#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./.agent/scripts/install-skill.sh <git-repo-or-path> [skill-name] [--global]

TARGET_DIR=".agents/skills"
IS_GLOBAL=false
SOURCE=""
SKILL_NAME=""

for arg in "$@"; do
    if [ "$arg" == "--global" ]; then
        IS_GLOBAL=true
    elif [ -z "$SOURCE" ]; then
        SOURCE="$arg"
    elif [ -z "$SKILL_NAME" ]; then
        SKILL_NAME="$arg"
    fi
done

if [ -z "$SOURCE" ]; then
    echo "Usage: $0 <git-repo-url-or-local-dir> [skill-name] [--global]"
    echo "Examples:"
    echo "  $0 https://github.com/user/my-skill                # installs to .agents/skills/my-skill"
    echo "  $0 https://github.com/user/my-skill custom-name    # installs to .agents/skills/custom-name"
    echo "  $0 https://github.com/user/my-skill --global       # installs to ~/.agents/skills/my-skill"
    exit 1
fi

if [ "$IS_GLOBAL" = true ]; then
    TARGET_DIR="$HOME/.agents/skills"
fi

if [ -z "$SKILL_NAME" ]; then
    SKILL_NAME=$(basename "$SOURCE" .git)
fi

DEST="$TARGET_DIR/$SKILL_NAME"
mkdir -p "$TARGET_DIR"

if [ -d "$SOURCE" ]; then
    echo "Copying local skill from $SOURCE to $DEST..."
    cp -r "$SOURCE" "$DEST"
else
    echo "Cloning skill from $SOURCE to $DEST..."
    git clone --depth 1 "$SOURCE" "$DEST"
    rm -rf "$DEST/.git"
fi

echo "✅ Installed skill '$SKILL_NAME' successfully into $DEST"

# Auto-repair symlinks if local
if [ "$IS_GLOBAL" = false ]; then
    for harness in .claude .zcode .cursor .codex; do
        if [ -d "$harness" ] && [ ! -L "$harness/skills" ]; then
            rm -rf "$harness/skills"
            ln -s ../.agents/skills "$harness/skills"
            echo "🔗 Restored symlink $harness/skills -> ../.agents/skills"
        fi
    done
fi
