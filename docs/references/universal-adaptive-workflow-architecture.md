# DeepSeek Harness (DSH) Universal Adaptive Workflow Engine
## Complete Architecture Specification & Blueprint

**Status**: Living Architecture Blueprint  
**Target Platform**: DeepSeek Harness (DSH) Core & Plugins  
**Core Thesis**: "Adaptive Everything" — Memory, Workflow, Skills, Subagents, and Harness via Recursive 2-Level Orchestration and Early Pruning Gates.

---

## 1. System Topology & Architectural Graph

```
                                  USER GOAL / TRIGGER
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ LEVEL 0: ROOT EXECUTIVE ORCHESTRATOR (CEO / PM SuperAgent)                                  │
│ • Role: System Thinking, Discovery, Milestone Decomposition, Worktree Dispatcher            │
│ • State Machine: Backlog (docs/gaps.md) ──► Topological Sorter ──► Parallel Worktrees       │
│ • Adaptability: Can install/edit subagents, rewrite workflow routes, query Hindsight Memory │
│ • Constraints: Pure Orchestrator. NEVER writes code directly. Dispatches to Level 1.        │
└──────────────────────────────────────┬──────────────────────────────────────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                │ (Worktree Isolation: .worktrees/feat-A)     │ (Worktree Isolation: .worktrees/feat-B)
                ▼                                             ▼
┌──────────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐
│ LEVEL 1: FEATURE / MILESTONE LEAD WORKER     │ │ LEVEL 1: FEATURE / MILESTONE LEAD WORKER     │
│ • Scope: Single Worktree, Single Feature     │ │ • Scope: Single Worktree, Single Feature     │
│ • Standard Execution Cycle:                  │ │ • Standard Execution Cycle:                  │
│   Plan ──► Repro/TDD ──► Build ──► PreCheck  │ │   Plan ──► Repro/TDD ──► Build ──► PreCheck  │
│ • Early Pruning Gates (Exit-Code Driven):    │ │ • Early Pruning Gates (Exit-Code Driven):    │
│   ├── Gate 1: judge-plan (Grounded Cause)    │ │   ├── Gate 1: judge-plan (Grounded Cause)    │
│   ├── Gate 2: judge-repro (Failing Test RED) │ │   ├── Gate 2: judge-repro (Failing Test RED) │
│   └── Gate 3: judge-pr (Pass-to-Pass GREEN)  │ │   └── Gate 3: judge-pr (Pass-to-Pass GREEN)  │
│ • Can spawn max 1 level of specialized tools │ │ • Can spawn max 1 level of specialized tools │
└──────────────────────┬───────────────────────┘ └──────────────────────┬───────────────────────┘
                       │                                                │
         ┌─────────────┴─────────────┐                    ┌─────────────┴─────────────┐
         ▼                           ▼                    ▼                           ▼
┌─────────────────┐         ┌─────────────────┐  ┌─────────────────┐         ┌─────────────────┐
│ LEVEL 2 (LEAF)  │         │ LEVEL 2 (LEAF)  │  │ LEVEL 2 (LEAF)  │         │ LEVEL 2 (LEAF)  │
│ explore-code    │         │ research        │  │ frontend-design │         │ visual-judge    │
│ (disallowed:    │         │ (disallowed:    │  │ (disallowed:    │         │ (disallowed:    │
│  Agent, Skill)  │         │  Agent, Skill)  │  │  Agent, Skill)  │         │  Agent, Skill)  │
└─────────────────┘         └─────────────────┘  └─────────────────┘         └─────────────────┘
```

---

## 2. The 2-Level Max Depth Recursive Subagent Hierarchy

