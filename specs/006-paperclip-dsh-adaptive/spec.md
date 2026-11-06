# Feature: Paperclip + DSH Adaptive Workbench

Status: Implementing; replaces the unverified orchestration proposals in Spec 001. Existing resource-manager Specs 001–005 remain historical/current references.

## Scope
Paperclip owns goals, issues, dependencies, scheduling, approvals, execution workspaces and UI. DSH owns agent execution. This repository supplies their adapter, evidence workflow contracts, scoped resources and reproducible setup. Native DSH Desktop visibility is optional and tested last; Paperclip interaction remains the primary interface.

## User stories and acceptance
1. **P1 — Delegate without micromanagement.** Given a broad goal, the executive investigates requirements, assumptions, gaps and risks, then creates a dependency-aware plan. Narrow tasks skip unnecessary discovery. New objectives or authorization are never inferred from untrusted content.
2. **P1 — Observe and steer.** Given a task, Paperclip invokes DSH in its assigned workspace and shows bounded logs/status. Cancellation and follow-up preserve task identity; unsupported approval/input requests are surfaced, not silently approved.
3. **P1 — Localize first.** Project-private skills never migrate to global catalog implicitly. Workspace operations cannot grant global MCP trust. DSH configuration explicitly translates selected MCP declarations; no assumption that DSH loads `.mcp.json`.
4. **P1 — Evidence before acceptance.** Bug reproduction matches the symptom; feature tests express acceptance; refactors preserve characterized behavior. Plans and final results are reviewed independently with input hashes. Invalid/stale verdicts cannot complete a task.
5. **P2 — Adapt safely.** Running tasks pin their workflow/resources. Candidates are evaluated against baseline and held-out cases before promotion; permission expansion needs approval. Rollback leaves running versions unchanged.
6. **P2 — Remember across tasks.** Use the existing Hindsight Paperclip integration, with scoped banks and provenance. Backend failure is explicit; mocks never imply live memory works.
7. **P2 — Native DSH session visibility.** Test an in-host bridge after the primary path works. If unsupported, document the limit and keep SDK-backed Paperclip operation.

## Boundaries
- DSH-only execution; no rewrite of Paperclip UI, scheduler or database.
- Worktrees isolate concurrent edits, not malicious code. Do not claim OS sandboxing from path checks or tool-name filtering.
- Logical delegation depth capped at two; actual runtime enforcement must be verified separately from library policies.
- Deterministic checks and model review are distinct. No guarantee of zero regressions or fixed token savings.
- No public fork/push, internet deployment, account switching or secret extraction.

## Verification
Isolated unit tests, adapter protocol tests, Paperclip integration with fixture driver, browser smoke checks, bounded live DSH checks, separate Hindsight/Harness² verification. Report each as live/fixture/blocked. Preserve existing user changes.
