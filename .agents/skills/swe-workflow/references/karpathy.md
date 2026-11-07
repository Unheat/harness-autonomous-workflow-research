# Karpathy's 4 Core Principles for SWE Coding Agents

Derived from Andrej Karpathy's analysis of LLM coding failure modes:

1. **Think Before Coding**:
   - Don't assume. Don't hide confusion. Surface tradeoffs.
   - If multiple interpretations exist, present them rather than picking silently.
   - If something is unclear, stop, name what is confusing, and ask.

2. **Simplicity First**:
   - Minimum code that solves the problem. Nothing speculative.
   - No features beyond what was asked.
   - No abstractions for single-use code.
   - No "flexibility" or "configurability" that wasn't requested.
   - If 200 lines could be 50, rewrite it.

3. **Surgical Changes**:
   - Touch only what you must. Clean up only your own mess.
   - Don't "improve" adjacent code, comments, or formatting.
   - Don't refactor things that aren't broken.
   - Match existing style. Remove any orphaned variables/imports created by your changes.

4. **Goal-Driven Execution**:
   - Transform tasks into verifiable goals with tests first.
   - Loop until verified with decisive before/after proof.
