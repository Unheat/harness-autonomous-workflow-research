# Implementation Plan: Subagent Lifecycle & Token Shield Governance

**Branch**: `004-subagent-management` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

---

## Summary

Implement subagent discovery, frontmatter parsing, and Token Shield auditing across Claude Code, ZCode, Cursor, DeepSeek Harness, Codex, and OpenCode. Parse Markdown YAML frontmatter in `.agent/src/subagents.ts` (<160 lines), integrate subagent inspection into CLI (`harness agent list`) and Web UI dashboard, and verify with automated unit tests in `tests/subagents.test.ts`.

---

## Technical Context

**Runtime**: Bun, TypeScript (ESNext)
**Dependencies**: `node:fs/promises`, `node:path`, `node:os`
**Testing**: `bun test`
**Constraints**: All files < 200 lines, zero external dependencies

---

## Architecture & Module Layout

```text
.agent/src/
├── subagents.ts        # Subagent discovery, YAML frontmatter parser, Token Shield audit (< 150 lines)
├── types.ts            # SubagentInfo interface
├── cli-printers.ts     # Format subagents in CLI status and list
└── resources.ts        # Map subagents into UnifiedResource (kind: 'subagent')
tests/
└── subagents.test.ts   # Bun tests for global/project subagent parsing and token shield
```
