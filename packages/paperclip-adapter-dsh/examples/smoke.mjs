// Explicitly opt-in live smoke. Never invoked by build/test/diagnostics.
import { createServerAdapter } from "../dist/index.js";
import { isAbsolute } from "node:path";
const cwd = process.env.DSH_SMOKE_CWD;
const model = process.env.DSH_SMOKE_MODEL;
if (!cwd || !isAbsolute(cwd) || !model) {
  throw new Error("Set DSH_SMOKE_CWD to a disposable absolute directory and DSH_SMOKE_MODEL to an operator-known registered model ID");
}
const result = await createServerAdapter().execute({
  runId: "explicit-smoke",
  agent: { id: "smoke-agent", companyId: "smoke-company", name: "DSH smoke", adapterType: "dsh", adapterConfig: {} },
  runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: "explicit-sdk-smoke" },
  config: {
    cwd, model, provider: process.env.DSH_SMOKE_PROVIDER ?? "deepseek-official",
    promptTemplate: "Reply with exactly SDK_SMOKE_OK. Do not use tools, modify files, launch processes, or access network resources beyond this model request.",
    timeoutMs: 20_000, shutdownTimeoutMs: 2_000
  },
  context: {},
  onLog: async (_stream, line) => process.stdout.write(line)
});
// Deliberately do not print session identity or arbitrary runtime payloads.
console.log(JSON.stringify({ exitCode: result.exitCode, errorCode: result.errorCode,
  timedOut: result.timedOut, summary: result.summary, resultJson: result.resultJson }));
process.exitCode = result.exitCode === 0 ? 0 : 1;
