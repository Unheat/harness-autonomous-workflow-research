#!/usr/bin/env bash
set -euo pipefail

# Self-healing hook: Ensures all harness skill/agent paths are symlinks to canonical .agents and .agent
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_ROOT"

# 1. Canonical directories
mkdir -p .agents/skills .agent/agents

# 2. Check and heal skills symlinks
for harness in .claude .zcode .cursor .dsh; do
    mkdir -p "$harness"
    if [ -d "$harness/skills" ] && [ ! -L "$harness/skills" ]; then
        # If it's a real folder, migrate any contents to .agents/skills
        echo "[Auto-Heal] Real folder found at $harness/skills. Migrating contents to .agents/skills/..."
        cp -rn "$harness/skills/"* .agents/skills/ 2>/dev/null || true
        rm -rf "$harness/skills"
        ln -s ../.agents/skills "$harness/skills"
        echo "[Auto-Heal] Restored symlink $harness/skills -> ../.agents/skills"
    elif [ ! -e "$harness/skills" ]; then
        ln -s ../.agents/skills "$harness/skills"
        echo "[Auto-Heal] Created missing symlink $harness/skills -> ../.agents/skills"
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
    elif [ ! -e "$harness/agents" ]; then
        ln -s ../.agent/agents "$harness/agents"
        echo "[Auto-Heal] Created missing symlink $harness/agents -> ../.agent/agents"
    fi
done

exit 0
