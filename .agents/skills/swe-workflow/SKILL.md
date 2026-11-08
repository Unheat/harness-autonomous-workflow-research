---
name: swe-workflow
description: Complete, disciplined autonomous software engineering workflow combining ECC test runner auto-detection, Karpathy surgical simplicity, CodePath F2P reproduction, and calibrated dual-gate judge verification with human tie-breakers. Use when implementing non-trivial features, fixing bugs, or preparing production-ready pull requests.
argument-hint: "<task description or path to issue/plan>"
license: MIT
---

# Autonomous SWE Workflow Engine

A disciplined, reproducible software engineering workflow for coding agents. It ensures fixes and features are built test-first, strictly bounded in scope, free of review debris, verified against root causes, and finalized as a review-ready Draft PR.

---

## Core Invariants: Karpathy's 4 Principles

Derived from Andrej Karpathy's analysis of LLM coding failure modes. These 4 rules govern every phase:

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

---

## Operating Protocol & Boundaries

- **One Hands-On Lead Engineer**: The active agent executes in the workspace/worktree directly (authoring tests and editing code). Secondary subagents (`explore-code`, `research`, `judge-plan`, `judge-pr`) are used strictly in **Read-only** roles for non-destructive exploration and independent evaluation.
- **Never Restart on Ambiguity**: When judges and plans disagree, invoke the **Human Tie-Breaker** to resolve the tradeoff in one quick question, then continue directly from the current checkpoint. Never throw away gathered exploration context.
- **Universal Physical Safety Gate (Optional)**: If physical enforcement against accidental pushes is desired, run `bash .agents/skills/swe-workflow/hooks/install-git-hook.sh`. This places a native `pre-push` hook intercepting any `git push` across all harnesses (DSH, Claude Code, Cursor, ZCode, manual CLI) to verify tests pass before code leaves the machine.
- **Atomic Git Checkpoints**: Create progressive commits preserving the verification trail:
  1. `test: add reproducer for <topic>` (RED state)
  2. `fix: <topic>` (GREEN state)
  3. `refactor: clean up <topic>` (Clean diff)

---

## Phase 0: Auto-Discovery & Test Runner Detection

Before writing any code or tests, discover the local repository's invariants:

1. **Discover Repository Guidelines & Non-Code Obligations**:
   *Every repository defines its own rules, contribution protocols, and deliverables. Common filenames below are illustrative examples, NOT an exhaustive list.*
   - **Agent Directives**: `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.cursor/rules/`, `.github/copilot-instructions.md`, or harness presets.
   - **Contribution & Development Guides**: Look for whatever documents contributor expectations (e.g. `CONTRIBUTING.md`, `docs/contributing.rst`, `DEVELOPMENT.md`, `HACKING.md`, `README.md`).
   - **PR Templates & Checklists**: Locate PR templates wherever placed (`.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE/*.md`, `pull_request_template.md`, etc.).
   - **Extract Concrete Mandatory Obligations**:
     - *Documentation*: Does the repo require updating user docs, API docs, or tooling specs (e.g. updating `SKILL.md` when agent tools/flags change)?
     - *Release notes / Changelog*: Does the repo require a `CHANGELOG.md` entry, `whatsnew/` fragment, or towncrier note?
     - *Artifact codegen*: Does the repo require regenerating types, cheatsheets, protobuf, or schema manifests?
     - *PR checklist items*: Specific issue reference keywords (`closes #xxxx`), test pass disclosures, or template sections.
   - **Record Discovered Policy Paths**: Note exact relative paths (e.g. `docs/CONTRIBUTING.md`, `.github/pull_request_template.md`). You will pass these to the judges.

2. **Resolve the Test Runner & Commands (Multi-Tier Testing)**:
   - Inspect `package.json`, `Makefile`, `pyproject.toml`, or `Cargo.toml`.
   - Distinguish package manager from test runner:
     - If Bun native: `<test>` = `bun test` (not `bun run test`).
     - If Jest/Vitest under pnpm: `<test>` = `pnpm test`.
     - If Python: `<test>` = `pytest`.
   - Resolve commands across the project's verification tiers:
     - `<test>`: Unit and integration test runner.
     - `<lint>`: Linter (e.g. `eslint`, `ruff`, `golangci-lint`).
     - `<typecheck>`: Static type checker (e.g. `tsc --noEmit`, `mypy`, `pyright`).

