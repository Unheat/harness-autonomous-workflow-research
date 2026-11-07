# Rubric: Is this pull request diff and test evidence ready to merge?

## Checks

| Check | Evidence | Pass condition | Weight |
|---|---|---|---|
| plan-fidelity | `git diff` compared against the approved `plan.md` scope and file list. | Every file touched and functional change in the diff falls within the plan's stated scope. Fails if unexpected files, unrequested flags, or unnoted scope growth are present. | required |
| clean-diff | Unified diff and git commit history. | The diff contains only purposeful changes and is 100% free of review debris: no debug prints (`console.log`, `print`, `eprintln`), no dead code (`_unused_`, `TODO`), no commented-out code experiments, and no unrelated formatting or import churn. | required |
| decisive-testing | Test execution transcripts and assertion evidence compared against the F2P reproduction requirement. | Concrete, observable before-and-after proof is demonstrated: test failed before the fix, and passed after the fix. Fails if evidence is vague ("tests pass", "verified locally") without observable command output. | required |
| repo-checks | Automated repository check outcomes (`tsc`, `lint`, test suite). | Compiler, linter, and full existing test suite pass with exit code 0. Fails if warnings are silenced, exceptions swallowed, or existing tests skipped. | required |

## Verdict Rule

- `accept`: Every required check passes with concrete evidence citations.
- `reject`: Any required check fails or has review debris. Output must name the exact file and line number to clean or fix.
