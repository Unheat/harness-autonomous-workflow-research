# Tasks: Core Invariants & Cross-Harness Verifier Enforcement

**Input**: `specs/014-enforcement-and-core-invariants/{spec,plan}.md`
**Rule**: M3 changes judge behaviour, so every M3 task ends with a calibration run. No task is "done" on code
alone.

## M1 — Capability matrix, witness, honest reporting

- [ ] T001 Author `references/harness-matrix.md`: 7 rows (Claude Code, Codex, Cursor, OpenCode, ZCode, DSH, pi),
      columns: predefine path, runtime-define mechanism, enforcement tier, how to pass the payload, version
      checked, verification status (`verified` / `unverified`).
- [ ] T002 Mark ZCode, DSH and pi-extension rows `unverified` (they are the three unprobed claims).
- [ ] T003 `tests/harness-matrix.test.ts`: parse the matrix; every harness the projection code emits must match
      its row's path and tier; a missing row fails the test.
- [ ] T004 Implement `services/verifier-witness.ts`: `captureWitness(root)` → `{ status, diffHash, untracked }`;
      `compareWitness(before, after)` → `{ unchanged, changedPaths }`.
- [ ] T005 `tests/verifier-witness.test.ts`: unchanged tree passes; an added line fails; a new untracked file
      fails; no writes occur (assert tree hash identical after capture).
- [ ] T006 `harness doctor`: print the enforcement tier per detected harness; never print `hard` for Codex.

## M2 — Enforcement projections

- [ ] T007 OpenCode: extend the projector to emit an agent entry per canonical agent with `mode: "subagent"`
      and ordered `permissions` deny rules for `edit` / `write` / state-changing `shell`.
- [ ] T008 OpenCode test: emitted entry has `mode: subagent`; a write-deny rule precedes any allow rule.
- [ ] T009 Claude: emit a `--agents <json>` payload (session-scoped) with `permissionMode: "plan"`,
      `tools`, `disallowedTools`, `prompt` = body; `setup.sh` prefers it over copying files.
- [ ] T010 Claude test: JSON contains all four agents, `prompt` equals the md body, no file is written.
- [ ] T011 Cursor: emit `readonly: true` for agents whose frontmatter denies `Edit`/`Write`; keep other fields
      the harness documents.
- [ ] T012 Codex: keep the instruction line; add an explicit test that the TOML contains **no** `sandbox_mode`
      or `approval_policy` (they are ignored by Codex and would be a false claim).
- [ ] T013 `manual.md`: per-harness dispatch recipe = witness(pre) → permission payload → judge → witness(post).

## M3 — Contract fields and held-out cases (calibration required)

- [ ] T014 `references/plan-procedure.md`: require allowed files, step order, mandatory verification commands,
      pitfalls, and `RE-PLAN IF` triggers; define what an acceptable trigger looks like.
- [ ] T015 `judge-plan`: treat a missing contract field as `bounded-scope` / `startable` failure (no new
      criterion); update `plan-rubric.md` wording only if the criteria cannot carry it.
- [ ] T016 `SKILL.md` Phase 3: on the second failure, stop and re-plan in read-only; forbid a third blind attempt.
- [ ] T017 `judge-pr`: verify witness result, touched-files ⊆ allowed files, and that verifier-added held-out
      cases pass.
- [ ] T018 Held-out cases: after green, the verifier writes 2–3 adversarial cases the implementer never saw;
      the implementer fixes or the task is blocked — cases are never edited by the implementer.
- [ ] T019 Calibration: 10 distinct cases per changed judge on a real model, frozen labels, before/after;
      report false accepts and false rejects; a judge is not "calibrated" on a smoke run.

## M4 — Corrections and probes

- [ ] T020 Correct the Codex row and the projection comment: per-agent `sandbox_mode` / `approval_policy` are
      ignored; Codex is `parent-inherit`.
- [ ] T021 Correct the Cursor row: CLI 2026.10.12 reads `.cursor`, `.claude`, `.grok` — not `.codex/agents`.
- [ ] T022 Correct the pi row: core has no registry; the subagent extension reads `~/.pi/agent/agents/*.md` and
      `.pi/agents/*.md` under `agentScope: "project"`. Probe whether DeepAI Code's bundled tool does the same.
- [ ] T023 Probe ZCode: does a project/user agent's `disallowedTools` actually block a write? Record version.
- [ ] T024 Probe DSH: confirm `$DSH_HOME/agents` is the only read path (project dir invisible).
- [ ] T025 Update the matrix's verification status and dates from T023/T024/T022; remove `unverified`.

## Out of scope (tracked elsewhere)

- Worktree isolation, parallel fan-out, `PROJECT_STATE.md`, swarm/`run_workflow` dispatch.
