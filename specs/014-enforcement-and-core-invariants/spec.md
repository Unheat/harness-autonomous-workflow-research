# Feature Specification: Core Invariants & Cross-Harness Verifier Enforcement

**Feature Branch**: `014-enforcement-and-core-invariants`
**Created**: 2026-11-14
**Status**: Planned (not implemented)
**Input**: "What is the absolute core we need? Is enforcement first?" → answered as four invariants + the
portability work that makes the second one real. Evidence: SpecBench/TestJack reward-hacking measurements,
the 18-tool SDD benchmark, and the harness capability matrix verified 2026-11-14.

## Problem

`swe-workflow`'s value rests on an **independent verifier**. Independence has two parts: a fresh context,
and an inability to change what it reviews. We have the first. The second is uneven and partly fiction:

| Harness | What we claim | What is true |
|---|---|---|
| Claude Code | `disallowedTools` | true — plus `permissionMode: plan` we never use |
| OpenCode | inherits the md decl | **wrong** — OpenCode needs `mode: subagent` + `permissions`, which we don't emit |
| Cursor | `disallowedTools` | **wrong** — Cursor only has `readonly: true`, which we don't set |
| Codex | implied read-only | **wrong** — agent files cannot change sandbox/approval; ours only adds an instruction line |
| pi / DeepAI | implied role restriction | true only as an instruction, plus host `approval-required` |
| ZCode / DSH | `disallowedTools` | unverified |

Two further gaps in the protocol itself: the plan has no **stop condition** ("RE-PLAN IF"), and the
reproducer is authored by the same agent that fixes it — the exact visible-vs-heldout gap measured at
+28pp per 10× code size.

## Core invariants (the thing we are protecting)

1. A **failing test** exists before the fix, and fails for the right reason.
2. The **verifier is not the author** — different context, ideally a different model, ideally with cases
   it authored and the implementer never saw.
3. A **declared scope + stop condition** — files allowed, when to stop and re-plan.
4. **Evidence, not narration** — command + exit code, and a human at the irreversible step.

Enforcement is not invariant #5; it is what makes #2 true. It is measured by #2, never on its own.

## Decision

- **Normalize enforcement as tiers, never as mechanisms.** Four tiers: `hard` (harness blocks the write),
  `coarse` (one blunt switch), `parent-inherit` (child inherits, definition cannot narrow it),
  `advertised` (instruction only). Every artifact — setup, projection, doctor, skill — reads one matrix.
- **Add a non-mutation witness.** Where the harness cannot prevent a write, make it *detectable*: fingerprint
  the tree before a reviewer dispatch and re-check after; a changed tree invalidates the verdict.
- **Keep four judge criteria.** The new plan contract fields are checked as evidence inside `bounded-scope` /
  `startable` / `decisive-test`; adding a fifth criterion would force a full recalibration for no measured gain.
- **Held-out cases are part of `decisive-testing`, not a new gate.** After the green gate, the verifier adds
  2–3 adversarial cases; the implementer must pass them without editing them.

## Requirements

- **FR-001**: `references/harness-matrix.md` is the single sourced table (predefine / runtime-define /
  enforcement tier / dispatch recipe) for exactly these harnesses: Claude Code, Codex, Cursor, OpenCode,
  ZCode, DSH, pi. Each row carries the version checked and a date.
- **FR-002**: A test fails if the matrix and the projection code disagree on any harness's tier or output path.
- **FR-003**: Non-mutation witness: capture `git status --porcelain` + `git diff` hash + untracked list before
  a reviewer dispatch, re-check after; mismatch ⇒ verdict discarded, workflow reports it.
- **FR-004**: Claude dispatch in manual mode uses `--agents <json>` with `permissionMode: "plan"` and writes
  no agent files (session-scoped).
- **FR-005**: OpenCode projection emits an agent entry per canonical agent with `mode: "subagent"` and an
  ordered `permissions` deny for `edit`/`write`/`shell` as applicable.
- **FR-006**: Cursor projection sets `readonly: true` for agents that deny write tools.
- **FR-007**: Codex projection keeps the instruction line and makes **no** permission claim; `harness doctor`
  reports `parent-inherit` for Codex and never reports it as read-only-enforced.
- **FR-008**: `plan.md` gains five fields — allowed files, step order, mandatory verification commands,
  pitfalls from Phase 1, and `RE-PLAN IF` triggers. `judge-plan` rejects a plan missing any of them.
- **FR-009**: `judge-pr` verifies (a) the witness result, (b) files touched ⊆ allowed files, (c) held-out
  cases added by the verifier pass.
- **FR-010**: Doc corrections with sources: Codex per-agent sandbox is ignored; Cursor CLI does not read
  `.codex/agents` (it reads `.cursor`, `.claude`, `.grok`); core pi has no registry but its subagent
  extension reads `~/.pi/agent/agents/*.md` and `.pi/agents/*.md` under `agentScope: "project"`.
- **FR-011**: Three probes recorded before any code depends on them: ZCode honours `disallowedTools`;
  DSH reads only `$DSH_HOME/agents`; DeepAI Code's bundled `subagent` tool does or does not read a registry.

## Non-Goals

- Worktree isolation, parallel fan-out, `run_workflow`/swarm dispatch (outer layer, separate spec).
- A durable `PROJECT_STATE.md` (would be a second source of truth; if added, generated only).
- A fifth judge criterion, or any rubric rewrite beyond FR-009's evidence requirement.
- Replacing the harness trust flow or granting permissions on the user's behalf.

## Measurement

- Witness: unit test proves a mutated tree invalidates a verdict on a `parent-inherit` harness.
- Enforcement: smoke test per `hard` harness — the reviewer attempts a write and fails (OpenCode, Claude).
- Judges: 10-case calibration before/after for `judge-plan` (FR-008) and `judge-pr` (FR-009), frozen labels,
  reporting false accepts and false rejects. No "it feels better".
- Held-out cases: count of cases the implementer could not have seen, and whether they changed the verdict.
