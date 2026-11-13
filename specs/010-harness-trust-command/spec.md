# Feature Specification: Explicit Cross-Harness Project Trust

**Feature Branch**: `010-harness-trust-command`
**Created**: 2026-11-12
**Status**: Implemented
**Input**: User description: "if I said trust for a folder it should work on all harness after that CLI"

## Problem

Every harness gates project resources behind its own "Trust this folder?" prompt, stored in a
different file. A headless host (desktop app or RPC) cannot show that prompt, so project skills and
MCP servers silently never load. Users had to find and edit each store by hand.

The manager must not grant trust during audit or repair (design law: a harness never gets approval on
the user's behalf). An explicit command the user runs on a named folder is the user's decision.

## User Scenarios

1. **Given** a project, **When** the user runs `harness trust .`, **Then** every detected harness with
   a documented on-disk trust format records that project as trusted, and harnesses without such a
   gate are reported as "no project-trust gate" instead of being silently skipped.
2. **Given** an already trusted project, **When** the command runs again, **Then** no file changes and
   every result says "already trusted" (idempotent).
3. **Given** unrelated projects or settings, **When** trust is granted, **Then** their entries, keys
   and MCP declarations are unchanged.
4. **Given** a workspace MCP declaration, **When** the user trusts the project for ZCode, **Then** one
   SHA-256 declaration record is written and regenerated when the declaration changes.
5. **Given** a project, **When** the user runs `harness trust --list`, **Then** the current decision is
   read back without writing anything.

## Functional Requirements

- **FR-1**: `harness trust [dir]` defaults to the workspace root and fails fast on a missing folder.
- **FR-2**: pi-family: set the canonical real path to `true` in `<agentDir>/trust.json` for every
  existing agent directory.
- **FR-3**: Claude Code: set `projects["<path>"].hasTrustDialogAccepted = true` in `~/.claude.json`.
- **FR-4**: Codex: upsert `[projects."<path>"] trust_level = "trusted"` in `~/.codex/config.toml`,
  matching the exact table so sibling paths are untouched.
- **FR-5**: ZCode: upsert one `workspace-mcp-trust-v1.json` record per local workspace MCP
  declaration, using the existing canonical-JSON SHA-256 digest format.
- **FR-6**: Harnesses without a documented trust file are reported as unsupported with a reason.
- **FR-7**: The command never runs from `heal`, `doctor`, or any background sync.
- **FR-8**: `--list` reports per-harness state without writing.

## Out of Scope

- Cursor: workspace trust lives in its own SQLite UI state; forging it is unsafe.
- Revocation (`untrust`); trust can still be removed through the harness itself.
- Project `.pi/settings.json` overrides inside the trust gate.
