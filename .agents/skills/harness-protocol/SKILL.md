---
name: harness-protocol
description: Universal guideline and setup protocol for a clean, zero-bloat, cross-harness agent environment (ZCode, Claude Code, Cursor, Codex, DeepSeek Harness, OpenCode). Follow this protocol whenever creating, downloading, installing, moving, symlinking, or configuring skills, MCPs, hooks, and subagent permissions.
---

# Universal Cross-Harness Setup & Clean Environment Protocol

Standard specification for managing agent skills, MCP servers, subagents, and hooks across all AI coding harnesses without context pollution or configuration drift.

---

## 1. Primary Operating Interface: Canonical CLI (`harness` / `agn`)

Whenever you (or the user) need to inspect, activate, deactivate, or audit skills, MCP servers, or adapter symlinks, **always use the canonical CLI `harness` (or short alias `agn`)**:

```bash
# Check current workspace tools & token footprint
harness status

# Browse the machine catalog (~/.agents/catalog/skills/ and ~/.agents/catalog/mcps.json)
harness catalog

# Enable/Disable a skill for current project (manages symlinks safely):
harness skill add <name>        # e.g., harness skill add impeccable (symlinks from catalog)
harness skill remove <name>     # safely unlinks; catalog source remains intact
harness skill create <name>     # scaffolds project-private skill in .agents/skills/<name>

# Enable/Disable an MCP server in local .mcp.json (preserves catalog definition):
harness mcp on <server>         # e.g., harness mcp on rea (enables in local .mcp.json)
harness mcp off <server>        # sets enabled: false (local only; 0 tokens injected)
harness mcp add <name> <cmd>    # registers in catalog (~/.agents/catalog/mcps.json) & enables locally
harness mcp rm <server>         # removes server entry from local .mcp.json

# Audit and self-heal cross-harness integrity:
harness doctor                  # verifies adapter symlinks, token shields, unmigrated harness MCPs & global cleanliness
harness heal                    # automatically restores missing or drifted adapter symlinks & centralizes harness MCPs into ~/.agents/catalog/mcps.json
harness clean-global            # sets heavy servers (rea, local-pdf-rag) to dormant & migrates global harness MCPs to central catalog

# Scaffold a new workspace with 3-layer cross-harness architecture:
harness init [dir]              # creates .agents/skills, .agent/agents, and all 5 adapter symlinks

# Launch interactive zero-prefix shell or web UI dashboard:
harness start                   # interactive REPL: [harness: <workspace>] >
harness ui                      # launch local vibe coder dashboard on port 20888
```

---

## 2. Two-Tier Storage Architecture (Under the Hood)

To prevent 10,000–30,000 tokens of unwanted previews from flooding model context windows, environments adhere to a two-tier model:

### Tier 1: Machine Central Catalog (Inactive by Default)
- **Skills**: `~/.agents/catalog/skills/<skill-name>/` (inactive globally).
- **MCP Servers**: `~/.agents/catalog/mcps.json` (canonical configs for `rea`, `hound`, `codebase-memory`, `hindsight`, etc.).
- **Rule**: Catalog definitions MUST NOT be declared as active globally. All harness-specific MCP declarations (~/.zcode, ~/.claude, ~/.cursor) are centralized here without duplication, keeping global harnesses clean.

### Tier 2: Local Project Workspace (Isolated Sandbox)
- **Active Skills**: `.agents/skills/<name>` (symlinks to catalog for shared skills, or physical folders for project-exclusive skills).
- **Active MCPs**: Declared locally in `.mcp.json` at repository root.
- **Rule**: Toggling a tool OFF removes/disables only the local pointer. The catalog remains pristine.

---

## 3. Protocol for Installing & Creating Skills

Whenever an agent or user needs to add a new skill, follow this strict 2-case protocol:

### Case A: Installing an External / Shared Skill (Machine-Wide)
1. **Download/Install into Central Catalog**:
   - Via Vercel Skills CLI:
     ```bash
     npx skills add <author/repo> -a universal
     ```
   - Or clone/create directly in: `~/.agents/catalog/skills/<skill-name>/`
2. **Activate in Current Project**:
   ```bash
   harness skill add <skill-name>
   ```
   *(Creates symlink `.agents/skills/<name> -> ~/.agents/catalog/skills/<name>`. Visible to Claude, ZCode, Cursor instantly).*

### Case B: Creating a Project-Private Skill (Exclusive to Current Repo)
1. **Scaffold locally via CLI**:
   ```bash
   harness skill create <skill-name> "[optional description]"
   ```
   *(Creates a physical folder `.agents/skills/<skill-name>/SKILL.md` inside this repo only. Never leaks to global catalog).*

---

## 4. 3-Layer Cross-Harness Defense Architecture

1. **Layer 1: OS Filesystem Routing (Symlinks)**:
   - Harness adapter folders (`.claude/skills`, `.zcode/skills`, `.cursor/skills`, `.codex/skills`, `.dsh/skills`, `.opencode/skills`) are single directory symlinks pointing to `../.agents/skills`.
2. **Layer 2: Instruction Protocol (`AGENTS.md`)**:
   - `AGENTS.md` acts as universal law across harnesses, directing agents to follow `harness-protocol` and use `harness` CLI instead of creating arbitrary directories.
3. **Layer 3: Active Safety Net (Hooks)**:
   - **PreToolUse Guard (`guard-skills.py`)**: Intercepts and aborts (exit code 2) any attempt to write directly to adapter folders (`.claude/skills`, `.zcode/skills`).
   - **SessionStart Auto-Heal (`auto-heal-symlinks.sh`)**: Automatically validates and repairs broken or missing symlinks on session launch.

---

## 5. Subagent Context Hygiene (Token Shield)

- All implementer subagent manifests (e.g., `.agent/agents/sdd-worker.md`) MUST enforce:
  ```yaml
  disallowedTools: Skill
  ```
- Stripping the `Skill` tool prevents the harness from injecting 7,000–10,000 tokens of skill previews on every subagent turn. Subagents receive needed context on-demand via Task Brief file paths.
