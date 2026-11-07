# Plan: Hands-on SWE workflow

## Ownership and entrypoint
- Input coordinator owns intake, queue and optional worktree provisioning.
- Main session in each workspace owns code/tests; load
  `.agents/skills/swe-workflow/SKILL.md`. No implementer subagent hop.
- Delegate bounded discovery/research or independent review only when useful.
- Consumers put docs/skill conventions in their own `AGENTS.md`.
- Repo `AGENTS.md` governs development of this product, not consumer conventions.

## Canonical prompts
- Main: `.agents/skills/swe-workflow/SKILL.md`.
- Evidence: `.agents/skills/swe-workflow/references/f2p-protocol.md`.
- Helper Subagents:
  - `.agents/skills/swe-workflow/agents/explore-code.md`: Internal codebase tracing (`codebase-memory-mcp`, `rg`).
  - `.agents/skills/swe-workflow/agents/research.md`: External docs & best practices (`search2ai`, `web_fetch`, local config read).
- Judges: `.agents/skills/swe-workflow/agents/judge-{plan,pr}.md` referencing canonical rubrics.
- Multi-harness discovery: Subagents are mirrored across `.agents/subagents/` and `.agent/agents/`.
- `sdd-worker` and `sdd-reviewer` remain legacy leaf interfaces, not main entrypoints.

## Workflow
1. Read requirements/project instructions; inspect directly for narrow known work.
   Use an explorer for unknown cross-file behavior, research for external uncertainty.
2. Establish task-kind evidence: bug repro, feature acceptance, refactor parity,
   docs validators. No artificial RED or universal toolchain requirement.
3. Grounded proportional plan → independent plan review → implementation by main.
4. Tester-style validation: normal/boundary/negative/failure/recovery/regression,
   actual integration behavior, recorded commands/results/skips. No weakened checks.
5. Independent review of requirements, semantic behavior, complete diff, project
   rules and verification evidence. Default two attempts per gate; stop if blocked.
6. Review-ready artifacts; human owns merge. External PR publication requires authority.

## Prompt correction acceptance
- Concise, complete prompts; no duplicated rubrics, arbitrary one-turn or price claims.
- Legitimate logs/TODOs and authorized prerequisites are not blanket rejections.
- Judge input changes invalidate affected verdicts; no self-approval substitution.
- Prompt-contract tests detect wiring/rule regressions, not model quality.

## Judge evaluation acceptance
At least 10 distinct cases per judge on a real model with the deployed prompt.
Freeze labels and category mix first. Include valid/invalid, borderline, adversarial,
semantic defects, legitimate logs, justified scope changes and task-kind variants.
Report false accepts/rejects, errors and category results, not just aggregate accuracy.
Keep held-out cases for confirmation; do not cherry-pick successful packages.
A smoke/partial run cannot claim calibration. Old CodePath labels include upstream
contribution requirements not necessarily present in these reusable rubrics; do not
score them as interchangeable without an explicit scope/label review.

## Limits
Markdown is behavioral guidance, not runtime enforcement or OS isolation.
Harness-specific tool permissions, UI visibility and entrypoint discovery need
separate verification. CLI/HTTP prompt evaluation is not native-subagent E2E proof.
Previous three-item calibration runs do not validate the revised prompts.
