# Fail-to-Pass (F2P) Protocol Reference

The Fail-to-Pass (F2P) testing methodology is the gold standard of SWE-bench and autonomous agent verification:

## 1. Anti-Cheat & Tautology Defenses (Combatting AI Laziness)
LLMs exhibit specific testing blind spots:
- **Trivial/Obvious Test Trap**: Testing only the happy path or inputs the model knows will pass beforehand.
- **Mock-Only Illusion**: Mocking the very component being fixed, asserting mocked returns rather than real system transitions.
- **Tautological Assertions**: Writing assertions like `expect(res).toBeDefined()` or `expect(true).toBe(true)` that pass regardless of bug presence.

**Mandatory Invariant**:
- The reproducer test MUST execute against the UNTOUCHED codebase and **FAIL with an exit code != 0** showing the exact symptom.
- If a test passes on untouched code, it is REJECTED immediately as invalid.
- Assertions must check specific state transitions, error messages, boundary inputs, or negative failure modes—not just loose non-null checks.

## 2. Multi-Tier Testing by Project Architecture
The test runner must detect and execute the relevant test tier for the change:
- **Unit Tests**: Individual functions, pure utilities, algorithm boundaries (`<test>`).
- **Integration Tests**: API routes, database transactions, service interactions.
- **Typecheck & Linter**: Static analysis (`<typecheck>` e.g. `tsc`, `mypy`; `<lint>` e.g. `eslint`, `ruff`).
- **Pass-to-Pass (P2P) Regression**: The existing test suite must be run to guarantee zero unintended side effects.

## 3. The 3 Phases of Execution
1. **RED Phase**: Write reproducer test with negative/boundary probes. Run test -> MUST FAIL (Exit code != 0).
2. **GREEN Phase**: Write surgical minimal fix. Run test -> MUST PASS (Exit code == 0).
3. **P2P Phase**: Run project test suite + linter + typechecker. Zero regressions allowed.
