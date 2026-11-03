# Spec Delta: Workflow Orchestration

## Purpose

Provides an outer coordinator that automates task intake, worktree isolation, unattended execution, and pull request delivery across heterogeneous agent harnesses without conversational noise.

## ADDED Requirements

### Requirement: Task Intake and Worktree Isolation
The system SHALL initialize an isolated git worktree for every multi-task feature or bug fix branch before executing changes.

#### Scenario: Automatic worktree creation
- **WHEN** a task or issue is accepted for execution
- **THEN** the system creates a dedicated branch and worktree under `.worktrees/<branch-name>`, verifies that `.worktrees/` is ignored in `.gitignore`, and sets up the project dependencies.

### Requirement: Unattended Continuous Execution
The outer coordinator SHALL execute implementation tasks to completion without halting for conversational chat confirmations unless an irreversible action or unrecoverable defect occurs.

#### Scenario: Autonomous plan execution
- **WHEN** an approved implementation plan is passed to the orchestrator
- **THEN** the orchestrator loops through all tasks, delegating each to worker and reviewer subagents, advancing automatically when review criteria pass.

#### Scenario: Halting on critical blocker
- **WHEN** a worker encounters an ambiguous architectural conflict or unresolvable test failure that exceeds retry thresholds
- **THEN** the orchestrator pauses execution and surfaces a single structured question for human intervention.

### Requirement: Pull Request Delivery and Clean Verification
The system SHALL verify full test suites and package git diffs before signaling readiness or opening a pull request.

#### Scenario: Successful delivery
- **WHEN** all tasks in a plan are approved by the reviewer subagent
- **THEN** the system runs the comprehensive project test suite, commits changes, pushes the branch, and notifies the user with a pull request link.
