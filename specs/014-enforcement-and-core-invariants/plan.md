# Implementation Plan: Core Invariants & Cross-Harness Verifier Enforcement

**Branch**: `014-enforcement-and-core-invariants` | **Spec**: [spec.md](spec.md)

## Shape

Four independent work items, deliberately ordered by "can we test it without touching a judge rubric".
Judge changes (M3) sit last because they cost a 10-case calibration each.

```
M1  capability matrix + witness        no rubric change      pure code + tests
M2  enforcement projections            no rubric change      pure code + smoke tests
M3  plan contract + held-out cases     rubric text changes   needs eval rerun
M4  doc corrections + probes           documentation         no code path
```

## Layout

```text
.agents/skills/swe-workflow/
  references/harness-matrix.md     M1  single sourced table (7 harnesses)
  references/plan-procedure.md     M3  five contract fields, RE-PLAN IF
  SKILL.md                         M3  dispatch = witness(pre) -> judge -> witness(post)
  manual.md                        M2  per-harness recipe incl. permission payload
  setup.sh                         M2  Claude --agents JSON instead of copied files
.agent/src/services/
  subagent-projection.ts           M2  + OpenCode agents block, + Cursor readonly
  verifier-witness.ts              M1  fingerprint / compare / invalidate
.agent/src/doctor.ts               M1  report enforcement tier per harness
tests/
  verifier-witness.test.ts         M1
  harness-matrix.test.ts           M1  matrix <-> code drift
  subagent-projection.test.ts      M2  dialect assertions per harness
```

## Key choices

- **Tier, not mechanism.** The matrix stores `hard | coarse | parent-inherit | advertised`; each row also
  stores how to pass the payload. Nothing downstream branches on harness names — it branches on the tier.
- **Witness is tool-agnostic.** It never inspects the child; it inspects the repository. So it works on Codex
  and pi, where no sandbox exists, and it cannot be fooled by a prompt.
- **Witness must be cheap.** `git status --porcelain` + `git diff | sha256sum` + untracked list. No stash, no
  worktree, no writes — a reviewer dispatch must not disturb the tree it is reviewing.
- **`--agents` over files on Claude.** Session-scoped JSON means `setup.sh` stops writing agent files there
  and there is no drift to repair. Files stay the fallback when the user wants `@agent-<name>`.
- **No permission claim where none exists.** Codex gets the instruction line plus the witness; doctor says
  `parent-inherit`. This is the `Manager = ground truth` law applied to capabilities.
- **Probes before code.** FR-011 rows are marked `unverified` in the matrix until a probe lands; code reads the
  matrix, so an unverified row cannot silently become a claim.

## Sequencing

1. **M1** matrix + witness + doctor tier + tests. Nothing user-visible changes except honest reporting.
2. **M2** OpenCode → Claude → Cursor projections, each with a smoke test; Codex wording fixed; `setup.sh`
   switches to `--agents`.
3. **M3** plan contract fields, dispatch recipe, held-out cases; then run the judge evals (10 cases each).
4. **M4** doc corrections and the three probes; update the matrix from `unverified` to a dated result.

## Risks

- **Witness false positives**: a background process (formatter, watcher) touching the tree during a judge run
  invalidates a good verdict. Mitigation: compare only after the dispatch, report *what* changed, and let the
  human re-run rather than silently retrying.
- **OpenCode `mode: subagent` default**: new custom agents default to `primary`; forgetting the field makes a
  judge callable as a primary agent with edit rights. The projection test asserts the field.
- **Judges get stricter after M3**: plans that passed before may now be rejected for a missing `RE-PLAN IF`.
  This is intended, and is why M3 is last and calibrated.
- **Matrix rot**: the matrix is the one artifact that can lie. FR-002's test only covers rows the code emits;
  the version/date columns are for humans and must be refreshed when a probe lands.

## Verification

- `bun test tests/verifier-witness.test.ts tests/harness-matrix.test.ts tests/subagent-projection.test.ts`
- One smoke test per `hard` harness: reviewer attempts a write, must fail.
- Judge evals: 10 cases per changed judge, frozen labels, false-accept / false-reject reported.
- `harness doctor` on a `parent-inherit` workspace says so, and never claims read-only.
