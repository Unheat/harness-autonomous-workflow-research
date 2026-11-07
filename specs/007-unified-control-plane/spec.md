# Feature Specification: Unified Control Plane & Global Governance

**Feature Branch**: `007-unified-control-plane`  
**Created**: 2026-11-06  
**Status**: Ready  
**Input**: User description: "add global mode trực tiếp và cả 3 mcp, skill, subagent để t có thể kiểu tắt global và quản lý đươcj, ngoài ra thêm các chứ năng cần thiết vô ui và cli như xoá hẳn skill, open json file trực tiếp để edit cònig, .... ngoài ra nhiều chức năng có trong cli chx có trong ui, chúng nó nên share cùng 1 logic code trong code structure và chỉ khác ở interface controller thôi,( clean code OOP thing) ngoài ra xem còn cái core j thiếu k"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Direct Global Mode Control across Skills, MCPs, & Subagents (Priority: P1) 🎯 MVP

As a developer working with multiple coding agent harnesses (DeepSeek Harness, Claude Code, Cursor, ZCode, Codex), I want to view and toggle Global Scope directly from the Web UI and CLI for all 3 resource types (Skills, MCPs, Subagents), so that I can govern machine-wide token load without hand-editing user configuration files.

**Why this priority**: Global resource leakage is the #1 cause of context bloat (~8,000+ tokens per session). Without direct global toggles in both UI and CLI, users are forced to manually find and edit dotfiles across `~/.zcode`, `~/.claude`, and `~/.agents`.

**Independent Test**: Can be fully tested by activating a global skill and global MCP, verifying their injection across all harnesses, toggling them OFF via Web UI or CLI, and confirming 0 token injection.

**Acceptance Scenarios**:
1. **Given** a skill active globally in `~/.zcode/skills`, `~/.claude/skills`, or `~/.agents/skills`, **When** toggled OFF globally via Web UI or `harness skill global off <name>`, **Then** symlinks are unlinked from all three global directories (`~/.zcode/skills`, `~/.claude/skills`, `~/.agents/skills` which DSH links to), while preserving the canonical catalog source in `~/.agents/catalog/skills/<name>`.
2. **Given** an MCP server in `~/.zcode/cli/config.json`, **When** toggled in Global mode via Web UI or `harness mcp global <on|off|rm>`, **Then** global configuration is updated immediately without affecting project-specific `.mcp.json`.
3. **Given** subagents in `.agent/agents/` (project) or `~/.agents/agents/` (global), **When** viewed in Web UI or CLI, **Then** their exact scope (`[Global]` vs `[Project]`) is clearly indicated with distinct badges.

---

### User Story 2 - Independent MCP Lifecycle & Effective Scope Status (Priority: P1)

As a developer, I want the Web UI and CLI to enable, disable, and remove MCP servers in Workspace or Global scope using the workflow's shared lifecycle logic, so that resource management remains independent of external tools.

**Why this priority**: A workspace entry can differ from its effective state when a supported global configuration overrides it. The interface must distinguish these states without assuming that an external gateway is involved.

**Independent Test**: Enable and disable a temporary MCP server in workspace configuration, inspect the same state through UI and CLI, and verify global shadowing using isolated configuration fixtures.

**Acceptance Scenarios**:
1. **Given** a workspace MCP with no global override, **When** enabled or disabled through UI or CLI, **Then** its local configuration and displayed state agree.
2. **Given** a disabled global entry overriding a workspace MCP, **When** inspected, **Then** the UI and CLI report the effective blocked state and offer explicit global management.
3. **Given** a configured MCP, **When** removal is requested for a scope, **Then** only that scope's entry is removed; unrelated configuration remains unchanged.

---

### User Story 3 - Subagent Token Shield Governance & Lifecycle (Priority: P1)

As a developer orchestrating subagents (`sdd-worker`, `sdd-reviewer`), I want to toggle Token Shield protection (stripping the `skill` tool from subagent frontmatter) directly from the Web UI and CLI, and manage their lifecycle (create/delete), preventing recursive prompt blowups.

**Why this priority**: Subagents that inherit parent skills duplicate thousands of prompt tokens per execution step and risk infinite recursion. Having one-click Token Shield toggling and deletion ensures subagents stay lightweight.

**Independent Test**: Can be tested by creating a subagent without a token shield, toggling the shield ON via Web UI, verifying `skill` is added to `disallowedTools` in its markdown frontmatter, and verifying the badge changes to `[Shield: Protected ✅]`.

**Acceptance Scenarios**:
1. **Given** a subagent with `Shield: None ⚠️`, **When** the user clicks the shield toggle or runs `harness subagent shield <name> on`, **Then** `skill` is added to `disallowedTools` in the YAML frontmatter.
2. **Given** a subagent with `Shield: Protected ✅`, **When** the user clicks the shield toggle or runs `harness subagent shield <name> off`, **Then** `skill` is removed from `disallowedTools`.
3. **Given** an obsolete subagent, **When** deleted via Web UI or `harness subagent delete <name>`, **Then** the `.md` file is safely deleted after user confirmation.

---

### User Story 4 - In-Dashboard Config Editor & Direct File Inspection (Priority: P2)

As a developer, I want to inspect and edit configuration files (`.mcp.json`, `~/.zcode/cli/config.json`, skill definitions, and subagent markdown files) directly in a web modal or via CLI, with syntax validation before saving, so I do not have to leave my development environment.

