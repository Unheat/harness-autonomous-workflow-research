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
# Codex is absent on purpose: it reads generated TOML under .codex/agents, never Markdown.
for harness in .claude .zcode .cursor .dsh .opencode; do
    repair_link "$harness/agents" ../.agent/agents
done

# A Markdown link there is poisonous: Codex would ignore it while it looks configured.
if [ -L .codex/agents ]; then
    rm -- .codex/agents
    printf '[Auto-Heal] Pruned .codex/agents link (run `harness heal` to generate Codex TOML)\n'
fi
if [ -f .mcp.json ]; then
    for harness in .agents .cursor; do
        repair_link "$harness/mcp.json" ../.mcp.json
    done
fi

# Remove poisonous .dsh/mcp.json adapter (prevents raw MCP double-mount in DSH)
if [ -e .dsh/mcp.json ] || [ -L .dsh/mcp.json ]; then
    rm -f -- .dsh/mcp.json
    printf '[Auto-Heal] Pruned poisonous .dsh/mcp.json adapter\n'
fi

# Remove only the known duplicate adapter, never unrelated ZCode skill links.
if [ -L .zcode/skills ]; then
    target="$(readlink .zcode/skills)"
    if [ "$target" = ../.agents/skills ] || [ "$target" = "$PROJECT_ROOT/.agents/skills" ]; then
        rm -- .zcode/skills
        printf '[Auto-Heal] Pruned redundant .zcode/skills adapter\n'
    fi
fi
