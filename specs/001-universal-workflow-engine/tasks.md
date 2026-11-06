# Tasks: Universal Cross-Harness Adaptive Workflow Engine

**Input**: Design documents from `specs/001-universal-workflow-engine/`  
**Architecture Blueprint**: [architecture.md](architecture.md) & [universal-adaptive-workflow-architecture.md](../../docs/references/universal-adaptive-workflow-architecture.md)  
**Prerequisites**: `spec.md`, `plan.md`, `architecture.md`, `.specify/memory/constitution.md`

> **Progressive Elaboration Note**: This task checklist follows rolling-wave milestones. Future milestones remain high-level placeholders and are elaborated into granular, testable tasks only when their preceding milestone passes verification.

---

## Milestone 1: Foundational Baseline & Canonical Storage (Completed) 🎯

**Objective**: Establish canonical `.agents/skills` Single Source of Truth, OS symlink projection, and initial token shield.

- [x] T001 Establish canonical Single Source of Truth in `.agents/skills` and `.agent/agents`, verified by `manage.sh`
- [x] T002 Configure universal directory symlinks for `.claude/skills`, `.zcode/skills`, `.cursor/skills`, and `.dsh/skills`
- [x] T003 Implement initial subagent context shield via tool stripping (`disallowedTools: Skill`) in `.agent/agents/sdd-worker.md`
- [x] T004 Implement initial independent reviewer configuration in `.agent/agents/sdd-reviewer.md`
- [x] T005 Install official Vercel `skills` CLI globally and document `-a universal` convention in `AGENTS.md`
- [x] T006 Implement 3-layer automated enforcement (`auto-heal-symlinks.sh`, `guard-skills.py`, and `AGENTS.md`)
- [x] T007 Clean up global duplicate skills in `~/.claude/skills` and `~/.zcode/skills`
- [x] T008 Migrate MCP servers and skills to DeepSeek Harness (`~/.dsh/cordis.patch.yml`)

---

## Milestone 2: Spec Kit Integration & Architecture Consensus (Completed) 🎯

**Objective**: Standardize Spec-Driven Development using GitHub Spec Kit, formalize donor decomposition, and define end-to-end data flow.

- [x] T009 Purge legacy OpenSpec CLI binary, config, and skills from computer and repository
- [x] T010 Install GitHub Spec Kit CLI (`specify-cli`) via `uv tool install`
- [x] T011 Initialize Spec Kit via `specify init --here --integration claude --allow-symlinks`
- [x] T012 Ratify project constitution in `.specify/memory/constitution.md`
- [x] T013 Author feature specification in `specs/001-universal-workflow-engine/spec.md`
- [x] T014 Author technical implementation plan in `specs/001-universal-workflow-engine/plan.md`
- [x] T015 Author architecture blueprint in `specs/001-universal-workflow-engine/architecture.md`
- [x] T016 Formalize Complete Adaptive Architecture & 2-Level Subagent Spec in `docs/references/universal-adaptive-workflow-architecture.md`

---

## Milestone 3: Early Pruning Gates & Unified F2P Lifecycle (Active Next) 🎯

**Objective**: Port CodePath rubrics into deterministic, exit-code-driven early pruning judges preventing shallow fixes and review debris.

- [ ] T017 [P] Create `.agent/judges/` and vendor CodePath evaluation rubrics (`rubrics/plan.md`, `rubrics/repro.md`, `rubrics/pr.md`) as immutable contracts
- [ ] T018 Implement `judge-repro.sh`: Gate 1 for bugs (verifies exit code $\ne 0$ proving failure RED) and acceptance test verification for features
- [ ] T019 Implement `judge-plan.sh`: Gate 2 early pruning check (evaluates `grounded-cause`, `bounded-scope`, `startable`, `decisive-test`)
- [ ] T020 Implement `judge-pr.sh`: Gate 3 final check (evaluates `plan-fidelity`, `clean-diff`, zero review debris, and full regression pass)
- [ ] T021 Add automated test coverage in `tests/judges.test.ts` verifying judge verdicts on sample pass/fail diffs and plans

---

## Milestone 4: 2-Level Subagent Topology & Worktree Feature Runner (Active Next)

**Objective**: Implement strictly bounded 2-level recursion (Max Depth = 2) with token shields and worktree isolation.

- [ ] T022 [P] Vendor core SDD templates (`implementer-prompt.md`, `task-reviewer-prompt.md`) into `.agent/templates/sdd/` with Token Shield headers
- [ ] T023 Configure Level 2 leaf helper subagents (`explore-code`, `research`, `frontend-design`) strictly enforcing `disallowedTools: [Agent, Skill]`
- [ ] T024 Implement `.agent/scripts/run-task.sh`: Autonomous L1 worktree feature runner provisioning `.worktrees/<feature>-<lane>`
- [ ] T025 Implement 3-round retry circuit breaker in the L1 review loop before escalating to human

---

## Milestone 5: Level 0 CEO System Thinking & Paperclip Fork Control Plane

**Objective**: Fork Paperclip for the Web Dashboard Control Plane, equip Level 0 with CEO/PM system thinking, and connect to L1 worktrees.

- [ ] T026 Fork `paperclipai/paperclip`, strip financial/cent-level budget overhead, and configure embedded database runtime
- [ ] T027 Implement L0 CEO Cognitive Intent Router classifying goals into **Route A (CEO/PM Broad Discovery & Gaps Matrix)** or **Route B (Fast-Track)**
- [ ] T028 Implement Paperclip adapter enhancement: inject Git Worktree isolation (`.worktrees/`) and Token Shield (`disallowedTools: [Skill, Agent]`) into `claude_local` and `dsh_local`
- [ ] T029 Implement Topological Dependency Sorting and Concurrency Throttling (`max_parallel_l1 = 2`, serial L2 helpers) in L0 coordinator
- [ ] T030 Implement `workflow init [archetype]` dynamic scaffolding (supporting `swe`, `game-design`, and `research`)

---

## Milestone 6: Self-Adaptive Triad (Hindsight Memory & Harness² on DSH)

**Objective**: Enable autonomous memory compounding and harness self-optimization with locked runtime boundaries.

- [ ] T030 Integrate Hindsight Memory Engine via MCP in `.mcp.json` for causal session indexing and retrieval
- [ ] T031 Implement session failure inbox logger (`.agent/memory/inbox/<session>.json`) during active task runs
- [ ] T032 Implement offline "Dreaming" script (`.agent/scripts/dream.sh`) to deduplicate inbox traces and update `docs/solutions/<topic>.md`
- [ ] T033 Integrate Google Harness² / `@xisnn/harness2-dsh` Propose-Probe-Compose loop for DSH configuration presets

---

## Milestone 7: Open-Source Release, Benchmarking & Packaging

**Objective**: Package the repository for public distribution under user account (`Unheat`).

- [ ] T034 [P] De-hardcode absolute user home paths across all scripts and MCP configs using dynamic `$HOME`
- [ ] T035 Author comprehensive public `README.md` explaining the 2-level topology, Early Pruning Gates, and DSH integration
- [ ] T036 Author one-command installer script (`setup.sh`) for new machines
