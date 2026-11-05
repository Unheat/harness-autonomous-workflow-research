# Tasks: Universal Cross-Harness Agentic Workflow Engine

**Input**: Design documents from `specs/001-universal-workflow-engine/`
**Architecture Blueprint**: [architecture.md](architecture.md)
**Prerequisites**: `spec.md`, `plan.md`, `architecture.md`, `.specify/memory/constitution.md`

> **Progressive Elaboration Note**: This task checklist follows rolling-wave milestones. Future milestones remain high-level placeholders and are elaborated into granular, testable tasks only when their preceding milestone passes verification.

---

## Milestone 1: Foundational Baseline & Canonical Storage (Completed) 🎯

**Objective**: Establish canonical `.agents/skills` Single Source of Truth, OS symlink projection, and initial token shield.

- [x] T001 Establish canonical Single Source of Truth in `.agents/skills` and `.agent/agents`, verified by `manage.sh`
- [x] T002 Configure universal directory symlinks for `.claude/skills`, `.zcode/skills`, `.cursor/skills`, and `.dsh/skills`
- [x] T003 Implement initial subagent context shield via tool stripping (`disallowedTools: Skill`) in `.agent/agents/sdd-worker.md`
- [x] T004 Implement initial independent reviewer configuration in `.agent/agents/sdd-reviewer.md`
- [x] T005 Install official Vercel `skills` CLI globally and document `-a universal` convention in `AGENTS.md`
- [x] T006 Implement 3-layer automated enforcement (`auto-heal-symlinks.sh`, `guard-skills.py`, and `AGENTS.md`)
- [x] T007 Clean up global duplicate skills in `~/.claude/skills` and `~/.zcode/skills`
- [x] T008 Migrate MCP servers and skills to DeepSeek Harness (`~/.dsh/cordis.patch.yml`)

---

## Milestone 2: Spec Kit Integration & Architecture Decomposition (Completed) 🎯

**Objective**: Standardize Spec-Driven Development using GitHub Spec Kit, formalize donor decomposition, and define end-to-end data flow.

- [x] T009 Purge legacy OpenSpec CLI binary, config, and skills from computer and repository
- [x] T010 Install GitHub Spec Kit CLI (`specify-cli`) via `uv tool install`
- [x] T011 Initialize Spec Kit via `specify init --here --integration claude --allow-symlinks`
- [x] T012 Ratify project constitution in `.specify/memory/constitution.md`
- [x] T013 Author feature specification in `specs/001-universal-workflow-engine/spec.md`
- [x] T014 Author technical implementation plan in `specs/001-universal-workflow-engine/plan.md`
- [x] T015 Author architecture blueprint and donor decomposition matrix in `specs/001-universal-workflow-engine/architecture.md`
- [x] T016 Reorganize `tasks.md` into progressive milestone scaffolds

---

## Milestone 3: Universal Harness CLI & Catalog Engine (`harness` / `agn`) (Completed) 🎯

**Objective**: Eliminate token flooding, implement 9Router-style zero-prefix CLI, central catalog, pure TypeScript Bun architecture, and automated tests.

- [x] T017 Clean & standardize `AGENTS.md` to <100 lines following Progressive Disclosure and clean-code principles
- [x] T018 Establish machine central catalog in `~/.agents/catalog/mcps.json`
- [x] T019 Install and link Paul Bakaus's `impeccable` design QA skill into `~/.agents/skills/impeccable`
- [x] T020 Author complete Spec Kit feature specification in `spec.md` (User Stories US6-US12) and `plan.md`
- [x] T021 Configure `tsconfig.json` and `package.json` for native Bun TypeScript execution and testing
- [x] T022 Implement strongly-typed core modules in `.agent/src/*.ts` (`types`, `config`, `workspace`, `catalog`, `skills`, `mcp`, `doctor`)
- [x] T023 Implement TypeScript zero-prefix CLI & interactive REPL in `.agent/scripts/harness.ts` with global symlinks `harness` & `agn`
- [x] T024 Implement type-safe vibe-coder Web UI dashboard in `.agent/ui/server.ts`
- [x] T025 Convert test suite to `tests/*.test.ts` and verify 100% pass rate via `bun test`
- [x] T026 Update `~/.agents/skills/harness-protocol/SKILL.md` to guide agents to use `harness` CLI natively

---

## Milestone 4: Vendored SDD Execution & Upstream Sync (Active Next)

**Objective**: Enable zero-friction open-source portability by vendoring core prompts into the repo with automated upstream sync.

- [ ] T026 [P] Create `.agent/templates/sdd/` and vendor core execution prompts (`implementer-prompt.md`, `task-reviewer-prompt.md`) with Token Shield headers
- [ ] T027 Build automated upstream sync script (`.agent/scripts/sync-upstream.sh`) to diff and pull latest Superpowers/Spec Kit templates
- [ ] T028 Update `sdd-worker.md` and `sdd-reviewer.md` to reference internal vendored templates relative to repository root
- [ ] T029 Verify subagent dispatch with zero skill preview leakage using `manage.sh`

---

## Milestone 4: Outer Autonomous Task Runner (Placeholder)

**Objective**: Autonomous worktree isolation and unattended issue-to-PR loop (borrowed from DSH).

- [ ] *Elaborate when Milestone 3 completes:*
  - Task intake script (`.agent/scripts/run-task.sh`)
  - Automated git worktree provisioning under `.worktrees/<branch-name>`
  - Project test runner baseline autodetection (npm, cargo, pytest, poetry)
  - Diff extraction and clean PR summary packaging

---

## Milestone 5: Circuit Breakers & Escalation Protocol (Placeholder)

**Objective**: Bounded review cycles preventing infinite ping-pong between worker and reviewer.

- [ ] *Elaborate when Milestone 4 completes:*
  - 3-round retry circuit breaker logic in SDD coordinator instructions
  - Structured human escalation prompt when unresolvable architectural conflict occurs

---

## Milestone 6: Compound Solution Memory (Placeholder)

**Objective**: Automated institutional knowledge distillation into version-controlled markdown.

- [ ] *Elaborate when Milestone 5 completes:*
  - Solution note template (`docs/solutions/template.md`)
  - Mandatory pre-planning review check in `AGENTS.md`
  - Initial verified solution notes for cross-harness symlinks and token stripping

---

## Milestone 7: Open-Source Release & One-Command Setup (Placeholder)

**Objective**: Package the repository for public distribution under user account (`Unheat`).

- [ ] *Elaborate when Milestone 6 completes:*
  - Dynamic `$HOME` path de-hardcoding across all scripts and MCP configs
  - One-command installer script (`setup.sh`)
  - Comprehensive public `README.md` and architecture documentation
