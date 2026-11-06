import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import { DEFAULT_SHUTDOWN, parseConfig, record } from "./config.js";
import { DriverError, Rpc } from "./rpc.js";
import { own, type Launch } from "./process.js";
import { project } from "./events.js";
import { buildPrompt, buildEnv } from "./host.js";
import { MAX_RUN_LOG } from "./redact.js";
import { session } from "./session.js";
export async function execute(ctx: AdapterExecutionContext, launch: Launch): Promise<AdapterExecutionResult> {
  let code = "invalid_configuration";
  let rpc: Rpc | undefined;
  let stop: ((ms:number)=>Promise<void>) | undefined;
  let shutdownMs = DEFAULT_SHUTDOWN;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let saved: Record<string,unknown> | null = null;
  let terminal: string | undefined;
  let interaction = false;
  const controller = new AbortController();
  const abort = () => controller.abort(new DriverError("cancelled"));
  ctx.signal?.addEventListener("abort",abort,{once:true});
  try {
    if (ctx.signal?.aborted) throw new DriverError("cancelled");
    if (ctx.executionTarget && ctx.executionTarget.kind !== "local") throw new Error("Local only");
    const config = parseConfig(ctx.config); shutdownMs = config.shutdownTimeoutMs;
    const identity = session(config,ctx);
    const prompt = await buildPrompt(ctx,config,identity.resume);
    const env = buildEnv(ctx,config);
    const secrets = Object.entries(env).filter(([k])=>/key|token|secret|password|authorization|cookie/i.test(k)).map(([,v])=>v ?? "");
    let logBytes = 0;
    code = "driver_failed";
    await ctx.onCancellationReady?.();
    controller.signal.throwIfAborted();
    timer = setTimeout(()=>controller.abort(new DriverError("timeout")),config.timeoutMs);
    ctx.onDispatch?.();
    const child = launch(config,env);
    rpc = new Rpc(child.stdout,child.stdin,async(method,params)=> {
      const event = project(method,params,identity.sessionId,secrets);
      if (!event) return;
      if (event.type === "turn/end" && "reason" in event) terminal = String(event.reason);
      const line = JSON.stringify(event)+"\n";
      if (logBytes + Buffer.byteLength(line) <= MAX_RUN_LOG) { logBytes += Buffer.byteLength(line); await ctx.onLog("stdout",line); }
    },async(method)=> {
      interaction = true;
      await ctx.onLog("stdout",JSON.stringify({kind:"dsh_event",type:"interaction_required"})+"\n");
      if (method === "approval/request") return {outcome:"rejected"};
      if (method === "user-question/ask") return {cancelled:true};
      throw new DriverError("interaction_required");
    });
    stop = own(child,rpc);
    const request = (method:string,params:unknown) => rpc!.request(method,params,config.timeoutMs,controller.signal);
    await request("initialize",{cwd:config.cwd,provider:config.provider,model:config.model,approvalRequests:true,capabilities:{userQuestions:true}});
    if (identity.resume) {
      await request("session/resume",{sessionId:identity.sessionId});
      const directory = record(await request("session/working-directory/get",{sessionId:identity.sessionId}));
      if (directory.cwd !== config.cwd) throw new DriverError("resume_directory_mismatch");
      terminal = undefined;
    }
    const admitted = record(await request("session/prompt",{sessionId:identity.sessionId,contentBlocks:[{type:"text",text:prompt}]}));
    if (typeof admitted.messageId !== "string" || !admitted.messageId) throw new DriverError("invalid_prompt_response");
    saved = {version:1,sessionId:identity.sessionId,scope:identity.scope};
    await request("session/wait",{sessionId:identity.sessionId});
    if (interaction) throw new DriverError("interaction_required");
    if (terminal !== "completed") throw new DriverError("terminal_not_completed");
    controller.signal.throwIfAborted();
    code = "ok";
  } catch (error) {
    code = interaction ? "interaction_required" : error instanceof DriverError ? error.code : code;
  } finally {
    if (timer) clearTimeout(timer);
    ctx.signal?.removeEventListener("abort",abort);
    try { await stop?.(shutdownMs); } catch { code = "termination_unconfirmed"; }
    rpc?.close();
  }
  const success = code === "ok";
  return {exitCode:success?0:1,signal:code === "cancelled"?"SIGTERM":null,timedOut:code === "timeout",
    errorCode:success?null:code,errorMessage:success?null:interaction?"BLOCKED: approval/question rejected or cancelled; interactive approval UI is not implemented.":`DSH adapter: ${code}`,
    sessionParams:saved,sessionDisplayId:typeof saved?.sessionId === "string"?saved.sessionId:null,
    summary:success?"DSH turn completed; workflow objective success is not verified.":`DSH run failed: ${code}`,
    resultJson:{blocked:interaction,objectiveSuccess:"unverified",terminal:terminal ?? null,interactionRequired:interaction}};
}
