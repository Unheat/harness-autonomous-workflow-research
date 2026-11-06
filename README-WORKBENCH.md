# Local Paperclip workbench

## Current, verified, and not yet verified

- Existing local installation: `paperclipai@2026.1023.0`, with instance data in `.workbench/state` and an instance reported running at `http://127.0.0.1:3100` before this work. This implementation did **not** restart, install into, or modify that live instance. Use `status` for a current observation.
- The installed package requires **Node >=24.11.0**. Default `node` here is v20; `/opt/homebrew/bin/node` is v26.13.0. Bun runs the wrappers/tests; Paperclip and npm run under the explicitly discovered compatible Node.
- Wrappers and isolated tests are implemented. Fresh installation/start have **not** been executed as part of this change. Live orchestration and optional integrations are not proven by wrapper tests.
- Hindsight backend is unavailable locally. Official plugin installation instructions below are not a claim of working memory. DSH/native desktop integration remains planned, not delivered here.

## Commands

From this repository (Bun required):

```sh
bun scripts/workbench/cli.ts doctor
bun scripts/workbench/cli.ts status
# Explicit, opt-in mutation: install locally and initialize only missing config.
bun scripts/workbench/cli.ts setup
# Foreground process only; run only after stopping your existing run yourself.
bun scripts/workbench/cli.ts start
```

Optionally select Node with `WORKBENCH_NODE=/absolute/path/to/node`. It must meet the minimum version; an invalid override fails rather than silently falling back. Otherwise the wrapper checks Homebrew, `/usr/local/bin`, then absolute PATH entries. No arbitrary CLI passthrough, shell evaluation, daemon installation, global npm packages, trust-store grants, or system configuration changes are exposed. All paths are derived from this checkout, not your current working directory.

`doctor` is filesystem/runtime inspection only: it does not invoke Paperclip's potentially mutating doctor or repair anything. `status` adds one GET to `/api/health`, with a 2.5-second abort, no redirects and a 16 KiB response bound. Both print JSON and exit nonzero on failed checks. Healthy HTTP does not prove process ownership, pinned version, or optional plugin health. No PID files are trusted and no processes are killed. `start` refuses an occupied port, then uses the real `paperclipai run --no-repair` command. The port preflight cannot eliminate races; the server's bind remains authoritative.

## Pinning, native dependencies, and safety

The bundled `scripts/workbench/package-lock.json` preserves the existing npm v3 lock, including transitive versions/integrity hashes, for the exact Paperclip pin. Setup uses the selected Node's adjacent npm, `npm ci --ignore-scripts --no-audit --no-fund`, under `.workbench/paperclip`. Its cache and npm config paths are local to `.workbench`; user/global npm configs and inherited DB/auth/Node options are not forwarded. A fresh setup needs npm registry access; a private registry/proxy is not configured by these wrappers.

The initial install used `--ignore-scripts`, which left embedded PostgreSQL shared-library aliases missing. The reviewed package `@embedded-postgres/darwin-arm64@18.1.0-beta.16` normally recreates them from `native/pg-symlinks.json`. Setup implements **only** that operation itself: require relative flat `native/lib/*.dylib` paths, regular source files, contained real ancestors, unique destinations, and matching existing links; validate the entire manifest before creating missing relative symlinks. No downloaded lifecycle script is executed and no `npm rebuild` or blanket script enabling is used. Unsupported platforms/package versions fail explicitly; this native handling is currently macOS ARM64 only. Package upgrades require another review.

Setup preserves a matching dependency tree, manifest, lock and existing valid instance config. It refuses mismatches and partial installs instead of allowing `npm ci` to erase an existing tree. On a failed initial install, inspect and explicitly relocate/remove only the failed dependency directory yourself before retrying; never delete `.workbench/state`. Matching native links are preserved, conflicting files are never overwritten. Managed symlink ancestors and unsafe paths fail closed. This is not a sandbox against concurrent malicious filesystem mutation; use a trusted, single-writer checkout.

New instance configs use private loopback `127.0.0.1:3100`, embedded PostgreSQL (default port 54329), local encrypted secrets, storage/logs/backups below `.workbench/state/instances/default`, private file modes for newly generated config/key/JWT secrets, telemetry off and update checks off. Existing configs are not rewritten. The existing config had telemetry enabled; every wrapper-launched Paperclip command sets the supported `PAPERCLIP_TELEMETRY_DISABLED=1` and `DO_NOT_TRACK=1`. **This does not change the environment of the already running process** or disable telemetry for CLI commands you launch outside the wrapper. These controls do not promise zero network activity: model APIs, npm and Paperclip update checks in retained configs may still use the network. Adjacent dotenv files may contain generated signing secrets only; routing/database overrides require manual review and are rejected. Keep `.workbench` local; never commit its database or secrets.

## Official Hindsight plugin (optional, explicit mutation)

Official integration documentation: https://hindsight.vectorize.io/sdks/integrations/paperclip

Once Paperclip is healthy and you have separately provisioned a compatible Hindsight backend:

```sh
bun scripts/workbench/cli.ts install-hindsight
```

This invokes the pinned CLI's real `plugin install @vectorize-io/hindsight-paperclip --version 0.4.2` with the local data/config paths and `--api-base http://127.0.0.1:3100`. It retains Paperclip's default target-verification probe. The probe displays its target, but is not an interactive approval gate; verify `doctor`/`status` and the local URL before running this command; installation trusts plugin code and may have its own server-side npm behavior, outside the core setup's no-scripts guarantee. For a manually launched CLI, also provide the telemetry-disable environment and the same selected Node.

Configure the plugin in Paperclip's plugin settings using the backend URL, credentials and bank scope required by that plugin's official documentation. Do not put backend credentials in this README or global harness configuration. No backend is installed or started by these wrappers. Verify an actual recall/retention lifecycle and company/bank isolation before relying on it. Official docs describe event-based recall and comment retention; run-finished output retention is currently a no-op, not a working automatic memory pipeline.

## Optional DSH bridge: limitations

DSH `0.2.2-rc.1` SDK execution uses a separate stdio runtime. Persisted session logs do not make SDK-created sessions visible/controllable in the native desktop. Same-host native control likely needs a separately implemented Cordis bridge; DSH MCP mounts are Cordis entries, not a generic Markdown setting. No such bridge, external execution adapter, automatic approvals or native UI session integration is installed here. Do not treat successful wrapper tests or a healthy Paperclip UI as proof of end-to-end DSH execution.

## Tests

```sh
bun test ./tests/workbench/workbench.test.ts
```

Tests use temporary directories and mocked HTTP/runtime discovery. They do not install packages, touch live configuration, start/stop services or contact the live instance. Root `package.json` is unchanged; its existing test glob does not include this nested suite.
