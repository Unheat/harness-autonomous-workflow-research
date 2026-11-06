import { spawn } from "node:child_process";
import type { Readable, Writable } from "node:stream";
import type { EventEmitter } from "node:events";
import type { Config } from "./config.js";
import { DriverError, Rpc } from "./rpc.js";
export type Child = EventEmitter & { stdin: Writable; stdout: Readable; stderr: Readable; kill(signal?: NodeJS.Signals): boolean };
export type Launch = (config: Config, env?: NodeJS.ProcessEnv) => Child;
export const launch: Launch = (config,env) => spawn(config.command,["--profile","sdk"],{cwd:config.cwd,env,stdio:["pipe","pipe","pipe"],shell:false});
export function own(child: Child, rpc: Rpc) {
  let closed = false;
  let failedExit = false;
  let resolveClose: () => void;
  const completion = new Promise<void>(resolve => { resolveClose = resolve; });
  child.on("error",() => rpc.fail(new DriverError("spawn_error")));
  child.on("close",(code: number | null) => { failedExit = code !== 0; closed = true; resolveClose(); rpc.fail(new DriverError("process_exited")); });
  // Never forward raw stderr: it may contain credentials, paths or tool output.
  child.stderr.resume();
  const wait = (ms: number) => new Promise<boolean>(resolve => {
    const timer = setTimeout(()=>resolve(false),ms);
    completion.then(()=>{clearTimeout(timer);resolve(true);});
  });
  return async (ms: number) => {
    if (closed) { if (failedExit) throw new DriverError("process_exit_failure"); return; }
    try { await rpc.request("shutdown",{},ms); } catch { /* Bounded signal fallback below. */ }
    if (closed || await wait(ms)) { if (failedExit) throw new DriverError("process_exit_failure"); return; }
    child.kill("SIGTERM");
    if (await wait(ms)) return;
    child.kill("SIGKILL");
    if (!await wait(ms)) throw new DriverError("termination_unconfirmed");
  };
}