---

## Phase 1: Proportional Discovery & Fail-to-Pass (F2P) Reproduction

*(Enforces Principle 4: Goal-Driven Execution)*

1. **Proportional Discovery (Non-Mandatory Routing)**:
   Evaluate task complexity before spawning any subagent:
   - **Direct Inspection (Default, 0 subagents)**: For narrow, localized tasks (1–2 known files, clear stack trace, familiar logic), inspect code directly using standard harness tools (`Read`, `Grep`, or project-preferred tools from `AGENTS.md`). Zero token overhead.
   - **Invoke `explore-code` (When tracing cross-file architecture)**: When the bug or feature spans unfamiliar modules, call the read-only `explore-code` subagent to trace callers/callees and dependency graphs (inheriting any custom indexing/search tools from `AGENTS.md`, or falling back to standard `Read`/`Grep`).
   - **Invoke `research` (When solving design uncertainty or industry standards)**: 90% of architectural patterns and optimizations are already solved by industry standards. If the task involves unfamiliar external libraries, framework upgrades, or non-trivial design decisions, call `research` to inspect local configs and search online solutions (inheriting any preferred search engine from `AGENTS.md`, or falling back to default web search/`web_fetch`).

2. **Author the Reproducer (Anti-Cheat & Strict Invariants)**:
   - Prohibit trivial/obvious happy-path tests: Do not write tests asserting things already known to work or loose tautologies (`expect(res).toBeDefined()`, `expect(true).toBe(true)`).
   - Prohibit mock-only tests: Do not mock the exact logic being fixed. Tests must assert actual behavior, boundary limits, invalid inputs, or error states.
   - Author a targeted unit or integration test reproducing the exact failure mode.
   - Place in project's test directory (e.g. `tests/repro_<issue>.test.ts`).
3. **Execute the RED Gate**:
   - Run the test: `<test> tests/repro_<issue>.test.ts`
   - **MANDATORY INVARIANT**: The test **MUST FAIL** (`Exit code != 0`).
   - If the test passes on the untouched code, it is **tautological/invalid**. Revise the test until it reliably catches the bug.
4. **Git Checkpoint 1**:
   ```bash
   git add <test-file>
   git commit -m "test: add reproducer for <topic>"
   ```

---

## Phase 2: Plan Drafting & Calibrated `judge-plan` Gate

*(Enforces Principles 1 & 2: Think Before Coding & Simplicity First)*

1. **Draft Plan** (`.workflow/plan.md`):
   Document a concise (20–30 lines) implementation blueprint:
   - **Grounded Cause**: Exact root cause mechanism (why it broke, not just what failed).
   - **Bounded Scope**: Exact list of files to touch. Explicit `Out of scope:` list.
   - **Approach**: The minimal, surgical change addressing the root cause.
   - **Decisive Test**: Command and expected output proving success.
   - **Repo Rules & Custom Deliverables**:
     - *Discovered Policy Files*: List exact paths found in Phase 0 (e.g. `docs/CONTRIBUTING.md`, `.github/pull_request_template.md`).
     - *Mandatory Non-Code Deliverables*: Specific items required by repo rules (e.g. `SKILL.md` update, docs update, `whatsnew/` entry, cheatsheet regen).
     - *Recorded Deviations*: Any repo rule explicitly not applicable to this task, with justification.
2. **Invoke `judge-plan` Subagent**:
   - Dispatch `judge-plan` (1-turn read-only reviewer) passing:
     - `plan.md` content
     - Reproduction evidence (F2P Red test command and output)
     - **Discovered Repository Policy Paths & Extracted Obligations** (pass the exact file paths and obligations discovered in Phase 0 so `judge-plan` can read them directly without burning tokens re-scanning the workspace).
   - It grades 4 criteria: `grounded-cause`, `bounded-scope` (verifying repo obligations are accounted for), `startable`, `decisive-test`.
