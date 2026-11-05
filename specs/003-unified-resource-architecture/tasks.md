# Tasks: Unified Resource Architecture & Scope Synchronization

**Input**: Design documents from `specs/003-unified-resource-architecture/`
**Prerequisites**: `spec.md`, `plan.md`

---

## Milestone 1: Domain Unification & Contracts

- [x] T001 Define `SkillScope`, `McpScopeState`, and `EffectiveSkillInfo` in `.agent/src/types.ts`
- [x] T002 Implement unified resource abstraction `UnifiedResource` in `.agent/src/resources.ts`
- [x] T003 Implement global skill discovery in `.agent/src/skills-global.ts`
- [x] T004 Implement lockstep sync between `.mcp.json` and `.agents/mcp.json` in `.agent/src/mcp.ts`
- [x] T005 Implement mathematical SHA-256 auto-trust engine in `.agent/src/mcp-global.ts`

---

## Milestone 2: Presentation & CLI Alignment

- [x] T006 Update `cli-printers.ts` to format `[Global: active]`, `[Project]`, and `[Catalog]` across skills and MCPs
- [x] T007 Update `server.ts` to return normalized `effectiveSkills` and accurate token load
- [x] T008 Update `index.html` to display unified scope badges and retain search input on polling
- [x] T009 Document PM & Lead SWE operating model and unified tooling guidelines in `AGENTS.md`

---

## Milestone 3: Automated Testing & Verification

- [x] T010 Author unit tests in `tests/skills-global.test.ts`
- [x] T011 Author unit tests in `tests/resources.test.ts`
- [x] T012 Author edge case tests in `tests/edge-cases.test.ts`
- [x] T013 Verify 100% test pass rate across all 9 test suites via `bun test`
