# Cross-Harness Agentic Workflow Architecture

This repository is configured as a **Universal Agentic Workflow Hub**. It provides a single, portable architecture that runs consistently across all major AI agent harnesses (**ZCode, Claude Code, OpenAI Codex, DeepSeek Harness (DSH), OpenCode, Cursor**) without vendor lock-in and without context pollution.

---

## 1. Core Architecture: Hub & Adapters

```
┌────────────────────────────────────────────────────────────────────────┐
│               CANONICAL HUB: .agent/ (Single Source of Truth)          │
│  ├── agents/       -> sdd-worker.md, sdd-reviewer.md (Defined once)     │
│  ├── skills/       -> Project-specific custom workflow skills          │
│  ├── workflows/    -> Plan & orchestration templates                   │
│  ├── hooks/        -> Reusable enforcement scripts                     │
│  └── scripts/      -> manage.sh (Integrity & pollution inspector)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Symlinks & Thin Adapters
      ┌─────────────────────────────┼────────────────────────────┐
      ▼                             ▼                            ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│ Claude Code  │             │    ZCode     │             │    Codex     │
│ .claude/     │             │ .zcode/      │             │ .codex/      │
│ └── agents/ ─┼──(symlink)──┤ └── agents/ ─┼──(symlink)──┤ └── agents/  │
│ CLAUDE.md    │             │              │             │ config.toml  │
└──────────────┘             └──────────────┘             └──────────────┘
      ▲                             ▲                            ▲
      │                             │                            │
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│  DeepSeek    │             │   OpenCode   │             │    Cursor    │
│ .dsh/        │             │ .opencode/   │             │ .cursor/     │
│ ├── presets/ │             │ └── agents/ ─┤             │ └── rules/   │
│ └── agents/ ─┼──(symlink)──┘              │             │ .cursorrules │
└──────────────┘                            └─────────────┴──────────────┘
```

---

## 2. Global Skills vs. Project (Folder) Skills

Modern harnesses discover skills from two distinct scopes:

| Scope | Location | Visibility | Best Use Case | Context Impact |
|---|---|---|---|---|
| **Global Skills** | `~/.agents/skills/`<br>`~/.claude/skills/`<br>`~/.zcode/skills/` | Available in **every conversation** on your machine. | Cross-cutting user preferences (e.g. `caveman`, `ui-ux-pro-max`, `codebase-memory`). | ⚠️ Adds previews to every turn unless model invocation or tool is stripped. |
| **Folder (Project) Skills** | `.agents/skills/`<br>`.claude/skills/`<br>`.zcode/skills/` | Available **only inside this repository**. | Domain workflows (e.g. `speckit-*`, project deployment). | Only impacts sessions opened in this repository. |
| **Reference Knowledge** | `docs/references/*.md` | **Not registered as skills** (Pure Markdown). | Specialized technical guidelines (regex rules, wrapper quirks). | ✅ **Zero token pollution**. Subagents only read files on-demand. |

---

## 3. Solving the Context Pollution Problem

When 30+ global skills exist on a machine, default subagents (`general-purpose`) receive 30+ skill previews on every turn.

**The Solution:**
1. **Tool Stripping in Subagents:**
   `.agent/agents/sdd-worker.md` explicitly declares:
   ```yaml
   tools: Read, Edit, Write, Bash
   disallowedTools: Skill
   ```
   When a subagent lacks the `Skill` tool, the harness **automatically excludes the skill catalog preview** from its system prompt.
2. **Instruction Enforcement (`AGENTS.md`):**
   `AGENTS.md` instructs the coordinator to always dispatch `sdd-worker` instead of `general-purpose`.

---

## 3.1 Hub Adapters: Symlinks vs. Generated Projections

Harnesses fall into two classes, and mixing them up is the most common cross-harness bug:

| Class | Harnesses | Mechanism | Why |
|---|---|---|---|
| **Hub reader** | Claude Code, Cursor, ZCode, Codex, OpenCode | Symlink `.cursor/mcp.json → ../.mcp.json` etc. | They read the shared `mcpServers` dialect verbatim. |
| **Projection consumer** | DeepSeek Harness (`.dsh/`), pi and every pi-like host (`<workspace>/.pi/mcp.json`) | Generated artifact written from the hub on every change | The dialect differs and the harness rewrites its own file; a symlink would feed the hub the harness dialect and let harness writes mutate the hub. |

Rules:

- The hub `.mcp.json` stays the single source of truth; projections are derived, never hand-maintained.
- Projections are written atomically and only when content changes, so drift is detectable and repair is safe.
- `harness doctor` reports drift, refused declarations and harness trust gaps; `harness heal` regenerates.
- A symlinked projection is poisonous: prune it, never write through it.
- Harness trust is never granted by the manager — it belongs to the harness approval flow.
- Two scopes, one owner: user scope is `~/.zcode/cli/config.json`, project scope is `.mcp.json`. Generated
  projections mirror both (`<agentDir>/mcp.json`, `<workspace>/.pi/mcp.json`), and `harness mcp sync` pushes the
  matrix non-destructively, so a hand-written harness file cannot drift.
- Projected tools default to `direct` exposure: the same `.mcp.json` must mean the same availability in every
  harness. `deferred`/`codemode` stay opt-in per server.

Detailed pi trust semantics: [`docs/solutions/pi-like-harness-projection.md`](solutions/pi-like-harness-projection.md).

---

## 4. Multi-Layer Workflow Integration

1. **Spec Layer (GitHub Spec Kit):**
   - For features, run `/speckit-specify` and `/speckit-plan` to create spec and design artifacts under `.specify/` and `specs/`.
   - Requires human review before implementation.
2. **Execution Layer (Superpowers SDD & TDD):**
   - The coordinator breaks the spec into small tasks.
   - For each task, dispatches an isolated `sdd-worker` in a fresh context window.
   - Runs TDD: write failing test (RED) $\rightarrow$ minimal code (GREEN) $\rightarrow$ refactor.
   - Dispatches `sdd-reviewer` to audit diff and test evidence before marking complete.
3. **Isolation Layer (Git Worktrees):**
   - Work happens inside `.worktrees/<branch-name>`.
   - `.worktrees/` is git-ignored to prevent recursive commits.
4. **Memory Layer (Compound Engineering Pattern):**
   - After completing a task, summarize root cause and fix in `docs/solutions/<topic>.md`.
   - Future sessions check `docs/solutions/` before planning.

---

## 5. Verification & Management

Run the management script at any time to verify symlinks and check for context pollution:

```bash
./.agent/scripts/manage.sh
```
