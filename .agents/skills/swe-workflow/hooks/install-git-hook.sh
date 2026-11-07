#!/usr/bin/env bash
# install-git-hook.sh - One-command installer for Universal Cross-Harness Git Gate
#
# Usage:
#   bash .agents/skills/swe-workflow/hooks/install-git-hook.sh [--uninstall]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_DIR="$(git rev-parse --git-dir 2>/dev/null || true)"

if [ -z "$GIT_DIR" ]; then
  echo "❌ Error: Not inside a Git repository." >&2
  exit 1
fi

HOOK_TARGET="$GIT_DIR/hooks/pre-push"
SOURCE_HOOK="$SCRIPT_DIR/universal-pre-push.sh"

if [[ "${1:-}" == "--uninstall" ]] || [[ "${1:-}" == "-u" ]]; then
  if [ -f "$HOOK_TARGET" ]; then
    rm -f "$HOOK_TARGET"
    echo "🗑️  Uninstalled Git pre-push hook from $HOOK_TARGET."
  else
    echo "ℹ️  No Git pre-push hook found to uninstall."
  fi
  exit 0
fi

# Ensure source hook is executable
chmod +x "$SOURCE_HOOK"

# Install hook
mkdir -p "$GIT_DIR/hooks"
cp "$SOURCE_HOOK" "$HOOK_TARGET"
chmod +x "$HOOK_TARGET"

echo "✅ Universal Git Pre-Push Hook successfully installed to:"
echo "   $HOOK_TARGET"
echo ""
echo "🛡️  Protection active: Any 'git push' from Claude Code, DSH, Cursor, ZCode,"
echo "   or manual terminal will now automatically verify tests before pushing."
echo "   (To uninstall at any time: bash $0 --uninstall)"
