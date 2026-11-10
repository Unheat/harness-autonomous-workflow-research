# Solution: pi-like harness MCP projection

**Problem**: A pi-based harness (stock `pi`, an app-bundled pi runtime, or a pi-derived fork) showed every MCP
tool as unavailable even though `.mcp.json` declared them and the harness manager reported them as active.

**Root cause (verified against the bundled `pi-coding-agent` source)**:

1. pi does not read the hub. It reads `<workspace>/.pi/mcp.json` and, at user scope,
   `<agentDir>/mcp.json` — where `agentDir` defaults to `~/.pi/agent` but is relocated per instance by hosts
   that embed pi (they set `PI_CODING_AGENT_DIR`).
2. A project file is loaded only for a **trusted** project. Trust lives in `<agentDir>/trust.json`, keyed by
   **real path** with nearest-ancestor lookup. In non-interactive runs (`--mode rpc`, `--print`) there is no UI,
   so an untrusted project is skipped silently (`if (!projectTrustContext.hasUI) return false`).
3. The dialect differs: transport is inferred from `url`/`command` (a `transport` field is ignored), legacy
   `sse` is rejected, server names differing only in `-`/`_` collapse into one tool namespace, and
   `enabled: false` means "listed but not connected".
4. Default tool exposure is `codemode`, which needs the codemode tool; a harness without it needs `deferred`
   (reachable through `tool_search`) or `direct`.

**Fix**: Treat the pi family as a projection consumer, exactly like DSH, not as a `.mcp.json` symlink adapter.

- `.agent/src/services/pi-mcp-dialect.ts` translates hub declarations into pi's dialect and refuses what pi
  refuses, with a reason.
- `.agent/src/services/pi-mcp-projection.ts` generates `<workspace>/.pi/mcp.json` atomically, is idempotent,
  reports `current`/`missing`/`stale`/`blocked`, and never writes through a symlink.
- `.agent/src/services/pi-harness-trust.ts` discovers agent directories (stock path + `PI_CODING_AGENT_DIR` +
  `PI_LIKE_AGENT_DIRS`) and mirrors pi's trust resolution to report gaps. It never writes `trust.json`.
- `doctor`/`heal`/`status` report and regenerate drift; `clean-global` treats `<agentDir>/mcp.json` as an
  unmigrated harness declaration.

**Do not regress**:

- Never symlink `.pi/mcp.json` to `../.mcp.json`: pi would receive hub-only keys and its own `/mcp` toggles would
  rewrite the shared hub through the link.
- Never auto-grant trust. `autoTrustWorkspaceMcps` is a documented no-op for this reason.
- Trust keys must be real paths — on macOS `/var` resolves to `/private/var`, so a non-canonical key silently
  fails to match.
- Keep the projection byte-stable; drift detection compares exact serialized text.

**Follow-up bugs found while wiring the live harness (fixed)**

1. Doctor reported the generated `<agentDir>/mcp.json` as an *unmigrated declaration*, so `harness heal` would
   have deleted a file the manager itself owns. Ownership rule now: a name in the manager's user scope is a
   projection, anything else is a declaration — only the latter is discovered for centralisation.
2. `harness mcp sync` reported work on every run even when nothing changed. Projection results now carry
   `changed`, and only real writes are reported, so repeat runs are silent and drift reports stay trustworthy.
3. Exposure defaulted to `deferred`, which made pi-only behaviour differ from every always-injecting harness.
   `direct` is now the default, with per-server opt-in to `deferred`/`codemode` in `.mcp.json`.

**Verification**: `bun test` (124 passing) including 27 cases in `tests/pi-projection.test.ts`; live
`harness doctor` reports a missing projection and the untrusted discovered harness.
