# Feature Specification: Universal Cross-Harness Adaptive Workflow Engine

**Feature Branch**: `001-universal-workflow-engine`  
**Created**: 2026-11-02 | **Updated**: 2026-11-05  
**Status**: Active / Implementation  
**Architecture Blueprint**: [architecture.md](architecture.md) & [universal-adaptive-workflow-architecture.md](../../docs/references/universal-adaptive-workflow-architecture.md)

---

## 1. System Vision & Architecture

The **Universal Adaptive Workflow Engine** is a portable, cross-harness autonomous development system designed for DeepSeek Harness (DSH) and multi-agent coding environments. It provides:
1. **2-Level Recursive Subagent Topology (Max Depth = 2)**: Level 0 (CEO/PM Orchestrator) $\to$ Level 1 (Worktree Milestone Lead) $\to$ Level 2 (Specialized Leaf Helpers).
2. **Cognitive Intent Router**: Evaluates task ambiguity to automatically switch between **Route A (CEO/PM Broad Discovery & Gaps Tracker)** and **Route B (Fast-Track Direct Execution)**.
3. **Unified Fail-to-Pass (F2P) Lifecycle**: A single universal engineering cycle (`RED` $\to$ `Grounded Plan` $\to$ `GREEN` $\to$ `P2P Regression Gate`) with **Early Pruning Judges** (`judge-repro`, `judge-plan`, `judge-pr`).
4. **Dynamic Project Scaffolding**: Archetype routing for SWE (code contracts, test suites) and Non-SWE (e.g. Game Design GDD, visual-judge, asset validators).
5. **Self-Adaptive Triad**: Hindsight memory integration, Harness² Propose-Probe-Compose optimization on DSH, and plug-and-play L2 subagents.
6. **Two-Phase Adaptation Boundary**: Runtime is strictly locked during active task execution; meta-adaptation occurs offline during dedicated "Dreaming" sessions.

---

## 2. User Scenarios & Acceptance Criteria *(mandatory)*

### User Story 1 - 2-Level Recursive Subagent Topology with Token Shields (Priority: P1) 🎯 MVP

As an engineering lead, I want a 2-level subagent hierarchy where Level 0 delegates milestones to Level 1 worktree workers, and Level 1 can call Level 2 leaf helpers (e.g., `explore-code`, `research`, `frontend-design`), while Level 2 is strictly forbidden from spawning further agents (`disallowedTools: Agent`), so that recursion never explodes into infinite concurrency loops.

**Why this priority**: Eliminates token starvation, rate limiting (HTTP 429), and uncontrolled recursive agent sprawl.

**Acceptance Scenarios**:
1. **Given** a Level 0 orchestrator, **When** dispatching a milestone, **Then** it delegates to an L1 worker inside an isolated Git worktree (`.worktrees/<feature>-<lane>`) using a focused Task Brief.
2. **Given** an L1 worker executing a task, **When** it needs localized code discovery or web research, **Then** it can invoke a Level 2 helper (max depth 2).
3. **Given** an L2 leaf helper, **When** running, **Then** tool `Agent` and tool `Skill` are stripped via `disallowedTools: [Agent, Skill]`, terminating further recursion.
4. **Given** L0 concurrency manager, **When** tasks run, **Then** `max_parallel_l1 <= 2` and L2 helpers within an L1 lane execute serially.

---

### User Story 2 - Cognitive Intent Router (CEO/PM vs. Fast-Track) (Priority: P1) 🎯 MVP

As a developer issuing high-level product goals (e.g., "port an application like Photoshop" or "build this workflow engine"), I want Level 0 to detect ambiguity and automatically activate **Route A (CEO/PM Mode)** to autonomously explore boundaries, build a gap matrix (`docs/gaps.md`), and order milestones, while narrow requests automatically use **Route B (Fast-Track Mode)** without bureaucratic overhead.

**Why this priority**: Relieves the human developer from having to manually perform system thinking, feature gap decomposition, and hand-holding for every sub-step.

**Acceptance Scenarios**:
1. **Given** a high-ambiguity or system-level prompt, **When** L0 inspects the goal, **Then** it selects Route A, creates `docs/gaps.md` and `docs/target-parity.md`, identifies unmentioned edge cases, and arranges milestones by topological dependency.
2. **Given** a narrow bug fix or specific 1-file modification, **When** L0 inspects the goal, **Then** it selects Route B, skips heavy spec generation, and dispatches directly to an L1 TDD worktree.

---

### User Story 3 - Unified F2P Lifecycle & Early Pruning Gates (Priority: P1) 🎯 MVP

As an orchestrator evaluating candidate solutions, I want all tasks (bug fixes and new features) to follow a single Fail-to-Pass (F2P) verification cycle with early pruning gates (`judge-repro`, `judge-plan`, `judge-pr`), so that flawed plans and shallow symptom patches are rejected immediately before burning code-generation tokens.

**Why this priority**: Prevents agent hallucinations, shallow monkey-patching, and regression by enforcing proof of failure before code is written.

