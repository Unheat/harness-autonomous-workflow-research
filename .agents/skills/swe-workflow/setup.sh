#!/usr/bin/env bash
# setup.sh - One-command installer and environment initializer for swe-workflow
#
# Usage:
#   bash .agents/skills/swe-workflow/setup.sh
#
# What it does:
#   1. Verifies workspace root and tools (git, bun/npm, rg).
#   2. Registers subagents into .agent/agents/ and .agents/subagents/ for DSH, ZCode, and Claude.
#   3. Scaffolds cross-harness symlinks (.dsh/skills, .claude/skills, .cursor/skills).
#   4. Installs the universal pre-push git hook (.git/hooks/pre-push).

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
mkdir -p .agents/subagents

for agent_file in "$SCRIPT_DIR/agents"/*.md; do
  if [ -f "$agent_file" ]; then
    base_name="$(basename "$agent_file")"
    cp "$agent_file" ".agent/agents/$base_name"
    cp "$agent_file" ".agents/subagents/$base_name"
    echo "  -> Registered agent: $base_name"
  fi
done

# 3. Setup Cross-Harness Symlinks (DSH, Claude, Cursor, Codex)
echo "🔗 [3/4] Scaffolding cross-harness adapter symlinks..."
mkdir -p .agents/skills
mkdir -p .claude .cursor .dsh .codex .opencode

# Symlink skills for harnesses requiring dedicated discovery paths
ensure_link() {
  local link_path="$1"
  local target_path="$2"
  if [ ! -e "$link_path" ] && [ ! -L "$link_path" ]; then
    ln -s "$target_path" "$link_path"
    echo "  -> Linked $link_path -> $target_path"
  fi
}

ensure_link ".claude/skills" "../.agents/skills"
ensure_link ".cursor/skills" "../.agents/skills"
ensure_link ".dsh/skills" "../.agents/skills"
ensure_link ".codex/skills" "../.agents/skills"
ensure_link ".opencode/skills" "../.agents/skills"

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
