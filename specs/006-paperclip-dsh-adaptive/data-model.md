# Data and ownership

Paperclip remains authoritative for company/project, issue/dependency graph, agent, run, approval and execution workspace. Do not mirror those into a second task database.

## Run identity
`companyId`, `projectId`, `taskId`, `runId`, canonical workspace, source revision, workflow version, logical depth and execution budgets. Resume binding must match workspace and pinned workflow.

## Evidence
Kind, producer, observed result, command/artifact reference, input hashes and timestamp. Repro distinguishes expected symptom from environment failure. Reviews identify a separate reviewer and reference exact evidence. Input changes invalidate dependent verdicts.

## Workflow version
Immutable version id/content hash, approved resource identifiers, capabilities, stage policy and provenance. Active runs retain their pinned version after promotion or rollback.

## Candidate
Parent version, proposed change, source/provenance, permission delta, baseline and held-out evaluations. States: staged -> evaluated -> promoted/rejected. Rollback changes the selected default, not in-flight runs.

## Memory
Use Hindsight banks, not a new fact database. Records retain project/author/evidence provenance and distinguish observations from verified lessons. Failed delivery is explicit and retryable without duplicate retention.
