# Feature Specification: Subagent Portability (registry, projection, prompt-only)

**Feature Branch**: `013-subagent-portability`
**Created**: 2026-11-14
**Status**: Implemented
**Input**: "Make swe-workflow's reviewer subagents work on every harness the manager knows, and make
the manager stop claiming registration where the harness cannot read it."

## Problem

Subagent support was one mechanism applied to seven harnesses: a Markdown file plus a
`.codex|.claude|.cursor|.dsh|.opencode|.zcode/agents -> ../.agent/agents` symlink. Three of those
cells were false:

1. **Codex** reads `*.toml` under `.codex/agents/`. Every Markdown link there was invisible, so
   `harness status` listed four active subagents that Codex could not load.
2. **pi / pi-like** has no agent registry at all. Correctly marked unsupported in the matrix, but
   `swe-workflow` had no path that worked there: its judges were simply unavailable.
3. **DSH** only reads agents through the `dsh-subagents` plugin, and only from `$DSH_HOME/agents`
   (global). A project `.dsh/agents` link is read by nothing.

A fourth, deeper issue: the canonical agent files carry the Claude dialect (`tools`,
`disallowedTools`). Harnesses that read Markdown with a different dialect (Cursor `readonly`,
OpenCode `mode`/`permission`) load the prompt but not the read-only declaration.

## Decision

Three dispatch tiers, one canonical source:

| Tier | Harness | Mechanism |
|---|---|---|
| registry | Claude Code, ZCode, Cursor, OpenCode | Markdown link, harness owns discovery |
| registry (plugin) | DSH with `dsh-subagents` | Markdown, but global `$DSH_HOME/agents` only |
| projection | Codex | generated TOML from the same `.md` |
| prompt-only | pi / any harness with no registry | skill-level `manual.md`: body as system prompt + brief |
| none | no child-task capability | skill-level `inline.md`: labelled self-audit |

## Requirements

- **FR-001**: `.agent/agents/*.md` stays the single source of truth; no projection is edited by hand.
- **FR-002**: Codex subagents MUST be generated TOML under `.codex/agents/`, carrying `name`,
  `description`, `developer_instructions`, with the canonical body verbatim.
- **FR-003**: A generated file MUST carry an ownership marker; repair rewrites or deletes only
  marked files, and preserves/reports hand-written ones.
- **FR-004**: A Markdown symlink at `.codex/agents` MUST be pruned and reported as poisonous.
- **FR-005**: Read-only declarations MUST be translated into an explicit instruction line for Codex
  (no `disallowedTools` field exists there); the limitation is reported, never faked with a
  `sandbox_mode` that would break a judge's test runs.
- **FR-006**: `harness doctor` MUST surface a missing/stale/blocked Codex projection.
- **FR-007**: `swe-workflow` MUST select a dispatch mode from the live runtime, not from folders
  present in the repository, and state `mode=registry|manual|inline` in its first update.
- **FR-008**: Manual mode MUST pass the canonical agent **body** (frontmatter stripped) as the
  child's system prompt, followed by the brief; it MUST NOT keep a second copy of that body.
- **FR-009**: Inline mode MUST label every verdict `self-audit (no independent judge)` and require
  two human checkpoints.
- **FR-010**: The shell auto-heal hook MUST apply the same adapter policy as the manager (single
  owner), including the Codex prune.

## Non-Goals

- Writing to `~/.dsh/agents` from a project installer (cross-scope pollution).
- A per-harness dialect rewriter for Cursor/OpenCode frontmatter. They load the prompt today;
  their read-only field gap is documented in the skill's `manual.md` instead.
- Auto-installing the `dsh-subagents` plugin.
