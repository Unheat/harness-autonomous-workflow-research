# Proposal: Universal Cross-Harness Agentic Workflow Engine

## Why

Current AI coding harnesses (Claude Code, ZCode, Codex, DeepSeek Harness, Cursor) suffer from severe fragmentation, vendor lock-in, and context pollution:
- Each harness introduces competing directory structures (`.claude`, `.zcode`, `.codex`), causing duplication and dead symlinks across projects.
- Subagents inherit massive catalogs of global skill previews, wasting thousands of tokens per turn and degrading reasoning performance.
- Workflows are either too manual (chat turn-by-turn) or tied to proprietary closed-source runtimes.

We need a unified, portable, open-standard workflow architecture that allows an agent to operate autonomously (from task/issue to verified PR) while keeping context windows clean, maintaining strict quality gates (TDD + two-stage subagent review), and compounding lessons across sessions.

---

## What Changes

1. **Establish Canonical Baseline Architecture (Completed)**:
   - Make `.agents/skills` (local) and `~/.agents/skills` (global) the single source of truth for all skills, managed via Vercel's `skills` CLI (`-a universal`).
   - Eliminate duplicated files by using single relative directory symlinks from adapter folders (`.claude/skills`, `.zcode/skills`, `.cursor/skills`) to `.agents/skills`.
   - Prevent context pollution by stripping the `Skill` tool from implementer subagents (`sdd-worker`), reducing token overhead to zero.
   - Enforce standards via a 3-layer defense: OS symlink routing, `AGENTS.md` policy, and self-healing hooks.

2. **Target End-State Goals (To Be Designed & Implemented)**:
   - **Outer Autonomous Wrapper**: A lightweight runner inspired by DeepSeek's `dsh-superagent` that accepts a task/issue, auto-provisions a git worktree, executes unattended, and reports back only upon PR readiness or blocker.
   - **Execution Pipeline**: Integrates OpenSpec for macro-planning and Superpowers' Subagent-Driven Development (SDD) with Test-Driven Development (TDD) for micro-task execution.
   - **Compound Learning & Memory**: Automatic distillation of verified solutions and debugging discoveries into `docs/solutions/` so future agents never repeat identical failures.

---

## Capabilities

### New Capabilities
- `workflow-orchestration`: The outer coordinator loop that automates task intake, worktree isolation, unattended execution, and PR delivery without spamming human chat.
- `subagent-governance`: Definition, tool-stripping, and dual-gate verification (spec compliance + code quality) for scoped worker subagents.
- `compound-memory`: Cross-session memory extraction that captures verified bug fixes and architecture decisions into structured documentation for retrieval by subsequent sessions.

### Modified Capabilities
*(None - this is the foundational architecture proposal for the repository)*

---

## Impact

- **Affected Systems**: All harness configurations (`.claude/`, `.zcode/`, `.codex/`, `.dsh/`, `.cursor/`).
- **Dependencies**: Git, Node.js (Vercel `skills` CLI), Python 3 (for lightweight hook guards).
- **Portability**: 100% portable across macOS and Linux. Zero lock-in to proprietary cloud agent runtimes.
