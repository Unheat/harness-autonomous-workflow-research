#!/usr/bin/env bash
set -euo pipefail

# Self-healing hook: Ensures all harness skill/agent paths are symlinks to canonical .agents and .agent
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$PROJECT_ROOT"

# 1. Canonical directories
mkdir -p .agents/skills .agent/agents

# 2. Check and heal skills symlinks
for harness in .claude .zcode .cursor .dsh; do
    mkdir -p "$harness"
    if [ -d "$harness/skills" ] && [ ! -L "$harness/skills" ]; then
        echo "[Auto-Heal] Real folder found at $harness/skills. Migrating contents to .agents/skills/..."
        cp -rn "$harness/skills/"* .agents/skills/ 2>/dev/null || true
        rm -rf "$harness/skills"
        ln -s ../.agents/skills "$harness/skills"
        echo "[Auto-Heal] Restored symlink $harness/skills -> ../.agents/skills"
    elif [ ! -L "$harness/skills" ] || [ ! -e "$harness/skills" ]; then
        rm -f "$harness/skills"
        ln -s ../.agents/skills "$harness/skills"
        echo "[Auto-Heal] Reconciled symlink $harness/skills -> ../.agents/skills"
    fi
done

# 3. Check and heal agent symlinks
for harness in .claude .zcode .codex .opencode .dsh; do
    mkdir -p "$harness"
    if [ -d "$harness/agents" ] && [ ! -L "$harness/agents" ]; then
        echo "[Auto-Heal] Real folder found at $harness/agents. Migrating to .agent/agents/..."
        cp -rn "$harness/agents/"* .agent/agents/ 2>/dev/null || true
        rm -rf "$harness/agents"
        ln -s ../.agent/agents "$harness/agents"
        echo "[Auto-Heal] Restored symlink $harness/agents -> ../.agent/agents"
    elif [ ! -L "$harness/agents" ] || [ ! -e "$harness/agents" ]; then
        rm -f "$harness/agents"
        ln -s ../.agent/agents "$harness/agents"
        echo "[Auto-Heal] Reconciled symlink $harness/agents -> ../.agent/agents"
    fi
done

# 4. Guarantee .agents/mcp.json -> ../.mcp.json compatibility symlink
if [ -f ".mcp.json" ]; then
    if [ ! -L ".agents/mcp.json" ] || [ ! -e ".agents/mcp.json" ]; then
        rm -f ".agents/mcp.json"
        ln -s ../.mcp.json ".agents/mcp.json"
        echo "[Auto-Heal] Reconciled .agents/mcp.json -> ../.mcp.json"
    fi
fi

exit 0
