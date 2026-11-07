# Specification: Declarative SWE workflow

**Created**: 2026-11-06  
**Status**: Prompt definitions under revision; runtime/eval acceptance pending  
**Supersedes**: Spec 006's Paperclip-first execution proposal. Spec 007 remains
resource-manager work, not this SWE lifecycle.

## Contract
```text
Human / approved coordinator (queue, optional worktree)
  ├─ main session: task A → same workflow → review-ready change A
  └─ main session: task B → same workflow → review-ready change B
                                             ↓
                                      human review/merge
```
One main engineer per workspace writes code/tests. Helpers gather evidence or judge;
no mandatory implementer subagent. Coordinator choice must not alter core semantics.
Prompt guidance is portable; native tools/hooks/permissions require harness mappings.

---

## 4 Core Pillars of the Workflow Design

### Pillar 1: Packaging the Entry Point as a Skill (`swe-workflow`)
- **Zero Bureaucracy by Default**: Everyday questions, 1-file typo fixes, or exploratory chat run through standard default harness tools without extra ceremony or token waste.
- **On-Demand Discipline**: Invoked explicitly via `/swe-workflow "<task>"` or routed via project `AGENTS.md` when non-trivial logic changes, bugfixes, or PR deliverables are detected.
- **Single Source of Truth**: The workflow logic lives in `.agents/skills/swe-workflow/SKILL.md`.

### Pillar 2: General Enough for Any Repo, Specific Enough for SWE Standards
- **General (Auto-Discovery)**: At startup, automatically discovers repo-specific rules:
  - `AGENTS.md` / `CLAUDE.md`: Architecture standards and project-specific constraints.
  - `CONTRIBUTING.md`: Commit conventions, branch naming, and AI disclosure rules.
  - `.github/pull_request_template.md`: Checklist requirements for final PR submission.
  - Build manifests (`package.json`, `Makefile`, `pyproject.toml`): Resolves test runner automatically (distinguishing `bun test` vs `bun run test`, `pnpm test`, `pytest`).
- **Specific (Rigorous SWE Standards)**:
  - Invariant 1: Fail-to-Pass (F2P) test must FAIL before any production code is touched.
  - Invariant 2: Karpathy 4 Principles (Think before coding, simplicity first, surgical changes, goal-driven execution).
  - Invariant 3: Calibrated Dual-Gate Review (`judge-plan` and `judge-pr`).

### Pillar 3: Clean I/O Boundary Contract
- **Input**:
  - `task` (required): Problem description, bug report, or feature goal.
  - `workspace` / `worktree` (optional): Path to execution directory (isolated git worktree or current directory).
  - `context` (optional): Error logs, stacktraces, or user hints.
- **Output**:
  - `status`: `COMPLETED` | `BLOCKED` (only for fatal unresolvable external errors).
  - `branch`: Dedicated git branch with progressive commits (`test: add reproducer`, `fix: ...`, `refactor: ...`).
  - `evidence`: Verified F2P before/after test execution transcripts.
  - `pr_draft`: Pre-filled `.workflow/pr_draft.md` ready for human 60-second review and merge.

### Pillar 4: Soft Checkpoint with Human Tie-Breaker (No Hard Block, No Context Loss)
- When `judge-plan` rejects a plan in Round 2, or when an architectural tradeoff arises:
  - **DO NOT ABORT OR RESTART WORKFLOW.** Restarting throws away gathered codebase exploration tokens.
  - **Human Tie-Breaker**: The agent pauses and poses a concise 3-option question (`ask_user_question` or chat prompt):
    - Example: *"[Option A] Suffix config file, [Option B] Strictly adhere to judge scope, [Option C] Custom direction"*.
  - The human developer answers in 5 seconds.
  - The agent records the human decision (`Deviation Note: User explicitly approved choice X`) and **proceeds directly to Phase 3 (Implementation)** without restarting.

### Pillar 5: Universal Enforcement via Native Git Hooks (Cross-Harness Physics)
- **Eliminating Fragmented Harness Hooks**: Harness-specific hook formats (Claude `settings.json`, DSH Cordis, Cursor rules) are abandoned in favor of the single universal tool shared by all coding harnesses: **Git**.
- **Procedural Gating (Inner Gate)**: Defined within `swe-workflow/SKILL.md` as state machine dependencies (Implementation requires Red test; PR generation requires PR Judge approval).
- **Universal Native Git Hook (Outer Gate)**: Provided as an optional 1-command installer (`.agents/skills/swe-workflow/hooks/install-git-hook.sh`):
  - Copies `universal-pre-push.sh` into `.git/hooks/pre-push`.
  - Automatically intercepts any `git push` executed by Claude Code, DSH, Cursor, ZCode, or manual developer terminal.
  - Auto-detects local test runner (`bun test`, `pnpm test`, `pytest`, `cargo test`) and blocks push if tests fail or unresolved merge conflicts exist. Zero token cost, zero vendor lock-in.

---

## Autonomous Mode Integration

> **[PROPOSED SOLUTION - NOT DECIDED YET]**  
> *Status: Architectural proposal for future integration. Current active milestone focuses strictly on the Core Workflow Engine and local worktrees.*

In a fully autonomous unattended mode (e.g. background DSH SuperAgent queue or GitHub Issue webhook):
- The coordinator intercepts new tickets/issues.
- Provisions an isolated Git worktree: `git worktree add ../task-<id> -b feat/<slug>`.
- Executes the core `swe-workflow` inside that worktree.
- If a Human Tie-Breaker is triggered while unattended:
  - Enters state `Awaiting Human Decision` (analogous to SuperAgent's `Attention / person` stage).
  - Posts the concise clarification question as an issue comment.
  - Upon user reply, resumes execution from the exact worktree checkpoint without restarting.

---

## Requirements
1. Main loads the shared SWE skill and consumer project's `AGENTS.md`. Consumer
   docs/skills requirements stay in that project, not hardcoded in the core.
2. Routing is proportional: direct targeted inspection for known/narrow tasks;
   explorer for cross-file discovery; research for external facts/design uncertainty.
3. Evidence fits task: bug symptom reproduction before repair; feature acceptance
   tests; refactor characterization; docs/research validators. No fabricated RED.
4. Plan review checks grounding, scope, executability and decisive verification.
   Final review also checks semantic correctness, claims, diff and test quality.
5. Main tests like a tester: normal, boundary, invalid-input, failure/recovery,
   regression and integration paths as applicable. Never weaken tests for green.
6. Independent judges use canonical rubric/procedure and cited evidence. No arbitrary
   one-turn limit, blanket log/TODO bans or assumption that every exception is wrong.
7. Bounded review loop (default two attempts per gate). Input changes stale relevant
   verdicts; unresolved review cannot silently become approval.
8. Output is review-ready artifacts; create/push PR only when authorized. Human
   review depth is risk-dependent, not guaranteed to take 60 seconds.
9. Before calibration claims: >=10 distinct real-model cases per judge, frozen
   labels, balanced failure/valid variants, false-accept/reject and category reports.
   Smoke runs and prompt-string tests do not establish judge quality or E2E operation.

## Acceptance examples
- Known-file typo: direct inspection, applicable checks; no compulsory research.
- Unknown bug: explore optionally, reproduce exact symptom, review cause, repair.
- Feature/refactor: no demand to manufacture a bug or failing environment.
- CLI change: legitimate stdout retained; docs obligations read from consumer policy.
- Misleading green mock tests: final judge requires real behavior at changed seams.
- Authorized prerequisite: justified scope accepted; unrelated hidden changes rejected.
- Insufficient verification/budget: explicit blocker, not false completion.
