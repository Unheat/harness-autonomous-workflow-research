import { describe, expect, it } from "bun:test";
import {
  DEFAULT_DELEGATION_BUDGET,
  MAX_DELEGATION_DEPTH,
  planDelegation,
  requireDelegation,
} from "../src/delegation.js";
import { ValidationError } from "../src/errors.js";

const req = (overrides: Partial<Parameters<typeof planDelegation>[0]> = {}) => ({
  parentLevel: "L2",
  childLevel: "L1",
  parentDepth: 0,
  activeChildren: 0,
  ...overrides,
});

describe("planDelegation", () => {
  it("allows exactly-one-level descent within the depth cap", () => {
    const rootToSub = planDelegation(req());
    expect(rootToSub.allowed).toBe(true);
    expect(rootToSub.childDepth).toBe(1);
    const subToLeaf = planDelegation(req({ parentLevel: "L1", childLevel: "L0", parentDepth: 1, activeChildren: 3 }));
    expect(subToLeaf.allowed).toBe(true);
    expect(subToLeaf.childDepth).toBe(2);
    expect(MAX_DELEGATION_DEPTH).toBe(2);
  });

  it("denies L2 delegation and same-level or skip-level hops", () => {
    expect(planDelegation(req({ childLevel: "L2" })).allowed).toBe(false);
    expect(planDelegation(req({ parentLevel: "L1", childLevel: "L2" })).reason).toMatch(/L2 children are never allowed/);
    expect(planDelegation(req({ childLevel: "L0" })).allowed).toBe(false);
    expect(planDelegation(req({ parentLevel: "L1", childLevel: "L1" })).allowed).toBe(false);
  });

  it("denies L0 leaf delegation and depth-cap violations", () => {
    expect(planDelegation(req({ parentLevel: "L0", childLevel: "L0", parentDepth: 2 })).reason).toMatch(/leaves and cannot delegate/);
    const tooDeep = planDelegation(req({ parentLevel: "L1", childLevel: "L0", parentDepth: 2 }));
    expect(tooDeep.allowed).toBe(false);
    expect(tooDeep.reason).toMatch(/depth 3 exceeds cap 2/);
  });

  it("enforces the concurrency budget", () => {
    expect(planDelegation(req({ activeChildren: DEFAULT_DELEGATION_BUDGET.maxConcurrent })).allowed).toBe(false);
    expect(planDelegation(req({ activeChildren: DEFAULT_DELEGATION_BUDGET.maxConcurrent - 1 })).allowed).toBe(true);
    expect(
      planDelegation(req({ activeChildren: 1, budget: { maxConcurrent: 1 } })).reason,
    ).toMatch(/budget exhausted/);
    expect(planDelegation(req({ activeChildren: 1, budget: { maxConcurrent: 2 } })).allowed).toBe(true);
  });

  it("validates boundaries", () => {
    expect(() => planDelegation(req({ parentLevel: "L3" }))).toThrow(/parentLevel/);
    expect(() => planDelegation(req({ childLevel: "leaf" }))).toThrow(/childLevel/);
    expect(() => planDelegation(req({ parentDepth: -1 }))).toThrow(/parentDepth/);
    expect(() => planDelegation(req({ activeChildren: 1.5 }))).toThrow(/integer/);
    expect(() => planDelegation(req({ budget: { maxConcurrent: 0 } }))).toThrow(/maxConcurrent/);
    expect(() => planDelegation(req({ budget: { maxConcurrent: 17 } }))).toThrow(/maxConcurrent/);
  });

  it("requireDelegation throws on denial and returns child depth on success", () => {
    expect(requireDelegation(req())).toBe(1);
    expect(() => requireDelegation(req({ childLevel: "L2" }))).toThrow(/\[POLICY_DENIED\]/);
    expect(() => requireDelegation(req({ parentLevel: "L0" }))).toThrow(ValidationError);
  });
});
