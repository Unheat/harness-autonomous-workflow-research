# Plan: Skill Catalog Promotion & Cross-Workspace Import

## Design

Two directions, one owner each:

```
project-local folder ──promote──▶ ~/.agents/catalog/skills/<name> ──link──▶ workspace entry
                                             ▲
another workspace's skill ──import (link or copy)──▶ target workspace
```

- The catalog stays the single machine-wide owner (Spec 003 / design law). Promotion makes it the
  owner of a folder that was previously private; import never touches it.
- Import preserves the source's *nature* rather than normalising it: a link stays a link (content is
  shared, nothing duplicated), a private folder stays private. Deciding to widen a skill to
  machine scope remains an explicit user act (the catalog button).
- Every refusal is reported with its reason; nothing is silently overwritten, merged or deleted.

## Modules

| File | Responsibility |
|---|---|
| `.agent/src/skill-promote.ts` | `promoteSkillToCatalog()`: validation, catalog copy, staged folder→symlink swap |
| `.agent/src/skill-import.ts` | `listImportableSkills()`, `importSkillFromWorkspace()`, source/target validation, catalog containment check |
| `.agent/src/catalog.ts` | `isSkillInCatalog()` (name-based existence check shared by both flows) |
| `.agent/src/services/directory-picker.ts` | `chooseDirectory()`: async `osascript` folder chooser, cancel/timeout handling |
| `.agent/src/skills.ts` | Active-over-dormant precedence in `listLocalSkills`; idempotent `addSkill`; dormant-twin cleanup in `removeSkill` |
| `.agent/src/skills-global.ts` | `inCatalog` on `EffectiveSkillInfo`; resolver prefers the non-dormant entry |
| `.agent/ui/routes-skill-transfer.ts` | `POST /api/skill/to-catalog`, `/api/skill/import/list`, `/api/skill/import`, `/api/dialog/choose-directory` |
| `.agent/ui/index.html` | Per-row catalog button, Import modal, badges, toast wiring |
| `tests/skill-promote.test.ts` | Promotion, relink, conflict refusal, guards |
| `tests/skill-import.test.ts` | Listing, link/copy import, conflicts, invalid sources |

Route handlers live in a separate router module (not `routes.ts`) so each file keeps one purpose and
stays under the 200-line guideline. `sendJson` moved to `server-helpers.ts` so both routers share it.

## API

| Endpoint | Body | Result |
|---|---|---|
| `POST /api/skill/to-catalog` | `{ name }` | `{ success, message }` |
| `POST /api/skill/import/list` | `{ sourceRoot }` | `{ success, message, sourceRoot, skills[] }` |
| `POST /api/skill/import` | `{ sourceRoot, name }` | `{ success, message }` |
| `POST /api/dialog/choose-directory` | — | `{ success, path?, cancelled?, message }` |

All are answered with HTTP 200 and an `OperationResult`-shaped body, matching the existing routes.

## Decisions

| Question | Decision | Reason |
|---|---|---|
| What happens when the catalog already has the name? | Refuse, keep both copies | A silent overwrite destroys one of two divergent skills |
| Copy or move on promotion? | Copy into catalog, then swap the original for a symlink | The catalog must be complete before the source disappears; staging restores on failure |
| Is `inCatalog` checked by name or realpath? | Name for the button; canonical realpath for `linkedFromCatalog` | An alias symlink (`kite/ui-demo-linked → catalog/harness-protocol`) is catalog-owned content with a different entry name; macOS `/var` → `/private/var` requires canonicalisation |
| Do we trust the source workspace's symlink target? | Re-resolve and verify `SKILL.md` exists before linking | A broken link must not be propagated |
| Does import create catalog entries? | Never | Promotion is the explicit widening step |
| How does the browser choose a folder? | Server-side `osascript` (macOS), typed path otherwise | A page cannot read an absolute path from `<input webkitdirectory>`; the dashboard is localhost-first |
| Foreign skill names in HTML | List rows built with escaped text, Import bound via `addEventListener` | Skill names come from another repository |

## Safety

- Every path is validated at the boundary: `isValidSkillName` for names, real directory + `.agents`
  presence for source roots, target ≠ source.
- Promotion: catalog copy is verified (`SKILL.md` present) by `syncSkillToCatalog` before the swap;
  the original folder is renamed to `.promote-<name>-<pid>` and restored if `symlink()` throws.
- Import of a physical folder uses `fsp.cp(..., { recursive: true, dereference: true })`, so nested
  symlinks do not create a copy that points back into the source workspace.
- Duplicate-name handling: active entry wins over a dormant twin everywhere, so the dashboard cannot
  report a loaded skill as dormant, and both toggle directions converge on one entry.
- The folder picker kills a hung dialog after 5 minutes and maps AppleScript `-128` to "cancelled"
  instead of an error.

## Verification

- `tests/skill-promote.test.ts`: promote + relink + no staging leftovers; divergent catalog refusal
  preserving both sides; guards for unknown, invalid and already-linked entries.
- `tests/skill-import.test.ts`: listing flags (`isLink`, `inCatalog`, `linkedFromCatalog`,
  `description`); symlink stays symlink (realpath equality), private folder stays a physical directory
  and never reaches the catalog; re-import refused; conflict marker; same-workspace, non-workspace and
  invalid-name refusals.
- Live: dashboard restarted, `/api/status` exposes `inCatalog`, temp source workspace listed and
  imported over HTTP (link + copy), promotion over HTTP relinked the entry, full suite 156 passing.
- Dashboard inline JS passes `node --check`; every `getElementById` target exists in the DOM.
