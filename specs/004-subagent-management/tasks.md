# Tasks: Subagent Lifecycle & Token Shield Governance

**Input**: Design documents from `specs/004-subagent-management/`
**Prerequisites**: `spec.md`, `plan.md`

---

## Milestone 1: Subagent Engine & Parser

- [x] T001 Define `SubagentInfo` interface in `.agent/src/types.ts`
- [x] T002 Implement YAML frontmatter parser and scanner in `.agent/src/subagents.ts` (<150 lines)
- [x] T003 Discover global subagents (`~/.zcode/agents/`) and project subagents (`.agent/agents/`)
- [x] T004 Implement Token Shield verification (`hasTokenShield`) checking `disallowedTools: Skill`

---

## Milestone 2: Presentation & CLI Commands

- [x] T005 Implement `harness agent list` and integrate subagents into `harness status` in `cli-printers.ts`
- [x] T006 Expose subagents in `/api/status` endpoint in `server.ts`
- [x] T007 Add Subagents section in `.agent/ui/index.html` displaying Global/Project badges and Token Shield tag

---

## Milestone 3: Automated Testing & Verification

- [x] T008 Author unit tests in `tests/subagents.test.ts`
- [x] T009 Run `bun test` and verify 100% pass rate
- [x] T010 Commit changes to Git with clean commit message
