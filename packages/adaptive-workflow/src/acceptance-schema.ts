/**
 * Boundary parsing for acceptance requests. Validates the structured shape
 * of external judge verdicts, checker outputs, and task-kind evidence before
 * the acceptance policy evaluates them. Type/enum violations throw; missing
 * evidence is a policy outcome (verdict "revise"), not a parse error.
 */

import {
  requireArrayOfStrings,
  requireBoolean,
  requireEnum,
  requireNonEmptyString,
  requireRecord,
  requireString,
  ValidationError,
} from "./errors.js";
import { TASK_KINDS, VERDICTS, type TaskKind, type Verdict } from "./contracts.js";

export interface CheckerResult {
  readonly checker: string;
  readonly passed: boolean;
  readonly details: string;
}

export interface ReproEvidence {
  readonly symptom: string;
  readonly observed: string;
  readonly steps: readonly string[];
}

export interface AcceptanceTestResult {
  readonly name: string;
  readonly passed: boolean;
}

export interface RefactorParity {
  readonly before: CheckerResult;
  readonly after: CheckerResult;
  readonly behaviorMatched: boolean;
}

export interface ReviewerVerdict {
  readonly actor: string;
  readonly verdict: string;
  readonly reason: string;
}

export interface AcceptanceRequest {
  readonly taskKind: string;
  readonly implementerActor: string;
  readonly reviewer: ReviewerVerdict;
  /** Deterministic checker outputs; kinds that carry their own structured
   * evidence (feature tests, refactor parity) may omit it. */
  readonly checks?: readonly CheckerResult[];
  readonly symptom?: string;
  readonly repro?: ReproEvidence;
  readonly acceptanceTests?: readonly AcceptanceTestResult[];
  readonly parity?: RefactorParity;
  readonly docSections?: readonly string[];
  readonly sources?: readonly string[];
}

export interface NormalizedRequest {
  taskKind: TaskKind;
  implementerActor: string;
  reviewer: { actor: string; verdict: Verdict; reason: string };
  checks: CheckerResult[]; // normalized to [] when absent
  symptom?: string;
  repro?: ReproEvidence;
  acceptanceTests?: AcceptanceTestResult[];
  parity?: RefactorParity;
  docSections?: string[];
  sources?: string[];
}

export function validateRequest(raw: AcceptanceRequest): NormalizedRequest {
  const input = requireRecord(raw, "request");
  const reviewerRaw = requireRecord(input.reviewer, "reviewer");
  const out: NormalizedRequest = {
    taskKind: requireEnum(input.taskKind, "taskKind", TASK_KINDS),
    implementerActor: requireNonEmptyString(input.implementerActor, "implementerActor"),
    reviewer: {
      actor: requireNonEmptyString(reviewerRaw.actor, "reviewer.actor"),
      verdict: requireEnum(reviewerRaw.verdict, "reviewer.verdict", VERDICTS),
      reason: requireNonEmptyString(reviewerRaw.reason, "reviewer.reason"),
    },
    checks: [],
  };
  if (input.checks !== undefined) out.checks = validateChecks(input.checks);
  if (input.symptom !== undefined) out.symptom = requireNonEmptyString(input.symptom, "symptom");
  if (input.repro !== undefined) out.repro = validateRepro(input.repro);
  if (input.acceptanceTests !== undefined) out.acceptanceTests = validateTests(input.acceptanceTests);
  if (input.parity !== undefined) out.parity = validateParity(input.parity);
  if (input.docSections !== undefined) out.docSections = requireArrayOfStrings(input.docSections, "docSections");
  if (input.sources !== undefined) out.sources = requireArrayOfStrings(input.sources, "sources");
  return out;
}

function validateChecks(value: unknown): CheckerResult[] {
  if (!Array.isArray(value)) throw new ValidationError("INVALID_TYPE", "checks must be an array");
  return value.map((raw, index) => {
    const check = requireRecord(raw, `checks[${index}]`);
    return {
      checker: requireNonEmptyString(check.checker, `checks[${index}].checker`),
      passed: requireBoolean(check.passed, `checks[${index}].passed`),
      details: requireString(check.details, `checks[${index}].details`),
    };
  });
}

function validateRepro(value: unknown): ReproEvidence {
  const repro = requireRecord(value, "repro");
  return {
    symptom: requireNonEmptyString(repro.symptom, "repro.symptom"),
    observed: requireNonEmptyString(repro.observed, "repro.observed"),
    steps: requireArrayOfStrings(repro.steps, "repro.steps", { minItems: 1 }),
  };
}

function validateTests(value: unknown): AcceptanceTestResult[] {
  if (!Array.isArray(value)) throw new ValidationError("INVALID_TYPE", "acceptanceTests must be an array");
  return value.map((raw, index) => {
    const test = requireRecord(raw, `acceptanceTests[${index}]`);
    return {
      name: requireNonEmptyString(test.name, `acceptanceTests[${index}].name`),
      passed: requireBoolean(test.passed, `acceptanceTests[${index}].passed`),
    };
  });
}

function validateParity(value: unknown): RefactorParity {
  const parity = requireRecord(value, "parity");
  return {
    before: validateChecks([parity.before])[0]!,
    after: validateChecks([parity.after])[0]!,
    behaviorMatched: requireBoolean(parity.behaviorMatched, "parity.behaviorMatched"),
  };
}
