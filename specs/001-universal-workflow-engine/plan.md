# Implementation Plan: Universal Cross-Harness Adaptive Workflow Engine

**Branch**: `001-universal-workflow-engine` | **Date**: 2026-11-05 | **Spec**: [specs/001-universal-workflow-engine/spec.md](spec.md)

**Input**: Feature specification from `specs/001-universal-workflow-engine/spec.md`  
**Architecture Blueprint**: [architecture.md](architecture.md) & [universal-adaptive-workflow-architecture.md](../../docs/references/universal-adaptive-workflow-architecture.md)

---

## 1. Summary

Build a cross-harness adaptive workflow engine adopting a **Fork & Enhance Paperclip** strategy (`paperclipai/paperclip`), augmented with DeepSeek Harness (DSH), Claude Code, ZCode, Cursor, and Codex CLI adapters. The system delivers:
1. **Paperclip Fork Base (UI & CEO System Thinking)**: Leverages Paperclip's web dashboard and autonomous CEO Agent to eliminate manual human prompt hand-holding, while pruning enterprise financial/hiring bloat.
2. **2-Level Subagent Topology**: Level 0 (CEO/PM Orchestrator) $\to$ Level 1 (Worktree Lead Worker) $\to$ Level 2 (Specialized Leaf Helpers with `disallowedTools: [Agent, Skill]`).
3. **Cognitive Intent Router**: Evaluates task ambiguity index to automatically trigger **Route A (CEO/PM Broad Discovery)** or **Route B (Fast-Track Execution)**.
4. **Unified F2P Lifecycle & Early Pruning Gates**: Enforces proof of failure before code is written (`RED` $\to$ `Grounded Plan` $\to$ `GREEN` $\to$ `P2P Regression Gate`) with CodePath-derived judges (`judge-repro`, `judge-plan`, `judge-pr`).
5. **Dynamic Project Scaffolding**: Archetype routing for SWE (code contracts, test suites) and Non-SWE (Game Design GDD, visual judges, asset checkers).
6. **Self-Adaptive Triad with Locked Runtime**: Runtime is strictly locked during task execution. Adaptation occurs offline via Hindsight Memory distillation and Harness² Propose-Probe-Compose optimization on DSH.

---

## 2. Technical Context

**Base Platform**: Fork of `paperclipai/paperclip` (Node.js/TypeScript + React UI Dashboard)  
**Runtime & Languages**: TypeScript 5.x, Bun 1.1+, Python 3.10+, Bash 4+  
**Target Harnesses**: DeepSeek Harness (DSH Core & Cordis Patches), Claude Code, ZCode, Cursor, OpenAI Codex CLI  
**Key Dependencies**:
- Paperclip Core (`paperclipai/paperclip`) for Web Dashboard & CEO delegation
- GitHub Spec Kit (`specify-cli` via `uv`)
- Hindsight Memory Engine (MCP)
- Google Harness² (`@xisnn/harness2-dsh` / `google-research/harness2`)
- CodePath AI301 Verification Suite (`plan-check`, `repro-check`, `pr-precheck`)
- Warden-inspired Git Worktree Rails (`git worktree add/remove/prune`)

**Storage**: Local filesystem, Git version control, structured Markdown (`.specify/`, `docs/solutions/`, `.agents/`), JSON configs (`.mcp.json`, `~/.agents/catalog/mcps.json`)

**Testing**: `bun test` for TypeScript modules, ShellCheck for bash scripts, pytest for python hooks, standard project test runners (npm/cargo/pytest) for workloads

**Invariants & Constraints**:
- **Max Depth = 2**: Level 2 subagents strictly cannot invoke `Agent` or `Skill`.
- **Early Pruning**: Plans failing `judge-plan` or missing `judge-repro` proof are rejected before writing implementation code.
- **Immutable Constitution**: Grading rubrics and project constitutions are read-only during active runs; no agent may relax its own test gates.
- **Worktree Isolation**: Every L1 milestone executes in an isolated Git worktree; no direct modifications on `main`.

---

## 3. Constitution Check

*GATE: Verified against `.specify/memory/constitution.md`*

| Principle | Status | Implementation Mechanism |
|---|---|---|
| I. Universal Agent Standard | PASS | `.agents/skills` Single Source of Truth + directory symlinks from adapters |
| II. 3-Layer Defense | PASS | Layer 1 symlinks, Layer 2 `AGENTS.md` + `harness-protocol`, Layer 3 guard hooks |
| III. Zero Token Waste | PASS | `disallowedTools: Skill` on L1; `disallowedTools: [Agent, Skill]` on L2 |
| IV. Unified F2P / TDD Cycle | PASS | Proof of failure (`judge-repro` RED) mandatory before implementation (`GREEN`) |
| V. Early Pruning Judges | PASS | `judge-plan` stops shallow fixes early; `judge-pr` prevents review debris |
| VI. Compound Memory & Adaptation | PASS | Hindsight memory + offline "Dreaming" sessions into `docs/solutions/` |

