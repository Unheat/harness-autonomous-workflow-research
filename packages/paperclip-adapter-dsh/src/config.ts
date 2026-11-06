import { realpathSync, statSync, accessSync, constants } from "node:fs";
import { isAbsolute } from "node:path";
import type { AdapterConfigSchema } from "@paperclipai/adapter-utils";
export const DEFAULT_COMMAND = "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh";
export const DEFAULT_TIMEOUT = 300_000;
export const DEFAULT_SHUTDOWN = 5_000;
export const MAX_TIMEOUT = 3_600_000;
const keys = ["cwd", "command", "provider", "model", "timeoutMs", "shutdownTimeoutMs", "workflowKey", "promptTemplate", "env", "instructionsFilePath", "paperclipRuntimeSkills", "paperclipRuntimeSkillInstructions", "paperclipConnectionInstructions"];
export function record(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
}
export function text(v: unknown, key: string): string {
  if (typeof v !== "string" || !v.trim() || v.length > 100_000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v)) throw new Error(`Invalid ${key}`);
  return v;
}
function duration(v: unknown, fallback: number): number {
  if (v === undefined) return fallback;
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 1 || v > MAX_TIMEOUT) throw new Error("Invalid timeout");
  return v;
}
export function parseConfig(raw: Record<string, unknown>) {
  if (Object.keys(raw).some(k => !keys.includes(k))) throw new Error("Unsupported config key");
  const cwd = text(raw.cwd, "cwd");
  if (!isAbsolute(cwd) || !statSync(cwd).isDirectory()) throw new Error("Invalid cwd");
  const command = text(raw.command ?? DEFAULT_COMMAND, "command");
  if (!isAbsolute(command)) throw new Error("Command must be absolute");
  const model = text(raw.model, "model");
  const provider = text(raw.provider ?? "deepseek-official", "provider");
  if (![model, provider].every(s => /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,199}$/.test(s))) throw new Error("Invalid model route");
  if (raw.workflowKey !== undefined) text(raw.workflowKey, "workflowKey");
  if (raw.promptTemplate !== undefined) text(raw.promptTemplate, "promptTemplate");
  if (raw.instructionsFilePath !== undefined && !isAbsolute(text(raw.instructionsFilePath,"instructionsFilePath"))) throw new Error("Invalid instructions path");
  if (raw.env !== undefined && (typeof raw.env !== "object" || raw.env === null || Array.isArray(raw.env) || Object.entries(raw.env).some(([k,v]) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) || typeof v !== "string" || v.includes("\0")))) throw new Error("Invalid env");
  if (raw.paperclipRuntimeSkills !== undefined && !Array.isArray(raw.paperclipRuntimeSkills)) throw new Error("Invalid runtime skills");
  return { cwd: realpathSync(cwd), command, model, provider,
    timeoutMs: duration(raw.timeoutMs, DEFAULT_TIMEOUT), shutdownTimeoutMs: duration(raw.shutdownTimeoutMs, DEFAULT_SHUTDOWN),
    workflowKey: raw.workflowKey, promptTemplate: raw.promptTemplate, env: record(raw.env), instructionsFilePath: raw.instructionsFilePath };
}
export type Config = ReturnType<typeof parseConfig>;
export function checkCommand(command: string) {
  if (!statSync(command).isFile()) throw new Error("Invalid command");
  accessSync(command, constants.X_OK);
}
export const configSchema: AdapterConfigSchema = { fields: [
  {key:"cwd",label:"Workspace (absolute directory)",type:"text",required:true},
  {key:"command",label:"Installed DSH launcher",type:"text",default:DEFAULT_COMMAND},
  {key:"provider",label:"Provider",type:"text",default:"deepseek-official"},
  {key:"model",label:"Model ID (registered in DSH)",type:"text",required:true},
  {key:"promptTemplate",label:"Prompt template (Paperclip variables)",type:"textarea"},
  {key:"workflowKey",label:"Stable workflow identity",type:"text"},
  {key:"timeoutMs",label:"Run timeout (ms)",type:"number",default:DEFAULT_TIMEOUT},
  {key:"shutdownTimeoutMs",label:"Shutdown timeout (ms)",type:"number",default:DEFAULT_SHUTDOWN}
] };
