# Project Agent Guidelines: Universal Workflow Engine

This repository designs, standardizes, and implements the **Universal Cross-Harness Agentic Workflow Engine** (portable across Claude Code, ZCode, Cursor, Codex, DeepSeek Harness, OpenCode).

---

## 1. Operating Model in this Repository

- **Process**: Normal Git workflow driven by GitHub Spec Kit (`.specify/`).
- **Roadmap & Milestones**: See `specs/001-universal-workflow-engine/tasks.md` for rolling milestones.
- **Mandatory Automated Tests**: All code modifications must include automated unit test coverage covering normal and edge cases before task completion.

---

## 2. Progressive Disclosure & Context Pointers

To keep context windows clean, detailed rules and specifications are loaded on demand:

- **Target Architecture & Design Proposal**:
  Read `specs/001-universal-workflow-engine/architecture.md` and `docs/references/workflow-design-proposal.md` for system blueprints and donor decomposition.
- **Tooling, Skills & Environment Protocol**:
  When installing, modifying, moving, symlinking, or configuring skills, hooks, workflows, or MCP servers, load and strictly follow `harness-protocol`.
- **Compound Memory**:
  Check `docs/solutions/` for known pitfalls before planning; record verified root-cause fixes upon resolving non-trivial bugs.

---

## 3. Clean Code & Engineering Standards

- **Composition Over Inheritance**: Avoid inheritance (`extends`) across distinct tools or adapters. Compose small, pure utility functions and runners.
- **No Leaky Abstractions (LSP)**: Consumers must interact with clean interfaces without type assertions or downcasting to concrete adapters.
- **Decouple Core from Harness/UI (Interface Segregation)**: Core domain logic (catalog, symlinks, workspace resolution) must not depend on UI state or harness-specific CLI idiosyncrasies.
- **Decompose God Files (< 200 Lines)**: Keep modules single-responsibility and concise. Extract distinct functionality into dedicated files.
- **Parse at the Boundary, Fail Fast Internally**: Validate CLI flags, user inputs, and JSON configurations at entry boundaries. Never swallow errors with silent `catch` or mask corruption with excessive `?.`.
- **Impact Analysis**: Inspect all dependent callers when modifying data schemas, function signatures, or symlink contracts.
- **No Magic Numbers / Strings**: Extract timeouts, ports, and configuration keys into named constants in configuration modules.
