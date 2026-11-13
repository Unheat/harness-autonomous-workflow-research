# Tasks: Judge Calibration Before Enforcement

## Wiring

- [x] T001 Replace `eval/judge-*/{rubric,procedure}.md` with symlinks to the deployed skill files
- [x] T002 Allow `pass|fail|unclear` in `eval/run_eval.py` schema; drop the leniency instruction
- [x] T003 Baseline both judges against the deployed rubrics (record before-numbers in `spec.md`)

## Calibration

- [x] T004 `judge-pr` `repo-checks`: replace the "absence is not a failure" escape with a `PASS`
      boundary (every check the repo or plan names has an outcome; a repo mandating none passes)
      and a `FAIL IF` (required check has no outcome, or shows a new failure)
- [x] T005 `judge-pr` `decisive-testing`: add `PASS` boundary so evidence the plan never asked for
      is a strength, not a requirement
- [x] T006 `judge-pr` `behavior-correctness`: a deferral disclosed by both plan and description is a
      scope boundary, not a defect; `fail` requires a shown defect
- [x] T007 `judge-plan` `startable`: ready-as-scoped is the bar; a disclosed unknown with a decision
      rule is a stated risk; `fail` requires an outcome-changing decision with no rule
- [x] T008 `judge-plan` `bounded-scope`: honour maintainer-stated direction and repo policy
      disclosure; `FAIL IF` the plan contradicts either
- [x] T009 `judge-plan` `decisive-test`: `PASS` boundary mirroring T005
- [x] T010 `judge-plan` verdict rule + `procedure.md`: `unclear` alone does not block
- [x] T011 Re-run both judges; both at 19/20 with reject-side unchanged

## Deferred (blocked on T011 holding)

- [ ] T012 `Policy Discovery Table` in `.workflow/plan.md`: fixed columns, fixed status enum
      (`satisfied | not-applicable+reason | deviated+approval`), rows discovered per repo
- [ ] T013 Judges read the supplied policy paths directly instead of the author's paraphrase
- [ ] T014 Repo-local gate mount point: `universal-pre-push.sh` sources `.agents/swe-gate.sh` when present
- [ ] T015 Held-out gold split before any further rubric wording change (see Known Limits)
- [ ] T016 `--repeats N` in the harness; report variance and per-check false-accept/false-reject rates
