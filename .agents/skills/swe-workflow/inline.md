# Inline mode — no independent judge

Use **only** when the runtime cannot spawn a child task at all. You execute every phase yourself,
including the review gates. Read `SKILL.md` first: the phases and their gates are unchanged.

This is the degraded mode: **there is no independent judge**. Say so in your first update, in
`.workflow/evidence.md`, and in the PR description. Presenting a self-check as a judge verdict is
the one thing this file exists to prevent.

## What changes

| Phase | Registry / manual mode | Inline mode |
|---|---|---|
| Phase 2 gate | `judge-plan` grades 4 criteria | you apply `references/plan-rubric.md` as a checklist against your own plan |
| Phase 4 gate | `judge-pr` grades 4 criteria | you apply `references/pr-rubric.md` as a checklist against your own diff |
| Independence | fresh context, enforced or advertised read-only | none — same context, same biases |

Everything else holds: F2P red test must fail for the right reason, green must pass, P2P suite and
lint/typecheck must be clean, diff hygiene still applies, commits stay atomic.

## Self-audit protocol

Run it as an adversary, not as a summary. For each rubric line:

1. Quote the concrete artifact that satisfies it (file path + line, command + exit code, diff
   hunk). A criterion you cannot quote is **unsatisfied**.
2. Look for the failure the criterion exists to catch, not for evidence that you were right:
   - `grounded-cause`: name the mechanism and the test that fails without the fix.
   - `bounded-scope`: list every file touched; anything not in the plan is scope creep — revert it.
   - `startable`: could another engineer execute this plan without asking you a question?
   - `decisive-test`: does the test fail on the untouched code (re-verify by stashing) and pass now?
   - `plan-fidelity`: every repo obligation from Phase 0 (docs, changelog, codegen, PR template).
   - `clean-diff`: no debug logs, no commented-out trials, no unrelated reformatting.
3. Any failed line stops the phase. Fix the artifact, not the checklist.

## Mandatory human checkpoints

With no independent reviewer, the human is the gate. Stop and ask at exactly two points:

1. **After Phase 2**: show the plan, the red-test output, and your self-audit table. Ask for
   approval before editing source.
2. **Before Phase 5**: show the diff stat, the green-test output, and the self-audit table. Ask
   before opening the Draft PR.

Ask once per checkpoint with the artifacts attached — do not ask per file.

## Label every verdict

```text
mode=inline   gate=plan   verdict=self-audit (no independent judge)   lines=4/4
mode=inline   gate=pr     verdict=self-audit (no independent judge)   lines=4/4
```

Never write `approved by judge`, `PASS`, or `VERDICT: PASS` in this mode. If the human approves,
that is `human-approved`, which is a different and stronger statement — record it as such.
