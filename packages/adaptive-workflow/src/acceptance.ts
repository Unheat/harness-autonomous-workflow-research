/**
 * Task-kind-specific acceptance policy. Verdicts are never self-claimed:
 * a structured reviewer verdict from a different actor is combined with
 * deterministic, task-kind-specific evidence requirements. No model calls
 * happen here — the reviewer verdict must arrive as structured data from an
 * external judge, and all other gates are deterministic checks.
 */

import {
  validateRequest,
  type AcceptanceRequest,
  type CheckerResult,
  type NormalizedRequest,
} from "./acceptance-schema.js";
import type { Verdict } from "./contracts.js";

export type {
  AcceptanceRequest,
  AcceptanceTestResult,
  CheckerResult,
  RefactorParity,
  ReproEvidence,
  ReviewerVerdict,
} from "./acceptance-schema.js";

export interface AcceptanceDecision {
  readonly verdict: Verdict;
  readonly reasons: readonly string[];
}

/** Anchored patterns: a repro saying ONLY this is generic, never symptom-specific. */
export const GENERIC_REPRO_PATTERNS: readonly RegExp[] = [
  /^nonzero( exit)?$/,
  /^exit code \d+$/,
  /^command failed$/,
  /^generic( failure| error)?$/,
  /^unknown error$/,
];

export function evaluateAcceptance(request: AcceptanceRequest): AcceptanceDecision {
  const req = validateRequest(request);
  if (req.reviewer.actor === req.implementerActor) {
    return {
      verdict: "blocked",
      reasons: [
        "independent review violated: reviewer actor equals implementer actor; self-claimed verdicts are rejected",
      ],
    };
  }
  if (req.reviewer.verdict === "blocked") {
    return { verdict: "blocked", reasons: [`reviewer blocked the task: ${req.reviewer.reason}`] };
  }
  if (req.reviewer.verdict === "revise") {
    return { verdict: "revise", reasons: [`reviewer requested revision: ${req.reviewer.reason}`] };
  }
  const reasons = evaluateKind(req);
  return reasons.length === 0
    ? { verdict: "accept", reasons: ["independent reviewer accepted and all task-kind evidence checks passed"] }
    : { verdict: "revise", reasons };
}

function evaluateKind(req: NormalizedRequest): string[] {
  switch (req.taskKind) {
    case "bug":
      return evaluateBug(req);
    case "feature":
      return evaluateFeature(req);
    case "refactor":
      return evaluateRefactor(req);
    case "docs":
      return evaluateDocs(req);
    case "research":
      return evaluateResearch(req);
  }
}

function evaluateBug(req: NormalizedRequest): string[] {
  const reasons: string[] = [];
  if (req.symptom === undefined) reasons.push("bug tasks require the reported task symptom");
  if (req.repro === undefined) {
    reasons.push("bug tasks require a symptom-specific repro");
    return reasons;
  }
  if (req.symptom !== undefined && normalizeSymptom(req.repro.symptom) !== normalizeSymptom(req.symptom)) {
    reasons.push("repro symptom does not match the reported task symptom");
  }
  if (
    GENERIC_REPRO_PATTERNS.some(
      (pattern) =>
        pattern.test(normalizeSymptom(req.repro!.symptom)) ||
        pattern.test(normalizeSymptom(req.repro!.observed)),
    )
  ) {
    reasons.push("repro is generic (e.g. bare nonzero exit); it must demonstrate the specific symptom");
  }
  if (!hasPassedCheck(req.checks)) {
    reasons.push("bug tasks require at least one passing deterministic check");
  }
  return reasons;
}

function evaluateFeature(req: NormalizedRequest): string[] {
  const reasons: string[] = [];
  const tests = req.acceptanceTests ?? [];
  if (tests.length === 0) reasons.push("feature tasks require acceptance tests");
  const failed = tests.filter((test) => !test.passed).map((test) => test.name);
  if (failed.length > 0) reasons.push(`acceptance tests failing: ${failed.join(", ")}`);
  return reasons;
}

function evaluateRefactor(req: NormalizedRequest): string[] {
  if (req.parity === undefined) {
    return ["refactor tasks require behavior-parity evidence (baseline + post-change checks)"];
  }
  const reasons: string[] = [];
  if (!req.parity.before.passed) reasons.push("pre-refactor baseline check failed");
  if (!req.parity.after.passed) reasons.push("post-refactor check failed");
  if (!req.parity.behaviorMatched) {
    reasons.push("behavior is not preserved between baseline and refactored code");
  }
  return reasons;
}

function evaluateDocs(req: NormalizedRequest): string[] {
  const reasons: string[] = [];
  if ((req.docSections ?? []).length === 0) {
    reasons.push("docs tasks require covered sections reported by the doc validator");
  }
  if (!hasPassedCheck(req.checks)) {
    reasons.push("docs tasks require at least one passing deterministic check");
  }
  return reasons;
}

function evaluateResearch(req: NormalizedRequest): string[] {
  const reasons: string[] = [];
  if ((req.sources ?? []).length === 0) reasons.push("research tasks require cited sources");
  if (!hasPassedCheck(req.checks)) {
    reasons.push("research tasks require at least one passing deterministic check");
  }
  return reasons;
}

function normalizeSymptom(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function hasPassedCheck(checks: readonly CheckerResult[]): boolean {
  return checks.some((check) => check.passed);
}
