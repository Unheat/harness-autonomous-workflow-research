# Tasks: Explicit Cross-Harness Project Trust

- [x] T001 Add `trustProject()` / `listTrust()` with per-harness adapters (`.agent/src/services/harness-trust.ts`).
- [x] T002 Grant pi trust in every existing agent directory, preserving other entries.
- [x] T003 Grant Claude Code trust without disturbing other project keys.
- [x] T004 Upsert Codex `trust_level` with exact table matching.
- [x] T005 Grant ZCode per-declaration digests using the canonical-JSON SHA-256 format.
- [x] T006 Report Cursor / OpenCode / DSH as unsupported with a reason.
- [x] T007 Wire `harness trust [dir]` and `harness trust --list` into the CLI and help.
- [x] T008 Add `tests/harness-trust.test.ts` (6 cases: grant, preservation, idempotency, digest regeneration, list, TOML exactness).
- [x] T009 Verify live: `harness trust --list` then `harness trust` in `career-ops` grants Claude while keeping pi/Codex/ZCode idempotent.
- [x] T010 Run `bun test` (148 passing).
