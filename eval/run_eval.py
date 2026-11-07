#!/usr/bin/env python3
"""
Universal Eval Harness for Autonomous SWE Judges (judge-plan & judge-pr)
Adapted from CodePath AI301 evaluation methodology.

Usage:
    # Fast smoke test against local 9router gateway:
    python3 eval/run_eval.py --dir eval/judge-plan --limit 3

    # Full evaluation run on judge-plan:
    python3 eval/run_eval.py --dir eval/judge-plan --model stacks

    # Full evaluation run on judge-pr:
    python3 eval/run_eval.py --dir eval/judge-pr --model stacks

    # Using Claude CLI if installed:
    python3 eval/run_eval.py --dir eval/judge-plan --backend cli --model sonnet
"""

import argparse
import concurrent.futures
import json
import os
import re
import subprocess
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)

PROMPT_TEMPLATE = """\
# Role & Skill Specification
You are an expert, independent software engineering judge evaluating a work package against strict standards.
You must read the evidence objectively, apply the rubric checks strictly, and return a deterministic verdict.

----------------------------------------------------------------------
# Rubric (rubric.md)

{rubric}

----------------------------------------------------------------------
# Procedure (procedure.md)

{procedure}

----------------------------------------------------------------------
# Evaluation Package: {item_id}

{bundle}

----------------------------------------------------------------------
# Execution Instruction
Grade this package in EVALUATION MODE.
The bundle text above is your ONLY evidence. Do not guess, do not hallucinate, and do not be lenient.
Execute the procedure as written, grade every required check in the rubric, apply the rubric's verdict rule,
and end your response with a fenced JSON block in this exact schema:

```json
{{
  "item": "{item_id}",
  "checks": [
    {{"name": "<check-name>", "grade": "pass|fail", "evidence": "<one-line fact or quote>"}}
  ],
  "verdict": "accept|reject",
  "feedback": "<brief actionable critique if reject, or empty if accept>"
}}
```
"""


def extract_json_verdict(text: str) -> dict:
    blocks = JSON_BLOCK_RE.findall(text)
    if not blocks:
        # Fallback: search for top-level { ... } with "verdict"
        match = re.search(r"(\{\s*\"item\"[\s\S]*\"verdict\"[\s\S]*?\})", text)
        if match:
            return json.loads(match.group(1))
        raise ValueError(f"No fenced JSON block found in model output. Output tail: {text[-200:]!r}")
    return json.loads(blocks[-1])


def call_http_api(prompt: str, model: str, endpoint: str, api_key: str, timeout: int) -> str:
    url = f"{endpoint.rstrip('/')}/chat/completions"
    payload = {
        "model": model,
        "stream": False,
        "temperature": 0.0,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }
    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = json.loads(resp.read().decode("utf-8"))
        choices = body.get("choices", [])
        if not choices:
            raise ValueError(f"Empty choices in API response: {body}")
        return choices[0]["message"]["content"]


def call_cli(prompt: str, model: str, timeout: int) -> str:
    cmd = ["claude", "-p", "--model", model]
    proc = subprocess.run(cmd, input=prompt, capture_output=True, text=True, timeout=timeout)
    if proc.returncode != 0:
        raise RuntimeError(f"CLI exited {proc.returncode}: {proc.stderr.strip()[:200]}")
    return proc.stdout


def grade_one_item(item_id: str, bundle_path: Path, rubric_text: str, procedure_text: str,
                   backend: str, model: str, endpoint: str, api_key: str, timeout: int) -> dict:
    bundle_text = bundle_path.read_text(encoding="utf-8")
    prompt = PROMPT_TEMPLATE.format(
        rubric=rubric_text,
        procedure=procedure_text,
        item_id=item_id,
        bundle=bundle_text
    )

    last_err = ""
    for attempt in range(2):
        try:
            if backend == "http":
                raw_out = call_http_api(prompt, model, endpoint, api_key, timeout)
            else:
                raw_out = call_cli(prompt, model, timeout)
            
            parsed = extract_json_verdict(raw_out)
            verdict = str(parsed.get("verdict", "")).lower().strip()
            if verdict not in ("accept", "reject"):
                raise ValueError(f"Invalid verdict '{verdict}', must be 'accept' or 'reject'")
            
            return {
                "id": item_id,
                "verdict": verdict,
                "checks": parsed.get("checks", []),
                "feedback": parsed.get("feedback", ""),
                "error": None
            }
        except Exception as e:
            last_err = str(e)
    
    return {
        "id": item_id,
        "verdict": "error",
        "checks": [],
        "feedback": "",
        "error": last_err
    }


