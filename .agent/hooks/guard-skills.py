#!/usr/bin/env python3
import sys
import json
import re

def main():
    try:
        raw_event = sys.stdin.read()
        if not raw_event.strip():
            sys.exit(0)
        event = json.loads(raw_event)
    except Exception:
        sys.exit(0)

    tool_name = event.get("tool_name", "")
    tool_input = event.get("tool_input", {})
    file_path = tool_input.get("file_path") or tool_input.get("path") or ""

    # Detect attempts to write skills directly into adapter directories instead of .agents/skills
    forbidden_patterns = [
        r"/\.claude/skills/",
        r"/\.zcode/skills/",
        r"/\.cursor/skills/",
        r"/\.codex/skills/"
    ]

    for pattern in forbidden_patterns:
        if re.search(pattern, file_path):
            # Block the write and instruct the model to redirect to .agents/skills/
            sys.stderr.write(
                f"\n[POLICY GUARD BLOCKED] Attempted write to '{file_path}'.\n"
                f"RULE: Do NOT create skill files directly in adapter directories (.claude/skills, .zcode/skills, etc.).\n"
                f"ACTION REQUIRED: Write your skill into '.agents/skills/' instead. The adapters will automatically pick it up via universal symlinks.\n"
            )
            # Exit 2 blocks the tool execution in Claude Code / ZCode
            sys.exit(2)

    sys.exit(0)

if __name__ == "__main__":
    main()
