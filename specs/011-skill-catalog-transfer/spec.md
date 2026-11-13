# Feature Specification: Skill Catalog Promotion & Cross-Workspace Import

**Feature Branch**: `011-skill-catalog-transfer`
**Created**: 2026-11-13
**Status**: Implemented
**Input**: User description: "add a function that can local skill to catalog ... a button for local skill can be add to catalog ... also like it should have a 'import local skill from workspace' button ... it should maintain the status like if it is symlink ... it is already in catalog then it should symlink to kite's only, if it is a local copy not in catalog then it should copy as local not in catalog to kites as well"

## Problem

The 3-tier lifecycle (Spec 003) says the catalog is the machine-wide store and a workspace entry is
either a projection of it (symlink) or a project-private folder. Only one direction existed:

- catalog → workspace: `addSkill()` symlinks a catalog skill into the workspace. Works.
- workspace → catalog: nothing. A project-private skill (`swe-workflow`) could only reach another
  workspace (`kite`) by hand-copying files, or by the user manually creating
  `~/.agents/catalog/skills/<name>` and hoping `doctor` adopted it.

Two consequences followed:

1. A genuinely reusable skill stays trapped in the repo that happened to author it.
2. There is no supported way to *reuse* another workspace's skills at all. The dashboard shows only
   the current workspace, so "bring `swe-workflow` into `kite`" requires leaving the manager.

`clean-global` already mirrors *global* skills into the catalog, so the missing piece is specifically
the project-local skill and the cross-repo transfer.

## User Scenarios

1. **Given** a workspace with a private local skill (`swe-workflow`), **When** the user clicks the
   catalog button on that row, **Then** the skill is copied into `~/.agents/catalog/skills/`, the
   workspace entry becomes a symlink to that copy, and the button disappears because the name is now
   catalog-owned.
2. **Given** a promoted skill, **When** another workspace links it (toggle on, or import), **Then**
   both workspaces read the same content; editing it anywhere updates everywhere.
3. **Given** the manager opened on workspace `kite`, **When** the user chooses the `workflow` folder
   in the import dialog and scans it, **Then** every active local skill of `workflow` is listed with
   its nature (symlinked vs private folder) and whether the catalog owns that name.
4. **Given** that list, **When** the user imports a symlinked skill, **Then** `kite` gets a symlink to
   the same content — not a copy. **When** the user imports a private folder skill, **Then** `kite`
   gets its own private copy and the catalog is untouched.
5. **Given** the target already has a skill with that name (active or dormant), **When** the user
   scans, **Then** the row is marked unavailable instead of silently overwriting anything.
6. **Given** a local folder whose name collides with an existing catalog skill, **When** the user
   clicks the catalog button, **Then** the operation is refused and both copies are preserved.
7. **Given** an active skill and a leftover dormant folder with the same name, **When** the dashboard
   loads, **Then** the skill is reported active and its toggle works in both directions.

## Functional Requirements

- **FR-1**: The effective skill list exposes `inCatalog`, so the UI can decide whether promotion
  applies without a second request.
- **FR-2**: Promotion (`.agent/src/skill-promote.ts`) validates the name, requires an active
  *physical* directory with a `SKILL.md`, and refuses when the name already exists in the catalog.
- **FR-3**: Promotion copies the folder into the catalog, then replaces the workspace entry with a
  symlink to the catalog path. The folder is staged before the swap; a failed symlink restores it.
- **FR-4**: Promotion of an already-symlinked entry is refused with the resolved target, never
  re-linked or overwritten.
- **FR-5**: Import listing (`.agent/src/skill-import.ts`) accepts any folder containing
  `.agents/skills/`, rejects a missing folder, a non-workspace folder, and the target itself.
- **FR-6**: Listing reports, per skill: `name`, `isLink`, `linkTarget`, `inCatalog` (name),
  `linkedFromCatalog` (canonical realpath inside the catalog), `description`, and a `conflict` marker
  when the target already holds that name as `active` or `dormant`.
- **FR-7**: Importing a symlinked source recreates a symlink to the resolved real path; importing a
  physical folder copies it recursively (dereferenced) into `.agents/skills/`.
- **FR-8**: Import never writes to the catalog, and refuses when the name is already present in the
  target as active or dormant.
- **FR-9**: Broken symlinks and entries without `SKILL.md` are skipped by the listing and rejected by
  an explicit import request.
- **FR-10**: Resource names are validated at every boundary with the existing `isValidSkillName`
  (no separators, no `..`, no whitespace padding).
- **FR-11**: An active skill always outranks a dormant folder of the same name, in `listLocalSkills`
  and in the effective resolver, so toggle on/off works in the presence of stale duplicates.
- **FR-12**: The dashboard exposes a per-row catalog button (only for active, physical, not-yet-in-
  catalog skills) and an "📥 Import" dialog with a native macOS folder chooser, a typed-path
  fallback, and per-row Import buttons bound programmatically (foreign names never reach inline JS).

## Out of Scope

- MCP servers, hooks, plugins and subagents: this feature covers skills only. MCP already has a
  catalog (`mcps.json`) with its own flow.
- Merging or three-way reconciling a divergent local folder against a catalog skill. The manager
  refuses instead of guessing which side wins (design law: report, do not fake).
- Batch import ("bring every skill from that folder") and automatic re-sync after the import.
- Remote dashboards: the native folder chooser runs server-side and is macOS-only; other platforms
  fall back to a typed path.
- Deleting a skill from the catalog as part of this flow (still available through the existing
  delete prompt / global scope controls).