**Acceptance Scenarios**:
1. **Given** a bug report, **When** L1 begins execution, **Then** `judge-repro` checks that a minimal test reproduces the reported defect and exits with code 1 (`RED`).
2. **Given** a candidate plan, **When** evaluated by `judge-plan`, **Then** the plan is checked against CodePath rubrics (`grounded-cause`, `bounded-scope`, `startable`, `decisive-test`); if rejected, execution halts and L1 must revise the plan.
3. **Given** code implementation complete, **When** evaluated by `judge-pr`, **Then** `pr-precheck` verifies `plan-fidelity`, clean diffs (no debug prints or dead code), and verifies that all existing test suites remain green (`P2P`).
4. **Given** an unexpected blocking bug encountered during feature implementation, **Then** L1 is permitted to write an isolated repro test, fix the prerequisite, and document the deviation in the PR notes without failing scope checks.

---

### User Story 4 - Dynamic Project Scaffolding & Archetype Routing (Priority: P2)

As a developer initializing a new project (`workflow init [archetype]`), I want the engine to dynamically scaffold the appropriate workflow gates, subagents, and templates depending on whether the project is **SWE** (code compilers, TDD, PR checks) or **Non-SWE** (e.g., Game Design GDD, visual judges, math balancers).

**Why this priority**: Expands the workflow engine beyond typical web development to game design, creative writing, and research tasks.

**Acceptance Scenarios**:
1. **Given** `workflow init swe`, **Then** GitHub Spec Kit (`.specify/`), CodePath judges (`plan-check`, `pr-precheck`), and `sdd-worker` configs are scaffolded.
2. **Given** `workflow init game-design`, **Then** Game Design Document (GDD) trackers, asset validation scripts, visual screenshot judges, and non-code subagents (`game-designer`, `lore-keeper`) are scaffolded.

---

### User Story 5 - Self-Adaptive Triad & Two-Phase Adaptation Boundary (Priority: P2)

As a long-running agent platform, I want memory (Hindsight), harness scaffolding (Harness² on DSH), and L2 subagents to adapt continuously based on empirical evidence, while keeping runtime strictly locked during active task execution to prevent self-degrading shortcut exploits.

**Why this priority**: Enables agents to become smarter over time across sessions while preventing models from relaxing their own grading rubrics.

**Acceptance Scenarios**:
1. **Given** an active milestone execution, **When** L1 is running, **Then** all grading rubrics (`rubric.md`), project constitutions, and gate criteria are **Immutable and Read-Only**. L1 writes failure telemetry to `.agent/memory/inbox/<session>.json`.
2. **Given** milestone completion or an idle trigger, **When** running a "Dreaming" session (`workflow dream`), **Then** an offline review subagent ingests the inbox, deduplicates findings, and distills verified causal lessons into `docs/solutions/<topic>.md`.
3. **Given** repeated execution churn on DSH, **When** Harness² Propose-Probe-Compose runs, **Then** candidate prompt/tool configurations are evaluated on parallel worktrees, and winning invariant configurations are merged into DSH presets.

---

## 3. Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST enforce a maximum subagent recursion depth of 2 (Level 0 $\to$ Level 1 $\to$ Level 2).
- **FR-002**: All Level 2 leaf helper subagents MUST have `Agent` and `Skill` stripped (`disallowedTools: [Agent, Skill]`).
- **FR-003**: System MUST execute all Level 1 milestone implementations in isolated Git worktrees (`.worktrees/<feature>-<lane>`).
- **FR-004**: Level 0 MUST include a Cognitive Intent Router classifying input goals into Route A (CEO/PM Broad Discovery) or Route B (Fast-Track Execution).
- **FR-005**: All code modifications MUST satisfy the Unified F2P Lifecycle: verifiable RED test before implementation, verifiable GREEN after implementation, and 100% PASS on existing regression suites.
- **FR-006**: System MUST enforce early pruning gates:
  - Gate 1: `judge-repro` (Exit code $\ne 0$ proving defect/new contract).
  - Gate 2: `judge-plan` (Validates `grounded-cause`, `bounded-scope`, `startable`, `decisive-test`).
  - Gate 3: `judge-pr` (Validates `plan-fidelity`, `clean-diff`, zero review debris).
- **FR-007**: System MUST keep evaluation rubrics and constitutions immutable during task execution; self-adaptation is restricted to offline dreaming sessions.
- **FR-008**: System MUST support dynamic archetype scaffolding for SWE and Non-SWE (e.g. Game Design).
- **FR-009**: System MUST integrate Hindsight memory via MCP for session recording and causal retrieval.
- **FR-010**: System MUST integrate Google Harness² / `@xisnn/harness2-dsh` for Propose-Probe-Compose scaffolding adaptation on DeepSeek Harness.
- **FR-011**: System MUST support plug-and-play L2 subagent installation from external repositories without altering L0/L1 core contracts.
- **FR-012**: System MUST maintain `.agents/skills` (local) and `~/.agents/skills` (catalog) with single directory symlinks and zero-token global dormancy.

---

## 4. Success Criteria *(measurable)*

- **SC-001**: Zero infinite recursion loops (100% compliance with Max Depth = 2).
- **SC-002**: $\ge 80\%$ reduction in wasted implementation tokens by pruning flawed plans at Gate 1/2 instead of PR review.
- **SC-003**: 0% regression rate on tasks passing Gate 3 (`judge-pr`).
- **SC-004**: Complete portability across DeepSeek Harness (DSH), Claude Code, ZCode, Cursor, and Codex CLI.
