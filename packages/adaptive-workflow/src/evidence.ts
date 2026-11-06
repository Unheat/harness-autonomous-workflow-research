/**
 * Evidence records with hash-pinned inputs and staleness invalidation.
 * Each record pins the exact hashes of the raw inputs it was derived from;
 * when any input changes, the record is reported stale and can no longer
 * support an acceptance decision. Records are immutable and integrity-checked.
 */

import { deepFreeze, type EvidenceKind, EVIDENCE_KINDS } from "./contracts.js";
import {
  isRecord,
  requireEnum,
  requireNonEmptyString,
  requireRecord,
  ValidationError,
} from "./errors.js";
import { HASH_ALGORITHM, inputHash, stableHash } from "./hash.js";

export interface RawEvidenceInput {
  readonly label: string;
  readonly content: string;
}

export interface EvidenceInputRef {
  readonly label: string;
  readonly algorithm: string;
  readonly hash: string;
}

export interface EvidenceRecord {
  readonly id: string;
  readonly kind: EvidenceKind;
  readonly stageId: string;
  readonly summary: string;
  readonly inputs: readonly EvidenceInputRef[];
  /** Pins the full record content including input hashes. */
  readonly recordHash: string;
}

export interface StalenessReport {
  readonly stale: boolean;
  readonly changedLabels: readonly string[];
  readonly missingLabels: readonly string[];
}

export function createEvidence(input: {
  id: string;
  kind: string;
  stageId: string;
  summary: string;
  inputs: unknown;
}): EvidenceRecord {
  if (!isRecord(input)) throw new ValidationError("INVALID_TYPE", "evidence input must be an object");
  const id = requireNonEmptyString(input.id, "id");
  const kind = requireEnum(input.kind, "kind", EVIDENCE_KINDS);
  const stageId = requireNonEmptyString(input.stageId, "stageId");
  const summary = requireNonEmptyString(input.summary, "summary");
  const inputs = validateRawInputs(input.inputs);
  const refs: EvidenceInputRef[] = inputs.map((item) => ({
    label: item.label,
    algorithm: HASH_ALGORITHM,
    hash: inputHash(item.content),
  }));
  const recordHash = stableHash({ id, kind, stageId, summary, inputs: refs });
  return deepFreeze({ id, kind, stageId, summary, inputs: refs, recordHash });
}

/** Re-hash current inputs against the record; any drift makes the evidence stale. */
export function isEvidenceStale(record: EvidenceRecord, currentInputs: unknown): StalenessReport {
  const current = validateRawInputs(currentInputs);
  const expected = new Map(record.inputs.map((ref) => [ref.label, ref.hash]));
  const changedLabels: string[] = [];
  const missingLabels: string[] = [];
  for (const item of current) {
    const expectedHash = expected.get(item.label);
    if (expectedHash === undefined) continue; // extra inputs never invalidate
    if (inputHash(item.content) !== expectedHash) changedLabels.push(item.label);
  }
  const provided = new Set(current.map((item) => item.label));
  for (const ref of record.inputs) {
    if (!provided.has(ref.label)) missingLabels.push(ref.label);
  }
  return {
    stale: changedLabels.length > 0 || missingLabels.length > 0,
    changedLabels,
    missingLabels,
  };
}

/** Recompute the record hash from its own fields to detect post-hoc tampering. */
export function verifyEvidenceIntegrity(record: EvidenceRecord): boolean {
  return (
    stableHash({
      id: record.id,
      kind: record.kind,
      stageId: record.stageId,
      summary: record.summary,
      inputs: record.inputs,
    }) === record.recordHash
  );
}

export class EvidenceLedger {
  readonly #records = new Map<string, EvidenceRecord>();

  add(record: EvidenceRecord): EvidenceRecord {
    if (!isRecord(record) || typeof record.id !== "string" || record.id.trim().length === 0) {
      throw new ValidationError("INVALID_TYPE", "a valid evidence record with an id is required");
    }
    if (this.#records.has(record.id)) {
      throw new ValidationError("INVALID_STATE", `evidence id already recorded: ${record.id}`);
    }
    this.#records.set(record.id, record);
    return record;
  }

  get(id: string): EvidenceRecord {
    const record = this.#records.get(requireNonEmptyString(id, "id"));
    if (!record) throw new ValidationError("INVALID_STATE", `unknown evidence id: ${id}`);
    return record;
  }

  /**
   * Classify referenced evidence ids. All ids share one current-inputs view;
   * staleness is evaluated per label, so unrelated labels do not interfere.
   */
  validateFresh(ids: readonly string[], currentInputs: unknown): {
    fresh: string[];
    stale: string[];
    tampered: string[];
    unknown: string[];
  } {
    const report = { fresh: [] as string[], stale: [] as string[], tampered: [] as string[], unknown: [] as string[] };
    for (const id of ids) {
      const record = this.#records.get(id);
      if (!record) {
        report.unknown.push(id);
      } else if (!verifyEvidenceIntegrity(record)) {
        report.tampered.push(id);
      } else {
        (isEvidenceStale(record, currentInputs).stale ? report.stale : report.fresh).push(id);
      }
    }
    return report;
  }
}

function validateRawInputs(value: unknown): RawEvidenceInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError("EMPTY_VALUE", "inputs must be a non-empty array");
  }
  const seen = new Set<string>();
  return value.map((raw, index) => {
    const item = requireRecord(raw, `inputs[${index}]`);
    const label = requireNonEmptyString(item.label, `inputs[${index}].label`);
    if (seen.has(label)) throw new ValidationError("INVALID_STATE", `duplicate input label: ${label}`);
    seen.add(label);
    return { label, content: requireNonEmptyString(item.content, `inputs[${index}].content`) };
  });
}
