# Doctor home scope and truthful healing results

## Verified cause

Doctor applied project adapter requirements to the user home directory. Native global harness folders were reported as invalid project adapters, and the global skills directory was compared against itself as though it were a separate workspace. The heal route also returned an unconditional “healed all” message despite preserved physical adapters; the modal immediately closed and hid the action list.

## Repair boundary

Home audit skips project adapter requirements and self-shadowing checks, while retaining global MCP, dangling skill and other diagnostics. Home healing does not scaffold project adapter directories or symlinks. Project physical folders remain untouched: converting them requires explicit migration, not blind deletion. The heal API re-audits and returns remaining issues; the dashboard keeps the modal open, renders actions and unresolved issues, and handles HTTP failures.

## Verification

`bun test tests/doctor-scope.test.ts` reproduces the original failures before the fix and exercises the real route and dashboard JavaScript. Tests run against isolated HOME, never the user's live configuration. No migration or cleanup of existing user folders is part of this repair.
