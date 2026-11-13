# Feature Specification: Judge Calibration Before Enforcement

**Feature Branch**: `012-judge-calibration`

**Created**: 2026-11-13

**Status**: Implemented

**Input**: "Enforce swe-workflow more, but stay generic across repos with different rules. Research
best practice first, do not make it so strict the model cannot pass the code checks at all, and run
the evals after the upgrade."

## Problem

The request assumed the judges were too lenient. Measurement showed the opposite: the deployed
judges rejected almost every valid work package while the repo's own `pass_bar` is 18/20.

Baseline run on the deployed rubrics (`claude` CLI, `sonnet`, 24 packages per judge):

| Judge | Agreement | Clear-accepts passing | Reject-categories passing |
|---|---|---|---|
| `judge-pr` | 15/20 (75%) | 2/7 | 13/13 |
| `judge-plan` | 12/20 (60%) | 0/7 | 16/17 |

Both judges were effectively perfect at rejecting bad work and near-useless at accepting good work.
Any increase in strictness at that point would have made the gate unusable, so calibration became
the prerequisite for enforcement.

Two harness defects made the baseline untrustworthy until fixed:

1. `eval/judge-{plan,pr}/{rubric,procedure}.md` were frozen snapshots of an older rubric. The eval
   was grading a judge that is not the one deployed.
2. `eval/run_eval.py` instructed the model to emit `"grade": "pass|fail"`, discarding the `unclear`
   abstention the deployed rubric depends on, and asserted the judge "not be lenient".

## Research Grounding

- Give a judge an abstention path; a forced binary converts missing evidence into false certainty.
  An abstention belongs to neither error class and must be its own category.
- Make the failure mode concrete (explicit `FAIL IF`), and state what is *not* a failure. Vague
  criteria are the main source of judge variance.
- All-checks-must-pass conjunctions compound: per-check rates multiply only when failures are
  independent, and they usually are not. Adding a sixth blocking check is a strictness multiplier.
- Grade outcomes, not paths; do not punish a solution for not matching the reviewer's preferred shape.
- Prefer deterministic checkers; the judge covers only what a test cannot.

## Requirements

- **FR-001**: The eval harness MUST grade the deployed rubric. Eval rubric/procedure files are
  symlinks to `.agents/skills/judge-*/`, never physical copies.
- **FR-002**: The harness MUST allow the three-valued check grade (`pass|fail|unclear`) and MUST NOT
  bias the judge toward leniency or severity.
- **FR-003**: A check graded `unclear` MUST NOT by itself produce a rejection. `fail` is reserved for
  evidence that contradicts the rubric; `unclear` names an unverified risk with a remedy.
- **FR-004**: Every blocking check MUST state both a `PASS` boundary and a concrete `FAIL IF`
  condition, so a disclosed unknown is distinguishable from an unresolved decision.
- **FR-005**: A check that is not applicable to the task kind MUST pass, not abstain.
- **FR-006**: The number of blocking checks MUST NOT increase. New obligations are folded into an
  existing check so the pass-all conjunction does not compound.
- **FR-007**: Both judges MUST reach the repo's `pass_bar` (18/20) with no false accept in a
  reject-category, measured after the change.

## Acceptance

- `judge-pr`: 19/20 (95%), false accepts 0, false rejects 1.
- `judge-plan`: 19/20 (95%), false accepts 1 (`pkg-20`, thread-convention), false rejects 0.
- Reject-side performance unchanged (pr 13/13, plan 16/17).

## Out of Scope

Enforcement additions (policy-discovery table, judge reading policy paths directly, repo-local
pre-push gate mount point). They are deferred deliberately: each adds a blocking obligation, and the
gate must hold its pass bar before absorbing one. Recorded in `tasks.md`.

## Known Limits

- Single run per package. `judge-plan` on `pkg-20` produced `reject` in one run and `accept` in
  another, so these numbers carry unmeasured variance. `claude` CLI exposes no temperature control.
- Tuning rubric wording against the same 24 gold labels risks overfitting. A held-out split is
  required before the next wording change.
