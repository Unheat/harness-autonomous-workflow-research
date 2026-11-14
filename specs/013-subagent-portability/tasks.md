# Tasks: Subagent Portability

**Input**: `specs/013-subagent-portability/{spec,plan}.md`

## Milestone 1: Canonical spec splitting

- [x] T001 Extract `splitSubagentDocument` (frontmatter vs prompt body) in `.agent/src/subagents.ts`
- [x] T002 Keep `parseSubagentFile` behaviour identical (existing `tests/subagents.test.ts` green)

## Milestone 2: Codex projection

- [x] T003 Implement `buildCodexAgentToml` (required keys, literal multi-line body, read-only line)
- [x] T004 Implement `inspectCodexSubagentProjection` (current / missing / stale / blocked)
- [x] T005 Implement `syncCodexSubagentProjection` (marker ownership, orphan cleanup, hand-written preserved)
- [x] T006 Remove `.codex/agents` from `ADAPTER_SYMLINKS`; add it to `GENERATED_PROJECTION_FILES`
- [x] T007 Refresh the projection inside `reconcileWorkspaceAdapters` so init and heal both emit it
- [x] T008 Report projection issues from `auditWorkspace`
- [x] T009 Align `.agent/hooks/auto-heal-symlinks.sh` with the manager policy (prune, never link)

## Milestone 3: Skill dispatch modes

- [x] T010 Add the mode-selection router to `swe-workflow/SKILL.md`
- [x] T011 Author `manual.md` (body-as-system-prompt contract, brief, per-harness invocation table)
- [x] T012 Author `inline.md` (labelled self-audit, two human checkpoints)
- [x] T013 Scope the Phase 0 setup preflight to registry mode only
- [x] T014 Correct `setup.sh` header and the README architecture claim

## Milestone 4: Verification

- [x] T015 `tests/subagent-projection.test.ts` (7 cases)
- [x] T016 `bun test ./tests/*.test.ts` — 153 pass, 1 pre-existing failure reproduced on HEAD
- [x] T017 `harness heal` regenerates `.codex/agents/*.toml` from `.agent/agents/*.md`
