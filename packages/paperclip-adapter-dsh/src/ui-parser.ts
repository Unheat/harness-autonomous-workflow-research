import type { StdoutLineParser } from "@paperclipai/adapter-utils";
export const parseStdoutLine: StdoutLineParser = (line,ts) => {
  if (line.length > 32_768) return [];
  let p: Record<string,unknown>;
  try { p = JSON.parse(line); if (!p || typeof p !== "object") return []; } catch { return []; }
  if (p.kind !== "dsh_event" || typeof p.type !== "string") return [];
  const clean = (v: unknown) => typeof v === "string" ? v.slice(0,4_128) : "";
  if (p.type === "assistant/message" && p.text) return [{kind:"assistant",ts,text:clean(p.text),channel:"final"}];
  if (p.type === "tool/call") return [{kind:"tool_call",ts,name:clean(p.name)||"tool",input:"[arguments omitted]",toolUseId:clean(p.callId)}];
  if (p.type === "tool/result") return [{kind:"tool_result",ts,toolUseId:clean(p.callId),content:clean(p.text),isError:p.isError === true}];
  if (p.type === "interaction_required") return [{kind:"stderr",ts,text:"BLOCKED: DSH requested approval or an answer. It was rejected/cancelled; interactive approval UI is not implemented."}];
  if (!["turn/start","turn/end","step/start","step/end","status"].includes(p.type)) return [];
  const reasons = ["completed","error","aborted","cancelled","max-tokens","blocked"];
  const reason = typeof p.reason === "string" && reasons.includes(p.reason) ? ` (${p.reason})` : "";
  return [{kind:"assistant",ts,text:`DSH ${p.type}${reason}`,channel:"progress"}];
};