3. **Review Loop & Human Tie-Breaker**:
   - **If Approved**: Proceed directly to Phase 3.
   - **If Rejected (Round 1)**: Review actionable feedback. Revise `plan.md` to address specific critique and re-test with `judge-plan`.
   - **If Rejected (Round 2) or Tradeoff Ambiguity**:
     - **DO NOT ABORT OR RESTART WORKFLOW.**
     - Trigger the **Human Tie-Breaker**: Ask the human developer a concise 3-option question summarizing the disagreement:
       > *"Judge rejected plan because [reason]. Proposed solutions: [Option A], [Option B], or [Override Judge]. How would you like to proceed?"*
     - Upon human selection, document the directive in `plan.md` (`Deviation Note: User explicitly approved <choice>`) and **PROCEED DIRECTLY TO IMPLEMENTATION**.

---

## Phase 3: Surgical Implementation (Make Tests Green)

*(Enforces Principle 3: Surgical Changes)*

1. **Implement Minimal Fix**:
   - Edit only the files approved in `plan.md`.
   - Implement the direct fix without adding unrequested "configurable options" or premature helper abstractions.
2. **Execute the GREEN Gate**:
   - Run the reproduction test: `<test> tests/repro_<issue>.test.ts`
   - **MANDATORY INVARIANT**: The test **MUST PASS** (`Exit code == 0`).
3. **Execute Pass-to-Pass (P2P) Regression & Lint**:
   - Run the entire existing test suite: zero regressions allowed.
   - Run `<typecheck>` and `<lint>`. Fix any type or lint errors introduced.
4. **Git Checkpoint 2**:
   ```bash
   git add <implemented-files>
   git commit -m "fix: <topic>"
   ```

---

## Phase 4: Diff Hygiene & `judge-pr` Verification

1. **Self-Diff Inspection**:
   - Run `git diff HEAD~1` and inspect every hunk:
     - Remove all debug statements (`console.log`, `print`, `debugger`).
     - Remove all commented-out trial code or unused imports.
     - Eliminate cosmetic reformatting or unrelated whitespace churn.
     - Confirm all mandatory repo deliverables from `plan.md` (docs, changelog/whatsnew, codegen, sync files) are implemented.
2. **Invoke `judge-pr` Subagent**:
   - Dispatch `judge-pr` (1-turn read-only reviewer) passing:
     - Uncommitted and committed branch diff
     - Draft PR description & checklist
     - Verified test evidence (F2P Green test output and P2P suite results)
     - **Discovered Repository Policy Paths & Extracted Obligations** (pass the exact file paths and obligations from Phase 0 so `judge-pr` reads them directly without re-exploring).
   - It checks: `plan-fidelity` (verifying all repo rules, template checklists, and non-code deliverables are satisfied or explicitly deviated), `clean-diff`, `decisive-testing`, `repo-checks`.
   - If review debris, missing repo deliverables, or unannounced scope creep is caught -> clean the diff and fulfill obligations immediately.
3. **Git Checkpoint 3** (if cleanups were made):
   ```bash
   git commit -am "refactor: clean diff and formatting for <topic>"
   ```

---

## Phase 5: Draft PR Generation & Human Handoff

1. **Compile Evidence Report** (`.workflow/evidence.md`):
   - Table of guarantees: what was broken, how it was reproduced, decisive test command, verified before/after exit codes.
2. **Draft PR Preparation**:
   - Populate `.workflow/pr_draft.md` adhering strictly to the **repository's discovered PR template format** (or standard Conventional PR format if none exists).
   - Fulfill all template sections (e.g. `closes #xxxx`, checklist items, type annotations disclosure, whatsnew/docs confirmation).
   - State summary of changes, reproduction steps, testing evidence, and explicitly mark as **Draft PR**.
3. **Handoff**:
   - Notify the user with:
     - Branch name and commit hashes.
     - `git diff --stat` summary.
     - One-sentence confirmation of verified F2P test evidence.
   - The human developer performs the final 60-second review and executes the merge.
