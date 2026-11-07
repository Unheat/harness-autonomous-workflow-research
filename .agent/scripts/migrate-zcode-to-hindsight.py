#!/usr/bin/env python3
"""
Migrate all ZCode memories to Hindsight Server.
Discovers all memory markdown files across all workspace projects in ~/.zcode/cli/memories/projects/,
parses frontmatter metadata, and ingests them into corresponding Hindsight banks.
Also ingests all global 'user' and 'feedback' memories into coding-agent::global.
"""

import os
import glob
import re
import json
import urllib.request
import urllib.error
import yaml

HINDSIGHT_URL = os.environ.get("HINDSIGHT_API_URL", "http://127.0.0.1:8888")
MEMORIES_ROOT = os.path.expanduser("~/.zcode/cli/memories/projects")
BATCH_SIZE = 10


def parse_memory_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    match = re.match(r"^---\n(.*?)\n---\n(.*)$", content, re.DOTALL)
    if not match:
        return None

    yaml_block, body = match.group(1), match.group(2)
    try:
        meta = yaml.safe_load(yaml_block) or {}
    except Exception as e:
        # Fallback to regex parsing for frontmatters with unquoted colons
        name_match = re.search(r"^name:\s*(.+)$", yaml_block, re.MULTILINE)
        desc_match = re.search(r"^description:\s*(.+?)(?=\n[a-z_]+:|$)", yaml_block, re.DOTALL | re.MULTILINE)
        type_match = re.search(r"type:\s*(user|feedback|project|reference)", yaml_block)
        meta = {
            "name": name_match.group(1).strip() if name_match else None,
            "description": desc_match.group(1).strip() if desc_match else "",
            "metadata": {"type": type_match.group(1).strip() if type_match else "project"}
        }

    name = meta.get("name") or os.path.splitext(os.path.basename(filepath))[0]
    description = meta.get("description", "").strip()
    mem_type = meta.get("metadata", {}).get("type", "project")

    return {
        "name": name,
        "description": description,
        "type": mem_type,
        "raw_content": content,
        "body": body.strip(),
        "filepath": filepath,
    }


def send_batch_to_hindsight(bank_id, items):
    url = f"{HINDSIGHT_URL}/v1/default/banks/{bank_id}/memories"
    payload = {
        "async": True,
        "items": items,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"HTTP Error {e.code} for bank {bank_id}: {err_msg}")
        return None
    except Exception as e:
        print(f"Error sending to bank {bank_id}: {e}")
        return None


def main():
    print(f"Connecting to Hindsight at {HINDSIGHT_URL}...")
    try:
        with urllib.request.urlopen(f"{HINDSIGHT_URL}/health") as resp:
            health = json.loads(resp.read().decode("utf-8"))
            print(f"Hindsight health: {health}")
    except Exception as e:
        print(f"FATAL: Hindsight server is not reachable at {HINDSIGHT_URL}: {e}")
        return

    project_dirs = sorted(glob.glob(os.path.join(MEMORIES_ROOT, "*")))
    print(f"Found {len(project_dirs)} project directories in {MEMORIES_ROOT}")

    by_project = {}
    global_user_items = []
    total_files = 0

    for pdir in project_dirs:
        folder_name = os.path.basename(pdir)
        # Strip 16-hex character hash suffix (e.g. 'workflow-91454d5b6faa0629' -> 'workflow')
        project_name = re.sub(r"-[0-9a-f]{16}$", "", folder_name)

        md_files = glob.glob(os.path.join(pdir, "memory", "*.md"))
        md_files = [f for f in md_files if not f.endswith("MEMORY.md")]
        if not md_files:
            continue

        if project_name not in by_project:
            by_project[project_name] = []

        for fpath in md_files:
            total_files += 1
            parsed = parse_memory_file(fpath)
            if not parsed:
                continue

            item = {
                "content": parsed["raw_content"],
                "context": f"migrated zcode memory ({parsed['type']}): {parsed['description']}",
                "document_id": f"zcode-memory:{parsed['name']}",
                "tags": [
                    "source:upload",
                    "zcode:migrated",
                    f"type:{parsed['type']}",
                    f"project:{project_name}",
                ],
                "metadata": {
                    "title": parsed["name"],
                    "description": parsed["description"],
                    "type": parsed["type"],
                    "project": project_name,
                    "migrated_from": "zcode",
                },
            }
            by_project[project_name].append(item)

            if parsed["type"] in ["user", "feedback"]:
                global_user_items.append(item)

    print(f"\nDiscovered {total_files} memory files across {len(by_project)} projects.")
    print(f"Identified {len(global_user_items)} user/feedback memories to sync globally.\n")

    # Ingest per-project banks
    for project_name, items in by_project.items():
        bank_id = f"coding-agent::{project_name}"
        print(f"Ingesting {len(items)} items into bank '{bank_id}'...")

        for i in range(0, len(items), BATCH_SIZE):
            chunk = items[i : i + BATCH_SIZE]
            res = send_batch_to_hindsight(bank_id, chunk)
            if res and res.get("success"):
                print(f"  [{bank_id}] Chunk {i//BATCH_SIZE + 1} queued ({len(chunk)} items, op: {res.get('operation_id')})")
            else:
                print(f"  [{bank_id}] Chunk {i//BATCH_SIZE + 1} FAILED!")

    # Ingest global user/feedback memories into coding-agent::global
    if global_user_items:
        global_bank = "coding-agent::global"
        print(f"\nIngesting {len(global_user_items)} user/feedback items into global bank '{global_bank}'...")
        for i in range(0, len(global_user_items), BATCH_SIZE):
            chunk = global_user_items[i : i + BATCH_SIZE]
            res = send_batch_to_hindsight(global_bank, chunk)
            if res and res.get("success"):
                print(f"  [{global_bank}] Chunk {i//BATCH_SIZE + 1} queued ({len(chunk)} items, op: {res.get('operation_id')})")
            else:
                print(f"  [{global_bank}] Chunk {i//BATCH_SIZE + 1} FAILED!")

    print("\n✓ Migration queued successfully into Hindsight server!")


if __name__ == "__main__":
    main()