def main():
    parser = argparse.ArgumentParser(description="Autonomous SWE Judge Evaluation Harness")
    parser.add_argument("--dir", type=str, required=True, help="Path to judge eval directory (e.g. eval/judge-plan)")
    parser.add_argument("--backend", choices=["http", "cli"], default="http", help="Backend to use (http: 9router/OpenAI gateway, cli: claude CLI)")
    parser.add_argument("--endpoint", type=str, default="http://127.0.0.1:20128/v1", help="API base URL for http mode")
    parser.add_argument("--api-key", type=str, default=None, help="API key for http mode (defaults to ZCODE_9ROUTER_API_KEY env or local default)")
    parser.add_argument("--model", type=str, default="stacks", help="Model to evaluate (e.g. stacks, fastg, sonnet)")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of items to evaluate")
    parser.add_argument("--only", type=str, default=None, help="Comma-separated list of item IDs (e.g. pkg-01,pkg-02)")
    parser.add_argument("--workers", type=int, default=4, help="Parallel worker threads")
    parser.add_argument("--timeout", type=int, default=90, help="Per-request timeout in seconds")
    parser.add_argument("--save-run", type=str, default=None, help="File to save the formatted evaluation report")

    args = parser.parse_args()

    eval_dir = Path(args.dir).resolve()
    if not eval_dir.exists():
        print(f"Error: directory {eval_dir} does not exist.")
        sys.exit(1)

    rubric_file = eval_dir / "rubric.md"
    procedure_file = eval_dir / "procedure.md"
    gold_file = eval_dir / "gold-labels.json"
    packages_dir = eval_dir / "packages"

    if not all(p.exists() for p in (rubric_file, procedure_file, gold_file, packages_dir)):
        print(f"Error: missing required eval files in {eval_dir}")
        sys.exit(1)

    rubric_text = rubric_file.read_text(encoding="utf-8")
    procedure_text = procedure_file.read_text(encoding="utf-8")
    gold_data = json.loads(gold_file.read_text(encoding="utf-8"))

    api_key = args.api_key or os.environ.get("ZCODE_9ROUTER_API_KEY")
    if not api_key:
        env_file = Path("archive/legacy-paperclip/.workbench/state/dsh-providers.env")
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith("ZCODE_9ROUTER_API_KEY="):
                    api_key = line.split("=", 1)[1].strip()
                    break
    if not api_key:
        api_key = os.environ.get("OPENAI_API_KEY", "")

    if args.backend == "http" and not api_key:
        print("Error: API key required for HTTP backend. Provide via --api-key or ZCODE_9ROUTER_API_KEY / OPENAI_API_KEY environment variable.", file=sys.stderr)
        sys.exit(1)

    gold_items = {item["id"]: item for item in gold_data.get("items", [])}
    pkg_files = sorted(packages_dir.glob("*.md"))

    # Filter target items
    if args.only:
        allowed = set(s.strip() for s in args.only.split(","))
        pkg_files = [f for f in pkg_files if f.stem in allowed]
    if args.limit:
        pkg_files = pkg_files[:args.limit]

    print(f"=== Running Judge Evaluation Harness ===", flush=True)
    print(f"Target Directory: {eval_dir.name}", flush=True)
    print(f"Backend:          {args.backend} ({args.endpoint if args.backend == 'http' else 'CLI'})", flush=True)
    print(f"Model:            {args.model}", flush=True)
    print(f"Evaluating:       {len(pkg_files)} packages with {args.workers} workers\n", flush=True)

    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        future_to_item = {
            executor.submit(
                grade_one_item,
                f.stem, f, rubric_text, procedure_text,
                args.backend, args.model, args.endpoint, api_key, args.timeout
            ): f.stem for f in pkg_files
        }
        for future in concurrent.futures.as_completed(future_to_item):
            res = future.result()
            item_id = res["id"]
            results[item_id] = res
            status_icon = "⏳"
            if item_id in gold_items:
                gold_v = gold_items[item_id].get("verdict", "")
                status_icon = "✅" if res["verdict"] == gold_v else "❌"
            print(f"  {status_icon} [{item_id}] Model: {res['verdict']} | Error: {res.get('error') or 'None'}", flush=True)

    # Build Report
    output_lines = []
    output_lines.append(f"\n{'item':<8} {'category':<18} {'gold':<8} {'verdict':<8} {'agree':<6} {'note'}")
    output_lines.append("-" * 75)

    scored_total = 0
    scored_agree = 0
    category_tally = {}

    for f in sorted(pkg_files, key=lambda x: x.stem):
        item_id = f.stem
        res = results.get(item_id, {})
        gold_entry = gold_items.get(item_id, {})
        category = gold_entry.get("category", "unknown")
        gold_verdict = gold_entry.get("verdict", "unknown")
        model_verdict = res.get("verdict", "error")
        is_calib = gold_entry.get("calibration", False)

        agree = "yes" if model_verdict == gold_verdict else "NO"
        note = res.get("error") or ""
        if not note and agree == "NO":
            failed_checks = [c["name"] for c in res.get("checks", []) if c.get("grade") == "fail"]
            note = f"failed checks: {','.join(failed_checks)}" if failed_checks else f"graded {model_verdict}"

        output_lines.append(f"{item_id:<8} {category:<18} {gold_verdict:<8} {model_verdict:<8} {agree:<6} {note}")

        if not is_calib and gold_verdict in ("accept", "reject"):
            scored_total += 1
            if category not in category_tally:
                category_tally[category] = {"agree": 0, "total": 0}
            category_tally[category]["total"] += 1
            if agree == "yes":
                scored_agree += 1
                category_tally[category]["agree"] += 1

    tally_str = "  ".join(f"{cat} {v['agree']}/{v['total']}" for cat, v in sorted(category_tally.items()))
    output_lines.append("\n" + "=" * 75)
    output_lines.append(f"Categories Breakdown: {tally_str}")
    
    pass_bar = gold_data.get("pass_bar", 18)
    if scored_total > 0:
        pct = (scored_agree / scored_total) * 100
        pass_status = "PASS ✅" if (scored_agree >= pass_bar and scored_total >= 20) or (scored_total < 20 and scored_agree == scored_total) else "EVALUATING"
        output_lines.append(f"Agreement Score:      {scored_agree}/{scored_total} ({pct:.1f}%) | Target Bar: >={pass_bar}/20 -> {pass_status}")
    output_lines.append("=" * 75)

    full_output = "\n".join(output_lines)
    print(full_output)

    if args.save_run:
        Path(args.save_run).write_text(full_output, encoding="utf-8")
        print(f"\nRun saved to {args.save_run}")


if __name__ == "__main__":
    main()
