---
name: swe-workflow
description: Run a hands-on SWE task in the current session, from evidence and plan review to tested, independently reviewed changes.
---

# Hands-on SWE workflow

You are the main engineer in this workspace. Write code and tests yourself.
Read the project's `AGENTS.md` and task acceptance criteria. Apply its skill/docs
conventions when relevant; do not bake project-specific rules into this workflow.
This skill guides behavior; it does not enforce permissions or install hooks.

## Route by need
- Known file/symbol, narrow question: inspect directly. Small task: short plan.
- Unknown location, cross-file behavior or dependency tracing: use an available
  read-only code explorer with a bounded question.
- Unfamiliar external API, technology or consequential design tradeoff: use an
  available research helper; require sources and distinguish fact from inference.
- Do not delegate implementation or repeat a helper's search. Verify decisive
  findings. Ask the user only for consequential product/scope/authority decisions.
- Use helpers only where the harness supports them. No independent reviewer:
  report blocked review; do not relabel self-review as independent approval.

## Evidence → plan → implement → review
1. Establish baseline and task-kind evidence using `../f2p-protocol/SKILL.md`.
   Inspect existing behavior before choosing a repair. Cannot reproduce: report
   evidence and differences; do not invent failure or force a green test red.
2. Write a proportional plan: evidence/cause or design, scope, chosen approach,
   decisive checks. Ask an independent judge to read
   `../judge-plan/SKILL.md`. Provide requirements, applicable project rules,
   evidence and plan. Revise on substantiated findings, not preferences.
3. Implement directly. Disclose necessary deviations; material changes to cause,
   scope or approach require renewed plan review. Never weaken tests or policy.
4. Test like a tester: derive assertions from requirements, not your implementation.
   Cover normal paths, boundaries, invalid input, failure/recovery and regressions.
   Exercise real integration seams; mock-only assertions are not end-to-end proof.
   Run relevant tests, lint and typechecks from the project, not a fixed toolchain.
   Inspect outputs/exit codes, explain skipped/not-applicable checks and baseline
   failures. Green checks do not prove complete correctness.
5. Inspect the whole task diff, including untracked files and staged/committed
   changes against the pinned base. Give an independent judge the requirements,
   project rules, plan/deviations, diff and check evidence; use
   `../judge-pr/SKILL.md`. Fix findings and rerun affected checks/review.
6. Deliver review-ready changes with evidence, residual risks and unresolved
   findings. Human owns merge. Publish/push/create a PR only with authorization.

## Bounds
Default: two review attempts per gate; use a lower task budget if specified.
If still rejected, stop with evidence and blocker; never skip a failed gate.
A judge may inspect dependencies and run checks within the allowed budget;
no artificial one-turn limit. Pin verdicts to the reviewed inputs; changes stale them.
