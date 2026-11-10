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

## Phase 5: User Story 4 - Manager as ground truth for both scopes (P1)

- [x] T017 [US4] Add `getPiUserScopeMcpPath`, `inspectPiUserScope`, `syncPiUserScopeMcps` to `.agent/src/services/pi-mcp-projection.ts` (shared `inspectAt`/`syncAt` internals).
- [x] T018 [US4] Refresh user-scope projections on every global toggle in `.agent/src/mcp-global.ts`.
- [x] T019 [US4] Add `.agent/src/services/harness-sync-service.ts` and the `harness mcp sync` command for a non-destructive push (DSH profile + both pi scopes).
- [x] T020 [US4] Stop centralisation from treating generated projections as declarations in `.agent/src/clean-global.ts` (only manager-unknown names are unmigrated).
- [x] T021 [US4] Make projection sync report only real writes (`changed`), so repeat runs are silent.
- [x] T022 [US4] Default exposure to `direct` for parity with other harnesses; keep per-server opt-in through the hub.

## Phase 5.5: Cross-resource coverage

- [x] T022a Generalise the skills-adapter pruning to `NATIVE_SKILL_DISCOVERY_HARNESSES` (`['.zcode', '.pi']`) in `.agent/src/workspace.ts`, keeping physical skills folders intact.
- [x] T022b Document the harness x resource matrix (skills / subagents / MCP) in `docs/ARCHITECTURE.md` section 3.2, including the deliberate pi subagent gap.
- [x] T022c Test that a redundant `.pi/skills` link is pruned while a physical folder survives.

## Phase 5.6: Harness default preservation

- [x] T022d DSH ownership by plugin name (`DSH_MCP_CLIENT_PLUGIN`), so stock `mcp-resources` survives pruning.
- [x] T022e ZCode cleanup removes only migrated `mcp.servers` names and keeps sibling `mcp.*` settings.
- [x] T022f Codex `removeTomlTable` matches exact table paths (no `foo`/`foo_bar` prefix collisions).
- [x] T022g Doctor warns when Claude Code runs under an administrator `managed-mcp.json` policy.
- [x] T022h `tests/harness-defaults-safety.test.ts` covers all four cases.

## Phase 6: Tests & Docs

- [x] T014 [P] Add `tests/pi-projection.test.ts` (20 cases: dialect, lifecycle, symlink poisoning, trust semantics, hub integration).
- [x] T015 [P] Update `docs/ARCHITECTURE.md` and add `docs/solutions/pi-like-harness-projection.md`.
- [x] T016 Run `bun test` (117 passing) and verify `harness doctor` / `harness status` live output.
