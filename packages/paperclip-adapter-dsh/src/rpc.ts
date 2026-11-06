import type { Readable, Writable } from "node:stream";
import { StringDecoder } from "node:string_decoder";
import { record } from "./config.js";
export const MAX_FRAME = 1_048_576;
export class DriverError extends Error {
  constructor(public code: string) { super(code); }
}
type Pending = { resolve(v: unknown): void; reject(e: Error): void };
export class Rpc {
  private pending = new Map<number, Pending>();
  private nextId = 0;
  private buffer = "";
  private decoder = new StringDecoder("utf8");
  private failure?: Error;
  private queue = Promise.resolve();
  constructor(private input: Readable, private output: Writable,
    private notification: (method: string, params: unknown) => Promise<void>,
    private reverse: (method: string, params: unknown) => Promise<unknown>) {
    input.on("data", this.data); input.on("end", this.end); input.on("error", this.error);
    output.on("error", this.error);
  }
  fail(error: Error) {
    this.failure ??= error;
    for (const p of this.pending.values()) p.reject(this.failure);
    this.pending.clear();
  }
  private end = () => this.fail(new DriverError("transport_eof"));
  private error = () => this.fail(new DriverError("transport_error"));
  private data = (bytes: Buffer | string) => {
    if (this.failure) return;
    this.buffer += typeof bytes === "string" ? bytes : this.decoder.write(bytes);
    for (;;) {
      const index = this.buffer.indexOf("\n");
      if (index < 0) break;
      const line = this.buffer.slice(0, index); this.buffer = this.buffer.slice(index + 1);
      if (Buffer.byteLength(line) > MAX_FRAME) { this.fail(new DriverError("frame_too_large")); return; }
      if (!line.trim()) continue;
      let frame: Record<string, unknown>;
      try { frame = record(JSON.parse(line)); } catch { this.fail(new DriverError("malformed_frame")); return; }
      this.queue = this.queue.then(() => this.handle(frame)).catch(() => this.fail(new DriverError("event_delivery_failed")));
    }
    if (Buffer.byteLength(this.buffer) > MAX_FRAME) this.fail(new DriverError("frame_too_large"));
  };
  private async handle(frame: Record<string, unknown>) {
    if (frame.jsonrpc !== "2.0") { this.fail(new DriverError("malformed_frame")); return; }
    if (typeof frame.method === "string") {
      if (frame.id !== undefined) {
        try { this.write({jsonrpc:"2.0",id:frame.id,result:await this.reverse(frame.method,frame.params)}); }
        catch { this.write({jsonrpc:"2.0",id:frame.id,error:{code:-32601,message:"Client interaction unavailable"}}); }
      } else await this.notification(frame.method,frame.params);
      return;
    }
    if (typeof frame.id !== "number") return;
    const p = this.pending.get(frame.id); if (!p) return;
    this.pending.delete(frame.id);
    if (frame.error !== undefined) p.reject(new DriverError("rpc_error"));
    else if ("result" in frame) p.resolve(frame.result);
    else p.reject(new DriverError("malformed_response"));
  }
  private write(frame: unknown) {
    if (this.output.destroyed || !this.output.writable) throw new DriverError("transport_write_failed");
    this.output.write(JSON.stringify(frame) + "\n", error => { if (error) this.error(); });
  }
  request(method: string, params: unknown, timeoutMs: number, signal?: AbortSignal): Promise<unknown> {
    if (this.failure) return Promise.reject(this.failure);
    if (signal?.aborted) return Promise.reject(signal.reason);
    return new Promise((resolve,reject) => {
      const id = ++this.nextId;
      const finish = (fn: () => void) => { clearTimeout(timer); signal?.removeEventListener("abort",abort); this.pending.delete(id); fn(); };
      const abort = () => finish(() => reject(signal?.reason ?? new DriverError("cancelled")));
      const timer = setTimeout(() => finish(() => reject(new DriverError("timeout"))), timeoutMs);
      signal?.addEventListener("abort",abort,{once:true});
      this.pending.set(id,{resolve:v=>finish(()=>resolve(v)),reject:e=>finish(()=>reject(e))});
      try { this.write({jsonrpc:"2.0",id,method,params}); } catch { finish(()=>reject(new DriverError("transport_write_failed"))); }
    });
  }
  close() {
    this.fail(new DriverError("transport_closed"));
    this.input.off("data",this.data); this.input.off("end",this.end); this.input.off("error",this.error);
    this.output.off("error",this.error);
  }
}
