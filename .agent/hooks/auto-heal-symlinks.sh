#!/usr/bin/env bash
set -euo pipefail

# Keep this adapter policy aligned with ADAPTER_SYMLINKS in src/workspace.ts.
# Never migrate physical resources implicitly: they may be private or conflicting.
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$PROJECT_ROOT"
mkdir -p .agents/skills .agent/agents

repair_link() {
    local link="$1" target="$2"
    mkdir -p "$(dirname "$link")"
    if [ -L "$link" ]; then
        if [ "$(readlink "$link")" = "$target" ]; then
            return
        fi
        rm -- "$link"
    elif [ -e "$link" ]; then
        printf '[Auto-Heal] Preserved physical adapter %s (manual migration required)\n' "$link"
        return
    fi
    ln -s "$target" "$link"
    printf '[Auto-Heal] Reconciled %s -> %s\n' "$link" "$target"
}

for harness in .claude .cursor .dsh .codex .opencode; do
    repair_link "$harness/skills" ../.agents/skills
done
for harness in .claude .zcode .cursor .codex .dsh .opencode; do
    repair_link "$harness/agents" ../.agent/agents
done
if [ -f .mcp.json ]; then
    for harness in .agents .cursor .dsh; do
        repair_link "$harness/mcp.json" ../.mcp.json
    done
fi

# Remove only the known duplicate adapter, never unrelated ZCode skill links.
if [ -L .zcode/skills ]; then
    target="$(readlink .zcode/skills)"
    if [ "$target" = ../.agents/skills ] || [ "$target" = "$PROJECT_ROOT/.agents/skills" ]; then
        rm -- .zcode/skills
        printf '[Auto-Heal] Pruned redundant .zcode/skills adapter\n'
    fi
fi
