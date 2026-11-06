import { describe, test, expect } from "bun:test";
import { PassThrough } from "node:stream";
import { EventEmitter } from "node:events";
import { Rpc } from "../src/rpc.js";
import { parseConfig } from "../src/config.js";
import { createServerAdapter } from "../src/index.js";
import { parseStdoutLine } from "../src/ui-parser.js";
import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";

function peer(options: { reverse?: string; reason?: string; fail?: boolean; hang?: boolean; exit?: boolean } = {}) {
 const child = Object.assign(new EventEmitter(), { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), kill: (_signal?: string) => { queueMicrotask(() => child.emit("close", null, "SIGTERM")); return true; } });
 const calls: any[] = []; let session = "";
 child.stdin.on("data", bytes => { for (const line of bytes.toString().trim().split("\n")) {
  if (!line) continue; const frame = JSON.parse(line); calls.push(frame); if (!frame.method) continue;
  queueMicrotask(() => {
   if (options.hang && frame.method !== "shutdown") return;
   if (options.exit && frame.method !== "shutdown") { child.emit("close", 0, null); return; }
   let result: unknown = {};
   if (frame.method === "session/working-directory/get") result = {cwd:process.cwd()};
   if (frame.method === "session/prompt") { session = frame.params.sessionId; result = { messageId: "msg" }; }
   if (frame.method === "session/wait") {
    if (options.reverse) child.stdout.write(JSON.stringify({jsonrpc:"2.0",id:"reverse",method:options.reverse,params:{secret:"TOKEN"}})+"\n");
    child.stdout.write(JSON.stringify({jsonrpc:"2.0",method:"session.event",params:{sessionId:session,event:{type:"turn/end",data:{reason:{kind:options.reason ?? "completed"}},secret:"TOKEN"}}})+"\n");
   }
   child.stdout.write(JSON.stringify(options.fail && frame.method === "initialize" ? {jsonrpc:"2.0",id:frame.id,error:{code:-1,message:"TOKEN"}} : {jsonrpc:"2.0",id:frame.id,result})+"\n");
   if (frame.method === "shutdown") queueMicrotask(() => child.emit("close",0,null));
  });
 }});
 return { child, calls };
}
function context(overrides: Partial<AdapterExecutionContext> = {}): AdapterExecutionContext {
 return {runId:"run",agent:{id:"a",companyId:"c",name:"a"},runtime:{sessionId:null,sessionParams:null,sessionDisplayId:null,taskKey:"workflow"},config:{cwd:process.cwd(),model:"deepseek-chat",promptTemplate:"hello",timeoutMs:100,shutdownTimeoutMs:25},context:{},onLog:async()=>{},...overrides} as AdapterExecutionContext;
}

describe("boundary",()=>{
 test("validates directories, routes, durations and unknown permissions",()=>{
  for (const patch of [{cwd:"relative"},{cwd:"/missing-dsh-test"},{model:"bad route"},{timeoutMs:0},{timeoutMs:NaN},{approvalRequests:false},{nativeBridge:true}]) expect(()=>parseConfig({...context().config,...patch})).toThrow();
  expect(parseConfig(context().config).model).toBe("deepseek-chat");
 });
 test("diagnostics never start a provider",async()=>{const a=createServerAdapter({launch:()=>{throw Error("must not launch")}});expect((await a.testEnvironment({companyId:"c",adapterType:"dsh",config:context().config})).status).toBe("warn");});
 test("UI only accepts safe projected events",()=>{expect(parseStdoutLine("not json","")).toEqual([]); expect(parseStdoutLine('{"secret":"TOKEN"}',"")).toEqual([]);});
});

describe("RPC",()=>{
 test("partial UTF8 and multiple frames",async()=>{const input=new PassThrough(),output=new PassThrough(); const rpc=new Rpc(input,output,async()=>{},async()=>({}));const p=rpc.request("test",{},100);output.on("data",()=>{});const wire=JSON.stringify({jsonrpc:"2.0",id:1,result:"雪"})+"\n";const b=Buffer.from(wire);input.write(b.subarray(0,b.length-3));input.write(b.subarray(b.length-3));expect(await p).toBe("雪");rpc.close();});
 test("malformed and oversize frames fail",async()=>{for(const data of ["invalid\n","x".repeat(1048577)]){const input=new PassThrough();const rpc=new Rpc(input,new PassThrough(),async()=>{},async()=>({}));const p=rpc.request("test",{},100);input.write(data);await expect(p).rejects.toThrow();rpc.close();}});
 test("timeout, EOF, write and input errors reject",async()=>{for(const mode of ["timeout","end","error","write"]){const input=new PassThrough(),output=new PassThrough();const rpc=new Rpc(input,output,async()=>{},async()=>({}));if(mode==="write")output.destroy();const p=rpc.request("test",{},5);if(mode==="end")input.end();if(mode==="error")input.emit("error",Error("private"));await expect(p).rejects.toThrow();rpc.close();}});
});

