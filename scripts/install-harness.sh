#!/usr/bin/env bash
# install-harness.sh - Global installer for Universal Cross-Harness Manager (harness / agn)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${BIN_DIR:-${HOME}/.local/bin}"
mkdir -p "$BIN_DIR"

chmod +x "$REPO_ROOT/.agent/scripts/harness.ts"
ln -sf "$REPO_ROOT/.agent/scripts/harness.ts" "$BIN_DIR/harness"
ln -sf "$REPO_ROOT/.agent/scripts/harness.ts" "$BIN_DIR/agn"

echo "🚀 [Harness Manager] Installation complete!"
echo "   Installed binaries to: $BIN_DIR"
echo "   - harness -> $REPO_ROOT/.agent/scripts/harness.ts"
echo "   - agn     -> $REPO_ROOT/.agent/scripts/harness.ts"
echo ""
echo "Make sure $BIN_DIR is in your PATH. You can now run:"
echo "   harness status    # Inspect active tools & token meter"
echo "   harness catalog   # Browse dormant skills & MCPs"
echo "   harness doctor    # Audit cross-harness adapter symlinks"
echo "   harness ui        # Launch local Web UI dashboard (port 20888)"
