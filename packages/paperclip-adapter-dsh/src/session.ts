import { createHash, randomUUID } from "node:crypto";
import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";
import type { Config } from "./config.js";
import { record, text } from "./config.js";
export function session(config: Config, ctx: AdapterExecutionContext) {
  const workflow = text(config.workflowKey ?? ctx.runtime.taskKey,"workflowKey or runtime.taskKey");
  const scope = createHash("sha256").update(JSON.stringify([config.cwd,workflow,ctx.agent.companyId,ctx.agent.id,config.provider,config.model])).digest("hex");
  const previous = ctx.runtime.sessionParams;
  if (!previous && ctx.runtime.sessionId) throw new Error("Unscoped legacy session refused");
  if (previous) {
    const p = record(previous);
    if (p.version !== 1 || p.scope !== scope || typeof p.sessionId !== "string" || !/^paperclip-[a-f0-9-]{36}$/.test(p.sessionId)) throw new Error("Resume scope mismatch");
    return {sessionId:p.sessionId,scope,version:1,resume:true};
  }
  return {sessionId:`paperclip-${randomUUID()}`,scope,version:1,resume:false};
}
