# Tasks: Catalog Isolation, Continuous Discovery & Self-Healing

**Input**: Design documents from `specs/005-catalog-self-healing/`
**Prerequisites**: `spec.md`, `plan.md`

---

## Milestone 1: Catalog Storage Isolation & Migration

- [x] T001 Define `GLOBAL_CATALOG_SKILLS_DIR` in `.agent/src/config.ts` (`~/.agents/catalog/skills`)
- [x] T002 Safely migrate/seed existing 40+ skills from `~/.agents/skills/` to `~/.agents/catalog/skills/`
- [x] T003 Update `addSkill` in `.agent/src/skills.ts` to source from `GLOBAL_CATALOG_SKILLS_DIR` with fallback
- [x] T004 Implement `enableGlobalSkill` and `disableGlobalSkill` in `.agent/src/skills-global.ts`

---

## Milestone 2: Continuous Discovery & Auto-Ingest

- [x] T005 Implement `syncSkillToCatalog(skillPath, name)` in `.agent/src/catalog.ts`
- [x] T006 Implement resilient `getCatalogSkills()` scanning both catalog storage and any rogue/manual skills
- [x] T007 Implement comprehensive `healWorkspace()` in `.agent/src/doctor.ts` (prune dead links, de-duplicate, trust)

---

## Milestone 3: Presentation, CLI Commands & Automated Tests

- [x] T008 Update `harness.ts` with `skill global on/off <name>` and connect multi-stage `heal`
- [x] T009 Author unit tests in `tests/catalog-healing.test.ts`
- [x] T010 Run `bun test` and verify 100% pass across all test suites