**Why this priority**: Context-switching to external text editors to tweak arguments, environment variables, or tool permissions slows down iterative development.

**Independent Test**: Can be tested by loading `.mcp.json` into the editor modal, introducing a JSON syntax typo, clicking Save, confirming the validation error prevents saving, fixing the typo, and confirming the successful write to disk.

**Acceptance Scenarios**:
1. **Given** a config file (`.mcp.json` or `~/.zcode/cli/config.json`), **When** opened via the Web UI edit icon or `harness config read <target>`, **Then** the content is displayed in a formatted editor.
2. **Given** invalid JSON entered by the user, **When** save is requested, **Then** the write is rejected with an explicit syntax error message, preserving disk integrity.
3. **Given** valid content, **When** saved, **Then** the file is atomically written and the dashboard state reloads.

---

### User Story 5 - Permanent Resource Deletion & Catalog Purge (Priority: P2)

As a developer wanting to clean up deprecated skills and subagents, I want an explicit permanent delete action (distinct from non-destructive dormant stashing) across CLI and Web UI.

**Why this priority**: Unused or abandoned skills clutter the catalog and search results. Users need a safe, explicit way to purge them permanently when stashing is no longer desired.

**Independent Test**: Can be tested by creating a temporary skill, verifying its presence in `.agents/skills/`, executing permanent deletion, and confirming both the symlink and source directory are completely removed.

**Acceptance Scenarios**:
1. **Given** a project-private skill, **When** permanent deletion is confirmed via Web UI or `harness skill delete <name> --force`, **Then** the skill folder is removed from both `.agents/skills/` and `.agents/dormant/`.
2. **Given** a central catalog skill, **When** permanent catalog deletion is requested (`harness skill delete <name> --catalog`), **Then** it is purged from `~/.agents/catalog/skills/<name>`.

---

### Edge Cases

- **Corrupted Config Files**: What happens when an existing `.mcp.json` or `config.json` is already corrupted on disk? System returns a safe syntax warning and does not crash the server.
- **DSH Symlink Invalidation**: What happens when a global skill is unlinked while DSH is running? The unlinking removes `~/.agents/skills/<name>`, so DSH's next session scan sees 0 skills without crashing.
- **Subagent Missing Frontmatter**: What happens when a subagent `.md` file has no YAML frontmatter? `SubagentService` initializes valid frontmatter containing `name`, `disallowedTools: [skill]`, and preserves markdown body.
- **Concurrent CLI & Web UI Edits**: What happens if a user toggles an MCP in Web UI while CLI is running? `server.ts` re-reads disk state on every request, ensuring fresh data is always served.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide direct Global Scope toggling for Skills in both CLI and Web UI, ensuring unlinks target `~/.zcode/skills`, `~/.claude/skills`, and `~/.agents/skills`.
- **FR-002**: System MUST provide direct Global Scope toggling for MCP Servers in both CLI and Web UI via `~/.zcode/cli/config.json`.
- **FR-003**: System MUST derive MCP status from supported Workspace and Global configurations, distinguishing configured state from effective state and global shadowing.
- **FR-004**: System MUST support MCP enable, disable, and scoped removal without routing servers through external tools or reading/writing external gateway configuration.
- **FR-005**: System MUST allow toggling Token Shield (`disallowedTools: [skill]`) on subagents directly via Web UI and CLI.
- **FR-006**: System MUST provide safe in-browser and CLI configuration viewing and editing with pre-write syntax validation for JSON and YAML.
- **FR-007**: System MUST support permanent deletion of skills and subagents with user confirmation.
- **FR-008**: System MUST implement a decoupled Domain Service Layer (`SkillService`, `McpService`, `SubagentService`, `ConfigService`, `DoctorService`) shared identically by both CLI (`harness.ts`) and Web UI (`server.ts`).

### Key Entities

- **ConfigTarget**: Enum identifying managed configuration files (`workspace-mcp`, `zcode-global`, `claude-settings`, `skill`, `subagent`).
- **EffectiveMcpInfo**: MCP scope resolution with workspace state, global state, effective active state, and shadowing reason.
- **SubagentInfo**: Model representing a subagent (`name`, `description`, `scope`, `filePath`, `hasTokenShield`, `disallowedTools`, `tools`).
- **UnifiedResource**: Common domain contract abstracting Skills, MCPs, and Subagents.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% feature parity between CLI commands and Web UI actions for all resource management workflows.
- **SC-002**: MCP lifecycle operations preserve unrelated entries and external-tool configuration; UI and CLI resolve the same effective state from identical fixtures.
- **SC-003**: Invalid JSON/YAML configurations entered in the editor modal fail with a validation message 100% of the time without touching the file on disk.
- **SC-004**: All domain services maintain < 200 lines per file adhering to Clean Code standards.
- **SC-005**: 100% passing automated unit tests covering normal operations, corrupt input, and edge cases.

---

## Assumptions

- Bun is installed and available as the runtime execution engine.
- DeepSeek Harness symlinks `~/.dsh/skills` to `~/.agents/skills/`.
## Scope Boundary

External tools used independently for experiments are not workflow dependencies. Gateway discovery, compression, routing, configuration management, and gateway-specific metrics are outside this feature. The workflow MUST NOT infer external routing from a disabled MCP entry.
