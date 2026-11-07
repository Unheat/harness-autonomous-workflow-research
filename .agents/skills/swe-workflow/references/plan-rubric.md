# Plan rubric

All checks required. Judge substance, not length, headings or a preferred solution.

| Check | Evidence and pass condition |
|---|---|
| grounded-cause | Bug: cause explains observations and controls, not merely silenced symptoms. Feature: design follows acceptance criteria and actual interfaces. Refactor: rationale and characterization preserve required behavior. Docs/research: approach fits objective and sources. Reject contradicted assumptions; exception handling is not inherently wrong. |
| bounded-scope | Changes serve the objective; necessary prerequisites/refactors are justified and within authorization. Unrelated work is deferred. Large diff or an additional justified file alone is not scope creep. |
| startable | Chosen approach, affected areas/interfaces and order make work executable. Do not demand every function name or fixed line count. Unresolved consequential implementation decisions fail. |
| decisive-test | Observable commands or reproducible steps distinguish success from failure. Include relevant boundaries, negative cases and regression checks. Refactors use parity evidence; feature/docs work need not invent a bug. A generic 'tests pass' is insufficient; precise manual/UI steps can be valid. |

Accept iff all checks pass. Missing required evidence: fail; conflicting evidence:
unclear, which holds acceptance. Give actionable feedback, not stylistic vetoes.