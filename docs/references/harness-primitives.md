# Harness Engineering Primitives — Industry Reference

**Status**: Living reference — naming, taxonomy and coverage for the surfaces a coding-agent harness exposes.
**Last verified**: 2026-11-23 (docs + public vendor material; re-check vendor specifics against the build you run).
**Scope**: What the customization/extension primitives *are*, what the industry calls them, which layer owns which
concern, and how this repository projects them. It is not a how-to for any single harness.

---

## 0. The definition everything hangs off

```
Agent = Model + Harness
```

**If it is not the model, it is the harness.** A raw model cannot execute code, hold durable state, fetch fresh
knowledge, or enforce a constraint; the harness supplies all of that. Two useful axes:

- **Authorable surfaces** — files/declarations a user or plugin writes (skills, agents, hooks, rules).
- **Runtime primitives** — machinery baked into the loop (tool registry, sandbox, compaction, orchestration).

The corollary that matters for every decision below: *prompt text steers, harness machinery enforces.* A rule
written in `AGENTS.md` is prose the model may weigh against other prose; a permission rule or a hook is enforced
regardless of what the prompt says.

---

## 1. Layer map

```
L0  Core loop ............ model turn → tool call → handler → observation → repeat
L1  Tool registry ........ built-ins + MCP tools + custom tools (+ deferred loading)
L2  Authorable surfaces .. AGENTS.md, rules, skills, slash commands, subagents, output styles
L3  Enforcement .......... hooks, permission rules & modes, policy, sandbox
L4  Orchestration ........ subagent dispatch, agent teams, workflows, handoffs, plan/worktree
L5  Context engineering .. progressive disclosure, compaction, tool-output offload, memory
L6  Integration protocols  MCP (tools), ACP (editor↔agent), A2A (agent↔agent), AG-UI (agent↔frontend)
L7  Meta / quality ....... evals, tracing, verifier gates, human approval gates
```

Each higher layer exists to correct a failure mode of the ones below it. Skills exist because tool schemas rot the
context (L1/L5). Hooks exist because prompts cannot be trusted to hold (L2→L3). Subagents exist because one context
window cannot stay coherent across a long task (L4/L5).

---

## 2. Authorable surfaces

| Layer | What it is | Canonical form | Industry names / variants |
|---|---|---|---|
| **Instruction file** | Standing facts + conventions injected at session start | `AGENTS.md` (open standard), `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/*.mdc` | Project rules, memory file, steerage. Usually *not* enforced — provenance is "user message", not system prompt |
| **Path-scoped rules** | Same, but loaded only when matching files are touched | `.claude/rules/*.md` with `paths:` frontmatter; Cursor `.mdc` globs | Scoped rules, conditional context |
| **Skill** | Named, reusable **procedure** with progressive disclosure | `<name>/SKILL.md` + optional scripts/assets; `name` + `description` frontmatter | **Agent Skills** (Anthropic, cross-vendor format); `disable-model-invocation: true` makes a skill behave like a slash command |
| **Slash command** | User-triggered prompt macro | `commands/<name>.md` | Prompt templates (Codex), custom commands. Largely being absorbed by Skills |
| **Subagent** | Worker with its own context window, system prompt, tool allowlist, model and permissions | `.claude/agents/*.md`, `.codex/agents/*.toml`, `.zcode/agents/`, `.opencode/agents/` | Subagent, agent profile, child task, delegate. Registries differ — see §9 |
| **Hook** | Deterministic script at a lifecycle event | `hooks` in settings; command / HTTP / MCP-tool / prompt / subagent handler | Lifecycle events: `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`, `PreToolUse`, `PostToolUse`, `PermissionRequest`, `SubagentStart/Stop`, `PreCompact`, `InstructionsLoaded`, … Exit code `2` blocks a tool call; JSON output can deny, rewrite input, or inject context |
| **Output style** | Swappable system-prompt fragment shaping tone/format | `output-styles/*.md`, `--append-system-prompt` | Persona, response format, system prompt overrides |
| **Settings / policy** | Layered configuration | `settings.json`, `config.toml`, `.mcp.json`; precedence `managed > user > project > local` | Managed policy is the one layer a remote prompt or repo file cannot override |

