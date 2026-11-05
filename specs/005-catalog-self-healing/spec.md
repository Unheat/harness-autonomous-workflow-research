# Feature Specification: Catalog Isolation, Continuous Discovery & Self-Healing

**Feature Branch**: `005-catalog-self-healing`
**Created**: 2026-11-05
**Status**: Ready
**Input**: True dormant catalog storage (`~/.agents/catalog/skills/`), auto-discovery of bypassed/manual installations, duplicate resolution, and comprehensive self-healing (`harness heal`).

---

## User Scenarios & Acceptance Criteria *(mandatory)*

### User Story 1 - True Dormant Catalog Storage (Priority: P1) 🎯

As an agent and user, I want the central skill catalog stored in `~/.agents/catalog/skills/` rather than directly in `~/.agents/skills/`, so that harnesses (ZCode, Claude Code, Cursor, Codex, DSH) never scan catalog skills as active user-scope skills (0 idle tokens).

**Acceptance Scenarios**:
1. **Given** 40+ skills in `~/.agents/catalog/skills/`, **When** any project opens without linking them, **Then** 0 tokens of skill previews are injected into LLM context.
2. **Given** `harness skill add <name>`, **When** executed, **Then** a symlink is created in `.agents/skills/<name>` pointing to `~/.agents/catalog/skills/<name>`.

---

### User Story 2 - Resilient Auto-Discovery of Bypassed/Manual Skills (Priority: P1) 🎯

As a developer who might manually `git clone`, `npx skills-cli`, or copy skills directly into `~/.zcode/skills/`, `~/.claude/skills/`, `~/.agents/skills/`, or local `.agents/skills/`, I want the engine to dynamically discover these uncataloged skills and automatically register them into the central catalog.

**Acceptance Scenarios**:
1. **Given** a skill manually dropped into `~/.zcode/skills/my-manual-skill`, **When** `listGlobalActiveSkills()` or `getCatalogSkills()` runs, **Then** `my-manual-skill` is discovered, auto-synced to `~/.agents/catalog/skills/my-manual-skill`, and available in the catalog.
2. **Given** a project-private skill in `.agents/skills/private-feat`, **When** listed, **Then** it is recognized as `[Project]` scope without polluting the global active context.

---

### User Story 3 - Comprehensive Self-Healing & De-Duplication (`harness heal`) (Priority: P1) 🎯

As a developer whose environment might suffer from broken symlinks, duplicate files across harnesses, or altered GUI settings, I want `harness heal` to automatically audit, reconcile, de-duplicate, and heal all resources.

**Acceptance Scenarios**:
1. **Given** broken symlinks pointing to deleted skill targets, **When** `harness heal` runs, **Then** dead links are safely pruned with a report.
2. **Given** duplicated skills across multiple global folders, **When** `harness heal` runs, **Then** duplicates are reconciled into canonical catalog storage without data loss.
3. **Given** un-trusted or altered workspace MCPs, **When** `harness heal` runs, **Then** SHA-256 trust digests are recalculated and recorded into `workspace-mcp-trust-v1.json`.
4. **Given** missing harness adapter links (`.claude/skills`, `.zcode/skills`, `.dsh/skills`, `.codex/skills`, `.opencode/skills`), **When** `harness heal` runs, **Then** all 5 adapter links are verified and recreated.

---

### User Story 4 - Granular Global Skill Toggling (Priority: P2)

As a developer, I want CLI commands `harness skill global on <name>` and `harness skill global off <name>` to mirror MCP global controls, allowing me to explicitly promote catalog skills to global user scope or demote them back to dormant.

**Acceptance Scenarios**:
1. **Given** `harness skill global on <name>`, **Then** symlinks are created in `~/.zcode/skills/<name>` and `~/.claude/skills/<name>`.
2. **Given** `harness skill global off <name>`, **Then** global symlinks are unlinked, keeping the catalog source intact.
