# 🔬 Autonomous Harness & Workflow Lab (`harness-autonomous-workflow-research`)

> **Personal Research Journal & Architectural Lab for Constructing Autonomous Agentic Workflows Across LLM Harnesses.**  
> *Target Harnesses: DeepSeek Harness (DSH), Claude Code, Cursor, Codex, OpenCode, and ZCode.*

---

## 🧭 Manifesto & Purpose

This repository is a live **technical log, research laboratory, and architectural notebook** tracking the exploration and engineering of autonomous agent workflows.

### Why this exists:
1. **The Multi-Harness Fragmentation Problem**: Every major agent harness (Claude Code, Cursor, DeepSeek Harness, OpenCode, ZCode) implements its own siloed abstraction for skills, tools, prompt injection, and MCP servers.
2. **From Fragile Scripts to Verifiable Autonomy**: Moving beyond naive "prompt and pray" loops toward disciplined, test-reproduced, dual-gated autonomous workflows (F2P Red-Green-Refactor, Calibrated Plan & PR Judges).
3. **Token Shielding & Context Governance**: Preventing subagents and main loops from suffering context poisoning and unbounded token burn via dynamic tool filtering and multi-tier scoping (Global vs. Workspace vs. Dormant).

---

## 📦 Two Standalone, Decoupled Tools

This research laboratory produced **two distinct, standalone tools**. They are **completely decoupled**—you can install and use Tool 1 only, Tool 2 only, or both together.

```
┌────────────────────────────────────────────────────────┐
│              Two Independent Research Tools            │
├────────────────────────────┬───────────────────────────┤
│ Tool 1: Harness Manager    │ Tool 2: SWE Workflow      │
│ (harness / agn)            │ (swe-workflow)            │
├────────────────────────────┼───────────────────────────┤
│ • Cross-harness governance │ • Karpathy 4 Principles   │
│ • 3-Tier catalog lifecycle │ • F2P Red-Green-Refactor  │
│ • Subagent token shielding │ • Dual-gate judges        │
│ • Local Web UI dashboard   │ • Context packet handoff  │
│ • Symlink auto-healing     │ • Zero-config bootstrap   │
├────────────────────────────┼───────────────────────────┤
│ Works independently in any │ Works independently in    │
│ workspace across harnesses │ any repo without harness  │
└────────────────────────────┴───────────────────────────┘
```

---

### Tool 1: Universal Harness Manager (`harness` / `agn`)

A fast, strongly-typed CLI and visual dashboard (running on Bun + TypeScript) for managing skills, MCP servers, and subagent token shielding across all 6 harnesses without configuration drift or token waste.

#### What it does:
- **3-Tier Storage Lifecycle**: Keeps 40+ dormant tools in a central catalog (`~/.agents/catalog/`) at 0 token cost, symlinking only what your active workspace needs into `.agents/skills/`.
- **Subagent Token Shielding**: Automatically strips non-essential skills and heavy tools from child subagent frontmatter (`toggleSubagentTokenShield`), preventing context window bloat.
- **Cross-Harness Adapter Auto-Healing**: Reconciles and repairs symlinks for Claude Code (`.claude`), Cursor (`.cursor`), DeepSeek Harness (`.dsh`), Codex (`.codex`), OpenCode (`.opencode`), and ZCode (`.zcode`).
- **Minimalist Vibe Coder Web UI**: Local dashboard served on port `20888` with token gauges, 1-click skill/MCP toggles, and live search.
- **Catalog Promotion & Skill Import**: Any project-local folder skill can be promoted into the machine catalog ("📦") and is then relinked, so other workspaces can reuse it. "📥 Import" pulls local skills from another workspace folder, keeping each entry's nature — linked stays linked, private copy stays private — and never writes to the catalog.

#### Standalone Installation Guide:

