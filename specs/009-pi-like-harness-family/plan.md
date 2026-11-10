# Implementation Plan: pi-like Harness Family Support (Spec 009)

**Branch**: `009-pi-like-harness-family` | **Date**: 2026-11-10

---

## 1. Architecture

```
            .mcp.json  (HUB — single source of truth, shared dialect)
                 │
                 │  read (never written by a harness adapter)
                 ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ services/pi-mcp-dialect.ts      translate hub -> pi dialect  │
   │ services/pi-mcp-projection.ts   inspect / atomic sync        │
   │ services/pi-harness-trust.ts    agent dirs + trust resolution│
   └──────────────────────────────────────────────────────────────┘
                 │                                  │
                 ▼                                  ▼
     <workspace>/.pi/mcp.json               doctor findings
     (GENERATED file, never a symlink)      (drift, rejections, trust gaps)
                 │
                 ▼
     pi-like harness reads it — only when the project is trusted
```

**Why generated, not symlinked (differs from Claude/Cursor adapters):** the dialects differ (`transport` vs
`type`, SSE rejection, `-`/`_` namespace collapse, `enabled: false` semantics), and pi rewrites the file that
defines a server when exposure or enabled state changes. A symlink would both feed hub keys to pi verbatim and
turn any harness-side write into a mutation of the shared hub.

**Why the DSH path already differs:** DSH is patched through `cordis.patch.yml` (a YAML projection), and a
`.dsh/mcp.json` is actively poisonous. pi is the same class of adapter — a projection consumer — so it reuses
that pattern instead of the `ADAPTER_SYMLINKS` pattern used by harnesses that genuinely read `.mcp.json`.

---

## 2. Phase 1 — Dialect and lifecycle

- Constants live in `.agent/src/config.ts` (`PI_PROJECT_CONFIG_DIR`, `PI_PROJECT_MCP_BASENAME`, `PI_TRUST_BASENAME`,
  `PI_AGENT_DIR_ENV`, `PI_LIKE_AGENT_DIRS_ENV`, `PI_DEFAULT_AGENT_SUBPATH`); no magic strings at call sites.
- `pi-mcp-dialect.ts`: `buildPiMcpEntry` (stdio/HTTP, dormant, passthrough `exposure`/`toolExposure`/`timeout`),
  `buildPiProjection` (namespace collapsing), `serializePiProjection` (byte-stable).
- `pi-mcp-projection.ts`: `getPiProjectMcpPath`, `inspectPiProjection` (`current`/`missing`/`stale`/`blocked`),
  `syncPiProjectMcps` (atomic temp+rename, idempotent, skip on symlink or empty workspace).

## 3. Phase 2 — Wiring

- `mcp.ts`: `saveLocalMcps` regenerates the projection after the hub write (same place DSH sync already runs).
- `workspace.ts`: `GENERATED_PROJECTION_FILES` becomes `{path, keepPhysicalFile}` defs; reconcile prunes
  `.dsh/mcp.json` always and `.pi/mcp.json` only when symlinked; `initWorkspace` projects the empty hub.
- `doctor.ts`: audits poisonous projections, drift, refused declarations, trust gaps; heal regenerates.
- `clean-global.ts`: discovers `<agentDir>/mcp.json` for every existing pi-like agent dir.
- `cli-printers.ts`: one status line with projection count and state.

## 4. Phase 3 — Trust, tests, docs

- `pi-harness-trust.ts` mirrors pi exactly: canonical (real-path) keys, nearest-ancestor lookup, tolerant JSON
  read, and a hard rule that trust is reported, never written (matches the deprecated `autoTrustWorkspaceMcps`
  doctrine and Spec 006 "workspace operations cannot grant global MCP trust").
- `tests/pi-projection.test.ts` covers dialect, lifecycle, trust, symlink poisoning and `mcp on/off` integration.
- Docs: `docs/ARCHITECTURE.md` projection rule and `docs/solutions/pi-like-harness-projection.md`.

## 5. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Trust store keyed by non-canonical path silently unmatched (macOS `/var` → `/private/var`) | Resolve with realpath, mirroring pi; covered by a dedicated test |
| Harness-side write mutating the hub | Symlinked projection is `blocked`; heal prunes it |
| Partial projection after a crash | temp file + rename |
| Silent drift after manual edits | byte-stable serialization + `stale` state in doctor/status |
| Machine-wide MCP loss when centralizing | Only existing agent dirs are scanned; servers move to the catalog first, then are removed from the harness (existing documented policy) |
