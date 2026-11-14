#!/usr/bin/env python3
"""
Universal Eval Harness for Autonomous SWE Judges (judge-plan & judge-pr)
Adapted from CodePath AI301 evaluation methodology.

Configuration:
    Copy `eval/.env.example` to `eval/.env` (next to this script) and fill in
    BASE_URL / MODEL / API_KEY. `.env` is gitignored; `.env.example` is the file
    we ship. Precedence: CLI flag > EVAL_* environment variable > eval/.env > default.

Usage:
    # Fast smoke test against the configured gateway:
    python3 eval/run_eval.py --dir eval/judge-plan --limit 3

    # Full evaluation run:
    python3 eval/run_eval.py --dir eval/judge-plan
    python3 eval/run_eval.py --dir eval/judge-pr

    # Explicit overrides still win:
    python3 eval/run_eval.py --dir eval/judge-plan --model fastg
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

DEFAULT_BASE_URL = "http://127.0.0.1:20128/v1"
DEFAULT_MODEL = "stacks"
DEFAULT_CLI_MODEL = "sonnet"
DEFAULT_TIMEOUT = 90
DEFAULT_WORKERS = 4
ENV_FILE_NAME = ".env"
ENV_EXAMPLE_NAME = ".env.example"

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
The bundle text above is your ONLY evidence. Do not guess and do not hallucinate.
Execute the procedure as written, grade every required check in the rubric, apply the rubric's verdict rule,
and end your response with a fenced JSON block in this exact schema:

```json
{{
  "item": "{item_id}",
  "checks": [
    {{"name": "<check-name>", "grade": "pass|fail|unclear", "evidence": "<one-line fact or quote>"}}
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


def load_env_file(path: Path) -> dict:
    """Reads a minimal KEY=VALUE config file (comments, blank lines, quotes handled)."""
    values = {}
    if not path.is_file():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key:
            values[key] = value.strip().strip('"').strip("'")
    return values


def first_set(*candidates):
    """Returns the first non-empty candidate, so an unset flag can defer to env/file."""
    for value in candidates:
        if value not in (None, ""):
            return value
    return None


def mask_secret(secret: str) -> str:
    """Reports presence without ever printing the key."""
    if not secret:
        return "missing"
    return f"set …{secret[-4:]}" if len(secret) > 8 else "set"


def resolve_settings(args, file_config: dict) -> dict:
    """Resolves CLI flag > EVAL_* env > eval/.env > built-in default."""
    if args.backend == "cli":
        model = first_set(args.model, os.environ.get("EVAL_MODEL"),
                          file_config.get("CLI_MODEL"), DEFAULT_CLI_MODEL)
    else:
        model = first_set(args.model, os.environ.get("EVAL_MODEL"),
                          file_config.get("MODEL"), DEFAULT_MODEL)
    return {
        "backend": args.backend,
        "model": model,
        "endpoint": first_set(args.endpoint, os.environ.get("EVAL_BASE_URL"),
                              file_config.get("BASE_URL"), DEFAULT_BASE_URL),
        "api_key": first_set(args.api_key, os.environ.get("EVAL_API_KEY"),
                             file_config.get("API_KEY"), os.environ.get("OPENAI_API_KEY")),
        "timeout": int(first_set(args.timeout, os.environ.get("EVAL_TIMEOUT"),
                                 file_config.get("TIMEOUT"), DEFAULT_TIMEOUT)),
        "workers": int(first_set(args.workers, os.environ.get("EVAL_WORKERS"),
                                 file_config.get("WORKERS"), DEFAULT_WORKERS)),
    }


def main():
    parser = argparse.ArgumentParser(description="Autonomous SWE Judge Evaluation Harness")
    parser.add_argument("--dir", type=str, required=True, help="Path to judge eval directory (e.g. eval/judge-plan)")
    parser.add_argument("--backend", choices=["http", "cli"], default="http", help="Backend to use (http: 9router/OpenAI gateway, cli: claude CLI)")
    parser.add_argument("--env-file", type=str, default=None, help=f"Config file (default: {ENV_FILE_NAME} next to this script)")
    parser.add_argument("--endpoint", type=str, default=None, help=f"API base URL for http mode (default: BASE_URL in {ENV_FILE_NAME}, else {DEFAULT_BASE_URL})")
    parser.add_argument("--api-key", type=str, default=None, help=f"API key for http mode (default: API_KEY in {ENV_FILE_NAME} or EVAL_API_KEY)")
    parser.add_argument("--model", type=str, default=None, help=f"Model to evaluate (default: MODEL in {ENV_FILE_NAME}, else {DEFAULT_MODEL})")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of items to evaluate")
    parser.add_argument("--only", type=str, default=None, help="Comma-separated list of item IDs (e.g. pkg-01,pkg-02)")
    parser.add_argument("--workers", type=int, default=None, help=f"Parallel worker threads (default: WORKERS in {ENV_FILE_NAME}, else {DEFAULT_WORKERS})")
    parser.add_argument("--timeout", type=int, default=None, help=f"Per-request timeout in seconds (default: TIMEOUT in {ENV_FILE_NAME}, else {DEFAULT_TIMEOUT})")
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

    env_path = Path(args.env_file).expanduser() if args.env_file else Path(__file__).resolve().parent / ENV_FILE_NAME
    file_config = load_env_file(env_path)
    settings = resolve_settings(args, file_config)

    if settings["backend"] == "http" and not settings["api_key"]:
        example = env_path.with_name(ENV_EXAMPLE_NAME)
        print(
            f"Error: no API key for the HTTP backend.\n"
            f"  cp {example} {env_path}  then set API_KEY (and BASE_URL / MODEL),\n"
            f"  or pass --api-key, or set EVAL_API_KEY.",
            file=sys.stderr,
        )
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
    print(f"Config:           {env_path} ({'found' if file_config else 'not found — using env/defaults'})", flush=True)
    print(f"Backend:          {settings['backend']} ({settings['endpoint'] if settings['backend'] == 'http' else 'claude CLI'})", flush=True)
    print(f"Model:            {settings['model']}", flush=True)
    if settings["backend"] == "http":
        print(f"API key:          {mask_secret(settings['api_key'])}", flush=True)
    print(f"Evaluating:       {len(pkg_files)} packages with {settings['workers']} workers\n", flush=True)

    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=settings["workers"]) as executor:
        future_to_item = {
            executor.submit(
                grade_one_item,
                f.stem, f, rubric_text, procedure_text,
                settings["backend"], settings["model"], settings["endpoint"],
                settings["api_key"], settings["timeout"]
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
