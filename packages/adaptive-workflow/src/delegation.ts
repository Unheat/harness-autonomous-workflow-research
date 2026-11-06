/**
 * Logical delegation policy. Levels describe the role of a node:
 * L2 = root orchestrator, L1 = sub-orchestrator, L0 = leaf executor.
 * Delegation must descend exactly one level (L2 -> L1 -> L0), L2 children
 * are never allowed ("deny L2 delegation"), the logical depth is capped,
 * and concurrent children are bounded by an explicit budget.
 */

import { DELEGATION_LEVELS, type DelegationLevel } from "./contracts.js";
import { requireEnum, requireInt, requireRecord, ValidationError } from "./errors.js";

/** Root sits at depth 0; L1 children at depth 1; L0 grandchildren at depth 2. */
export const MAX_DELEGATION_DEPTH = 2;
export const DEFAULT_MAX_CONCURRENT_CHILDREN = 4;
export const MAX_CONCURRENT_CHILDREN_HARD_CAP = 16;

export interface DelegationBudget {
  readonly maxConcurrent: number;
}

export const DEFAULT_DELEGATION_BUDGET: DelegationBudget = {
  maxConcurrent: DEFAULT_MAX_CONCURRENT_CHILDREN,
};

export interface DelegationRequest {
  readonly parentLevel: string;
  readonly childLevel: string;
  readonly parentDepth: number;
  readonly activeChildren: number;
  readonly budget?: DelegationBudget;
}

export interface DelegationDecision {
  readonly allowed: boolean;
  readonly childDepth: number;
  readonly reason?: string;
}

const LEVEL_RANK: Record<DelegationLevel, number> = { L0: 0, L1: 1, L2: 2 };

export function planDelegation(request: DelegationRequest): DelegationDecision {
  const input = requireRecord(request, "request");
  const parentLevel = requireEnum(input.parentLevel, "parentLevel", DELEGATION_LEVELS);
  const childLevel = requireEnum(input.childLevel, "childLevel", DELEGATION_LEVELS);
  const parentDepth = requireInt(input.parentDepth, "parentDepth", { min: 0 });
  const activeChildren = requireInt(input.activeChildren, "activeChildren", { min: 0 });
  const budget = (input.budget ?? DEFAULT_DELEGATION_BUDGET) as DelegationBudget;
  requireInt(budget.maxConcurrent, "budget.maxConcurrent", {
    min: 1,
    max: MAX_CONCURRENT_CHILDREN_HARD_CAP,
  });
  const childDepth = parentDepth + 1;
  const deny = (reason: string): DelegationDecision => ({ allowed: false, childDepth, reason });

  if (parentLevel === "L0") return deny("L0 executors are leaves and cannot delegate");
  if (LEVEL_RANK[childLevel] !== LEVEL_RANK[parentLevel] - 1) {
    return deny(
      `delegation must descend exactly one level (${parentLevel} -> ${childLevel} denied); L2 children are never allowed`,
    );
  }
  if (childDepth > MAX_DELEGATION_DEPTH) {
    return deny(`logical delegation depth ${childDepth} exceeds cap ${MAX_DELEGATION_DEPTH}`);
  }
  if (activeChildren >= budget.maxConcurrent) {
    return deny(`concurrency budget exhausted (${activeChildren}/${budget.maxConcurrent} active children)`);
  }
  return { allowed: true, childDepth };
}

/** Orchestrator-facing variant: throws instead of returning a denied decision. */
export function requireDelegation(request: DelegationRequest): number {
  const decision = planDelegation(request);
  if (!decision.allowed) {
    throw new ValidationError("POLICY_DENIED", decision.reason ?? "delegation denied by policy");
  }
  return decision.childDepth;
}
