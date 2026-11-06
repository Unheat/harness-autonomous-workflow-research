# Paperclip DSH server adapter

An external, local-only Paperclip adapter using the official DeepSeek Harness SDK stdio wire protocol. Paperclip is the operator interface; this is **not a desktop-window bridge**.

## Build and isolated tests

Use Node >=24.11.0 (required by the pinned Paperclip package), npm, and Bun. No root workspace changes are needed.

```sh
npm install --prefix /Users/dangtruongan/study/workflow/packages/paperclip-adapter-dsh --ignore-scripts --workspaces=false
npm run build --prefix /Users/dangtruongan/study/workflow/packages/paperclip-adapter-dsh
npm test --prefix /Users/dangtruongan/study/workflow/packages/paperclip-adapter-dsh
```

Tests inject an in-memory stdio driver. They never start DSH, contact a model, read credentials, or launch services. They exercise partial UTF-8 frames, malformed/oversize frames, RPC errors, EOF, transport errors, timeout, cancellation, shutdown escalation, missing/failed terminals, log failures, fail-closed reverse requests and scoped resume.

## Paperclip integration

```js
import { createServerAdapter } from './dist/index.js';
import { parseStdoutLine } from './dist/ui-parser.js';
const serverAdapter = createServerAdapter();
// Register serverAdapter under type "dsh" in the host's external adapter loader.
// Register parseStdoutLine with the host's transcript parser integration.
```

`createServerAdapter()` returns the **published** `ServerAdapterModule` from `@paperclipai/adapter-utils@2026.1023.0`, pinned in package.json and package-lock.json. This upstream package exports types, not a `createServerAdapter` helper; the factory here implements that interface. Merely importing the module does not register it in Paperclip or start a runtime. Root Paperclip registration and rendered UI verification are outside this package.

Example adapter config:

```json
{
  "cwd": "/absolute/existing/workspace",
  "model": "YOUR_REGISTERED_DSH_MODEL_ID",
  "provider": "deepseek-official",
  "workflowKey": "stable-project-workflow-identity",
  "promptTemplate": "Carry out the assigned task, report evidence and unresolved issues.",
  "timeoutMs": 300000,
  "shutdownTimeoutMs": 5000
}
```

`promptTemplate` is **literal text**, not a template language. A nonempty `ctx.context.prompt` overrides it. Supply actual Paperclip task instructions there when integrating task-aware prompt generation. A stable `ctx.runtime.taskKey` can replace `workflowKey`; absent both, execution fails before launch. Unknown configuration keys are rejected (including permission-bypass/native-bridge flags). Timeouts are integer milliseconds, 1–3,600,000. The model/provider route must be a nonempty ID; actual model availability is validated by DSH initialization, not guessed here.

The optional `command` is an absolute executable, defaulting to the installed macOS launcher:

`/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh`

The sole argument vector is `["--profile", "sdk"]`, with no shell interpolation. The launcher uses Electron-run-as-node with the bundled CLI. A different installation may supply its verified compatible launcher. Execution inherits the host environment for DSH's existing runtime setup; this package neither locates nor persists credentials, and does not inject Paperclip identity/JWT or managed runtime tools.

## Verified installed protocol

Inspected read-only from DeepSeek Harness **0.2.2-rc.1**, desktop build commit `c59d10aff167ad7eefead4b3a9082fb57c8fbfe8`:

- `app.asar/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js`: `--profile sdk` launch selection.
- `@deepseek-ai/dsh-sdk-protocol/lib/index.js`: newline-delimited JSON-RPC 2.0 over UTF-8 stdio, **not** Content-Length framing.
- `@deepseek-ai/dsh-sdk-jsonrpc-server/lib/index.js`: exact handlers and reverse-request validators.
- `runtime/cli/bin/dsh`: installed Electron CLI launcher.

Sequence:

1. `initialize({ cwd, provider, model, approvalRequests: true, capabilities: { userQuestions: true } })`.
2. If scoped state exists, `session/resume({ sessionId })`, then `session/working-directory/get({ sessionId })`; refuse a changed effective directory.
3. `session/prompt({ sessionId, contentBlocks: [{ type: "text", text }] })` → `{ messageId }`. First prompt creates a new SDK session; there is no invented session-create call.
4. `session/wait({ sessionId })` → `{}` after idle/descendant checks. Notifications committed during wait precede its response.
5. `shutdown({})`, then wait for process closure. If unresponsive, bounded SIGTERM/SIGKILL fallback. This installed SDK has **no session-cancel RPC**. Cancellation stops this adapter-owned SDK process, not the user's desktop application. Timeout/termination is not rollback and never authorizes replay.

