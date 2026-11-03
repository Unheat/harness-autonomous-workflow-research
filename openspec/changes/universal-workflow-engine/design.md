# Design: Universal Cross-Harness Agentic Workflow Engine

## Context

Current baseline (already established in this repository):
- Canonical Single Source of Truth at `.agents/skills` (local) and `~/.agents/skills` (global).
- Relative symlinks connecting `.claude/skills`, `.zcode/skills`, and `.cursor/skills` to `.agents/skills`.
- Tool stripping (`disallowedTools: Skill`) active in `.agent/agents/sdd-worker.md`.
- 3-layer automated enforcement via OS symlinks, `AGENTS.md`, and `.agent/hooks/`.
- Official Vercel `skills` CLI configured as the primary package installer.

See `proposal.md` for motivation and background.

---

## Goals / Non-Goals

**Goals:**
- Provide a clean, reproducible, cross-harness workflow that runs without token waste or harness lock-in.
- Support both interactive chat mode (TDD + Subagent-Driven Development) and unattended background mode (issue-to-PR).
- Establish explicit boundaries so new agent sessions know exactly where baseline work ends and what needs to be implemented next.

**Non-Goals:**
- Re-architecting foundation LLMs or embedding models.
- Building a heavy enterprise webhook daemon in v1 (deferring complex multi-user bot servers).
- Modifying proprietary harness binaries (Claude Code, ZCode, Codex run as unpatched, stock binaries).

---

## Key Architectural Decisions

### Decision 1: Universal Canonical Hub over Multi-Directory Sprawl
- **Choice**: Store real files exclusively in `.agents/skills` (project) and `~/.agents/skills` (machine), exposing single directory symlinks to `.claude/`, `.zcode/`, `.cursor/`.
- **Alternative considered**: Allowing tools (like OpenSpec or ECC) to copy duplicate files into each adapter directory.
- **Rationale**: Copying duplicates caused broken symlinks, stale versions, and context confusion (as observed in Kites). Directory symlinks guarantee 100% synchronization by the operating system kernel at zero token cost.

### Decision 2: Hybrid Model-Orchestrated SDD over Hardcoded SDK Code
- **Choice**: Direct the model to act as coordinator using structured Task Briefs, worktrees, and independent reviewer subagents (Superpowers methodology).
- **Alternative considered**: Writing a 1,000-line TypeScript SDK orchestrator locked into ZCode (`CreateWorkflow`) or DeepSeek (`dsh`).
- **Rationale**: Prompt-and-tool-driven orchestration is portable across Claude Code, ZCode, Codex, and Cursor without rewriting execution code for every platform.

### Decision 3: Compound Markdown Memory over Complex Vector Databases
- **Choice**: Save verified root causes and solutions as structured Markdown files in `docs/solutions/<topic>.md`.
- **Alternative considered**: Deploying an external Chroma/Mem0 vector database with background worker daemons.
- **Rationale**: Markdown files in Git are human-inspectable, version-controlled, branch-aware, and easily read on-demand by agents using standard `Read` tools.

---

## Risks / Trade-offs

- **[Risk: Symlink degradation on Windows]**  
  → *Mitigation*: The SessionStart hook (`.agent/hooks/auto-heal-symlinks.sh`) detects broken or missing symlinks and automatically repairs them upon session startup.
- **[Risk: Subagent ignoring task brief constraints]**  
  → *Mitigation*: The independent reviewer subagent (`sdd-reviewer`) runs in read-only mode and verifies diffs against the brief with a hard veto before any commit is finalized.

---

## Open Questions & Extension Points (Gaps for Next Sessions)

These questions are intentionally deferred for subsequent implementation stages:
1. **Outer Runner Delivery**: Should the unattended issue-to-PR runner be a simple shell script (`run-task.sh`), a Node/TS script, or a background GitHub Action?
2. **Review Retry Limit**: What is the optimal circuit-breaker threshold (3 rounds vs 5 rounds) before an implementer-reviewer stalemate triggers a human escalation?
