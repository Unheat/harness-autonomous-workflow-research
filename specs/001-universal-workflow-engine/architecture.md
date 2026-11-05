# Architecture Blueprint: Universal Cross-Harness Agentic Workflow Engine

## 1. System Vision & The Core Problem

Current AI coding workflows suffer from three critical architectural flaws:
1. **Harness Fragmentation**: Competing directories (`.claude`, `.zcode`, `.cursor`, `.codex`, `.dsh`) force developers to duplicate configs, leading to stale copies and broken symlinks.
2. **Context Pollution (Token Bloat)**: Subagents inherit 40–50 global skill descriptions (~8,000 tokens of previews per turn), causing token starvation and degraded reasoning.
3. **Execution Gap**: Agents either run turn-by-turn with conversational spam, or hallucinate fixes because they lack independent verification and automated quality gates.

Our goal is a **unified, portable, open-standard agentic workflow engine** that runs across any harness with zero token waste, strict TDD, and independent dual-gate auditing.

---

## 2. Donor Decomposition Matrix

Rather than reinventing every wheel, our architecture synthesizes the best components from 5 leading open-source frameworks while eliminating their weaknesses:

| Donor Framework | What We Borrow (Components Used) | What We Reject / Modify | Why We Adapted It |
|---|---|---|---|
| **1. GitHub Spec Kit** (`github/spec-kit`) | • `.specify/` specification structure<br>• Project constitution (`constitution.md`)<br>• Core lifecycle (`specify` → `plan` → `tasks` → `implement` → `converge`)<br>• Bug extension (`/speckit-bug-*`) | Spec Kit's default `implement` phase does not enforce subagent isolation or tool stripping. | Spec Kit provides the industry standard for *specifying* work, but needs an execution engine for *doing* the work. |
| **2. Superpowers** (`obra/superpowers`) | • Subagent-Driven Development (SDD) core loop<br>• Task Brief delegation pattern<br>• Independent two-stage review (Spec Compliance + Code Quality)<br>• TDD cycle (Red → Green → Refactor) | Superpowers spawns `general-purpose` subagents, which inherit all global skills and leak 8,000+ preview tokens per turn. It also relies on prompt instructions to prevent reviewer edits. | We wrapped Superpowers' execution model in specialized containers (`sdd-worker` & `sdd-reviewer`) with the **Token Shield** (`disallowedTools: Skill, Edit, Write`). |
| **3. Everything Claude Code (ECC)** (`affaan-m/everything-claude-code`) | • PreToolUse guard hook pattern (exit 2 to abort illegal writes)<br>• SessionStart auto-healing hook pattern<br>• Permission boundary enforcement | ECC is hardcoded exclusively for Claude Code (`.claude/rules/`, `.claude/commands/`) and loads 15,000+ tokens of static instructions into root context. | We universalized the hooks to defend a single canonical hub (`.agents/skills`), decoupling safety from any single harness. |
| **4. DeepSeek Harness (DSH)** (`deepseek-ai/dsh`) | • Unattended autonomous runner concept (`dsh-superagent`)<br>• Git worktree isolation per task branch<br>• Cordis patch architecture for headless MCP injection | Full DSH runtime requires heavy Electron/Node desktop infrastructure. | We distilled the unattended runner into a lightweight, portable script (`.agent/scripts/run-task.sh`) usable on any Unix machine. |
| **5. GEAR** (`rsi-gear/gear`) | • Benchmark & evaluation methodology<br>• Empirical metrics: task pass rate, retry churn, token cost per resolved issue | Complex multi-agent reinforcement learning daemon. | We adopt GEAR's evaluation metrics to benchmark our workflow's efficiency against standard SWE benchmarks. |

---

## 3. End-to-End Architectural Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   INPUT: TASK / ISSUE                                   │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     LAYER 1: SPECIFICATION & PLANNING (GitHub Spec Kit)                 │
│                                                                                         │
│  [speckit-specify] ──► specs/<feat>/spec.md      (Prioritized User Stories: P1, P2, P3) │
│           │                                                                             │
│           ▼                                                                             │
│  [speckit-plan]    ──► specs/<feat>/plan.md      (Constitution Check + Tech Architecture)│
│           │                                                                             │
│           ▼                                                                             │
│  [speckit-tasks]   ──► specs/<feat>/tasks.md     (Progressive Milestones Checklist)     │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     LAYER 2: WORKSPACE ISOLATION (DSH / Superpowers)                    │
│                                                                                         │
│  • Automated Worktree: .worktrees/<branch-name>                                         │
│  • Clean git baseline & test runner verification (npm, pytest, cargo)                   │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│               LAYER 3: EXECUTION & TOKEN-SHIELDED SDD (Superpowers + Custom)            │
│                                                                                         │
│  Coordinator loops over tasks in specs/<feat>/tasks.md:                                 │
│                                                                                         │
│  1. Dispatch `sdd-worker`:                                                              │
│     ├── Ingests: Self-contained Task Brief                                              │
│     ├── Tool Shield: disallowedTools: [Skill] (0 preview tokens wasted!)                │
│     └── Execution: Strict TDD (Red -> Green -> Refactor) + Self-Diff Check              │
│                                                                                         │
│  2. Dispatch `sdd-reviewer`:                                                            │
│     ├── Tool Shield: disallowedTools: [Edit, Write, Skill, Agent] (Strict Read-Only)    │
│     ├── Gate 1: Spec Compliance (Does diff match brief without scope creep?)            │
│     ├── Gate 2: Code Quality & Real Tests (file_path:line_number citations)             │
│     └── Verdict: APPROVED or REVISE (Max 3 rounds before circuit breaker trips)         │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 4: HARNESS ENFORCEMENT & SAFETY NET (ECC)                    │
│                                                                                         │
│  • Kernel Level: Symlinks (.claude, .zcode, .cursor -> .agents/skills)                  │
│  • PreToolUse Hook: guard-skills.py blocks unauthorized writes to adapter directories   │
│  • SessionStart Hook: auto-heal-symlinks.sh repairs broken symlinks on startup          │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 5: CONVERGENCE & COMPOUND MEMORY (Spec Kit + DSH)              │
│                                                                                         │
│  • [speckit-converge]: Audit codebase against spec.md until status is "CONVERGED"       │
│  • docs/solutions/<topic>.md: Distill verified fix & root causes for future agents      │
│  • Delivery: Clean commit, worktree merge/prune, and PR package                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Key Architectural Trade-Offs

1. **Vendored Templates vs. Upstream Package Dependencies**:
   - *Decision*: Vendor core SDD templates (`implementer-prompt.md`, `task-reviewer-prompt.md`) into `.agent/templates/sdd/` inside the repo, accompanied by a `./.agent/scripts/sync-upstream.sh` script.
   - *Trade-off*: Downstream developers can `git clone` and run with zero setup on any machine, without inheriting 50 global skills or dealing with broken global dependencies.
2. **Dynamic $HOME Resolution**:
   - All hook scripts and paths use dynamic environment resolution (`${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}`, `$HOME`) to ensure complete portability across macOS and Linux.