---

## 4. System Structure & Layout

```text
/Users/dangtruongan/study/workflow/
├── .agent/
│   ├── agents/
│   │   ├── sdd-worker.md            # Canonical L1 implementer config (disallowedTools: Skill)
│   │   └── sdd-reviewer.md          # Canonical L1 reviewer config (read-only, no Edit/Write)
│   ├── judges/                      # Early Pruning Evaluation Gates
│   │   ├── judge-repro.sh           # Gate 1 (Bugs): Verifies test fails RED with exact symptom
│   │   ├── judge-plan.sh            # Gate 2: Verifies grounded-cause, bounded-scope, startable
│   │   └── judge-pr.sh              # Gate 3: Verifies plan-fidelity, clean-diff, P2P tests pass
│   ├── templates/                   # Vendored SDD & Spec Templates
│   │   ├── sdd/                     # implementer-prompt.md, task-reviewer-prompt.md
│   │   └── archetypes/              # swe/, game-design/, research/
│   ├── scripts/
│   │   ├── run-workflow.sh          # Autonomous L0 Executive Runner (SuperAgent loop)
│   │   ├── run-task.sh              # L1 Worktree Feature Runner
│   │   ├── dream.sh                 # Offline Meta-Adaptation Memory Distillation
│   │   ├── sync-upstream.sh         # Re-sync templates from Superpowers / Spec Kit
│   │   ├── manage.sh                # Cross-harness diagnostic status script
│   │   └── auto-heal-symlinks.sh    # SessionStart symlink repair hook
│   └── hooks/
│       └── guard-skills.py          # PreToolUse unauthorized write guard
├── .agents/
│   └── skills/                      # Active project skills (Spec Kit + localized tools)
├── .claude/skills ──► ../.agents/skills
├── .zcode/skills  ──► ../.agents/skills
├── .cursor/skills ──► ../.agents/skills
├── .dsh/
│   ├── skills     ──► ../.agents/skills
│   └── agents     ──► ../.agent/agents
├── .specify/                        # GitHub Spec Kit root (constitution, templates, scripts)
├── specs/
│   └── 001-universal-workflow-engine/
│       ├── spec.md                  # Feature specification
│       ├── plan.md                  # Implementation plan (this document)
│       ├── architecture.md          # Architecture blueprint
│       └── tasks.md                 # Progressive milestone checklist
├── docs/
│   ├── references/                  # Domain guides (universal-adaptive-workflow-architecture.md)
│   └── solutions/                   # Compound verified bug fixes & architecture notes
├── AGENTS.md                        # Thin router (<30 lines) pointing to harness-protocol & docs
└── .mcp.json                        # Project-scoped MCP servers (codebase-memory, hound, rea)
```

---

## 5. Component Execution Contracts

### Contract A: Level 0 Cognitive Intent Router
- **Input**: Natural language user goal.
- **Evaluation**: Calculates Ambiguity Index and Blast Radius.
- **Route A (Ambiguity $\ge 0.5$)**: Generates `docs/gaps.md`, builds parity matrix, and outputs topological dependency execution graph.
- **Route B (Ambiguity $< 0.5$)**: Creates single isolated worktree and invokes L1 runner directly.

### Contract B: Level 1 Milestone Lead Worker
- **Input**: Task Brief file (`.brief.md`) generated by L0.
- **Execution Flow**:
  1. **Repro/Contract Phase**: Writes test $\to$ executes `judge-repro` $\to$ verifies exit code $\ne 0$ (`RED`).
  2. **Plan Phase**: Writes `plan.md` $\to$ executes `judge-plan` $\to$ must return `ACCEPT`.
  3. **Build Phase**: Writes minimal code $\to$ passes Repro test (`GREEN`).
  4. **Precheck Phase**: Runs full regression suite $\to$ executes `judge-pr` $\to$ must return `ACCEPT`.
- **Output**: Clean branch commit + verified PR package.

### Contract C: Level 2 Specialized Leaf Helpers
- **Types**: `explore-code`, `research`, `frontend-design`, `visual-judge`.
- **Contract**: Strictly tool-isolated (`disallowedTools: [Agent, Skill]`). Dispatched serially within an L1 worker lane.

### Contract D: Offline "Dreaming" Meta-Adaptation
- **Trigger**: Run post-milestone or via `.agent/scripts/dream.sh`.
- **Action**: Ingests `.agent/memory/inbox/*.json`, extracts repeated failure patterns, validates code anchors, and generates structured solution notes in `docs/solutions/<topic>.md` for future Hindsight retrieval.