### The selection rule

| You want… | Use | Never use |
|---|---|---|
| A procedure that must run the same way every time | **Skill** | a paragraph in `AGENTS.md` |
| Something that must hold even if the model disagrees | **Hook** (or permission rule) | prompt text |
| A standing fact / convention / vocabulary | **Instruction file** | a skill (skills are procedures, not facts) |
| A hard limit on what is possible | **Permission / policy rule** | a hook that merely warns |
| External system access | **MCP server** | a bash curl wrapper per call |
| Context isolation for a big sub-task | **Subagent** | "please ignore the rest" |
| Deterministic fan-out / gating | **Workflow script** | hoping the model fans out |

---

## 3. Runtime extension surfaces

### 3.1 MCP servers
Typed access to external systems (issue trackers, DBs, browsers, doc search) as **tools**, **resources** and
**prompts**. JSON-RPC 2.0 over stdio or Streamable HTTP, with OAuth, elicitation (server→user questions) and
sampling. It is the de-facto integration standard across Claude Code, ZCode, Cursor, Codex, OpenCode, DSH and
Copilot — the one primitive every harness agrees on.

### 3.2 Deferred tool loading
Instead of injecting every MCP tool schema at startup, inject only tool **names** and fetch schemas on demand
(`ToolSearch`-style). This is why carrying dozens of servers no longer costs tens of thousands of startup tokens.
It is the first line of defence against context rot.

### 3.3 Plugins / extensions
A directory that bundles skills + agents + hooks + MCP/LSP configs + default settings behind a manifest
(`plugin.json`), installed from a local path or a marketplace, with namespaced resources (`/plugin:skill`).
ZCode plugins, Cursor extensions and VS Code extensions are the same packaging idea at different scopes.

### 3.4 Custom tools (in-process)
A function registered directly with the harness or agent SDK, rather than over a protocol. Cheapest option when you
own the runtime; otherwise MCP is the portable choice.

---

## 4. Orchestration

| Primitive | Purpose | Mechanism |
|---|---|---|
| **Subagent dispatch** | Fresh context per unit of work; only the conclusion returns | `Agent`-style tool; description-driven routing, or explicit dispatch |
| **Background / async agents** | Keep working while the parent does something else | Detached session + notification on completion |
| **Agent teams / session RPC** | Parent ↔ child messaging across sessions | `SendMessage`, list/fork/resume/interrupt session, task output polling |
| **Workflow / dynamic workflow** | *Deterministic* fan-out, gated loops, typed results | A script that calls subagents, versus the model deciding to |
| **Handoff / model routing** | Move control to a specialised agent or cheaper model | Explicit handoff tool, per-agent model override |
| **Plan mode** | Read-only exploration before edits | Harness-enforced tool restriction, not a prompt request |
| **Worktree isolation** | Parallel agents without stepping on one working tree | `EnterWorktree` / `.worktrees/<branch>` |
| **Scheduled wakeups** | Long-horizon continuation | Cron-style schedule + sleep/wake tools |

The distinction to keep straight: **delegation is model-decided and adaptive; workflow is harness-decided and
reproducible.** Use the second whenever the shape of the work is known in advance.

---

## 5. Enforcement & control plane

- **Tool registry** — the built-ins (`Read/Edit/Write/Glob/Grep`, `Bash`, LSP, `Agent`, `Skill`, todo, plan modes,
  ask-user). Tool names double as the vocabulary for permission globs and hook matchers, so `Bash(git *)` refers to
  exactly the entry the model calls.
- **Permission modes** — manual/default (prompt per tool), accept-edits, plan (read-only), auto (auto-approve with a
  classifier checking intent), deny-by-default (`dontAsk`), bypass. Plus allow / deny / ask rules, with managed
  policy as the non-overridable floor.
- **Sandbox** — container / microVM / isolate, network allow-lists, no-FS isolates. Sandboxing is both a safety
  property and a scaling property: environments that can be created and destroyed on demand allow fan-out.
- **Bundled infrastructure** — filesystem + git as durable state, browser automation, screenshots, test runners,
  package installs. This is what makes self-verification loops possible rather than aspirational.
