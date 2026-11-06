# Execution Tasks

## 1. Baseline and design
- [x] Preserve existing working tree and create implementation branch.
- [x] Verify current runtime/donor contracts; identify prior inaccurate claims.
- [x] Create Spec 006 without overwriting Specs 002–005.
- [ ] Reconcile old architecture and constitution claims with verified scope.

## 2. Core implementation (parallel, integrate before acceptance)
- [ ] Harden existing localization: nonmutating reads, no implicit trust grants, consistent safe symlinks.
- [ ] Build external Paperclip–DSH adapter with isolated protocol tests.
- [ ] Build evidence workflow and adaptation contracts with tests.
- [ ] Add executable integration wiring; library helpers alone do not mean a working autonomous workflow.

## 3. Setup and validation
- [x] Install pinned Paperclip into an isolated local instance; load adapter and verify UI.
- [x] Configure executive/task/reviewer roles with scoped resources and per-agent instructions.
- [x] Verify skill materialization end to end (Paperclip company skills → `.dsh/skills`, kebab-sanitized, DSH-discoverable).
- [ ] Verify follow-up, cancellation and review rejection/retry end to end (needs live DSH turn; agents intentionally paused until operator provides model session).
- [ ] Integrate official Hindsight plugin and test real retain/recall, or report backend blocker (backend not installed — blocker recorded).
- [ ] Verify candidate evaluation/promotion/rollback; distinguish native Harness² integration from local contract tests (kernel contracts tested; native integration pending).
- [ ] Run full regression suite, typecheck/build and independent review; fix findings (suites green: 44 + 30 + 34; reviewer re-run pending).
- [ ] Try native DSH UI bridge last; retain Paperclip SDK fallback if it fails (plugin doc contract confirmed: `ctx.sessionController` + `dsh.bundle` format).

## 4. Handoff
- [ ] Record local URLs, exact commands, test evidence, service state and limitations.

Future subtasks are elaborated from real integration failures, not guessed APIs.
