#!/usr/bin/env bash
# universal-pre-push.sh - Cross-Harness Pre-Push Enforcement Gate
#
# Placed into .git/hooks/pre-push by install-git-hook.sh.
# Intercepts any 'git push' command from ANY harness (Claude Code, DSH, Cursor, ZCode, or human)
# and ensures test evidence exists and the local test suite passes before code leaves the machine.

set -euo pipefail

# Allow manual override for emergency hotfixes if explicitly requested
if [[ "${GIT_SWE_SKIP:-0}" == "1" ]]; then
  echo "⚠️ [swe-git-gate] GIT_SWE_SKIP=1 detected: Skipping pre-push verification."
  exit 0
fi

# Detect remote and branch being pushed
remote="$1"
url="$2"

echo "🛡️ [swe-git-gate] Verifying branch before push to $remote ($url)..."

# Detect if the project uses a standard test runner
TEST_CMD=""
if [ -f "package.json" ]; then
  if command -v bun >/dev/null 2>&1 && [ -f "bun.lockb" -o -f "bun.lock" ]; then
    TEST_CMD="bun test"
  elif command -v pnpm >/dev/null 2>&1 && [ -f "pnpm-lock.yaml" ]; then
    TEST_CMD="pnpm test"
  elif command -v yarn >/dev/null 2>&1 && [ -f "yarn.lock" ]; then
    TEST_CMD="yarn test"
  elif command -v npm >/dev/null 2>&1; then
    TEST_CMD="npm test"
  fi
elif [ -f "pyproject.toml" -o -f "pytest.ini" -o -f "setup.py" ]; then
  if command -v pytest >/dev/null 2>&1; then
    TEST_CMD="pytest"
  elif command -v python3 >/dev/null 2>&1; then
    TEST_CMD="python3 -m unittest discover"
  fi
elif [ -f "Cargo.toml" ]; then
  TEST_CMD="cargo test"
elif [ -f "Makefile" ]; then
  if grep -q "^test:" Makefile 2>/dev/null; then
    TEST_CMD="make test"
  fi
fi

# 1. Verification of Test Suite
if [ -n "$TEST_CMD" ]; then
  echo "🔍 [swe-git-gate] Running deterministic test gate: '$TEST_CMD'..."
  if ! eval "$TEST_CMD" > /dev/null 2>&1; then
    echo "❌ [swe-git-gate] BLOCKED: Local test suite failed!" >&2
    echo "   Run '$TEST_CMD' locally to inspect and fix the failing tests before pushing." >&2
    echo "   (Emergency bypass: GIT_SWE_SKIP=1 git push)" >&2
    exit 1
  fi
  echo "✅ [swe-git-gate] Test suite passed."
fi

# 2. Check for unresolved merge conflicts
if git grep -n "^<<<<<<< " -- ':!*.test.*' ':!*.json' ':!*.md' 2>/dev/null; then
  echo "❌ [swe-git-gate] BLOCKED: Unresolved merge conflicts detected in code!" >&2
  exit 1
fi

# 3. Secret Scanning Gate (Block exposed API keys, tokens, and private credentials)
SECRET_MATCH=$(git grep -E -I -n "(sk-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{50,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA|EC|DSA|OPENSSH|PRIVATE) KEY-----)" -- ':!*.test.*' ':!*.json' ':!*.md' ':!specs/*' ':!docs/*' ':!package-lock.json' 2>/dev/null || true)
if [ -n "$SECRET_MATCH" ]; then
  echo "🚨 [swe-git-gate] BLOCKED: High-entropy secret / API key detected in tracked files!" >&2
  echo "$SECRET_MATCH" | head -n 5 >&2
  echo "   Move secrets to gitignored .env files or environment variables before pushing." >&2
  exit 1
fi

echo "🚀 [swe-git-gate] All pre-push checks passed cleanly. Pushing to $remote..."
exit 0
