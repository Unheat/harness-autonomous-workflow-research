# Hindsight memory: local topology, per-harness wiring, and how to change it

**Goal**: one local memory store per repository, written and read by every harness, with no cloud hop and no
second copy of the truth. This note records what is wired, why each piece is that way, and how to undo or
retarget it.

---

## 1. Topology (what "local" actually covers)

| Layer | Where | Local? |
|---|---|---|
| Memory store | Postgres via `pg0://hindsight-embed-coding-agent` (`~/.pg0/instances/...`) | ✅ |
| API / extraction engine | `hindsight-api@1.2.1` on `127.0.0.1:8888`, launched by launchd `io.hindsight.embed` | ✅ |
| Embeddings | local `hindsight-embed` daemon | ✅ |
| **LLM used for extraction/consolidation** | `openai`-protocol against `http://localhost:20128/v1` (9router) | ❌ routes to hosted providers |

So the *storage and pipeline* are local; the *thinking* is still a hosted model behind 9router. Anyone claiming
"fully local" must deal with that last row.

One database holds one bank per repository:

```
coding-agent::Kites      coding-agent::workflow     coding-agent::math426
coding-agent::career-ops coding-agent::denied       coding-agent::draft-…
```

`bankIdTemplate` is `coding-agent::{gitProject}` and is deliberately **harness-neutral**, so every harness writes
the *same* bank for a workspace. The harness is only a tag on the documents (`harness:pi`, `harness:zcode`, …),
used for provenance, `{harness}` placeholders, and `harnesses.<name>` overrides — never for routing.

---

## 2. Two ways memory happens

| Mechanism | Who triggers | Coverage | Where it exists on this machine |
|---|---|---|---|
| **Native** (hook or plugin) | the host, silently: SessionStart / UserPromptSubmit / Stop | full transcript + first-prompt injection | `zcode`, `dsh`, `claude-code`, `codex`, `cursor-cli`, `antigravity-cli`, `opencode`, `pi` |
| **MCP tools** | the model, deliberately | only what it chooses to write | any MCP-capable host (fallback) |

The installer supports more targets than we use (`opencode2`, `kilo`, `cline-cli`, `copilot-cli`, `grok-build`,
`qwen-code`, `kimi-code`, `devin-cli`, `factory-droid`, `trae code`, `workbuddy`, `codebuddy`, `prime-agent`,
`dcode`). `dcode` is a **hook** target, not this pi-based IDE, so it was not installed for it.

Consequence for repos with a project `AGENTS.md`: where native capture exists, a "write memory after a task" rule
must not duplicate it. `Kites/AGENTS.md` §13 says exactly that (check `hindsight_sync_status` first).

---

## 3. How pi was wired (the special case)

The installer hardcodes `join($HOME, ".pi", "agent")` for both installation and history import — it does not read
`PI_CODING_AGENT_DIR`. This IDE relocates the agent dir to
`~/.deepai-code/userdata/deepai/pi/deepai`, so a plain `install pi` would write an extension the host never reads.

Fix — make the stock path canonical with a symlink:

```bash
mkdir -p ~/.pi
ln -sfn ~/.deepai-code/userdata/deepai/pi/deepai ~/.pi/agent
```

After that, `install pi` writes `~/.pi/agent/extensions/...` (here: `settings.json` →
`extensions: ["~/.hindsight/coding-agents/dist/pi.js"]`), which the host does read. Same trick fixes
`piHistory` session import. If the host's user-data dir ever changes, move this symlink with it.

---

## 4. Ownership: what the harness manager may and may not touch

Hindsight's installer owns its artifacts; the manager must never migrate or prune them.

| Artifact | Identification | Rule |
|---|---|---|
| MCP entries it writes (`~/.zcode/cli/config.json` → `mcp.servers.hindsight`, `~/.cursor/mcp.json`, `~/.codex/config.toml`, `~/.gemini/config/mcp_config.json`) | `env.HINDSIGHT_MCP_HARNESS` present | skipped by `isHostManagedMcpEntry()` in `clean-global.ts` — never counted as an unmigrated declaration |
| DSH plugin row | block wrapped in `# HINDSIGHT_CODING_AGENTS_DSH_START/END` in `~/.dsh/cordis.patch.yml` | not in the profile file we manage; marker block must be preserved verbatim if we ever write there |
| Skill directories | physical dirs at `~/.agents/skills/hindsight-coding-agent`, `~/.claude/skills/…`, `~/.zcode/skills/…`, `~/.cursor/skills/…` | the installer copies a real directory and fails on a symlink (`ERR_FS_CP_DIR_TO_NON_DIR`); the catalog symlink for **this one skill** was retired so the installer owns it |

Detection is by marker, not by server name: a user's own server called `hindsight` is still managed normally.

**Where the shared hub entry went.** With every installed harness wired natively, the `.mcp.json` entry for
`hindsight` became a second connection (transcript hook *plus* MCP server) for the same host, and its single
`HINDSIGHT_MCP_HARNESS` value could only ever name one harness. It was removed from the workspace hub
(`harness mcp rm hindsight`) and its env marker was dropped from `~/.agents/catalog/mcps.json`, so the catalog
definition survives as a label-free **fallback** for hosts with no native wiring. Per-harness labels now come from
the installer's own entries (`cursor-cli`, `codex`, …), which are correct by construction.