describe("execution",()=>{
 test("official flow streams safe events, not objective success",async()=>{const mock=peer();const logs:string[]=[];const result=await createServerAdapter({launch:()=>mock.child}).execute(context({onLog:async(_,s)=>{logs.push(s)}}));expect(result.exitCode).toBe(0);expect(result.summary).toContain("not verified");expect(mock.calls.filter(x=>x.method).map(x=>x.method)).toEqual(["initialize","session/prompt","session/wait","shutdown"]);expect(mock.calls[0].params.approvalRequests).toBe(true);expect(logs.join("")).not.toContain("TOKEN");expect(result.sessionParams?.scope).toBeString();});
 test("resume is scoped and mismatches do not launch",async()=>{const m=peer();const first=await createServerAdapter({launch:()=>m.child}).execute(context());const n=peer();const a=createServerAdapter({launch:()=>n.child});const c=context();c.runtime.sessionParams=first.sessionParams!;expect((await a.execute(c)).exitCode).toBe(0);expect(n.calls.some(x=>x.method==="session/resume")).toBe(true);c.config={...c.config,workflowKey:"other"};expect((await a.execute(c)).exitCode).not.toBe(0);});
 for(const reason of ["error","cancelled","max-tokens","unknown"])test(`terminal ${reason} fails`,async()=>{const m=peer({reason});expect((await createServerAdapter({launch:()=>m.child}).execute(context())).exitCode).not.toBe(0);});
 for(const reverse of ["approval/request","user-question/ask","unknown"])test(`reverse ${reverse} fails closed`,async()=>{const m=peer({reverse});const r=await createServerAdapter({launch:()=>m.child}).execute(context());expect(r.exitCode).not.toBe(0);expect(JSON.stringify(m.calls)).not.toContain("allowed-once");expect(r.errorCode).toBe("interaction_required");});
 for(const opt of [{fail:true},{exit:true},{hang:true}])test(`driver failure ${JSON.stringify(opt)}`,async()=>{const m=peer(opt);const r=await createServerAdapter({launch:()=>m.child}).execute(context());expect(r.exitCode).not.toBe(0);expect(r.errorMessage).not.toContain("TOKEN");if(opt.hang)expect(r.timedOut).toBe(true);});
 test("pre-abort does not launch",async()=>{const ctrl=new AbortController();ctrl.abort();const r=await createServerAdapter({launch:()=>{throw Error("launch")}}).execute(context({signal:ctrl.signal}));expect(r.errorCode).toBe("cancelled");});
 test("in-flight cancel shuts down",async()=>{const m=peer({hang:true}),ctrl=new AbortController();const p=createServerAdapter({launch:()=>m.child}).execute(context({signal:ctrl.signal}));setTimeout(()=>ctrl.abort(),5);expect((await p).errorCode).toBe("cancelled");expect(m.calls.some(x=>x.method==="shutdown")).toBe(true);});
});

describe("safety edges",()=>{
 test("no terminal is not completion",async()=>{const m=peer();const write=m.child.stdout.write.bind(m.child.stdout);m.child.stdout.write=((data:any,...args:any[])=>data.toString().includes("session.event")?true:write(data,...args)) as typeof m.child.stdout.write;expect((await createServerAdapter({launch:()=>m.child}).execute(context())).errorCode).toBe("terminal_not_completed");});
 test("spawn and log failures settle without raw messages",async()=>{for(const mode of ["spawn","log"]){const m=peer();const r=await createServerAdapter({launch:()=>{if(mode==="spawn")queueMicrotask(()=>m.child.emit("error",Error("TOKEN")));return m.child;}}).execute(context({onLog:async()=>{if(mode==="log")throw Error("TOKEN")}}));expect(r.exitCode).toBe(1);expect(r.errorMessage).not.toContain("TOKEN");}});
 test("shutdown timeout escalates and unconfirmed termination fails",async()=>{const m=peer();m.child.stdin.removeAllListeners("data");m.child.kill=()=>true;const r=await createServerAdapter({launch:()=>m.child}).execute(context({config:{...context().config,timeoutMs:5,shutdownTimeoutMs:2}}));expect(r.errorCode).toBe("termination_unconfirmed");});
 test("resume rejects a changed effective directory",async()=>{const m=peer();const first=await createServerAdapter({launch:()=>m.child}).execute(context());const n=peer();const write=n.child.stdout.write.bind(n.child.stdout);n.child.stdout.write=((data:any,...args:any[])=>write(data.toString().replace(process.cwd(),"/different"),...args)) as typeof n.child.stdout.write;const c=context();c.runtime.sessionParams=first.sessionParams!;expect((await createServerAdapter({launch:()=>n.child}).execute(c)).errorCode).toBe("resume_directory_mismatch");expect(n.calls.some(x=>x.method==="session/prompt")).toBe(false);});
 test("safe UI parser emits content-free progress",()=>{expect(parseStdoutLine('{"kind":"dsh_event","type":"turn/end","reason":"completed","secret":"TOKEN"}',"now")).toEqual([{kind:"assistant",ts:"now",text:"DSH turn/end (completed)",channel:"progress"}]);});
 test("invalid diagnostics and remote execution fail",async()=>{const a=createServerAdapter();expect((await a.testEnvironment({companyId:"c",adapterType:"dsh",config:{}})).status).toBe("fail");expect((await a.execute(context({config:{}}))).exitCode).toBe(1);});
});

