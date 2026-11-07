# Procedure: How judge-pr evaluates a PR diff and test evidence

## Read Order

1. Read the approved `plan.md` to identify the committed scope, file list, and test requirements.
2. Inspect the test evidence (before/after terminal output, exit codes).
3. Inspect `git diff` against the default branch.

## Evidence Gathering

For each check, gather concrete facts:
- **plan-fidelity**: Compare files in `git diff --stat` against `plan.md` target files. Flag any file that was touched without justification.
- **clean-diff**: Scan every hunk in `git diff` for:
  - Debug statements (`console.log`, `print`, `eprintln`).
  - Commented-out code blocks.
  - Temporary or unused functions/variables.
  - Unrelated reformatting or whitespace churn.
- **decisive-testing**: Check if before/after evidence exists proving the reproduction test failed originally and now passes.
- **repo-checks**: Verify that linter, typechecker, and regression tests passed without errors.

## Evaluation & Verdict

1. Grade each check as `pass` or `fail` strictly according to `rubric.md`.
2. Verdict:
   - If ALL checks are `pass` -> `verdict: accept`.
   - If ANY check is `fail` -> `verdict: reject`.
3. Output Format:
   Emit a readable summary followed by the final fenced JSON block:

```json
{
  "item": "<pr-or-branch-identifier>",
  "checks": [
    {"name": "plan-fidelity", "grade": "pass|fail", "evidence": "<quote or fact>"},
    {"name": "clean-diff", "grade": "pass|fail", "evidence": "<quote or fact>"},
    {"name": "decisive-testing", "grade": "pass|fail", "evidence": "<quote or fact>"},
    {"name": "repo-checks", "grade": "pass|fail", "evidence": "<quote or fact>"}
  ],
  "verdict": "accept|reject",
  "feedback": "<actionable fix instructions if rejected, or empty if accepted>"
}
```
