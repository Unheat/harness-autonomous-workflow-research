#!/usr/bin/env bun
import { connect } from "node:net";
import { resolve } from "node:path";
import { BASE_URL, DISCOVERY_TIMEOUT_MS, HOST, paths, PORT, SOURCE } from "./constants";
import { command, discoverNode, run } from "./runtime";
import { setup } from "./setup";
import { health, inspect } from "./workbench";

export function requireFreePort() {
  return new Promise<void>((resolve, reject) => {
    const socket = connect({ host: HOST, port: PORT });
    socket.setTimeout(DISCOVERY_TIMEOUT_MS);
    socket.once("connect", () => { socket.destroy(); reject(new Error(`Port ${PORT} is occupied; not starting or stopping any process`)); });
    socket.once("timeout", () => { socket.destroy(); reject(new Error("Port probe timed out; refusing start")); });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      socket.destroy();
      if (error.code === "ECONNREFUSED") resolve(); else reject(error);
    });
  });
}
export async function main(args: string[]) {
  if (args.length !== 1 || !["setup", "start", "status", "doctor", "install-hindsight"].includes(args[0])) {
    throw new Error("Usage: bun scripts/workbench/cli.ts setup|start|status|doctor|install-hindsight (no extra arguments)");
  }
  const p = paths(resolve(SOURCE, "../.."));
  const action = args[0];
  if (action === "status") {
    const result = { diagnostics: inspect(p), health: await health() };
    console.log(JSON.stringify(result, null, 2));
    return result.diagnostics.ok && result.health.ok ? 0 : 1;
  }
  if (action === "doctor") {
    const result = inspect(p); console.log(JSON.stringify(result, null, 2)); return result.ok ? 0 : 1;
  }
  const node = discoverNode();
  if (action === "setup") { setup(p, node); return 0; }
  const diagnostics = inspect(p);
  if (!diagnostics.ok) throw new Error(JSON.stringify(diagnostics, null, 2));
  if (action === "start") {
    await requireFreePort();
    console.log(`Foreground Paperclip at ${BASE_URL}; Ctrl-C stops this run. No system service is installed.`);
    run(command(p, node, ["run", "--instance", "default", "--no-repair"]));
  } else {
    if (!(await health()).ok) throw new Error("Paperclip must be healthy before plugin installation");
    run(command(p, node, ["plugin", "install", "@vectorize-io/hindsight-paperclip", "--version", "0.4.2", "--api-base", BASE_URL]));
    console.log("Plugin install requested. Backend/configuration/lifecycle behavior must be verified separately; memory is NOT proven working.");
  }
  return 0;
}
if (import.meta.main) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1;
  });
}
