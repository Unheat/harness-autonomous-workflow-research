# Implementation Plan: Universal Cross-Harness Agentic Workflow Engine

**Branch**: `001-universal-workflow-engine` | **Date**: 2026-11-02 | **Spec**: [specs/001-universal-workflow-engine/spec.md](spec.md)

**Input**: Feature specification from `specs/001-universal-workflow-engine/spec.md`

---

## Summary

Build a cross-harness agentic workflow system that operates seamlessly across Claude Code, ZCode, Codex, DeepSeek Harness, Cursor, and OpenCode. The architecture combines:
1. **Filesystem Canonicalization**: `.agents/skills` and `~/.agents/skills` as Single Source of Truth with zero-token symlink adapters.
2. **Subagent Governance**: Tool-stripped worker subagents (`sdd-worker`) to prevent context pollution, paired with independent dual-gate reviewers (`sdd-reviewer`).
3. **Spec-Driven Process**: GitHub Spec Kit (`.specify/`) providing project constitution, feature specs, plans, and task lists, combined with TDD for execution.
4. **Compound Learning**: Markdown-based solution distillation (`docs/solutions/`) for perpetual institutional knowledge.

---

## Technical Context

**Language/Version**: TypeScript 5.x, Bun 1.1+, Node.js 20+, Bash 4+

**Primary Dependencies**:
- Bun runtime (`bun run`, `bun test` native test runner)
- GitHub Spec Kit (`specify-cli` via `uv`)
- Vercel `skills` CLI (`npx skills`)
- Git (worktrees, branch isolation, diff verification)

**Storage**: Local filesystem, Git version control, structured Markdown (`.specify/`, `docs/solutions/`, `.agents/`), JSON configs (`.mcp.json`, `~/.agents/catalog/mcps.json`)

**Testing**: `bun test` for TypeScript modules (<25ms execution, 100% pass), ShellCheck for bash scripts, pytest for python hooks

**Target Platform**: macOS, Linux (POSIX compliant)

**Project Type**: Developer Tooling / Agentic Workflow Standard & Harness Hub

**Constraints**:
- Zero proprietary cloud runtime lock-in
- Zero duplicate files across adapter directories
- Zero skill catalog preview tokens injected into worker subagents
- Zero runtime type errors (100% strongly-typed TypeScript)
- Modules < 200 lines each following clean code standards

---

## Constitution Check

*GATE: Verified against `.specify/memory/constitution.md`*

| Principle | Status | Notes |
|---|---|---|
| I. Universal Agent Standard | PASS | Canonical hub at `.agents/skills`, single directory symlinks from adapters |
| II. 3-Layer Defense | PASS | Layer 1 symlinks, Layer 2 AGENTS.md, Layer 3 guard hooks & auto-heal |
| III. Zero Token Waste | PASS | `disallowedTools: Skill` active in `sdd-worker.md` |
| IV. TDD Non-Negotiable | PASS | Mandated Red -> Green -> Refactor cycle before task completion |
| V. Dual-Gate SDD Review | PASS | Independent `sdd-reviewer` audits spec compliance & code quality |
| VI. Compound Learning | PASS | Markdown memory template established in `docs/solutions/` |

---

## Project Structure

