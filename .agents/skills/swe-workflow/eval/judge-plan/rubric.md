# Rubric: Is this implementation plan ready to build from?

## Checks

| Check | Evidence | Pass condition | Weight |
|---|---|---|---|
| grounded-cause | The plan's stated root cause compared against observed symptoms / reproduction evidence. | The stated cause is consistent with every recorded symptom and explains why the reported behavior occurs. Fails when the cause contradicts observed evidence, addresses only downstream symptoms (e.g. swallowing exceptions, silencing errors), or when no cause is stated at all. | required |
| bounded-scope | The plan's change description, target files, and in-scope / out-of-scope boundaries. | Everything the plan changes serves the reported issue; work beyond it is explicitly deferred or marked out-of-scope. Fails when a fix is bundled with unrelated rework (refactors, migrations, redesigns, cleanup) into the same change. | required |
| startable | The plan's named files, functions, and explicit approach. | A developer can begin implementation immediately without asking questions: commits to specific files, areas, or one chosen approach. Fails when a decision needed to build is left open at build time ("investigate during build", "whichever is easier", "somewhere in the utils"). | required |
| decisive-test | The plan's test strategy compared against expected vs actual behavior. | Names an observable outcome that differs between broken and fixed behavior (for example, the repro's expected outcome now holding, a specific exit code, command output, or rendered state transition); fails when it names no observable outcome ("run the full test suite", "nothing else should feel broken", "should feel fast") or only restates that the change works. | required |

## Verdict Rule

- `accept`: Every required check passes.
- `reject`: Any required check fails or is unclear. Output must provide actionable feedback on what must be revised.
