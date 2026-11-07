# Change-review rubric

All checks required. Acceptance means review-ready, not proven correct or merged.

| Check | Evidence and pass condition |
|---|---|
| plan-fidelity | Requirements, approved plan and authorized deviations match actual changes and delivery claims. Necessary extra files are justified; recorded deviations do not authorize dropping required acceptance criteria. No silent additions or omissions. |
| behavior-correctness | Trace changed logic and relevant callers against acceptance criteria and project constraints. Check error paths, boundaries and integration assumptions. Reject concrete defects with evidence; do not invent hypothetical blockers or treat passing tests as proof. |
| clean-diff | Changes are purposeful; no accidental debug debris, dead experiments or unrelated churn. Preserve legitimate logging/output, useful TODOs, required generated changes and justified restructuring. Tokens such as print or TODO are not automatic failures. |
| decisive-testing | Task-kind evidence exercises changed behavior with meaningful assertions, relevant negative/boundary cases and regressions. Bug: symptom-specific before/after; feature: acceptance; refactor: characterization parity; docs: validators. Mock-only evidence cannot establish integration behavior. No fabricated RED requirement. |
| repo-checks | Applicable required project checks have recorded outcomes tied to reviewed inputs. No unexplained new failures, skipped required checks or weakened assertions. Explicit not-applicable checks and evidenced unchanged baseline failures are not automatically new regressions; missing required verification holds review. |

Accept iff all checks pass. Missing required evidence: fail; ambiguity: unclear,
which holds acceptance. Cite deciding evidence and a concrete remedy for each failure.
