# Procedure: How judge-plan evaluates an implementation plan

## Read Order

1. Read the issue/task description and reproduction evidence first. Identify the target symptom, expected behavior, and actual behavior.
2. Read the candidate `plan.md` last:
   - Identify stated root cause.
   - Identify target files and scope boundaries.
   - Identify the implementation approach.
   - Identify the verification test command.

## Evidence Gathering

For each check, extract direct quotes or file references:
- **grounded-cause**: Quote the stated cause sentence and compare with the symptom. Verify it targets root mechanism, not a symptom band-aid.
- **bounded-scope**: List all files to be modified. Verify each file is necessary for the task. Check for unneeded scope creep.
- **startable**: Check if file paths and function names are explicitly stated. Verify no design choices are left unresolved.
- **decisive-test**: Quote the test command and expected exit code / assertion.

## Evaluation & Verdict

1. Grade each check as `pass` or `fail` strictly according to `rubric.md`.
2. Verdict:
   - If ALL checks are `pass` -> `verdict: accept`.
   - If ANY check is `fail` -> `verdict: reject`.
3. Output Format:
   Emit a readable analysis followed by the final fenced JSON block:

```json
{
  "item": "<plan-identifier>",
  "checks": [
    {"name": "grounded-cause", "grade": "pass|fail", "evidence": "<quote or fact>"},
    {"name": "bounded-scope", "grade": "pass|fail", "evidence": "<quote or fact>"},
    {"name": "startable", "grade": "pass|fail", "evidence": "<quote or fact>"},
    {"name": "decisive-test", "grade": "pass|fail", "evidence": "<quote or fact>"}
  ],
  "verdict": "accept|reject",
  "feedback": "<actionable fix instructions if rejected, or empty if accepted>"
}
```
