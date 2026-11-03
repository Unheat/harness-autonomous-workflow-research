# Spec Delta: Subagent Governance

## Purpose

Enforces strict subagent context isolation, tool permission stripping, and independent two-stage code review across all supported AI coding harnesses.

## ADDED Requirements

### Requirement: Token Pollution Prevention via Tool Stripping
The system SHALL strip the `Skill` tool from implementer subagents (`sdd-worker`) to prevent global and project skill preview catalogs from inflating the subagent context window.

#### Scenario: Dispatching a clean implementer subagent
- **WHEN** the orchestrator dispatches a worker to implement a task
- **THEN** the spawned subagent receives only core execution tools (`Read`, `Edit`, `Write`, `Bash`), zero skill preview text, and only the specific task brief requirements.

### Requirement: Independent Dual-Gate Review
The system SHALL evaluate every completed task through an independent, read-only reviewer subagent (`sdd-reviewer`) before accepting changes.

#### Scenario: Reviewing a completed task
- **WHEN** an implementer reports a task as completed
- **THEN** the reviewer subagent inspects the isolated git diff against the task brief, verifies test execution evidence, and returns an explicit verdict (`APPROVED` or `REVISE`).

#### Scenario: Review rejection and fix loop
- **WHEN** the reviewer detects missing requirements, broken tests, or unauthorized edits outside task scope
- **THEN** the orchestrator returns the findings with exact `file_path:line_number` evidence to the implementer to fix before re-review.
