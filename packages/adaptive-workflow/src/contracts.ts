/**
 * Shared vocabulary for the adaptive-workflow contracts.
 * Runtime enums live here so boundary validation and types stay in sync.
 */

export const TASK_KINDS = ["bug", "feature", "refactor", "docs", "research"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const VERDICTS = ["accept", "revise", "blocked"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const DELEGATION_LEVELS = ["L0", "L1", "L2"] as const;
export type DelegationLevel = (typeof DELEGATION_LEVELS)[number];

export const EVIDENCE_KINDS = [
  "repro",
  "test-output",
  "diff",
  "observation",
  "doc",
  "research-note",
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

/** Recursively freeze a value; used to make version and evidence objects immutable. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}
