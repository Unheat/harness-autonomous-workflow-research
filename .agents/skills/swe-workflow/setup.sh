#!/usr/bin/env bash
# setup.sh - One-command installer and environment initializer for swe-workflow
#
# Usage:
#   bash .agents/skills/swe-workflow/setup.sh
#
# What it does:
#   1. Verifies workspace root and tools (git, bun/npm, rg).
#   2. Installs canonical subagents into .agent/agents/ (single source of truth).
#   3. Scaffolds cross-harness adapter symlinks for skills and agents (Claude, ZCode, Cursor,
#      DSH, OpenCode, Codex skills). Markdown-agent harnesses discover agents through their
#      adapter link; DSH also needs the `dsh-subagents` plugin.
#   4. Installs the universal pre-push git hook (.git/hooks/pre-push).
#
# Codex agents are NOT covered by Markdown symlinks: Codex reads generated *.toml under
# .codex/agents. Run `harness heal` in a workspace managed by the harness manager, or let
# swe-workflow run in manual mode (manual.md).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

echo "🚀 [swe-workflow] Initializing autonomous SWE workflow in: $WORKSPACE_ROOT"
cd "$WORKSPACE_ROOT"

# 1. Environment & Preflight Checks
echo "🔍 [1/4] Checking required development tools..."
MISSING_TOOLS=()
for tool in git; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    MISSING_TOOLS+=("$tool")
  fi
done

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
  echo "❌ Error: Missing required system tools: ${MISSING_TOOLS[*]}" >&2
  exit 1
fi

if command -v rg >/dev/null 2>&1; then
  echo "  ✅ Optional tool detected: ripgrep (rg)."
else
  echo "  ℹ️  Optional tool ripgrep not present (using standard harness tools)."
fi

# 2. Register Subagents
echo "🤖 [2/4] Registering subagents for cross-harness discovery..."
mkdir -p .agent/agents

for agent_file in "$SCRIPT_DIR/agents"/*.md; do
  if [ -f "$agent_file" ]; then
    base_name="$(basename "$agent_file")"
    cp "$agent_file" ".agent/agents/$base_name"
    echo "  -> Registered agent: $base_name"
  fi
done

# 3. Setup Cross-Harness Symlinks (DSH, Claude, Cursor, Codex)
echo "🔗 [3/4] Scaffolding cross-harness adapter symlinks..."
mkdir -p .agents/skills
mkdir -p .claude .cursor .dsh .codex .opencode .zcode

# Symlink skills and agents for cross-harness discovery
ensure_link() {
  local link_path="$1"
  local target_path="$2"

  if [ -L "$link_path" ]; then
    local current
    current="$(readlink "$link_path")"
    if [ "$current" = "$target_path" ]; then
      return
    fi
    rm "$link_path"
    ln -s "$target_path" "$link_path"
    echo "  -> Relinked $link_path -> $target_path"
    return
  fi

  if [ -d "$link_path" ]; then
    # Migrate legacy real directories that only mirror canonical agent files.
    local can_replace=true
    local has_files=false
    for f in "$link_path"/*; do
      [ -e "$f" ] || continue
      has_files=true
      local base
      base="$(basename "$f")"
      if [ ! -f ".agent/agents/$base" ]; then
        can_replace=false
        break
      fi
    done
    if [ "$can_replace" = true ]; then
      rm -rf "$link_path"
      ln -s "$target_path" "$link_path"
      echo "  -> Migrated $link_path -> $target_path (replaced legacy copy)"
      return
    fi
    echo "  ⚠️  Preserved physical adapter: $link_path (manual migration required)"
    return
  fi

  if [ -e "$link_path" ]; then
    echo "  ⚠️  Preserved physical adapter: $link_path (manual migration required)"
    return
  fi

  ln -s "$target_path" "$link_path"
  echo "  -> Linked $link_path -> $target_path"
}

# Skills adapters
ensure_link ".claude/skills" "../.agents/skills"
ensure_link ".cursor/skills" "../.agents/skills"
ensure_link ".dsh/skills" "../.agents/skills"
ensure_link ".codex/skills" "../.agents/skills"
ensure_link ".opencode/skills" "../.agents/skills"

# Agents adapters (Markdown-agent harnesses). Codex is absent on purpose:
# it reads generated *.toml under .codex/agents/ and would ignore Markdown links.
ensure_link ".claude/agents" "../.agent/agents"
ensure_link ".zcode/agents" "../.agent/agents"
ensure_link ".cursor/agents" "../.agent/agents"
ensure_link ".dsh/agents" "../.agent/agents"
ensure_link ".opencode/agents" "../.agent/agents"

# 4. Install Universal Git Hook
echo "🛡️  [4/4] Installing universal pre-push gate..."
if [ -d ".git" ]; then
  bash "$SCRIPT_DIR/hooks/install-git-hook.sh"
else
  echo "  ℹ️  Not a git repository root. Skipped pre-push hook installation."
fi

echo ""
echo "🎉 [swe-workflow] Setup complete! You are ready to run:"
echo "   /swe-workflow \"<task description>\""
