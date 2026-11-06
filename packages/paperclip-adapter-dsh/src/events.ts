import { record } from "./config.js";
import { safeText } from "./redact.js";
export const EVENT_TYPES = new Set(["turn/start","turn/end","step/start","step/end","tool/call","tool/result","assistant/message"]);
export const REASONS = new Set(["completed","error","aborted","cancelled","max-tokens","blocked"]);
function blocks(value: unknown, secrets: string[]) {
  return Array.isArray(value) ? safeText(value.filter(b=>record(b).type === "text").slice(0,32).map(b=>safeText(record(b).text,secrets)).join("\n"),secrets) : "";
}
export function project(method: string, params: unknown, sessionId: string, secrets: string[] = []) {
  const p = record(params);
  if (p.sessionId !== sessionId) return null;
  if (method === "session.status" && (p.status === "running" || p.status === "idle")) return {kind:"dsh_event",type:"status",status:p.status};
  if (method !== "session.event") return null;
  const event = record(p.event);
  if (typeof event.type !== "string" || !EVENT_TYPES.has(event.type)) return null;
  const data = record(event.data), message = record(data.message);
  const reason = record(data.reason).kind;
  const content = event.type === "assistant/message" ? blocks(message.content,secrets) : event.type === "tool/result" ? blocks(message.content,secrets) : "";
  return {kind:"dsh_event",type:event.type,
    ...(content ? {text:content} : {}),
    ...(event.type === "tool/call" ? {name:safeText(data.name,secrets).slice(0,128),callId:safeText(data.callId,secrets).slice(0,128)} : {}),
    ...(event.type === "tool/result" ? {callId:safeText(message.callId,secrets).slice(0,128),isError:message.isError === true} : {}),
    ...(event.type === "turn/end" ? {reason:typeof reason === "string" && REASONS.has(reason)?reason:"unknown"} : {})};
}
