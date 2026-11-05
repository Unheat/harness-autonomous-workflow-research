# Feature Specification: Universal Cross-Harness Agentic Workflow Engine

**Feature Branch**: `001-universal-workflow-engine`

**Created**: 2026-11-02

**Status**: Active / Implementation

**Architecture Blueprint**: [architecture.md](architecture.md)

**Input**: User specification: "Build a portable, open-standard workflow architecture operating across Claude Code, ZCode, Codex, DeepSeek Harness, Cursor, and OpenCode with 3-layer skill enforcement, subagent tool-stripping context protection, TDD, and dual-gate SDD review."

---

## Architecture & Donor Synthesis

This workflow synthesizes 5 core open-source donor projects into an integrated stack (see [architecture.md](architecture.md) for full matrix):
1. **GitHub Spec Kit** (`github/spec-kit`): Planning, constitution, feature specs, and bug diagnostics.
2. **Superpowers** (`obra/superpowers`): Subagent-Driven Development (SDD) core loop, task briefs, and two-stage review.
3. **Everything Claude Code (ECC)** (`affaan-m/everything-claude-code`): PreToolUse guards and SessionStart auto-healing hooks.
4. **DeepSeek Harness (DSH)** (`deepseek-ai/dsh`): Unattended issue-to-PR outer runner and git worktree isolation.
5. **GEAR** (`rsi-gear/gear`): Benchmark evaluation metrics (pass rates, token costs, retry churn).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Harness Skill & Subagent Single Source of Truth (Priority: P1) 🎯 MVP

As an AI engineer working across multiple coding harnesses (Claude Code, ZCode, Codex, DeepSeek Harness, Cursor), I want all skills and subagent definitions stored canonically in `.agents/skills/` and `.agent/agents/` with automated symlink projection, so that I never suffer from duplicated files, stale edits, or broken symlinks across tools.

**Why this priority**: Solves the fundamental fragmentation of AI coding harnesses at the filesystem level. Without this single source of truth, files drift, updates fail, and harnesses break.

**Independent Test**: Install a skill via Vercel `skills` CLI using `-a universal`; verify that Claude Code, ZCode, Cursor, and DSH immediately see the identical skill file without manual copying.

**Acceptance Scenarios**:
1. **Given** a new skill is installed into `.agents/skills/`, **When** any supported harness (Claude, ZCode, Cursor, DSH) accesses its skills directory, **Then** the kernel resolves the symlink to `.agents/skills/` identically.
2. **Given** an adapter directory (`.claude/skills` or `.zcode/skills`) is accidentally created as a physical directory, **When** `.agent/hooks/auto-heal-symlinks.sh` runs, **Then** existing files are migrated into `.agents/skills/` and the directory is replaced with a relative symlink.

---

### User Story 2 - Subagent Context Stripping & Token Shield (Priority: P1) 🎯 MVP

As an orchestrator coordinating subagents, I want implementer subagents (`sdd-worker`) to run with the `Skill` tool explicitly stripped (`disallowedTools: Skill`), so that 30-50 global skill descriptions (7,000+ tokens) are not dumped into the subagent's prompt, preserving context capacity and reasoning accuracy.

**Why this priority**: Eliminates context pollution that degrades model reasoning and inflates token cost by thousands of tokens on every subagent turn.

**Independent Test**: Inspect the system prompt / tool declarations received by `sdd-worker`; verify that zero skill preview tokens are injected and only core execution tools (`Read`, `Edit`, `Write`, `Bash`) are active.

**Acceptance Scenarios**:
1. **Given** 40+ skills installed in `~/.agents/skills/`, **When** the coordinator dispatches an `sdd-worker` subagent, **Then** the worker has zero skill catalog descriptions in its turn prompt.
2. **Given** an implementer needs domain guidance, **When** dispatched, **Then** the coordinator provides relevant paths in `docs/references/` for on-demand file reading instead of full-catalog preview injection.

---

### User Story 3 - Task Intake & Worktree Isolation (Priority: P2)

As a developer initiating a complex task or issue, I want the system to automatically isolate the task inside a dedicated Git worktree (`.worktrees/<branch-name>`), so that execution runs without polluting the main working directory or interfering with other concurrent sessions.

