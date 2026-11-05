# Feature Specification: Unified Resource Architecture & Scope Synchronization

**Feature Branch**: `003-unified-resource-architecture`
**Created**: 2026-11-05
**Status**: Completed
**Input**: Unified 3-Tier Lifecycle (Global, Project, Catalog) across all harness resources (Skills, MCPs, Hooks, Plugins) with bi-directional sync, auto-trust generation, and PM/SWE operating model.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Scope Abstraction Across Skills & MCPs (Priority: P1) 🎯

As a developer using multiple coding harnesses, I want Skills and MCP servers to share an identical 3-tier lifecycle model (`Global`, `Project`, `Catalog`), so that origin, scope, and effective status are intuitive and predictable regardless of resource type.

**Why this priority**: Eliminates cognitive overload and inconsistent behavior between skill toggling and MCP toggling.

**Independent Test**: Run `harness status` or open `http://localhost:20888`; verify both Skills and MCP columns display `[Global]`, `[Project]`, and `[Catalog]` badges using the exact same semantics.

**Acceptance Scenarios**:
1. **Given** a skill active globally (`~/.zcode/skills/` or `~/.claude/skills/`), **When** viewed in status or dashboard, **Then** it displays `[Global] [Active]` with explanation "Active globally across all projects".
2. **Given** a skill activated for this workspace (`.agents/skills/`), **When** viewed, **Then** it displays `[Project] [Active]`.
3. **Given** a dormant catalog tool, **When** viewed, **Then** it displays `[Catalog]` with 0 token footprint.

---

### User Story 2 - Automated Scope Conflict & Shadowing Resolution (Priority: P1) 🎯

As an engineer working in an isolated workspace, I want the system to automatically detect and resolve Global vs Workspace override conflicts, so that disabling a tool globally does not deadlock local projects.

**Why this priority**: ZCode's "User scope overrides Workspace scope" rule prevents local workspaces from activating servers disabled globally.

**Independent Test**: Gating a server ON in a workspace that was dormant globally auto-unblocks the global lock and enables the server locally.

**Acceptance Scenarios**:
1. **Given** a server disabled in global `config.json` (`enabled: false`), **When** activating it via `harness mcp on <server>`, **Then** the global restriction is unblocked and the workspace server connects successfully.
2. **Given** a workspace server awaiting trust, **When** running `harness heal`, **Then** valid SHA-256 declaration digests are automatically computed and registered in `workspace-mcp-trust-v1.json`.

---

### User Story 3 - Extensible Harness Lifecycle (Hooks, Plugins, Subagents) (Priority: P2)

As a maintainer extending the engine, I want a unified domain contract (`UnifiedResource`) so that adding new harness extensions (Hooks, Plugins, Subagents) reuses existing status calculation, token estimation, and display components without refactoring.

**Why this priority**: Guarantees zero code bloat and clean architecture as the system grows.

**Independent Test**: `getUnifiedResources()` maps both skills and MCPs into a normalized structure with `id`, `kind`, `scope`, `globalState`, `workspaceState`, and `tokenCostEstimate`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide `UnifiedResource` interface in `.agent/src/resources.ts` normalizing Skills, MCPs, Hooks, and Plugins.
- **FR-002**: System MUST identify active global user skills across `~/.zcode/skills/`, `~/.claude/skills/`, and `~/.agents/skills/`.
- **FR-003**: System MUST compute accurate injected token load reflecting both Project and Global active resources.
- **FR-004**: System MUST synchronize `.mcp.json` and `.agents/mcp.json` in lockstep bi-directionally.
- **FR-005**: System MUST compute ZCode-compliant SHA-256 declaration digests and auto-grant trust in `~/.zcode/security/workspace-mcp-trust-v1.json`.