| Hierarchy Level | Identity & Role | Permitted Tools | Disallowed Tools | Execution Context |
|---|---|---|---|---|
| **Level 0 (L0)** | **Executive Lead (CEO/PM)**<br>System thinking, gap discovery, milestone sorting, allocating lanes. | `Read`, `Bash`, `Agent` (L1 dispatch), `Hindsight`, `Harness2` | Direct file editing tools on source code (`Edit`, `Write`) | Root Workspace |
| **Level 1 (L1)** | **Milestone Generalist Worker**<br>Autonomous implementation lead executing Plan ➔ Repro ➔ Build ➔ Verify. | `Read`, `Edit`, `Write`, `Bash`, `Agent` (L2 dispatch only) | Global `Skill` preview catalog | Dedicated Git Worktree (`.worktrees/<id>`) |
| **Level 2 (L2)** | **Specialized Leaf Helper**<br>Singular domain execution (AST trace, web search, UI render audit, game asset check). | Task-specific tools (`Read`, `Bash`, or headless CLI) | **STRICTLY DISALLOWED:** `Agent`, `Skill` (Cannot recurse further; depth capped at 2). | Worker's Worktree Sandbox |

---

## 3. Early Pruning Quality Gates (CodePath 3-Gate Model)

Rather than allowing flawed code to burn 20,000+ tokens through full implementation only to be rejected at PR review, L1 enforces **Early Pruning at every lifecycle stage**:

```
[L1 Worker Task Intake]
         │
         ▼
[Phase 1: Planning] ──► Generate plan.md
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ EARLY GATE 1: judge-plan (Rubric Evaluation)                                │
│ • grounded-cause: Does the plan fix the root cause, or a shallow symptom?   │
│ • bounded-scope: Zero scope creep, no unrelated rework.                     │
│ • startable: Explicit files, functions, and approach identified.            │
│ • decisive-test: Names observable before/after delta (exit code, output).   │
│ ──► VERDICT: REJECT ➔ Prune immediately, fix plan.                          │
│ ──► VERDICT: ACCEPT ➔ Advance to Phase 2.                                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
[Phase 2: Reproduction & TDD] ──► Write failing test
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ EARLY GATE 2: judge-repro (Failing Proof)                                   │
│ • behavior-matches: Test fails with EXACT symptom reported (RED).           │
│ • steps-followable: Minimal, runnable test fixture without ambient state.   │
│ ──► VERDICT: REJECT ➔ Implementer cannot code until repro is proven.        │
│ ──► VERDICT: ACCEPT ➔ Advance to Phase 3 (Green Build).                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
[Phase 3: Implementation & Green Cycle] ──► Minimal code to pass test
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ EARLY GATE 3: judge-pr (PR Precheck)                                        │
│ • plan-fidelity: Diff touches only files authorized in plan.md.             │
│ • decisive-testing: Observable before (RED) and after (GREEN) proof shown.  │
│ • repo-checks: Linters, typecheckers, and existing test suite pass 100%.    │
│ • clean-diff: No debug statements, dead code, or unintended whitespace.     │
│ ──► VERDICT: REJECT ➔ Implementer repairs in worktree (Max 3 retries).      │
│ ──► VERDICT: ACCEPT ➔ Package clean commit and return branch to L0.          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. The Two-Route Execution Engine (SWE vs. Non-SWE)

The engine routes execution dynamically based on the project archetype:

```
                                  PROJECT ARCHETYPE INTAKE
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
┌──────────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐
│ ROUTE A: SWE WORKFLOW ENGINE                 │ │ ROUTE B: NON-SWE / CREATIVE WORKFLOW ENGINE  │
│ (Deterministic, Contract-Driven)             │ │ (Iterative, Perception & Constraint-Driven)  │
├──────────────────────────────────────────────┤ ├──────────────────────────────────────────────┤
│ 1. Spec Kit SDD: spec.md ➔ plan.md ➔ tasks   │ │ 1. Intent Brief: Narrative, rules, mechanics │
│ 2. Tooling: Compilers, Linters, Test Runners │ │ 2. Tooling: Asset validators, balance sims   │
│ 3. Gates: F2P (Fail-to-Pass), P2P Regression │ │ 3. Gates: Narrative consistency, visual judge│
│ 4. Output: Verified Git PR + Docs            │ │ 4. Output: Rendered builds, game assets, doc │
│ 5. Subagents: sdd-worker, sdd-reviewer       │ │ 5. Subagents: game-designer, lore-keeper     │
└──────────────────────────────────────────────┘ └──────────────────────────────────────────────┘
```

---

## 5. The Self-Adaptive Triad: Memory, Harness, and Ecosystem

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. MEMORY ADAPTATION: Hindsight Engine (Online Ingest + Reflective Retrieval)              │
│ • Ingests Git commits, developer chat transcripts, and verified test fixes.                 │
│ • Stores structured causal graphs: "Symptom X in module Y was fixed by Z".                  │
│ • L0 and L1 query Hindsight via MCP at task orientation to avoid repeat mistakes.           │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. HARNESS ADAPTATION: Google Harness² / xisnn/harness2-dsh (Propose-Probe-Compose)         │
│ • When tasks encounter plateaus or high retry churn:                                        │
│   - Propose: Propose candidate adjustments to agent prompt, tool subset, or timeout limits. │
│   - Probe: Run candidate harnesses against parallel worktrees on the same task.             │
│   - Compose: Adopt winning harness variations based on execution invariants (exit code 0).  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. ECOSYSTEM ADAPTATION: Dynamic Skills & Plug-and-Play Subagents (Hermes Pattern)          │
│ • L0 can fetch specialized subagent definitions and skills dynamically from GitHub/Registry.│
│ • L0 can modify existing subagents or generate project-specific subagents on the fly.       │
│ • Installed assets conform to 3-tier scoping (Global Catalog vs. Project Local).             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Architecture Audit: Critical Risks, Missing Gaps & Proposed Solutions

### Gap 1: Recursive Concurrency Explosion & Token Depletion
* **Risk**: If L0 dispatches 5 parallel L1 workers, and each L1 spawns 2 parallel L2 leaf helpers, 15 LLM streams run concurrently. This causes catastrophic rate-limit throttling (HTTP 429) and burns context budgets in minutes.
* **Proposed Solution**: 
  - Implement a **Concurrency Semaphore & Token Budget Pool** in L0.
  - L0 enforces `max_parallel_l1 = 2` and `max_parallel_l2_per_l1 = 1`.
  - Level 2 subagents run strictly serially within an L1 worker lane.

### Gap 2: Worktree Divergence & Sequential Merge Hell
* **Risk**: Multiple L1 workers operating in parallel on the same codebase will produce conflicting PR branches. Merging them back into `main` naively creates merge conflicts and invalidates earlier test passes.
* **Proposed Solution**:
  - L0 performs **Topological Dependency Graphing** (Storytold pattern).
  - Tasks touching overlapping subsystem boundaries (e.g., shared data models or database schemas) are queued sequentially.
  - Only orthogonal subsystems (e.g., frontend components vs. backend API routes) are executed in parallel.
  - An integration pass (`cargo test` / `npm test`) runs on `main` immediately following each merged lane.

### Gap 3: Self-Editing Degeneration (The Alignment Trap)
* **Risk**: If agents can dynamically edit their own prompts, rubrics, and subagents, an agent struggling to pass a strict test may "adapt" the test or judge rubric to be lenient, creating the illusion of progress while degrading code quality.
* **Proposed Solution**:
  - **Immutable Constitution Invariant**: The project constitution (`.specify/memory/constitution.md`) and the judge rubrics (`plan-check`, `pr-precheck`) are cryptographically or policy-locked as **Read-Only** to worker subagents.
  - L1 can adapt its own internal scratchpad, but CANNOT modify the evaluation gates.

### Gap 4: Context Leakage Between Recursion Tiers
* **Risk**: Dumping L0's massive high-level planning transcript into L1 turns L1 into a confused, bloated session.
* **Proposed Solution**:
  - Enforce **Strict Task Brief Handoffs**.
  - L0 communicates with L1 solely via an isolated Markdown file: `.worktrees/<id>/.brief.md`.
  - L1's turn 1 starts with a fresh context window containing only `.brief.md`, relevant domain docs, and core tools.