The published `@deepseek-ai/dsh-sdk-client` is 0.0.1-rc.1; it is not bundled in this inspected runtime. To avoid assuming compatibility with a differently versioned client, this package implements the inspected wire contract directly.

## Safety and outcome semantics

- Logs are content-free allowlisted event projections, sent through awaited `onLog`; raw stdout, stderr, model text, tool inputs, error messages, questions and approvals are not forwarded. UI progress intentionally omits assistant answers and artifacts. These remain in DSH's session history. No credentials are placed in result state.
- `approval/request` receives `{ outcome: "rejected" }`; `user-question/ask` receives `{ cancelled: true }`. Unknown reverse requests receive a JSON-RPC error. All mark the result `interaction_required` and emit generic UI progress. **Nothing is auto-approved.** There is no suspended approval/question round-trip UI yet: operator remediation requires a subsequent deliberate run, not blind replay.
- Resume state includes a SHA-256 scope over canonical workspace, workflow key, company, agent and model/provider. Legacy unscoped IDs and mismatched scopes fail before launch. State is returned only after prompt admission; failed resume never silently creates a replacement. Hashing isolates accidental scope reuse; it is not a signature against a malicious state store.
- A successful `session/wait` plus an owned-session `turn/end` whose `data.reason.kind` is `completed` is required. Missing, unknown, blocked, error, aborted and token-limit terminals fail. **Exit 0 alone is never success.** Even accepted turn completion returns `objectiveSuccess: "unverified"`: the workflow must verify deliverables/tests independently.
- Failures and cancellations return nonzero adapter results with generic error codes. Cancellation waits for bounded teardown before returning. If process death cannot be confirmed the result is `termination_unconfirmed`; no recovery/retry authority is asserted. Signal fallback confirms the direct child only; native tools may have external side effects that cannot be rolled back.
- `testEnvironment` only validates local configuration, directory and executable. It always warns on valid configuration because it does not probe authentication, model availability, native tools, desktop permissions, or Paperclip registration.

## Explicit limitations

Real model execution, full Paperclip UI wiring, and DSH native desktop tools have **not** been exercised by this package's isolated tests. Native tools are composed by the official SDK profile, but this adapter makes no claim that GUI automation works, shares an existing desktop session, or has operating-system permissions. No fake native bridge is supplied. Remote/sandbox execution targets are rejected. No usage/cost accounting, tool-refresh resume, managed instructions/skills, Paperclip control-tool injection, prompt interpolation, automatic task completion, or assistant-response transcript forwarding is implemented. Do not advertise these capabilities from the host registry.

## Optional live SDK smoke (operator opt-in; not run by tests)

After building, choose an empty disposable workspace and a model/provider ID already known to be registered in DSH. Do not discover those by opening credential files. Using Node >=24.11.0:

```sh
DSH_SMOKE_CWD=/absolute/disposable/workspace \
DSH_SMOKE_MODEL=OPERATOR_KNOWN_MODEL_ID \
DSH_SMOKE_PROVIDER=deepseek-official \
node /Users/dangtruongan/study/workflow/packages/paperclip-adapter-dsh/examples/smoke.mjs
```

This **does make one real model request**, with a 20-second run budget and 2-second per-stage teardown budget. The installed launcher is started once with `--profile sdk`; no desktop server is launched by the adapter. The prompt requests no tools, but a prompt is not a security sandbox: run only in an appropriate disposable workspace/environment. A pass establishes SDK turn completion, not exact response correctness (response text is intentionally not forwarded), Paperclip registration, or native UI readiness. A provider/model resolution error remains a failure, with no fallback model or automatic retry.

The official launcher resolves profiles under `DSH_HOME/profiles`. For home/profile isolation, prefix that command with `DSH_HOME=/absolute/operator-prepared/dsh-home`. That home must already contain the operator-approved runtime/provider setup compatible with the chosen route. An empty home cannot be assumed to reuse existing login or registered routes. The SDK profile may initialize profile files and persist session state in the selected home; the workspace cwd alone does **not** isolate those writes. This package never copies credentials, creates replacement profiles with `--from-default-profile`, changes the default desktop profile, or claims that SDK tools are sandboxed. Leaving `DSH_HOME` unset uses the operator's existing DSH home and its normal persistence/profile side effects.
