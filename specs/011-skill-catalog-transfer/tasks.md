# Tasks: Skill Catalog Promotion & Cross-Workspace Import

Implementation is complete; tasks are recorded in the order they were executed.

## Setup

- [x] T001 Confirm the missing direction: catalog → workspace exists (`addSkill`), workspace → catalog does not; `clean-global` only mirrors *global* skills.
- [x] T002 Confirm the dashboard has no entry point for another workspace and no folder-picker capability.

## Tests

- [x] T003 Add `tests/skill-promote.test.ts`: copy + relink + no `.promote-*` leftovers; divergent catalog name refused with both copies intact; guards for unknown / invalid / already-linked skills.
- [x] T004 Add `tests/skill-import.test.ts`: listing flags, symlink-preserving import (realpath equality), private-copy import with no catalog write, re-import refusal, conflict marker, same-workspace / non-workspace / invalid-name refusals.

## Core

- [x] T005 Add `isSkillInCatalog(name)` to `.agent/src/catalog.ts`.
- [x] T006 Implement `promoteSkillToCatalog()` in `.agent/src/skill-promote.ts`: validation, catalog copy via `syncSkillToCatalog`, staged folder→symlink swap with restore on failure.
- [x] T007 Implement `listImportableSkills()` and `importSkillFromWorkspace()` in `.agent/src/skill-import.ts`, including `linkedFromCatalog` with canonical realpath comparison.
- [x] T008 Implement `chooseDirectory()` in `.agent/src/services/directory-picker.ts` (async `osascript`, cancel `-128`, 5-minute timeout, non-macOS fallback message).
- [x] T009 Expose `inCatalog` on `EffectiveSkillInfo` and populate it from `getCatalogSkills()`.

## Integration

- [x] T010 Move `sendJson` to `.agent/ui/server-helpers.ts` and add `.agent/ui/routes-skill-transfer.ts` with the four endpoints; dispatch from `handleApiRoute`.
- [x] T011 Dashboard: per-row catalog button gated on `isProjectActive && !isLink && !inCatalog`.
- [x] T012 Dashboard: "📥 Import" modal — Choose Folder / typed path / Scan, per-row badges (`Linked: Catalog`, `Local copy`, `Already here`), Import buttons bound with `addEventListener`.
- [x] T013 README: document promotion and import in the feature list.

## Regression (precondition of a truthful catalog state)

- [x] T014 `listLocalSkills` suppresses a dormant folder whose name is active; resolver prefers the non-dormant entry.
- [x] T015 `addSkill` returns an idempotent success and heals a stale dormant twin; `removeSkill` discards the twin instead of failing with `ENOTEMPTY`.
- [x] T016 Tests for duplicate active+dormant: single listed entry, enable succeeds, disable replaces the stale copy.

## Polish

- [x] T017 Verify over HTTP against a temp workspace and temp source workspace: listing, link import, copy import, promotion, post-state `{ link: true, cat: true }`.
- [x] T018 Verify dashboard inline JS (`node --check`) and that every `getElementById` id exists.
- [x] T019 Run `bun test` (156 passing, 0 failing).
- [x] T020 Live cleanup: restart the dashboard and remove the stale `.agents/dormant/swe-workflow` copy.

## Follow-ups (not implemented)

- [ ] T021 Promote path when the workspace skill is git-tracked: the folder→symlink swap is a real git change; consider tracking skill sources outside `.agents/skills/`.
- [ ] T022 Doctor finding for names that are simultaneously active and dormant in the same workspace.
- [ ] T023 Offer "relink to catalog" for a local folder whose name the catalog already owns, once divergence policy is decided.
