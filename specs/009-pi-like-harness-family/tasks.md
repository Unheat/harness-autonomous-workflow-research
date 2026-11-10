# Tasks: pi-like Harness Family Support (Spec 009)

**Input**: Design documents from `/specs/009-pi-like-harness-family/spec.md` and `plan.md`  
**Prerequisites**: `spec.md` (required), `plan.md` (required)  
**Tests**: Automated tests in `tests/pi-projection.test.ts`

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2, US3)

---

## Phase 1: Setup & Foundational Infrastructure

- [x] T001 [P] [Foundational] Add pi constants to `.agent/src/config.ts` (`PI_PROJECT_CONFIG_DIR`, `PI_PROJECT_MCP_BASENAME`, `PI_TRUST_BASENAME`, `PI_AGENT_DIR_ENV`, `PI_LIKE_AGENT_DIRS_ENV`, `PI_DEFAULT_AGENT_SUBPATH`).
- [x] T002 [P] [Foundational] Extend `McpServerConfig` in `.agent/src/types.ts` with `url`, `headers`, `type`, `transport`, `cwd`, `disabled` so adapters stop relying on `any` casts.

## Phase 2: User Story 1 - Workspace MCP declarations reach pi-like harnesses (P1)

- [x] T003 [US1] Implement `.agent/src/services/pi-mcp-dialect.ts`: `buildPiMcpEntry`, `buildPiProjection`, `serializePiProjection`.
- [x] T004 [US1] Implement `.agent/src/services/pi-mcp-projection.ts`: `getPiProjectMcpPath`, `inspectPiProjection`, `syncPiProjectMcps` with atomic writes.
- [x] T005 [US1] Wire projection regeneration into `saveLocalMcps` in `.agent/src/mcp.ts`.
- [x] T006 [US1] Project the empty hub during `initWorkspace` in `.agent/src/workspace.ts`.

**Checkpoint**: `mcp on/off/rm` keeps `.pi/mcp.json` in lockstep with `.mcp.json`.

## Phase 3: User Story 2 - Projections never re-enter the hub (P1)

- [x] T007 [US2] Replace `GENERATED_PROJECTION_FILES` with `{path, keepPhysicalFile}` defs in `.agent/src/workspace.ts` and prune symlinked projections during reconcile.
- [x] T008 [US2] Skip writes when the projection is a symlink (`blocked` state) and regenerate it in `healWorkspace` (`.agent/src/doctor.ts`).
- [x] T009 [US2] Audit poisonous projections as errors in `auditWorkspace` (`.agent/src/doctor.ts`).

**Checkpoint**: A symlinked `.pi/mcp.json` is reported, pruned by `harness heal`, and never mutates the hub.

## Phase 4: User Story 3 - Drift and trust gaps are visible (P2)

- [x] T010 [US3] Implement `.agent/src/services/pi-harness-trust.ts`: agent dir discovery, nearest-ancestor real-path trust resolution, gap reporting.
- [x] T011 [US3] Report stale/missing projection, refused declarations, and trust gaps from `auditWorkspace`.
- [x] T012 [US3] Surface projection state in `harness status` (`.agent/src/cli-printers.ts`); Web UI doctor panel inherits it via `/api/doctor`.
- [x] T013 [US3] Extend `discoverUnmigratedHarnessMcps` to every existing pi-like agent directory (`.agent/src/clean-global.ts`).

**Checkpoint**: Doctor names both the drift and the untrusted harness, and never offers to write `trust.json`.

## Phase 5: Tests & Docs

- [x] T014 [P] Add `tests/pi-projection.test.ts` (20 cases: dialect, lifecycle, symlink poisoning, trust semantics, hub integration).
- [x] T015 [P] Update `docs/ARCHITECTURE.md` and add `docs/solutions/pi-like-harness-projection.md`.
- [x] T016 Run `bun test` (117 passing) and verify `harness doctor` / `harness status` live output.
