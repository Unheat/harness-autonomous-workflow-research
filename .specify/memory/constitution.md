# Universal Agentic Workflow Engine Constitution

## Core Principles

### I. Universal Agent Standard (.agents/ as Single Source of Truth)
All agent skills and custom subagents MUST have their canonical home in `.agents/skills` (project-scoped) or `~/.agents/skills` (machine-global). Adapter folders (`.claude/`, `.zcode/`, `.cursor/`, `.dsh/`, `.codex/`, `.opencode/`) MUST NEVER hold physical duplicates. They MUST link to the canonical source via directory symlinks. New skills are installed strictly using the standard Vercel `skills` CLI with `-a universal`.

### II. 3-Layer Cross-Harness Enforcement
Standards MUST NOT rely solely on model adherence. Every project enforces a 3-layer defense:
1. **OS Filesystem Layer**: Directory symlinks redirect writes transparently at the kernel level with zero token cost.
2. **Instruction Protocol Layer**: `AGENTS.md` (referenced by minimal pointers in `CLAUDE.md`, `.cursorrules`, etc.) acts as universal cross-harness law.
3. **Active Safety Net**: PreToolUse guard hooks (`guard-skills.py`) intercept and abort rogue writes, and SessionStart hooks (`auto-heal-symlinks.sh`) automatically repair broken symlinks on startup.

### III. Zero Token Waste & Context Hygiene (Tool Stripping)
Subagents MUST NOT inherit global skill previews. Worker subagents (`sdd-worker`) MUST explicitly strip the `Skill` tool via `disallowedTools: Skill` in their configuration. The coordinator agent passes only focused, self-contained Task Briefs with domain references read on-demand, preventing 7,000+ tokens of skill catalog pollution per turn.

### IV. Test-Driven Development (TDD) Non-Negotiable
Code modifications MUST follow a strict TDD cycle:
1. **RED**: Write an automated test reproducing the issue or defining the new requirement; verify test failure.
2. **GREEN**: Write the minimal code necessary to make the test pass.
3. **REFACTOR**: Clean up code and abstractions while keeping test green.
No code is approved without corresponding test coverage and execution evidence.

### V. Dual-Gate Subagent-Driven Review (SDD)
Every implementation task MUST be audited by an independent, read-only reviewer subagent (`sdd-reviewer`) before being committed. The reviewer verifies two independent gates:
- **Gate 1 (Spec Compliance)**: Does the implementation satisfy all requirements in the task brief without scope creep?
- **Gate 2 (Code Quality & Hygiene)**: Does code follow project conventions, pass linters/types, include test evidence, and avoid regressions?
Findings must be backed by exact `file_path:line_number` citations.

### VI. Compound Learning & Solution Persistence
Verified bug fixes, non-obvious architecture insights, and debugging root causes MUST be distilled into structured markdown notes in `docs/solutions/<topic>.md`. Future agents MUST consult `docs/solutions/` during planning before attempting to solve related problems.

---

## Workflow Hierarchy & Process Routing

Projects governed by this constitution route tasks through a 3-tier hierarchy:
1. **Tier 1 (Micro / Routine Tasks)**: Direct implementation via TDD (`Red -> Green -> Refactor`) using `sdd-worker`. No formal spec required.
2. **Tier 2 (Bug Fixes & Diagnosis)**: Spec Kit Bug Extension (`/speckit-bug-assess`, `/speckit-bug-fix`, `/speckit-bug-test`) with root-cause reports in `.specify/bugs/<slug>/`.
3. **Tier 3 (Features & Architecture)**: Full Spec Kit SDD (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, `/speckit-converge`) with specifications tracked in `specs/<feature>/`.

---

## Governance & Ratification

- This Constitution supersedes all ad-hoc agent instructions.
- Changes to core principles require updating this file, recording the amendment, and verifying that hooks and subagent definitions remain in lockstep.
- All Pull Requests and automated checks MUST pass verification against these principles.

**Version**: 1.0.0 | **Ratified**: 2026-11-02 | **Status**: Active
