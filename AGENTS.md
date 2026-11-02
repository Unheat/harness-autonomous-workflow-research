# Project Agent Guidelines & Workflow Rules

This document is the **Single Source of Truth** for all AI coding agents working in this repository (ZCode, Claude Code, Codex, DeepSeek Harness, OpenCode, Cursor).

---

## 1. Task Routing & Lifecycle

- **Small Tasks (Fix typos, bugfix in 1-2 files):**
  - Implement directly using TDD (Test-Driven Development).
  - Verify with local test runner before completing.
- **Large / Ambiguous Tasks (New features, architectural refactoring):**
  - **Step 1:** Use OpenSpec (`/opsx:propose` or `openspec change`) to define requirements and acceptance criteria.
  - **Step 2:** Stop and wait for user approval of the spec.
  - **Step 3:** Break into an implementation plan with bite-sized tasks (2-5 minutes each).
  - **Step 4:** Execute tasks via Subagent-Driven Development (SDD).

---

## 2. Subagent & Skill Scoping Rules

To prevent context pollution and token waste:
1. **Implementer subagent:** Always dispatch using type `sdd-worker` (configured in `.agent/agents/sdd-worker.md` with tool `Skill` stripped).
2. **Reviewer subagent:** Always dispatch using type `sdd-reviewer` (read-only verification).
3. **Task Briefs:** Hand off requirements to subagents via dedicated brief files, never by dumping full conversation history.
4. **Domain References:** Specialized domain knowledge lives in `docs/references/*.md`. Instruct workers to `Read` specific files on-demand.

---

## 3. Worktree Isolation

- For multi-task plans or non-trivial branches, work in an isolated worktree under `.worktrees/<branch-name>`.
- Always verify `.worktrees/` is in `.gitignore` before creating worktrees.
- Verify clean test baseline before applying changes.

---

## 4. Compound Memory (Lessons Learned)

- **Before Planning:** Check `docs/solutions/` for known pitfalls and previous architectural decisions.
- **After Completion:** When finishing a development branch or solving a non-obvious bug, summarize the root cause, verified fix, and key files in `docs/solutions/<topic>.md`.
