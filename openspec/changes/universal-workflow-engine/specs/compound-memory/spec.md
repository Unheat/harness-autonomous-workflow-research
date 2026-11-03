# Spec Delta: Compound Memory

## Purpose

Enables automated continuous learning across agent sessions by distilling verified solutions, bug fixes, and architectural decisions into structured, inspectable markdown artifacts.

## ADDED Requirements

### Requirement: Verified Solution Distillation
The system SHALL record reusable discoveries, non-obvious bug fixes, and key architectural decisions into `docs/solutions/` upon task completion.

#### Scenario: Saving a verified solution
- **WHEN** a complex task or debugging cycle is resolved and verified by test suites
- **THEN** the system generates a structured note in `docs/solutions/<topic>.md` detailing the trigger condition, root cause, verified fix, and key files touched.

### Requirement: Prior Knowledge Recall
The orchestrator SHALL consult existing solution notes in `docs/solutions/` before creating implementation plans.

#### Scenario: Checking existing solutions during planning
- **WHEN** an agent plans a new feature or investigates a bug in an area previously documented
- **THEN** the agent reads the relevant `docs/solutions/<topic>.md` file and incorporates known constraints and verified patterns into the plan.
