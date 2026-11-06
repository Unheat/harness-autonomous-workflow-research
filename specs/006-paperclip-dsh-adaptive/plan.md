# Implementation Plan

## Context and source corrections
Paperclip already provides worktree execution and review stages. Extend rather than replace it. `harness2-dsh` is a converter, not an optimizer. DSH MCP configuration uses Cordis, not `.mcp.json`. Existing Markdown `disallowedTools` does not prove DSH enforcement.

## Components
- Existing `.agent/src/`: harden catalog/localization reads and remove implicit trust-store writes. Preserve explicit global administration.
- `packages/paperclip-adapter-dsh/`: external adapter; official SDK/verified JSON-RPC, environment diagnostics, cancellation, scoped resume, safe logs and UI parsing.
- `packages/adaptive-workflow/`: typed evidence/stage/delegation/version contracts with deterministic tests.
- `resources/workflow/`: executive, task lead and independent reviewer procedures; task-triggered, not AGENTS.md bloat.
- `scripts/workbench/`: pinned local Paperclip installation and operational helpers; isolated data, telemetry off, loopback only, reproducible setup.
- Official Hindsight Paperclip plugin; isolated service or existing endpoint, no replacement memory engine.
- Optional DSH in-host bridge after primary integration tests. SDK fallback keeps Paperclip usable.

## Design
Paperclip is the single task scheduler. Its execution workspace becomes adapter cwd. DSH sessions stream events back, and never mark success merely because the process exited zero. Objective/evidence review remains a separate completion policy.

A run pins task id, workspace, workflow version and source revision. Judges return structured verdicts tied to these inputs. Changed inputs invalidate evidence. Bug/feature/refactor/research choose appropriate proof, rather than requiring synthetic RED failures.

Adaptation stages candidates separately, compares baseline/held-out outcomes and permissions, then promotes or rolls back a version. Generated scripts/plugins are untrusted until reviewed and isolated. Active sessions do not hot-reload candidate content.

## Reuse
Reuse `findWorkspaceRoot`, `getWorkspacePaths`, skill add/remove/dormancy, unified resource inventory and MCP declaration parsing. Do not reuse implicit global trust granting or mutating status functions.

## Tests and delivery
Run existing tests under temporary HOME/XDG; tests may not touch real credentials/config. Add negative protocol/security cases and integration fixture. Install Paperclip pinned separately, validate local health and adapter load, then exercise real DSH only with available official authentication. Verify browser UI and memory separately. Native DSH UI bridge is optional, last. Document exact blocked dependencies instead of substituting mock success.

## Approved-plan deviations
Use Spec **006** because 002–005 already exist; never overwrite them. Preserve upstream budgets/database/approvals. No public GitHub fork needed unless an actual extension gap requires a local patch.