**Why this priority**: Prevents destructive accidental changes, git conflict locks, and context bleed across concurrent task branches.

**Independent Test**: Run `.agent/scripts/run-task.sh <task-id>`; verify a new branch and worktree under `.worktrees/` is checked out with project dependencies ready.

**Acceptance Scenarios**:
1. **Given** a new task brief or issue, **When** task execution begins, **Then** the system creates a worktree under `.worktrees/<branch-name>`, configures git exclusions, and establishes test baselines.
2. **Given** an existing worktree, **When** execution settles or is aborted, **Then** the worktree is cleanly pruned or committed as a clean PR branch.

---

### User Story 4 - Independent Dual-Gate Subagent Review & Circuit Breaker (Priority: P2)

As an engineering lead, I want every completed task evaluated by an independent, read-only reviewer subagent (`sdd-reviewer`) verifying spec compliance and code quality before committing, bounded by a 3-round retry circuit breaker, so that bad code never reaches the main branch and agents do not loop indefinitely.

**Why this priority**: Guarantees code correctness, catches regression early, and prevents infinite ping-pong loops between implementer and reviewer.

**Independent Test**: Provide an implementation with a failing edge case or unauthorized file edit; verify `sdd-reviewer` rejects with exact `file_path:line_number` evidence and triggers an implementer fix cycle up to 3 times before halting for human intervention.

**Acceptance Scenarios**:
1. **Given** a completed task brief, **When** `sdd-reviewer` audits the diff, **Then** it evaluates Gate 1 (Spec Compliance) and Gate 2 (Code Quality), outputting `APPROVED` or structured `REVISE` findings.
2. **Given** 3 consecutive failed review rounds, **When** the circuit breaker trips, **Then** the system pauses execution and surfaces a single structured question for user escalation.

---

### User Story 5 - Compound Markdown Memory & Solution Recall (Priority: P3)

As a continuous AI development engine, I want verified root causes and non-obvious fixes automatically documented in `docs/solutions/<topic>.md` and consulted during future planning, so that future sessions never repeat identical mistakes.

**Why this priority**: Builds long-term institutional codebase knowledge that persists across sessions and across different agent harnesses without requiring proprietary vector databases.

**Independent Test**: Resolve a non-trivial bug; verify a solution document is generated in `docs/solutions/`. In a subsequent session, verify that the planner queries `docs/solutions/` and incorporates known fixes into its plan.

**Acceptance Scenarios**:
1. **Given** a successfully resolved and verified debugging session, **When** the task closes, **Then** `docs/solutions/<topic>.md` is created with trigger, root cause, verified fix, and key file anchors.
2. **Given** existing solution notes in `docs/solutions/`, **When** an agent plans work in a related subsystem, **Then** it reads the solution note and applies the verified pattern.

---

### User Story 6 - Two-Tier Skill Catalog & Workspace Localization (Priority: P1) 🎯

As a developer working across multiple repositories, I want a central catalog of 40+ skills in `~/.agents/skills/` that remains dormant globally, and the ability to inherit specific skills into my active workspace via symlinks, so that unrelated workspaces suffer zero context bloat.

**Why this priority**: Eliminates the global skill dump across all projects while keeping an organized library on the machine.

**Independent Test**: Run `harness skill add <name>`; verify the symlink `.agents/skills/<name> -> ~/.agents/skills/<name>` is created and discovered by all harnesses without copying files.

**Acceptance Scenarios**:
1. **Given** 40+ skills in `~/.agents/skills/`, **When** an unlinked workspace is opened, **Then** 0 global skill preview tokens are injected.
2. **Given** a project requiring `impeccable`, **When** running `harness skill add impeccable`, **Then** a symlink is created in `.agents/skills/impeccable`.
3. **Given** `harness skill remove impeccable`, **Then** only the symlink is removed; the catalog source file remains untouched.
4. **Given** `harness skill create <name>`, **Then** a project-private skill is scaffolded in `.agents/skills/<name>/SKILL.md` and strictly prohibited from exporting to global.

---

### User Story 7 - Independent Per-Project MCP Scoping & Dormancy (Priority: P1) 🎯

As an engineer using heavy MCP servers (e.g. `rea` with 100+ tools), I want heavy servers kept out of global config, declared in local `.mcp.json`, and togglable per workspace without cross-project interference.

