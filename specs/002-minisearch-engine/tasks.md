# Tasks: 3-Tier MiniSearch Hybrid Engine

**Input**: Design documents from `specs/002-minisearch-engine/`
**Prerequisites**: `spec.md`, `plan.md`

---

## Milestone 1: Core Description Extraction & Offline Asset

- [x] T001 Bundle MiniSearch UMD to `.agent/ui/minisearch.js` for 100% offline usage
- [x] T002 Enhance `getSkillDescription()` in `.agent/src/catalog.ts` to inspect `.agents/skills`, `.agents/dormant`, and `~/.agents/skills`
- [x] T003 Extract server helpers into `.agent/ui/server-helpers.ts` keeping `server.ts` < 185 lines
- [x] T004 Expose `GET /minisearch.js` and inject skill descriptions into `/api/status` in `.agent/ui/server.ts`

---

## Milestone 2: Frontend 3-Tier Search Integration & Typo Tolerance

- [x] T005 Construct MiniSearch instances in `.agent/ui/index.html` for both skills and MCPs (indexing `name` boost: 10, `description` boost: 3)
- [x] T006 Implement search filtering with `prefix: true` and `fuzzy: 0.2` Levenshtein distance
- [x] T007 Fallback gracefully to empty state when query is blank, sorting active tools first

---

## Milestone 3: Automated Testing & Verification

- [x] T008 Author unit tests in `tests/search.test.ts` verifying MiniSearch index, prefix boost, description keyword retrieval, and fuzzy matching
- [x] T009 Run `bun test` to achieve 100% pass rate
- [x] T010 Test live UI search interactively via `http://localhost:20888`
