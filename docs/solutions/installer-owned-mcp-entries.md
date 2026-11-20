# Solution: third-party installer-owned MCP entries (billion-context `bili`)

**Problem**: After `bili plugin install zcode|codex|…` (the [billion-context](https://github.com/ranxianglei/billion-context)
context-compression plugin), `harness doctor` reported the installer's entry as an unmigrated harness MCP
declaration:

```
⚠️ WARNING: Found unmigrated harness MCP declaration(s) in ZCode (config.json: bili)!
⚠️ WARNING: Found unmigrated harness MCP declaration(s) in Codex (config.toml: bili)!
```

Following that advice (`harness heal` / `harness clean-global`) would have deleted `mcp.servers.bili` from
`~/.zcode/cli/config.json` and `[mcp_servers.bili]` from `~/.codex/config.toml`, silently disabling bili's native
lane in both harnesses: the plugin ships its MCP face itself and rewrites it on upgrade.

**Root cause**: `isHostManagedMcpEntry()` only recognised one installer, by an env marker
(`env.HINDSIGHT_MCP_HARNESS`). bili cannot stamp an env marker: it writes the same entry shape into several harness
files (`node <pkg>/dist/mcp.js` for codex/claude, `node <pkg>/dist/zcode/mcp-entry.js` for ZCode) and rewrites it in
place on every upgrade, so the only stable signature is **server name + path into its own installed package**.

**Fix** (`.agent/src/services/host-managed.ts`):

- `HOST_MANAGED_MCP_RULES` — installer-owned entries declared as `{ name, pathMarkers }`
  (`{ name: 'bili', pathMarkers: ['billion-context'] }`).
- `isHostManagedMcpEntry(config, name?)` — env marker first, then the name + package-path rule. The name must match
  **and** the command/args must point into that installer's package, so a user-declared `bili` pointing somewhere
  else, or another server name pointing at `billion-context`, stays a normal declaration.
- Call sites now pass the server name: `clean-global.ts` (migration/cleanup), `pi-mcp-dialect.ts` (pi projection),
  `mcp-dsh.ts` (DSH projection). Installer entries are therefore never migrated away and never projected into a
  harness the installer did not write them for.

**Repro proof**: `tests/host-managed-mcp.test.ts` — a `bili` entry in `~/.zcode/cli/config.json` and
`~/.codex/config.toml` produces zero `unmigrated harness MCP` issues, survives `healWorkspace`, and is filtered out of
the pi projection while a normal declaration next to it is kept.

**Do not regress**:

- Ownership is never decided by server name alone; keep the package-path check.
- Do not "centralize" an installer entry into `~/.agents/catalog/mcps.json` — the installer owns that file and
  rewrites it; a catalog copy would be a second, drifting truth.
- A new third-party installer gets a `HOST_MANAGED_MCP_RULES` entry, not a special case in `clean-global.ts`.