**Why this priority**: Prevents massive 20,000+ token floods from heavy MCP servers across unrelated projects and eliminates global shadowing conflicts.

**Independent Test**: Toggle an MCP server in Project A; verify Project B's `.mcp.json` remains completely unaffected.

**Acceptance Scenarios**:
1. **Given** `rea` configured in Project A and Project B, **When** Project A sets `"enabled": false` via `harness mcp off rea`, **Then** Project A injects 0 `rea` tools while Project B continues running `rea` normally.
2. **Given** `harness mcp add <name> <command>`, **Then** the server is registered in `~/.agents/catalog/mcps.json` and activated in the local project's `.mcp.json`.
3. **Given** `harness clean-global`, **Then** heavy servers in `~/.zcode/cli/config.json` are sanitized to dormant state so global never shadows workspace overrides.

---

### User Story 8 - 9Router-Style Zero-Prefix CLI & Interactive REPL (Priority: P1) 🎯

As a vibe coder, I want a global CLI command `harness` (or short alias `agn`) installed in `$PATH` that launches an interactive shell where I can type commands directly without path prefixes (`./.agent/scripts/...`).

**Why this priority**: Drastically lowers cognitive load and command friction for developers and coding agents.

**Independent Test**: Type `harness start` in any directory; verify interactive prompt `[harness: <workspace>] > ` accepts zero-prefix commands.

**Acceptance Scenarios**:
1. **Given** terminal anywhere on the machine, **When** typing `harness start` (or bare `harness`), **Then** an interactive REPL opens with prompt `[harness: <workspace>] > `.
2. **Given** inside the REPL, **When** typing `status`, `catalog`, `skill add <name>`, `mcp on <name>`, `doctor`, `ui`, `exit`, **Then** commands execute with zero prefix.
3. **Given** headless automation, **When** running `harness status` or `agn mcp off rea`, **Then** commands execute directly with exit code 0.

---

### User Story 9 - Zero-AI-Slop Vibe Coder Web Dashboard (Priority: P2)

As a developer who prefers visual controls, I want a local dashboard served on port 20888 with clean typography, token meters, and instant toggle switches.

**Why this priority**: Gives developers a 1-click visual control center without bloated AI-slop graphics or cloud subscriptions.

**Independent Test**: Run `harness ui`; verify web interface loads at `http://localhost:20888`, displays active token meters, and toggles update disk state immediately.

---

### User Story 10 - Zero-Config Project Scaffolding & Edge Cases (Priority: P2)

As an engineer starting a new repository, I want `harness init` to scaffold the complete 3-layer cross-harness architecture in 1 second.

**Acceptance Scenarios**:
1. **Given** an empty directory, **When** running `harness init`, **Then** `.agents/skills`, `.agent/agents`, adapter symlinks for Claude, ZCode, Cursor, DSH, Codex, and `.mcp.json` are generated automatically.
2. **Given** broken or dangling symlinks, **When** running `harness heal` (or `auto-heal-symlinks.sh`), **Then** missing links are reconciled cleanly.
3. **Given** running from nested subdirectories, **When** invoking `harness`, **Then** the workspace root is auto-detected by ascending parent directories.

---

### User Story 11 - Impeccable Design System Integration (Priority: P2)

As a frontend designer/developer, I want `pbakaus/impeccable` available in the central catalog (`~/.agents/skills/impeccable`) so any workspace can activate it via `harness skill add impeccable`.

---

### User Story 12 - 100% Strongly-Typed TypeScript Architecture (Priority: P1) 🎯

As a maintainer of this tool, I want the codebase written in clean, strongly-typed TypeScript executed natively via Bun, eliminating runtime `TypeError` and `undefined` bugs.