```text
/Users/dangtruongan/study/workflow/
├── package.json                 # Project manifest ("scripts": { "test": "bun test" })
├── tsconfig.json                # Strict TypeScript configuration
├── .agent/
│   ├── src/                     # Strongly Typed Core Modules (< 200 lines each)
│   │   ├── types.ts             # Central interfaces (McpServerConfig, WorkspacePaths, AuditResult)
│   │   ├── config.ts            # Path constants, color codes, token weight constants
│   │   ├── workspace.ts         # Workspace root discovery & directory initialization
│   │   ├── catalog.ts           # Central machine catalog reader & frontmatter parser
│   │   ├── skills.ts            # Type-safe skill activation, deactivation & local creation
│   │   ├── mcp.ts               # Local .mcp.json management & catalog registration
│   │   └── doctor.ts            # Cross-harness symlink audit, healing & global cleanup
│   ├── scripts/
│   │   ├── harness.ts           # Type-safe CLI & interactive REPL (#!/usr/bin/env bun)
│   │   ├── manage.sh            # Cross-harness diagnostic script
│   │   └── auto-heal-symlinks.sh # SessionStart symlink repair hook
│   ├── hooks/
│   │   └── guard-skills.py      # PreToolUse write interceptor (prevents adapter pollution)
│   ├── agents/
│   │   ├── sdd-worker.md        # Canonical worker config (disallowedTools: Skill)
│   │   └── sdd-reviewer.md      # Canonical reviewer config (read-only)
│   └── ui/
│       ├── server.ts            # Type-safe dashboard HTTP server (#!/usr/bin/env bun)
│       └── index.html           # Vibe-coder minimalist UI
├── tests/                       # TypeScript Unit Test Suite (bun test)
│   ├── workspace.test.ts        # Workspace root and path tests
│   ├── skills.test.ts           # Skill symlink, boundary validation & idempotency tests
│   ├── mcp.test.ts              # MCP on/off, enabled flag & catalog preservation tests
│   └── doctor.test.ts           # Symlink audit, broken-link detection & healing tests
├── .mcp.json                    # Active workspace MCP servers
├── .agents/
│   ├── skills/                  # Active workspace skills (symlinks or local-only)
│   └── mcp.json ──► ../.mcp.json
├── .claude/skills ──► ../.agents/skills
├── .zcode/skills  ──► ../.agents/skills
├── .cursor/skills ──► ../.agents/skills
├── .dsh/skills    ──► ../.agents/skills
├── .dsh/agents    ──► ../.agent/agents
├── .specify/                    # GitHub Spec Kit root
│   ├── memory/constitution.md
│   ├── templates/
│   └── scripts/bash/
├── specs/
│   └── 001-universal-workflow-engine/
│       ├── spec.md              # Feature specification (US1 - US12)
│       ├── plan.md              # Implementation plan (this document)
│       ├── architecture.md      # Blueprint & donor synthesis
│       └── tasks.md             # Actionable task list
└── AGENTS.md                    # Canonical cross-harness instruction protocol
```
│   │   └── sdd-reviewer.md         # Canonical reviewer config (read-only)
│   ├── hooks/
│   │   ├── auto-heal-symlinks.sh   # SessionStart symlink healing hook
│   │   └── guard-skills.py         # PreToolUse unauthorized write guard
│   └── scripts/
│       ├── manage.sh               # Health check and diagnostic status script
│       ├── install-skill.sh        # Canonical skill installer wrapper
│       └── run-task.sh             # (Phase 2) Autonomous worktree runner
├── .agents/
│   └── skills/                     # Canonical project skills directory
├── .claude/
│   ├── skills -> ../.agents/skills
│   ├── agents -> ../.agent/agents
│   └── settings.json               # Claude Code hook registrations
├── .zcode/
│   ├── skills -> ../.agents/skills
│   └── agents -> ../.agent/agents
├── .cursor/
│   └── skills -> ../.agents/skills
├── .codex/
│   └── agents -> ../.agent/agents
├── .dsh/
│   ├── skills -> ../.agents/skills
│   └── agents -> ../.agent/agents
├── .specify/                       # GitHub Spec Kit root
│   ├── memory/
│   │   └── constitution.md         # Project constitution and workflow rules
│   ├── templates/                  # Spec, plan, tasks, checklist templates
│   └── scripts/bash/               # Spec Kit bash automation scripts
├── specs/
│   └── 001-universal-workflow-engine/
│       ├── spec.md                 # Feature specification
│       ├── plan.md                 # Implementation plan (this document)
│       └── tasks.md                # Actionable task list
├── docs/
│   ├── references/                 # Domain guides loaded on-demand
│   └── solutions/                  # Compound verified bug fixes and architecture notes
├── AGENTS.md                       # Canonical cross-harness instruction protocol
├── CLAUDE.md                       # Pointer to AGENTS.md
└── .cursorrules                    # Pointer to AGENTS.md
```

---

## Key Design Decisions

1. **GitHub Spec Kit (`.specify/`) as Official SDD Standard**:
   Replaces OpenSpec with GitHub Spec Kit (`specify-cli`). Provides native GitHub backing, rich templates (`spec.md`, `plan.md`, `tasks.md`, `constitution.md`), and integrations for Claude Code, Cursor, Copilot, and DeepSeek Harness.
2. **Vendored Core Prompts with Automated Upstream Sync (Option D)**:
   Instead of forcing downstream users to install Superpowers globally into `~/.agents/skills` (which causes symlink errors on fresh clones and leaks 50 global skill previews), we **vendor the essential prompt templates** into `.agent/templates/sdd/` inside the repo. We provide an automated `./.agent/scripts/sync-upstream.sh` script to pull and diff against upstream Superpowers without polluting local context.
3. **3-Tier Workflow Progression**:
   - Micro/Routine: Direct TDD via `sdd-worker`.
   - Bug Diagnosis: Spec Kit bug extension (`/speckit-bug-assess`, `/speckit-bug-fix`, `/speckit-bug-test`).
   - Feature/System: Full Spec Kit SDD (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, `/speckit-converge`).
4. **Dynamic Home Paths & Zero-Setup Portability**:
   All scripts, hooks, and configuration files must resolve `$HOME` or use `get_repo_root()` dynamically without hardcoding `/Users/dangtruongan/`. A top-level `./setup.sh` configures everything for new users in one command.
