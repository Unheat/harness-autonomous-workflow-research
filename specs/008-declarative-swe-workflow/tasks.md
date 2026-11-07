# Tasks: Declarative SWE Workflow Engine & Eval Harness

## Milestone 1: Archive & Foundation
- [x] Stop all background paperclip and embedded postgres processes.
- [x] Archive legacy Paperclip components into `archive/legacy-paperclip/`.
- [x] Create Spec 008 (`specs/008-declarative-swe-workflow/`): `spec.md`, `plan.md`, `tasks.md`.

## Milestone 2: Judge Definitions, Rubrics, & Procedures
- [x] Create `.agents/skills/judge-plan/` (`SKILL.md`, `rubric.md`, `procedure.md`).
- [x] Create `.agents/skills/judge-pr/` (`SKILL.md`, `rubric.md`, `procedure.md`).
- [x] Create `.agents/skills/f2p-protocol/` (`SKILL.md`).
- [x] Register subagents in `.agents/subagents/` and `.agent/agents/`:
  - [x] `judge-plan.md` (read-only 1-turn, rubric-gated, disallowedTools: [Agent, Skill])
  - [x] `judge-pr.md` (read-only 1-turn, rubric-gated, disallowedTools: [Agent, Skill])
  - [x] `explore-code.md` (read-only codebase graph tracing with `codebase-memory-mcp` & `rg`)
  - [x] `research.md` (read-only local config read + online research with `search2ai` & `web_fetch`)
- [x] Create canonical workflow entrypoint `.agents/skills/swe-workflow/SKILL.md` with ECC test runner auto-detection, Karpathy principles, and Human Tie-Breaker.
- [x] Configure workflow routing directives in project `AGENTS.md`.
- [x] Implement Universal Native Git Hook (`install-git-hook.sh` & `universal-pre-push.sh`) to enforce pre-push test passing across all harnesses.

## Milestone 3: Universal Eval Runner & Dataset Calibration
- [x] Copy and adapt 20 benchmark packages and `gold-labels.json` for `judge-plan` into `eval/judge-plan/`.
- [x] Copy and adapt 20 benchmark packages and `gold-labels.json` for `judge-pr` into `eval/judge-pr/`.
- [x] Implement universal `eval/run_eval.py` supporting both CLI (`claude -p` / `dsh`) and local OpenAI/9router HTTP gateway (`http://127.0.0.1:20128/v1`).
- [x] Run smoke calibration test on 9router gateway (`stacks` / `fastg`) verifying 100% agreement on initial test packages.
- [ ] Run comprehensive 10+ package benchmark calibration confirming false-accept/false-reject bounds.

## Milestone 4: End-to-End Workflow Verification & Documentation
- [ ] Run an end-to-end SWE workflow task verifying:
  - Phase 0: Test runner auto-detection (`bun test` vs `bun run test`)
  - Phase 1: F2P reproduction test creation (asserts RED failure on untouched code)
  - Phase 2: Plan drafting and `judge-plan` gate evaluation (and Human Tie-Breaker path)
  - Phase 3: Surgical implementation (asserts GREEN success + regression pass)
  - Phase 4: `judge-pr` verification (diff hygiene, zero console.log)
  - Phase 5: Draft PR and evidence table compilation
- [ ] Document final developer quickstart in `specs/008-declarative-swe-workflow/quickstart.md`.
