# Implementation Plan: Catalog Isolation, Continuous Discovery & Self-Healing

**Branch**: `005-catalog-self-healing` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

---

## Summary

Migrate the physical catalog storage to `~/.agents/catalog/skills/` (isolated from ZCode's default user-scope scanning). Implement resilient discovery in `.agent/src/catalog.ts` that unions catalog skills, active globals, and local skills, automatically archiving bypassed/manual skills into the catalog. Extend `healWorkspace()` in `.agent/src/doctor.ts` to perform multi-stage self-healing (prune dead symlinks, de-duplicate declarations, reconcile adapters, and auto-grant ZCode SHA-256 trust). Add global skill toggling commands `harness skill global on/off <name>`.

---

## Technical Context

**Runtime**: Bun, TypeScript (ESNext)
**Dependencies**: `node:fs/promises`, `node:path`, `node:os`, `node:crypto`
**Testing**: `bun test`
**Constraints**: All modules < 200 lines, zero external dependencies

---

## Architecture & Module Layout

```text
.agent/src/
├── config.ts           # Update GLOBAL_CATALOG_SKILLS_DIR = ~/.agents/catalog/skills
├── catalog.ts          # Resilient multi-source catalog scanner & autoSyncToCatalog (< 160 lines)
├── skills.ts           # Add skill from catalog storage, support global toggling (< 190 lines)
├── skills-global.ts    # Discover global active skills (zcode, claude, agents) (< 160 lines)
├── doctor.ts           # Comprehensive heal: dead symlink prune, de-duplication, adapters (< 190 lines)
└── cli-printers.ts     # CLI commands and status formatting (< 180 lines)
tests/
└── catalog-healing.test.ts # Bun tests for catalog discovery, manual skill ingest, and healing
```
