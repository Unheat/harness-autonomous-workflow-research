# Implementation Plan: Unified Resource Architecture & Scope Synchronization

**Branch**: `003-unified-resource-architecture` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

---

## Summary

Unify the domain model across all harness resources (Skills, MCPs, Hooks, Plugins) under a common 3-tier lifecycle (`Global`, `Project`, `Catalog`). Implement bi-directional lockstep sync between `.mcp.json` and `.agents/mcp.json`, automated declaration digest generation for ZCode auto-trust, and normalize status resolution in `.agent/src/resources.ts`.

---

## Technical Context

**Runtime**: Bun, TypeScript (ESNext)
**Dependencies**: `node:crypto`, `node:fs/promises`, `node:path`, `node:os`
**Testing**: `bun test`
**Constraints**: All modules < 200 lines, zero external dependencies

---

## Architecture & Module Layout

```text
.agent/src/
├── types.ts            # Central contracts (UnifiedResource, SkillScope, McpScopeState)
├── skills-global.ts    # Global skill discovery (~/.zcode/skills, ~/.claude/skills) (< 140 lines)
├── mcp-global.ts       # Global MCP resolution & autoTrustWorkspaceMcps (< 195 lines)
├── resources.ts        # Unified resource normalizer (< 80 lines)
├── mcp.ts              # Workspace MCP lockstep sync (< 160 lines)
├── skills.ts           # Workspace skill symlinks & dormant stash (< 180 lines)
└── cli-printers.ts     # Unified status & catalog formatting (< 150 lines)
tests/
├── skills-global.test.ts # Tests for global skill discovery & scope resolution
├── resources.test.ts     # Tests for unified resource normalization
└── edge-cases.test.ts    # Tests for malformed JSON, sync, auto-trust
```
