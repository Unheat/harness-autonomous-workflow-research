# Feature Specification: Subagent Lifecycle & Token Shield Governance

**Feature Branch**: `004-subagent-management`
**Created**: 2026-11-05
**Status**: Ready
**Input**: Subagent cross-harness architecture (Claude Code, ZCode, Cursor, DSH, Codex, OpenCode), Token Shield auditing, and Global vs Project agent management.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cross-Harness Subagent Parity (Priority: P1) 🎯

As a developer configuring subagents (`sdd-worker`, `explore-code`, `research`), I want all major coding harnesses (Claude Code, ZCode, DeepSeek Harness, Codex, OpenCode) to read from a single shared configuration format, so I don't have to duplicate prompt manifests across 5 different tools.

**Why this priority**: Prevents configuration drift and ensures all models share the exact same prompt guidelines and permission boundaries.

**Independent Test**: Define a subagent in `.agent/agents/my-worker.md`; verify it is discovered across `.claude/agents`, `.zcode/agents`, `.dsh/agents`, `.codex/agents`, and `.opencode/agents`.

**Acceptance Scenarios**:
1. **Given** subagents in `.agent/agents/` (e.g. `sdd-worker.md`, `sdd-reviewer.md`), **When** inspected via CLI or UI, **Then** they are recognized as `[Project]` subagents with their tools and token shield status.
2. **Given** global subagents in `~/.zcode/agents/` (e.g. `explore-code.md`, `research.md`), **When** inspected, **Then** they are recognized as `[Global]` subagents available across all workspaces.

---

### User Story 2 - Automated Token Shield Verification (Priority: P1) 🎯

As an engineer concerned with token costs, I want the system to audit subagent manifests and verify that worker agents strip the `Skill` tool (`disallowedTools: Skill`), so subagents never leak 8,000–10,000 tokens of global skill previews into their context windows.

**Why this priority**: Eliminates the largest source of token waste in agentic workflows (subagent context pollution).

**Independent Test**: Run `harness doctor`; verify subagents missing `disallowedTools: Skill` are flagged with actionable remediation.

**Acceptance Scenarios**:
1. **Given** `sdd-worker.md` with `disallowedTools: Skill`, **When** audited, **Then** `hasTokenShield` evaluates to `true` (Protected ✅).
2. **Given** a subagent without tool stripping, **When** audited, **Then** `doctor` warns of potential token leakage.

---

### User Story 3 - Subagent Management in CLI & Dashboard (Priority: P2)

As a developer monitoring agent capabilities, I want to inspect and view active subagents in both `harness status` / `harness agent list` and the local Web Dashboard (`http://localhost:20888`), so I have complete visibility over worker topology.

**Why this priority**: Full observability into what agents exist, what tools they are permitted to use, and whether they are protected.

**Independent Test**: Run `harness agent list`; verify all global and project subagents are printed with their allowed/disallowed tools.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain `.agent/agents/` as the single canonical source of truth for project subagents.
- **FR-002**: System MUST project directory symlinks for `.claude/agents`, `.zcode/agents`, `.dsh/agents`, `.codex/agents`, and `.opencode/agents` pointing to `../.agent/agents`.
- **FR-003**: System MUST provide `.agent/src/subagents.ts` parsing YAML frontmatter (`name`, `description`, `tools`, `disallowedTools`).
- **FR-004**: System MUST discover global subagents from `~/.zcode/agents/` and project subagents from `.agent/agents/`.
- **FR-005**: System MUST verify Token Shield compliance (`disallowedTools: Skill`).
- **FR-006**: CLI MUST provide `harness agent list` command displaying subagent scope and tools.
