---
name: f2p-protocol
description: Establish task-kind evidence and verify behavior without fabricated RED tests or weakened assertions.
---

# Evidence by task kind

- **Bug**: Reproduce the reported symptom before repairing it. Record environment,
  command, expected/actual behavior and output. RED must be the target failure,
  not a broken environment. After repair, the same check must pass.
- **Feature**: Define acceptance behavior first. Add behavioral tests before
  implementation where practical; demonstrate missing behavior, not incidental
  import/setup failure. Document when runnable RED is not feasible.
- **Refactor**: Record passing characterization tests and preserve behavior;
  no invented RED requirement.
- **Docs/research**: Use appropriate validators and source checks, not fake bugs.

A passing baseline test may be a valid control or already-supported behavior.
Investigate before rewriting it; cannot-reproduce is a legitimate outcome.

## Test quality
Assert externally meaningful results, not just mocked call counts. Include normal,
boundary, invalid-input and failure/recovery cases as applicable. Explain exclusions.
Keep test intent stable across the repair. Never delete/weaken checks for green.
Record relevant regression outcomes against baseline, including failures and skips.
Use integration checks for changed seams. F2P and coverage are evidence, not proof
that all requirements, security properties or edge cases hold.