- **Code/bash as the general-purpose tool** — the escape hatch that prevents designing a bespoke tool per action.

---

## 6. The protocol family (the "RPC" question)

Four protocols are commonly confused. They standardize *different links*:

| Protocol | Standardizes | Transport | Typical use |
|---|---|---|---|
| **MCP** — Model Context Protocol | harness ↔ **tools / data** | JSON-RPC 2.0, stdio or Streamable HTTP | Integrations: DBs, issue trackers, docs, browsers |
| **ACP** — Agent Client Protocol (Zed) | editor / IDE ↔ **agent** | JSON-RPC 2.0 over stdio, newline-delimited, bidirectional | "Bring your own agent" into any ACP client; agent calls back to the editor for file access and permission prompts |
| **A2A** — Agent2Agent (Google / Linux Foundation) | agent ↔ **agent** across vendors | HTTP with task/artifact semantics | Cross-vendor delegation, long-running tasks |
| **AG-UI** | agent ↔ **frontend** | event stream | Streaming agent state into a UI |

Separately, **intra-harness session RPC** (send message to another session, fork, interrupt, poll output) is not a
standard — it is a per-product API surface. When someone says "subagent RPC", they usually mean either ACP or this
session-messaging API.

Transport note: all of these deliberately reuse **JSON-RPC 2.0** shapes so that a single decoder, an audit log, or a
proxy can sit in the middle. That is also why MCP proxies and gateways are cheap to build.

---

## 7. Code Mode

**Origin**: Cloudflare, "Code Mode: give agents an entire API in 1,000 tokens" (Feb 2026); Anthropic shipped the
same idea as *code execution with MCP*.

**Mechanism**: replace N tool schemas with **two tools** — `search()` and `execute()`. The harness generates a typed
SDK from the API/tool spec; the model writes JavaScript/TypeScript against it inside an isolate (no filesystem, no
env vars, egress off by default). The full spec never enters the model's context.

**Why it wins**:
- schema-token cost collapses from O(tools) to O(1);
- pagination, retries, loops and chaining happen in **one** execution instead of N round-trips;
- intermediate data stays inside the sandbox instead of transiting the context window.

**Caveats**: the sandbox is now part of your trust boundary; typed SDKs must be generated and versioned; debugging
spans code + tool calls; and a code-writing model can express far more than a fixed tool set, so egress and
filesystem policy must be explicit. Treat it as an exposure mode (`codemode`) alongside `direct` and `deferred`,
not as a universal replacement for tools.

---

## 8. Context & memory engineering

The harness is largely a delivery mechanism for good context engineering. The standard toolkit:

| Technique | Problem it solves |
|---|---|
| **Progressive disclosure** (skill frontmatter only until invoked) | Too many procedures loaded "just in case" |
| **Deferred tool schemas** (§3.2) | Tool-schema tax at startup |
| **Compaction** | Context window about to overflow mid-task |
| **Tool-output offloading** | A single large output noise-polluting the window; keep head/tail, spill the rest to disk |
| **Subagent isolation** | Research that would otherwise consume the main window |
| **Instruction files** (`AGENTS.md`) | Conventions relearned every session; agent may edit them → continual learning |
| **Auto-memory directories** | Notes the model writes for its future self, injected next session |
| **Retrieval memory** (pages / vector / graph stores) | Facts from past sessions that do not belong in a static file |
| **Live-doc lookup** (context servers) | Knowledge cut-off; current library versions |
| **Ralph loop** | Model declares "done" too early: a hook intercepts exit and reinjects the goal in a fresh window |

---

## 9. Harness coverage: managed vs projected

Same declaration, different carrier. Every cell in this matrix is one of:

- **native** — the harness reads the hub directly; no adapter (and any adapter is *pruned* to avoid double discovery)
- **link** — a symlink into the canonical hub
- **projection** — a generated artifact in the harness's own dialect; regenerated on every write
- **unsupported** — the harness has no such concept; **write nothing** rather than a file it will never read

> Canonical matrix, kept in [`docs/ARCHITECTURE.md` §3.2](../ARCHITECTURE.md). That file is authoritative for this
> repository; this section only records the vocabulary. When the two disagree, ARCHITECTURE.md wins.

