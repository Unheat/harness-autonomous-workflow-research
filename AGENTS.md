# Project Agent Guidelines: Universal Workflow Engine

This repository designs, standardizes, and implements the **Universal Cross-Harness Agentic Workflow Engine** (portable across Claude Code, ZCode, Cursor, Codex, DeepSeek Harness, OpenCode).

---

## 1. Operating Model in this Repository

- **PM & Lead SWE Dynamic**:
  - **User = Product Manager (PM)**: Sets vision, reviews UX, defines priorities, and probes edge cases.
  - **Agent = Lead Software Engineer (SWE)**: Proactively drives end-to-end engineering. Independently organizes milestones, maintains GitHub Spec Kit artifacts (`.specify/`), handles architectural edge cases, ensures 100% test coverage, and creates clean, atomic Git commits automatically without requiring micro-management.
- **Specification-Driven Development**: Major architecture changes or feature additions MUST be formalized in `specs/<NNN>-<feature>/` (`spec.md`, `plan.md`, `tasks.md`) following GitHub Spec Kit standards before/during execution.
- **Roadmap & Milestones**: See `specs/001-universal-workflow-engine/tasks.md` and subsequent feature specs for rolling milestones.
- **Mandatory Automated Tests**: All code modifications must include automated unit test coverage covering normal and edge cases before task completion.

---

## 2. Progressive Disclosure & Context Pointers

To keep context windows clean, detailed rules and specifications are loaded on demand:

- **Target Architecture & Design Proposal**:
  Read `specs/001-universal-workflow-engine/architecture.md` and `docs/references/workflow-design-proposal.md` for system blueprints and donor decomposition.
- **Unified 3-Tier Tooling Protocol**:
  All harness resources (`Skills`, `MCPs`, `Hooks`, `Plugins`, `Subagents`) follow the 3-Tier lifecycle (`Global`, `Project`, `Catalog`). Follow `harness-protocol` for installation, shadowing rules, and token-shielding protocols.
- **Compound Memory**:
  Check `docs/solutions/` for known pitfalls before planning; record verified root-cause fixes upon resolving non-trivial bugs.

---

## 3. Clean Code & Engineering Standards

- **Unified Domain Models**: Abstract shared lifecycle states across distinct tools (Skills, MCPs, Hooks) using common contracts (`ResourceScope`, `EffectiveStatus`, `ResolutionEngine`).
- **Composition Over Inheritance**: Avoid inheritance (`extends`) across distinct tools or adapters. Compose small, pure utility functions and runners.
- **No Leaky Abstractions (LSP)**: Consumers must interact with clean interfaces without type assertions or downcasting to concrete adapters.
- **Decouple Core from Harness/UI (Interface Segregation)**: Core domain logic (catalog, symlinks, workspace resolution) must not depend on UI state or harness-specific CLI idiosyncrasies.
- **Decompose God Files (< 200 Lines)**: Keep modules single-responsibility and concise. Extract distinct functionality into dedicated files.
- **Parse at the Boundary, Fail Fast Internally**: Validate CLI flags, user inputs, and JSON configurations at entry boundaries. Never swallow errors with silent `catch` or mask corruption with excessive `?.`.
- **Impact Analysis**: Inspect all dependent callers when modifying data schemas, function signatures, or symlink contracts.
- **No Magic Numbers / Strings**: Extract timeouts, ports, and configuration keys into named constants in configuration modules.