**Prerequisite**: [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`).

```bash
# Clone the repository
git clone https://github.com/Unheat/harness-autonomous-workflow-research.git
cd harness-autonomous-workflow-research

# Install harness and agn globally into ~/.local/bin
bash scripts/install-harness.sh
```

Ensure `~/.local/bin` is in your `PATH` (e.g. `export PATH="$HOME/.local/bin:$PATH"` in `~/.bashrc` or `~/.zshrc`).

#### Usage:
```bash
# Inspect current workspace tools & estimated token footprint
harness status

# Browse dormant catalog tools
harness catalog

# Enable/Disable a skill or MCP server for current project
harness skill add <skill-name>
harness mcp on <server-name>

# Audit and self-heal adapter symlinks
harness doctor
harness heal

# Launch interactive zero-prefix REPL or local web dashboard
harness start
harness ui
```

*Note: Tool 1 does NOT require Tool 2. You can use `harness` purely as an agent environment and MCP manager for any project.*

---

### Tool 2: Autonomous SWE Workflow Engine (`swe-workflow`)

A disciplined, reproducible software engineering workflow for coding agents. It ensures fixes and features are built test-first, strictly bounded in scope, free of review debris, verified against root causes, and finalized as a review-ready Draft PR.

#### What it does:
- **Karpathy 4 Core Invariants (Top-Level Rule)**:
  1. *Think Before Coding*: Don't assume. Don't hide confusion. Surface tradeoffs. Present choices rather than picking silently. Never fake passes or use silent workarounds to look correct.
  2. *Simplicity First*: Minimum code that solves the problem. No speculative abstractions, unrequested features, or premature configurability.
  3. *Surgical Changes*: Touch only what you must. Don't "improve" adjacent code or reformat unrelated files. Clean up only your own mess.
  4. *Goal-Driven Execution*: Transform tasks into verifiable goals with tests first. Loop until verified with decisive before/after proof.
- **Fail-to-Pass (F2P) Anti-Cheat Reproduction**: Strictly requires an authentic reproducer test that **FAILS (`exit != 0`) on untouched code** before any production code is touched. Blocks trivial, tautological, or mock-only tests.
- **Calibrated Dual-Gate Reviewers**:
  - `judge-plan`: 1-turn read-only reviewer grading `grounded-cause`, `bounded-scope`, `startable`, and `decisive-test`.
  - `judge-pr`: 1-turn read-only reviewer grading `plan-fidelity`, `behavior-correctness`, `clean-diff`, `decisive-testing`, and `repo-checks`.
  - *Human Tie-Breaker*: If judges and plans disagree, prompts a concise 3-option human question instead of discarding gathered context.
- **Generalized Repository Policy Discovery & Context Packet Handoff**:
  - Dynamically discovers repository-specific guidelines (`CONTRIBUTING.md`, PR templates, developer manuals, domain-specific sync rules like updating `SKILL.md` when agent tools change).
  - Hands off discovered policy paths directly to the judges so they evaluate compliance without burning tokens re-scanning the tree.
- **Physical Pre-Push Safety Gate**: Optional native git `pre-push` hook that auto-detects the test runner and blocks pushes if tests fail.

#### Installation

`swe-workflow` lives in its own repository — [Unheat/swe-workflow](https://github.com/Unheat/swe-workflow). This repo does not vendor a copy.

```bash
# Any project, no Tool 1 required:
curl -fsSL https://raw.githubusercontent.com/Unheat/swe-workflow/main/setup.sh | bash

# Or via Vercel Skills CLI:
npx skills add Unheat/swe-workflow --skill swe-workflow
```

On a machine managed by Tool 1, install once into the catalog and link each workspace:

```bash
git clone https://github.com/Unheat/swe-workflow.git ~/study/swe-workflow
bash ~/study/swe-workflow/scripts/update-catalog.sh        # deploy clone + catalog links

cd /path/to/workspace
harness skill add swe-workflow
bash .agents/skills/swe-workflow/setup.sh
```

Updates: push in the swe-workflow checkout, then re-run `scripts/update-catalog.sh`; every linked workspace follows. Full options: [swe-workflow install/update guide](https://github.com/Unheat/swe-workflow/blob/main/skills/swe-workflow/README.md).

##### As a Claude Code Plugin
The plugin manifest ships in that repo (`skills/swe-workflow/.claude-plugin/plugin.json`).

#### Three Modes, One Contract:
`swe-workflow` picks a reviewer dispatch path from the live runtime, not from the folders in the repo, and states it in its first update (`mode=registry|manual|inline`):
- **registry** — `judge-plan`/`judge-pr` are registered subagents (Claude Code, ZCode, Cursor, OpenCode, DSH with the `dsh-subagents` plugin). `SKILL.md` runs the phases directly.
- **manual** — the harness can spawn a child task but has no registry entry (pi / DeepAI Code, Codex without a TOML projection). `manual.md` passes the agent's own body as the child's system prompt plus the brief, because nothing else supplies it.
- **inline** — no child task capability at all. `inline.md` runs the rubrics as a self-audit and labels every verdict `self-audit (no independent judge)`.

Registry setup, when you want it, is `bash .agents/skills/swe-workflow/setup.sh`: it registers the subagents for Markdown-agent harnesses and installs the optional pre-push hook. In a workspace managed by `harness`, `harness heal` additionally generates the Codex TOML projection.

You don't need to run setup scripts manually: simply invoke `/swe-workflow` in your harness:
```text
/swe-workflow "Fix the memory leak in WebSocket connection pool"
```

---

### 🔄 Optional Synergy: Using Both Together

While completely independent, the two tools provide maximum productivity when combined:
1. Use **Harness Manager (`harness`)** to manage workspace isolation, toggle `swe-workflow` on or off with `harness skill add swe-workflow`, and audit subagent token shields with `harness doctor`.
2. Use **SWE Workflow (`swe-workflow`)** to execute complex feature additions and bugfixes with test-first rigor and judge verification.

---

## 🏗️ Architectural Core

```
┌─────────────────────────────────────────────────────────────┐
│                 Universal Cross-Harness CLI                 │
│              (harness / agn: Bun + TypeScript)              │
├─────────────────────────────────────────────────────────────┤
│ 1. 3-Tier Resource Lifecycle                                │
│    - Global (~/.agents, ~/.claude)                          │
│    - Workspace (.agents, .cursor, .dsh, .codex)             │
│    - Central Catalog & Dormant Archive (.agents/dormant)    │
├─────────────────────────────────────────────────────────────┤
│ 2. Dual-Gate Calibrated Verification Engine                 │
│    - judge-plan: Pre-implementation requirement grounder    │
│    - judge-pr: Post-implementation review readiness gate    │
│    - CodePath F2P Reproduction Protocol                     │
├─────────────────────────────────────────────────────────────┤
│ 3. Token Shield & Context Distillation                      │
│    - Subagent tool scoping (strip unnecessary skills/tools) │
│    - Fuzzy MiniSearch discovery with Levenshtein tolerance  │
│    - Multi-adapter auto-healing & bi-directional sync       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📓 Research Log & Milestones

### Entry 001: The Multi-Harness Parity Dilemma
- **Finding**: Syncing `.agents/mcp.json` with `.mcp.json` and `.dsh/mcp.json` requires bi-directional reconciliation and handling of dual `enabled`/`disabled` boolean flags.
- **Decision**: Implemented an automated doctor and self-healing engine (`healWorkspace`) to prune broken symlinks and reconcile adapter targets without corrupting local configurations.

### Entry 002: Dual-Gate Verification (`judge-plan` & `judge-pr`)
- **Finding**: Autonomous agents fail most often due to underspecified problem boundaries or unverified edge regressions.
- **Decision**: Established the F2P (Fail-to-Pass) protocol:
  1. Write failing reproducible test first.
  2. Plan & pass `judge-plan` calibration before writing code.
  3. Implement minimal surgical fix.
  4. Pass `judge-pr` verification before finalizing.

### Entry 003: Subagent Token Shielding
- **Finding**: Passing all skills to child subagents pollutes context windows and wastes tokens.
- **Decision**: Created the Subagent Token Shield mechanism (`toggleSubagentTokenShield`), cleanly stripping non-essential skills and tools from child agent frontmatter while leaving parent capabilities intact.

### Entry 004: Unified Control Plane & Local Workbench
- **Finding**: Managing local databases, background runtime daemons, and model memory (e.g. Hindsight) must never touch user git commits or pollute repository histories.
- **Decision**: Established a strict sandboxed isolation policy. Heavy runtime dependencies and caches (`.hindsight-runtime/`, `.pg0/`, `archive/`, `scratch/`) are quarantined and tracked via detailed specifications in `specs/`.

### Entry 005: Karpathy Core Principles & Anti-Cheat Safeguards
- **Finding**: Agents frequently invent speculative helper abstractions, reformat adjacent code, or pick silent workarounds to "look correct" rather than truly resolving bugs.
- **Decision**: Promoted Karpathy's 4 Core Principles (Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution) to top-level non-negotiable invariants in `AGENTS.md` and `swe-workflow/SKILL.md`. Enforced generalized repository rule discovery and zero-waste context packet handoffs to reviewers.

---

## 🧪 Test Suite & Verification

All architectural primitives are validated through exhaustive automated unit and edge-case suites:

```bash
# Run full test suite with Bun
bun test
```

Current test matrix covers:
- **`tests/skills.test.ts` & `tests/skills-global.test.ts`**: Boundary validation, symlink idempotency, 3-tier scoping.
- **`tests/mcp.test.ts` & `tests/mcp-global.test.ts`**: Shadowing detection, global vs workspace resolution.
- **`tests/catalog-healing.test.ts`**: Broken link pruning, central catalog sync, self-healing.
- **`tests/subagents.test.ts`**: YAML frontmatter parsing, Token Shield validation, token estimation.
- **`tests/search.test.ts`**: MiniSearch 3-tier prefix, capability, and fuzzy retrieval.
- **`tests/unified-control-plane.test.ts`**: Fault-tolerant atomic config writes and lifecycle management.

---

## 🛠️ Repository Layout

```
.
├── .agent/             # Core harness CLI engine, services, doctor, and UI
├── .agents/            # Active project skills and MCP configurations
│   ├── dormant/        # Preserved inactive skills
│   └── skills/         # Executable skill protocols (swe-workflow, judge-plan, judge-pr, speckit)
├── docs/               # Research notes, solutions, and architectural records
├── eval/               # Evaluation harnesses and benchmark fixtures
├── scripts/            # Global installers (install-harness.sh)
├── specs/              # Formalized Specification-Driven Development (GitHub Spec Kit)
├── tests/              # Automated unit and integration test suites
├── AGENTS.md           # Universal instructions and behavioral directives
└── package.json        # Workspace manifest
```

---

*Authored as part of ongoing personal autonomous workflow engineering and experimentation.*
