# Proposed Workflow Engine Design (System Blueprint)

This document contains the proposed architecture rules and lifecycle patterns for the universal workflow engine being designed and developed in this repository.

---

## 1. Task Routing & Lifecycle (3-Tier Hierarchy)

- **Tier 1: Micro / Routine Tasks (Typos, isolated bugfix in 1-2 files, quick refactor):**
  - Implement directly using strict TDD (Test-Driven Development: Red -> Green -> Refactor) with `sdd-worker`.
  - Verify with local test runner before completing. No formal specification required.
- **Tier 2: Bug Fixes & Behavior Diagnosis:**
  - Use GitHub Spec Kit's bug extension:
    - `/speckit-bug-assess "<symptom>" slug=<bug-name>`: Assess cause and scope.
    - `/speckit-bug-fix slug=<bug-name>`: Apply minimal verified fix.
    - `/speckit-bug-test slug=<bug-name>`: Verify fix and generate report under `.specify/bugs/<slug>/`.
- **Tier 3: Features & Architectural Changes (New features, system refactoring):**
  - **Step 1 (Specify):** Run `/speckit-specify` to define requirements and prioritized user stories in `specs/<feature>/spec.md`.
  - **Step 2 (Plan):** Run `/speckit-plan` to design technical architecture in `specs/<feature>/plan.md` and check `.specify/memory/constitution.md`.
  - **Step 3 (Tasks):** Run `/speckit-tasks` to generate bite-sized, testable task checklist in `specs/<feature>/tasks.md`.
  - **Step 4 (Execute):** Run `/speckit-implement` via Subagent-Driven Development (SDD) delegating to `sdd-worker` and auditing with `sdd-reviewer`.
  - **Step 5 (Converge):** Run `/speckit-converge` to assess codebase parity and capture remaining items until converged.

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