| Harness | Skills | Subagents | MCP |
|---|---|---|---|
| Claude Code | link `.claude/skills` | link `.claude/agents` | native `.mcp.json` |
| Cursor | link `.cursor/skills` | link `.cursor/agents` | link `.cursor/mcp.json` |
| Codex | link `.codex/skills` | **projection** `.codex/agents/*.toml` | `~/.codex/config.toml` |
| OpenCode | link `.opencode/skills` | link `.opencode/agents` | `~/.config/opencode/opencode.json` |
| ZCode | **native** `.agents/skills` | link `.zcode/agents` | `~/.zcode/cli/config.json` |
| DSH | link `.dsh/skills` | plugin-read, `$DSH_HOME/agents` only | **projection** `cordis.patch.yml` |
| pi / pi-like | **native** `.agents/skills` | **no registry**; host-level child tasks only | **projection** `.pi/mcp.json` + `<agentDir>/mcp.json` |

Three invariants that fall out of it:

1. Native discovery ⇒ prune the adapter, or the same skill appears twice in the prompt.
2. An unsupported cell stays empty on purpose; a file the host never reads is worse than no file (it looks
   configured while being invisible at runtime).
3. A dialect difference is a projection, never a link (Codex agents are TOML → generate, do not symlink).

---

## 10. Where this repository implements each primitive

| Primitive | Artifact here |
|---|---|
| Instruction & memory | root [`AGENTS.md`](../../AGENTS.md), [`CLAUDE.md`](../../CLAUDE.md) |
| Skills | `.agents/skills/<name>/SKILL.md` (canonical), fanned out by the manager |
| Subagents | `.agents/agents/*.md` (canonical) → per-harness links / TOML projection |
| Hooks | `.agents/hooks/` (e.g. the adapter-write guard), registered per harness |
| MCP | catalog `~/.agents/catalog/mcps.json` → local `.mcp.json` → generated projections |
| Policy / exposure | `direct` / `deferred` / `codemode` per server in `.mcp.json` |
| Orchestration | `swe-workflow` (skill) + `judge-plan` / `judge-pr` (subagents) |
| Verification | `harness doctor`, `harness heal`, `tests/` parity suite |
| Solutions memory | [`docs/solutions/`](../solutions) checked before planning |

Ownership rule: the **manager is ground truth**, harnesses agree. A name the manager knows is a projection (safe to
rewrite); a name it does not know is a declaration (migrate to the catalog first, never silently delete).

---

## 11. Naming glossary (the part everyone confuses)

| Term | It is | It is **not** |
|---|---|---|
| **Tool** | A callable function with a schema | A procedure or a document |
| **Skill** | A procedure, loaded on demand | A tool, a subagent, or a fact |
| **Slash command** | A user-invoked macro | Something the model autonomously picks |
| **Subagent** | A separate context window + prompt + tool subset | A tool call that returns data |
| **Workflow** | Deterministic orchestration script | A skill that merely describes steps |
| **Hook** | Deterministic lifecycle code | A guideline or reminder |
| **MCP** | A protocol for exposing tools/data | The harness's internal tool registry |
| **Plugin** | A bundle of the above + manifest | A single skill |
| **AGENTS.md** | Standing context | Enforcement |
| **Code Mode** | Tool exposure mode via typed SDK + `execute()` | A new protocol |
| **ACP** | Editor ↔ agent protocol | Agent ↔ tool (that is MCP) |

---

## 12. Sources

- LangChain, *The Anatomy of an Agent Harness* (2026-03) — definition of harness, primitives, context rot, Ralph loop.
- Anthropic, Agent Skills / Claude Code docs — skills, subagents, hooks, plugin bundles, permission modes, deferred MCP schemas.
- Cloudflare, *Code Mode: give agents an entire API in 1,000 tokens* (2026-02) and Code Mode SDK changelog (2026-03).
- Zed, Agent Client Protocol spec + ACP Registry (2026).
- A2A specification; AG-UI.
- This repo: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) §3 (matrix) and `.agents/skills/harness-protocol/SKILL.md`.
