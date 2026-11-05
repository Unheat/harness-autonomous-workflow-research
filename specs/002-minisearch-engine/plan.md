# Implementation Plan: 3-Tier MiniSearch Hybrid Engine

**Branch**: `002-minisearch-engine` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-minisearch-engine/spec.md`

---

## Summary

Integrate a 3-tier hybrid search architecture using MiniSearch (BM25 + prefix matching + Levenshtein typo tolerance) into the Web Dashboard. MiniSearch is bundled locally in `.agent/ui/minisearch.js` (zero CDN/network reliance). Backend endpoints in `catalog.ts` and `server.ts` are upgraded to parse and return descriptions for active, dormant, and catalog skills, allowing users to find tools either by exact slug, prefix, capability keyword, or fuzzy approximation.

---

## Technical Context

**Language/Runtime**: TypeScript, Bun (ESNext)
**Primary Dependencies**: `minisearch` (bundled UMD in `.agent/ui/minisearch.js`)
**Testing**: `bun test`
**Target Platform**: Node/Bun local HTTP server (Darwin/Linux)
**Performance Goals**: <5ms query execution on 100+ tools
**Constraints**: 100% offline-capable, modules < 200 lines each

---

## Constitution & Architecture Compliance

1. **Clean Code (<200 Lines)**:
   - Server helpers extracted to `server-helpers.ts` keeping `server.ts` < 185 lines.
   - Core catalog routines in `catalog.ts` remain under 80 lines.
2. **Offline Resilience**:
   - Zero CDN script tags. MiniSearch is served directly from the local static assets directory (`GET /minisearch.js`).
3. **Automated Verification**:
   - Unit tests in `tests/search.test.ts` verify MiniSearch indexing, prefix boosting, description keyword matching, and typo tolerance.

---

## Proposed Changes & File Impact

```text
.agent/
├── src/
│   └── catalog.ts          # Enhance getSkillDescription for local/dormant/catalog resolution
├── ui/
│   ├── minisearch.js       # Bundled offline MiniSearch UMD
│   ├── server-helpers.ts   # Port discovery and body parsing (< 40 lines)
│   ├── server.ts           # Expose /minisearch.js and skill descriptions (< 190 lines)
│   └── index.html          # MiniSearch 3-tier search indexing and filtering
tests/
└── search.test.ts          # Bun unit tests for MiniSearch indexing and retrieval
```