// Integration contracts from installed Paperclip 2026.1023.0.
describe("Paperclip host integration",()=>{
 test("accepts injected instructions/skills and renders host task prompt",async()=>{
  const m=peer();const c=context({config:{...context().config,instructionsFilePath:"/dev/null",paperclipRuntimeSkills:[],env:{EXAMPLE:"value"},promptTemplate:"Hello {{agent.name}}"},context:{paperclipTaskMarkdown:"## Assignment\nImplement ticket PC-42",paperclipWake:{reason:"issue_assigned",issue:{id:"issue",identifier:"PC-42",title:"Do work"}}}});
  const r=await createServerAdapter({launch:()=>m.child}).execute(c);expect(r.exitCode).toBe(0);const prompt=m.calls.find(x=>x.method==="session/prompt").params.contentBlocks[0].text;expect(prompt).toContain("PC-42");expect(prompt).toContain("Hello a");
 });
 test("run credentials and task identity passed only through environment",async()=>{
  const m=peer();let env:NodeJS.ProcessEnv={};const c=context({authToken:"run-secret",context:{taskId:"task-42",wakeReason:"issue_assigned"},config:{...context().config,env:{PAPERCLIP_API_KEY:"evil",PAPERCLIP_AGENT_ID:"spoof",CUSTOM:"ok"}}});
  const r=await createServerAdapter({launch:(_cfg,e)=>{env=e!;return m.child;}}).execute(c);expect(r.exitCode).toBe(0);expect(env.PAPERCLIP_API_KEY).toBe("run-secret");expect(env.PAPERCLIP_AGENT_ID).toBe("a");expect(env.PAPERCLIP_TASK_ID).toBe("task-42");expect(env.CUSTOM).toBe("ok");expect(JSON.stringify(m.calls)).not.toContain("run-secret");expect(createServerAdapter().supportsLocalAgentJwt).toBe(true);
 });
 test("assistant/tool logs meaningful, bounded and redacted without thinking",async()=>{
  const m=peer();const raw=m.child.stdout.write.bind(m.child.stdout);m.child.stdout.write=((data:any,...args:any[])=>{const f=JSON.parse(data.toString());if(f.method==="session.event"){for(const [type,d] of [["assistant/message",{message:{content:[{type:"thinking",text:"PRIVATE_THOUGHT"},{type:"text",text:"Implemented task run-secret Authorization: Bearer abc.def.ghi"}]}}],["tool/call",{name:"bash",callId:"call",input:{command:"secret"}}],["tool/result",{message:{callId:"call",content:[{type:"text",text:"Tests passed "+"x".repeat(20000)}]}}]])raw(JSON.stringify({jsonrpc:"2.0",method:"session.event",params:{sessionId:f.params.sessionId,event:{type,data:d}}})+"\n");}return raw(data,...args)}) as typeof m.child.stdout.write;
  const logs:string[]=[];const r=await createServerAdapter({launch:()=>m.child}).execute(context({authToken:"run-secret",onLog:async(_,s)=>{logs.push(s)}}));expect(r.exitCode).toBe(0);const all=logs.join("");expect(all).toContain("Implemented task");expect(all).toContain("bash");expect(all).toContain("Tests passed");expect(all).not.toContain("run-secret");expect(all).not.toContain("PRIVATE_THOUGHT");expect(all).not.toContain("abc.def.ghi");expect(all.length).toBeLessThan(14000);
 });
 test("UI parser is standalone external contract",async()=>{const {readFileSync}=await import("node:fs");const pkg=JSON.parse(readFileSync(new URL("../package.json",import.meta.url),"utf8"));expect(pkg.exports["./ui-parser"]).toBeDefined();expect(pkg.paperclip.adapterUiParser).toBe("1.0.0");});
});