**Acceptance Scenarios**:
1. Core modules in `.agent/src/*.ts` have zero `any` types and stay < 200 lines per file.
2. Test suite in `tests/*.test.ts` runs natively via `bun test` in < 50ms with 100% pass rate.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain `.agents/skills/` (project) and `~/.agents/skills/` (global) as the sole canonical source of truth for all agent skills.
- **FR-002**: Adapter folders (`.claude/skills`, `.zcode/skills`, `.cursor/skills`, `.dsh/skills`) MUST be directory symlinks pointing to `.agents/skills/`.
- **FR-003**: System MUST strip the `Skill` tool from `sdd-worker` subagents using `disallowedTools: Skill` to protect against token pollution.
- **FR-004**: System MUST maintain an independent, read-only reviewer subagent (`sdd-reviewer`) with `Edit`, `Write`, `Skill`, and `Agent` tools disallowed.
- **FR-005**: All code modifications MUST adhere to Test-Driven Development (TDD) with tests written, failing (RED), and passing (GREEN) prior to review approval.
- **FR-006**: Reviewer subagents MUST enforce dual-gate criteria (Spec Compliance + Code Quality) with evidence citations formatted as `file_path:line_number`.
- **FR-007**: System MUST provide a PreToolUse guard hook (`guard-skills.py`) intercepting unauthorized writes to adapter directories and exiting with status 2 to abort the operation.
- **FR-008**: System MUST provide a SessionStart hook (`auto-heal-symlinks.sh`) repairing missing or broken symlinks on startup.
- **FR-009**: System MUST support GitHub Spec Kit (`.specify/`) as the standard Spec-Driven Development framework for project constitution, specifications, plans, and tasks.
- **FR-010**: System MUST enforce a 3-tier task routing hierarchy: Tier 1 (Direct TDD), Tier 2 (Spec Kit Bug Extension), Tier 3 (Spec Kit Feature SDD).
- **FR-011**: System MUST provide 3-tier hybrid search (Prefix boost x10, Description keyword boost x3, Typo tolerance) powered by offline MiniSearch in the Web UI dashboard.
- **FR-011**: System MUST provide automated worktree provisioning under `.worktrees/<branch-name>` for multi-task branches.
- **FR-012**: System MUST capture verified fixes in `docs/solutions/<topic>.md` and require planners to consult prior notes before executing tasks.
- **FR-013**: System MUST provide a global CLI (`harness` / `agn`) with an interactive REPL shell (`harness start`) and headless direct execution.
- **FR-014**: System MUST provide a Two-Tier Catalog architecture where global catalog (`~/.agents/skills/` and `~/.agents/catalog/mcps.json`) remains dormant by default.
- **FR-015**: System MUST support workspace skill inheritance via symlinks (`harness skill add <name>`) and safe unlinking (`harness skill remove <name>`).
- **FR-016**: System MUST support project-private skill creation (`harness skill create <name>`) in `.agents/skills/<name>/SKILL.md` isolated from global.
- **FR-017**: System MUST support per-workspace MCP scoping and dormancy (`harness mcp on/off <server>`) using `.mcp.json`.
- **FR-018**: System MUST provide `harness init` to scaffold the 3-layer architecture for new repositories in 1 second.
- **FR-019**: System MUST provide a zero-slop local Web UI dashboard (`harness ui`) on port 20888 with real-time token metrics and toggle switches.
- **FR-020**: System MUST implement all CLI engine components in modular TypeScript (<200 lines per file) tested via `bun test`.

---

## Edge Cases

- **Windows or filesystems without symlink support**: `auto-heal-symlinks.sh` falls back to junction points or warns with actionable instructions.
- **Reviewer-Implementer stalemate**: The 3-round circuit breaker halts the loop, aggregates previous findings, and asks the human user for a definitive ruling.
- **Empty or missing tests**: `sdd-reviewer` rejects any feature implementation that lacks automated test suites or execution logs.
- **Global Shadowing Conflict**: When a server is defined in global ZCode config as enabled, `harness clean-global` resets it to dormant so local workspace configs take effect.
- **Subdirectory Execution**: Running `harness` from deeply nested child directories automatically resolves the nearest project root.
- **Port Collision**: If port 20888 is occupied, the dashboard server automatically probes the next available port.

---

## Success Criteria *(measurable)*

- **SC-001**: 100% elimination of duplicate skill files across all installed coding harnesses in the project.
- **SC-002**: 7,000+ token reduction per subagent turn for `sdd-worker` compared to default subagent dispatch.
- **SC-003**: 0% regression rate on tasks passing the dual-gate `sdd-reviewer` verification pass.
- **SC-004**: 100% compliance with Spec Kit standards (`constitution.md`, `spec.md`, `plan.md`, `tasks.md`).
