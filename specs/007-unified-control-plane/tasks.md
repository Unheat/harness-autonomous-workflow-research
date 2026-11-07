# Tasks: Unified Control Plane & Global Governance (Spec 007)

**Input**: Design documents from `/specs/007-unified-control-plane/spec.md` and `plan.md`  
**Prerequisites**: `spec.md` (required), `plan.md` (required)  
**Tests**: Automated tests in `tests/unified-control-plane.test.ts`

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup & Foundational Infrastructure

**Purpose**: Core infrastructure and configuration management service that all stories depend on.

- [x] T001 [P] [Foundational] Implement `.agent/src/services/config-service.ts` for safe JSON/YAML/Markdown reading, path resolution, and pre-write syntax validation.
- [x] T002 [P] [Foundational] Create unified service types and contracts in `.agent/src/types.ts` supporting effective MCP scope state, ConfigTarget, and Subagent mutations.

---

## Phase 2: User Story 1 - Direct Global Mode Control (Priority: P1) 🎯 MVP

**Goal**: Full global scope toggle capabilities for Skills, MCPs, and Subagents across CLI and Web UI.  
**Independent Test**: Enable global skill/MCP, verify presence in `~/.zcode`, `~/.claude`, and `~/.agents`, disable via CLI or Web UI, verify unlinked across all 3 directories.

### Implementation for User Story 1
- [x] T003 [US1] Enhance `disableGlobalSkill()` in `.agent/src/skills-global.ts` to sweep `~/.agents/skills/` (clearing DSH global load) in addition to `~/.zcode` and `~/.claude`.
- [x] T004 [US1] Add `/api/skill/global-toggle` and `/api/mcp/global-toggle` endpoints in `.agent/ui/server.ts` and `.agent/ui/routes.ts`.
- [x] T005 [US1] Wire `skill global <on|off> <name>` and `mcp global <on|off|rm> <srv>` in `.agent/scripts/harness.ts` to call shared services directly.
- [x] T006 [US1] Add Global Scope toggle badges and filters in `.agent/ui/index.html` allowing one-click global deactivation.

**Checkpoint**: At this point, User Story 1 is fully functional across both UI and CLI.

---

## Phase 3: User Story 2 - Independent MCP Lifecycle & Effective Scope Status (Priority: P1)

**Goal**: Manage Workspace/Global MCP lifecycle independently of external tools.
**Independent Test**: Toggle temporary MCP entries in isolated scope fixtures; verify effective state, shadowing, scoped removal, and unchanged unrelated configuration.

### Implementation for User Story 2
- [x] T007 [US2] Use shared lifecycle modules `.agent/src/mcp.ts` and `.agent/src/mcp-global.ts`; remove the external gateway service.
- [x] T008 [US2] Expose `/api/mcp/toggle`, `/api/mcp/global-toggle`, and `/api/mcp/delete` in `.agent/ui/routes.ts`; remove the gateway mode endpoint.
- [x] T009 [US2] Expose `mcp on|off|rm` and `mcp global on|off|rm` through `.agent/scripts/cli-commands.ts`; report effective scope status in `.agent/src/cli-printers.ts`.
- [x] T010 [US2] Use Workspace/Global MCP controls in `.agent/ui/index.html`; remove external gateway badges, selectors, metrics, and config editor targets.

**Checkpoint**: External routing and compression are outside workflow scope. Lifecycle edge cases require regression evidence, not gateway token-savings claims.

---

## Phase 4: User Story 3 - Subagent Token Shield Governance & Lifecycle (Priority: P1)

**Goal**: Toggle Token Shield protection on subagents and manage their lifecycle from UI & CLI.  
**Independent Test**: Toggle Token Shield on a subagent, verify `skill` is added/removed in frontmatter `disallowedTools`, and delete subagent cleanly.

### Implementation for User Story 3
- [x] T011 [US3] Implement `.agent/src/services/subagent-service.ts` for frontmatter mutation (`disallowedTools: [skill]`), subagent creation, and deletion.
- [x] T012 [US3] Add `/api/subagent/toggle-shield` and `/api/subagent/delete` endpoints in `.agent/ui/server.ts` and `.agent/ui/routes.ts`.
- [x] T013 [US3] Add `subagent shield <name> <on|off>` and `subagent delete <name>` commands in `.agent/scripts/harness.ts`.
- [x] T014 [US3] Add clickable Shield toggle badge and Delete button on Subagent cards in `.agent/ui/index.html`.

**Checkpoint**: User Story 3 complete - subagents governed with zero prompt explosion risk.

---

## Phase 5: User Story 4 & 5 - In-Dashboard Config Editor & Permanent Deletion (Priority: P2)

**Goal**: In-dashboard file editing with syntax validation and permanent deletion capabilities.  
**Independent Test**: Open `.mcp.json` in editor modal, attempt invalid JSON write (assert error), save valid JSON, and permanently delete a temporary skill.

### Implementation for User Story 4 & 5
- [x] T015 [US4] Add `/api/config/read` and `/api/config/write` endpoints in `.agent/ui/server.ts` and `.agent/ui/routes.ts` utilizing `config-service.ts`.
- [x] T016 [US4] Add `config read <target>` and `config edit <target>` commands in `.agent/scripts/harness.ts`.
- [x] T017 [US4] Implement Config Editor Modal with JSON validator and syntax highlighting in `.agent/ui/index.html`.
- [x] T018 [US5] Add `deleteSkillPermanent()` in `.agent/src/services/skill-service.ts` and wire `/api/skill/delete` and `harness skill delete <name> [--catalog]`.

---

## Phase 6: Automated Testing & Verification

**Goal**: Comprehensive test coverage across all domain services, edge cases, and CLI/API contracts.

- [x] T019 [P] [Tests] Create automated test suite in `tests/unified-control-plane.test.ts` covering:
  - Global skill multi-directory unlinking (`~/.zcode`, `~/.claude`, `~/.agents`).
  - Workspace/global MCP lifecycle and enabled-state transitions.
  - Subagent frontmatter manipulation and Token Shield toggling.
  - Config reading, safe writing, and syntax error rejection.
  - Permanent skill deletion.
- [x] T020 Run `bun test` and ensure 100% test pass.
