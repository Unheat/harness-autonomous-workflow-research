import { redactDiagnosticText } from "@paperclipai/adapter-utils";
export const MAX_LOG_TEXT = 4_096;
export const MAX_RUN_LOG = 262_144;
export function safeText(value: unknown, secrets: string[] = []): string {
  if (typeof value !== "string") return "";
  let output = value.slice(0,MAX_LOG_TEXT * 4);
  for (const secret of secrets.filter(Boolean).sort((a,b)=>b.length-a.length)) output = output.split(secret).join("[REDACTED]");
  output = output.replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-]*PRIVATE KEY-----|$)/g,"[REDACTED]")
    .replace(/\bBearer\s+[^\s,;]+/gi,"Bearer [REDACTED]")
    .replace(/((?:api[_-]?key|token|secret|password|authorization)["']?\s*[:=]\s*["']?)[^\s,"';}]+/gi,"$1[REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,"[REDACTED]");
  output = redactDiagnosticText(output).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,"");
  return output.length > MAX_LOG_TEXT ? output.slice(0,MAX_LOG_TEXT)+" [truncated]" : output;
}
