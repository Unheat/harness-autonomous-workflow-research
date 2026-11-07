# 🔬 Autonomous Harness & Workflow Lab (`harness-autonomous-workflow-research`)

> **Personal Research Journal & Architectural Lab for Constructing Autonomous Agentic Workflows Across LLM Harnesses.**  
> *Target Harnesses: DeepSeek Harness (DSH), Claude Code, Cursor, Codex, OpenCode, and ZCode.*

---

## 🧭 Manifesto & Purpose

This repository is **not** an off-the-shelf commercial framework or a generic boilerplate. It is a live **technical log, research laboratory, and architectural notebook** tracking the exploration and engineering of autonomous agent workflows.

### Why this exists:
1. **The Multi-Harness Fragmentation Problem**: Every major agent harness (Claude Code, Cursor, DeepSeek Harness, OpenCode) implements its own siloed abstraction for skills, tools, prompt injection, and MCP servers.
2. **From Fragile Scripts to Verifiable Autonomy**: Moving beyond naive "prompt and pray" loops toward disciplined, test-reproduced, dual-gated autonomous workflows (F2P Red-Green-Refactor, Calibrated Plan & PR Judges).
3. **Token Shielding & Context Governance**: Preventing subagents and main loops from suffering context poisoning and unbounded token burn via dynamic tool filtering and multi-tier scoping (Global vs. Workspace vs. Dormant).

---

## 🏗️ Architectural Core

The laboratory investigates and prototypes several key architectural subsystems:

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
│   └── skills/         # Executable skill protocols (judge-plan, judge-pr, speckit)
├── docs/               # Research notes, solutions, and architectural records
├── eval/               # Evaluation harnesses and benchmark fixtures
├── specs/              # Formalized Specification-Driven Development (GitHub Spec Kit)
├── tests/              # Automated unit and integration test suites
├── AGENTS.md           # Universal instructions and behavioral directives
└── package.json        # Workspace manifest
```

---

*Authored as part of ongoing personal autonomous workflow engineering and experimentation.*
