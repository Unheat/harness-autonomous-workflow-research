# adaptive-workflow

Self-contained, typed TypeScript contracts for an adaptive, evidence-first
workflow engine. Pure domain library: zero runtime dependencies, no model
calls, no network. Runs on Bun (tests) and any ESM-capable TS host.

## Provenance

- All code in this package is original, written for this repository.
- No third-party or copied source (explicitly: nothing taken from CodePath or
  any unlicensed material). Only dependency is Node/Bun's built-in
  `node:crypto` for SHA-256.
- Hashing is deterministic canonical JSON (recursively key-sorted) so hashes
  pin content, never key order.

## Modules (`src/`, all < 200 lines)

| Module               | Responsibility                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `contracts.ts`       | Shared enums (`bug/feature/refactor/docs/research`, `accept/revise/blocked`, `L0/L1/L2`, evidence kinds) + `deepFreeze` helper. |
| `errors.ts`          | Boundary validation helpers; typed `ValidationError` with codes. Fail fast at every public entry point.                        |
| `hash.ts`            | `stableHash` (canonical JSON), `inputHash` (raw artifacts), `sha256Hex`.                                                        |
| `workflow-version.ts`| Immutable, hash-pinned workflow version documents (stages, permissions, resources) + `WorkflowRegistry` promote/rollback/pin.   |
| `evidence.ts`        | `EvidenceRecord` with per-input hashes, staleness invalidation (`isEvidenceStale`), tamper check, `EvidenceLedger`.             |
| `acceptance.ts`      | Task-kind acceptance policy combining an independent reviewer verdict with deterministic evidence gates. Never self-claimed.    |
| `delegation.ts`      | Logical delegation policy: exactly-one-level descent (L2→L1→L0), depth cap 2, concurrency budget. Denies L2 delegation.         |
| `index.ts`           | Barrel export of the full public API.                                                                                          |

## Core guarantees

1. **Versioned workflows**: version documents are deep-frozen at creation and
   pinned by `contentHash`. Registry promote/rollback only moves an "active"
   pointer; `pin()` snapshots for active runs are immutable forever. Version
   numbers are never reused; no-op promotes (identical content) are rejected.
2. **Evidence integrity**: every record pins the SHA-256 of each raw input.
   Changed or missing inputs invalidate the record (`stale`), and post-hoc
   edits are caught by `verifyEvidenceIntegrity`.
3. **Acceptance is not self-claimed**: a structured reviewer verdict from an
   actor different from the implementer is required; bug tasks additionally
   require a symptom-specific repro (anchored generic patterns such as bare
   `exit code 1` are rejected), feature tasks require passing acceptance
   tests, refactor tasks require baseline/post behavior parity, docs and
   research tasks require validator sections and cited sources plus a passing
   deterministic check.
4. **Bounded delegation**: delegation must descend exactly one level
   (L2→L1, L1→L0); L0 leaves cannot delegate, L2 children are never allowed,
   logical depth is capped at 2, and concurrent children are bounded by an
   explicit budget (hard-capped at 16).

## Commands

```sh
cd packages/adaptive-workflow
bun test        # 34 tests (normal + negative + boundary cases)
```

## Integration contract (orchestrator-facing)

- `createWorkflowVersion({name, version, stages, permissions, resources})` → frozen `WorkflowDocument`
- `WorkflowRegistry`: `register` / `promote(name, content)` / `rollback(name, toVersion?)` / `pin(name, version?)` / `active` / `get` / `history`
- `createEvidence({id, kind, stageId, summary, inputs})` → frozen record; `isEvidenceStale(record, currentInputs)`; `verifyEvidenceIntegrity(record)`; `EvidenceLedger.add/get/validateFresh`
- `evaluateAcceptance(AcceptanceRequest)` → `{verdict: "accept"|"revise"|"blocked", reasons[]}`
- `planDelegation(DelegationRequest)` → decision; `requireDelegation(request)` → child depth (throws `ValidationError` with code `POLICY_DENIED` on denial)
- All boundary inputs are validated; violations throw `ValidationError` with a machine-readable `code`.
