#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "      AGENTIC WORKFLOW HUB - CROSS-HARNESS STATUS "
echo "=================================================="
echo ""

echo "--- 1. CANONICAL SUBAGENTS (.agent/agents) ---"
if [ -d ".agent/agents" ]; then
    ls -1 .agent/agents/*.md 2>/dev/null || echo "No agents found"
fi
echo ""

echo "--- 2. HARNESS SYMLINK INTEGRITY ---"
for h in .claude .zcode .codex .opencode .dsh; do
    if [ -L "$h/agents" ]; then
        target=$(readlink "$h/agents")
        echo "✅ $h/agents -> $target"
    else
        echo "⚠️  $h/agents is NOT a symlink or missing"
    fi
done
for h in .claude .zcode .cursor .dsh; do
    if [ -L "$h/skills" ]; then
        target=$(readlink "$h/skills")
        echo "✅ $h/skills -> $target"
    else
        echo "⚠️  $h/skills is NOT a symlink or missing"
    fi
done
echo ""

echo "--- 3. PROJECT-SCOPED (FOLDER) SKILLS ---"
echo "From .agents/skills:"
ls -1 .agents/skills 2>/dev/null || echo "None"
echo ""

echo "--- 4. GLOBAL SKILLS ON THIS MACHINE ---"
echo "From ~/.agents/skills (Total: $(ls -1 ~/.agents/skills 2>/dev/null | wc -l | tr -d ' ')): "
ls -1 ~/.agents/skills 2>/dev/null | head -n 10
if [ "$(ls -1 ~/.agents/skills 2>/dev/null | wc -l)" -gt 10 ]; then
    echo "... and $(( $(ls -1 ~/.agents/skills 2>/dev/null | wc -l) - 10 )) more."
fi
echo ""

echo "--- 5. CONTEXT POLLUTION CHECK ---"
for agent_file in .agent/agents/*.md; do
    if [ -f "$agent_file" ]; then
        name=$(basename "$agent_file")
        if grep -q "disallowedTools:.*Skill" "$agent_file" || grep -q "disallowedTools:.*\[.*Skill.*\]" "$agent_file"; then
            echo "🛡️  $name: Protected against skill preview pollution (tool 'Skill' is stripped)"
        else
            echo "⚠️  $name: WARNING - tool 'Skill' is NOT stripped! Will receive global skill previews."
        fi
    fi
done
echo "=================================================="