**Stale second copies in `~/.mcp.json` (home) — found and removed 2026-11-21.** An old-scheme
`install zcode` had written the hindsight MCP there; the published contract for ZCode is three hooks plus
`mcp.servers.hindsight`, both in `~/.zcode/cli/config.json`, with the companion skill in `~/.zcode/skills`. With
that entry sitting disabled, every ZCode session ran hooks-only while the session banner still advertised the
`hindsight_*` tools — 0 of 424 recorded ZCode turns ever called one. Re-running `install zcode` (v0.8.7) merged
the server into `~/.zcode/cli/config.json` and installed the skill at `~/.zcode/skills/hindsight-coding-agent`;
the home-file copies (the installer-flipped hindsight duplicate plus a disabled `search2ai` duplicate of the
workspace entry) were deleted, leaving `~/.mcp.json` with an empty `mcpServers`. The tools registered in the
same ZCode session with no app restart, and `hindsight_diagnose` resolved `harness: zcode` against bank
`coding-agent::workflow` — ZCode picks up `mcp.servers` changes live. Two enabled hindsight declarations would
have meant the second-connection duplicate this section removed the hub entry to avoid; the home file must stay
empty.

---

## 5. Configuration surfaces

| File | Holds | Read when |
|---|---|---|
| `~/.hindsight/coding-agent.json` (client) | `serverMode`, `apiUrl`, `autoInject`, `retainSessions`, `bankIdTemplate`, `harnesses.<name>`, `paths`, `banks` | every hook invocation / plugin load |
| `~/.hindsight/profiles/coding-agent.env` (server, mode `0600`) | `HINDSIGHT_API_LLM_PROVIDER/MODEL/BASE_URL/API_KEY`, `HINDSIGHT_API_DATABASE_URL` | at `hindsight-api` start |
| `~/Library/LaunchAgents/io.hindsight.embed.plist` | launchd wrapper: `uvx hindsight-embed -p coding-agent daemon start`, `StartInterval` 300 | at login |

Applying an env change requires a real restart — `launchctl kickstart` alone kept the old process alive:

```bash
hindsight-embed -p coding-agent daemon stop
hindsight-embed -p coding-agent daemon start
ps eww -p $(pgrep -f bin/hindsight-api | tail -1) | tr ' ' '\n' | grep HINDSIGHT_API_LLM_MODEL
```

---

## 6. Model choice is a hard constraint, not a preference

Consolidation sends ~23k-token requests. Any route below that budget fails **after** the document is stored, so the
write looks successful while observations never form.

Observed on this machine:

| 9router combo | Routes to | Result |
|---|---|---|
| `hindsight-9router` | Groq `openai/gpt-oss-120b`, 8k TPM | `HTTP 413 Request too large … Limit 8000` on consolidation |
| `stacks` | `deepseek-v4.1-flash-free` | handled ~7k prompt fine; `CONSOLIDATION COMPLETE … 10 processed` |
| `rotation`, `strong` | `codex/gpt-6*-sol` | `429 usage limit` at the time of testing |

Also: a 9router api key can be **inactive** while still listing models (`/v1/models` is open, chat returns 401
`Invalid API key`). Check `apiKeys.isActive` in `~/.9router/db/data.sqlite` before blaming hindsight.

Verify a write end-to-end, never trust `ok: true`:

```bash
curl -s localhost:8888/v1/default/banks/coding-agent::<Repo>/documents/<doc_id>   # parked?
tail -40 ~/.hindsight/profiles/coding-agent.log | grep -Ei 'ProviderAuthError|413|CONSOLIDATION'
```

---

## 7. Customize / disable / uninstall

```bash
# wire another harness later (adds hooks/plugins/skills); needs --server for a non-TTY run
node ~/.hindsight/coding-agents/dist/installer.js install <harness> --server self-hosted --api-url http://localhost:8888

# remove exactly what install added
node ~/.hindsight/coding-agents/dist/installer.js uninstall <harness|all>

# refresh the runtime only, leaving host configs untouched
node ~/.hindsight/coding-agents/dist/installer.js update

# per-harness off switch (keeps the wiring, silences it)
# ~/.hindsight/coding-agent.json
{ "harnesses": { "pi": { "disabled": true } } }
```

| Want | Change |
|---|---|
| Memory off for one repo | `bankIdTemplate` stays; add `banks: { "coding-agent::<repo>": { "disabled": true } }` |
| No auto-injection, tools only | `"autoInject": "none"` |
| No transcript capture | `"retainSessions": false` |
| Store raw text, no LLM extraction | `retainExtractionMode: "chunks"` — then set `recallOptions.types` to `["world","experience"]` or `null`, because observations never form |
| Only these projects remember anything | `"optInOnly": true` + `optInPaths` |
| Different bank for a folder | `mapPathToBank` |
| Another LLM/provider per harness or repo | `harnesses.<name>` / `banks.<id>` / `paths.<prefix>` sections, or the profile `.env` for the server |

---

## 8. What the harness manager learned from this

- `isHostManagedMcpEntry()` (`clean-global.ts`): installer-owned entries carry `HINDSIGHT_MCP_HARNESS`; migration and
  clean-global skip them, so a repair can never break an agent's memory.
- Native-skill readers are pruned, not linked (`NATIVE_SKILL_DISCOVERY_HARNESSES`), but a **harness-installed physical
  skill directory** is preserved — the two coexist.
- "Configured but silent" remains the dominant failure mode: an installer writing to a path the host does not read,
  a write that parks because extraction failed, and a project file ignored because the project is untrusted. Every
  check in this document exists to catch one of those.
