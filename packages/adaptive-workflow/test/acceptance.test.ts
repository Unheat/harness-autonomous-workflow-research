import { describe, expect, it } from "bun:test";
import { evaluateAcceptance, type AcceptanceRequest } from "../src/acceptance.js";
import { ValidationError } from "../src/errors.js";

const bugBase = {
  taskKind: "bug",
  symptom: "login returns 500 for valid password",
  implementerActor: "impl-1",
  reviewer: { actor: "rev-1", verdict: "accept", reason: "verified locally" },
  checks: [{ checker: "bun-test", passed: true, details: "12 passed" }],
  repro: {
    symptom: "login returns 500 for valid password",
    observed: "POST /login returned HTTP 500 where 200 was expected",
    steps: ["start server", "POST /login with valid credentials", "observe 500 response"],
  },
};

const featureBase = {
  taskKind: "feature",
  implementerActor: "impl-1",
  reviewer: { actor: "rev-1", verdict: "accept", reason: "verified" },
  acceptanceTests: [
    { name: "cart adds item", passed: true },
    { name: "cart computes total", passed: true },
  ],
};

const parityOk = {
  before: { checker: "bun-test", passed: true, details: "baseline green" },
  after: { checker: "bun-test", passed: true, details: "refactor green" },
  behaviorMatched: true,
};

describe("bug acceptance", () => {
  it("accepts a symptom-specific repro that matches the task symptom", () => {
    expect(evaluateAcceptance(bugBase).verdict).toBe("accept");
  });

  it("rejects generic nonzero repros", () => {
    const generic: AcceptanceRequest = {
      ...bugBase,
      repro: { ...bugBase.repro, observed: "exit code 1" },
    };
    const decision = evaluateAcceptance(generic);
    expect(decision.verdict).toBe("revise");
    expect(decision.reasons.join(" ")).toMatch(/generic/);
  });

  it("rejects repros whose symptom does not match the task", () => {
    const mismatch: AcceptanceRequest = {
      ...bugBase,
      repro: { ...bugBase.repro, symptom: "server crashes on startup" },
    };
    expect(evaluateAcceptance(mismatch).verdict).toBe("revise");
  });

  it("rejects missing repro, missing symptom, or failing checks", () => {
    const noRepro: AcceptanceRequest = { ...bugBase, repro: undefined };
    expect(evaluateAcceptance(noRepro).reasons.join(" ")).toMatch(/symptom-specific repro/);
    const noSymptom: AcceptanceRequest = { ...bugBase, symptom: undefined };
    expect(evaluateAcceptance(noSymptom).verdict).toBe("revise");
    const failingCheck: AcceptanceRequest = {
      ...bugBase,
      checks: [{ checker: "bun-test", passed: false, details: "1 failed" }],
    };
    expect(evaluateAcceptance(failingCheck).verdict).toBe("revise");
  });
});

describe("reviewer independence and verdicts", () => {
  it("blocks self-claimed verdicts", () => {
    const selfReview: AcceptanceRequest = {
      ...bugBase,
      reviewer: { actor: "impl-1", verdict: "accept", reason: "looks good to me" },
    };
    const decision = evaluateAcceptance(selfReview);
    expect(decision.verdict).toBe("blocked");
    expect(decision.reasons.join(" ")).toMatch(/self-claimed/);
  });

  it("passes blocked and revise reviewer verdicts through", () => {
    const blocked: AcceptanceRequest = { ...bugBase, reviewer: { actor: "rev-1", verdict: "blocked", reason: "missing rights" } };
    expect(evaluateAcceptance(blocked).verdict).toBe("blocked");
    const revise: AcceptanceRequest = { ...bugBase, reviewer: { actor: "rev-1", verdict: "revise", reason: "needs tests" } };
    expect(evaluateAcceptance(revise).verdict).toBe("revise");
  });

  it("rejects malformed requests at the boundary", () => {
    expect(() => evaluateAcceptance({ ...bugBase, taskKind: "hotfix" } as unknown as AcceptanceRequest)).toThrow(/taskKind/);
    expect(() =>
      evaluateAcceptance({ ...bugBase, reviewer: { actor: "rev-1", verdict: "approve", reason: "ok" } } as unknown as AcceptanceRequest),
    ).toThrow(/reviewer\.verdict/);
    expect(() =>
      evaluateAcceptance({ ...bugBase, checks: [{ checker: "c", passed: "yes", details: "" }] } as unknown as AcceptanceRequest),
    ).toThrow(/must be a boolean/);
    expect(() =>
      evaluateAcceptance({ ...bugBase, implementerActor: "" } as unknown as AcceptanceRequest),
    ).toThrow(/implementerActor/);
  });
});

describe("feature / refactor / docs / research acceptance", () => {
  it("feature: requires acceptance tests, all passing", () => {
    expect(evaluateAcceptance(featureBase).verdict).toBe("accept");
    const failing: AcceptanceRequest = { ...featureBase, acceptanceTests: [{ name: "cart adds item", passed: false }] };
    const decision = evaluateAcceptance(failing);
    expect(decision.verdict).toBe("revise");
    expect(decision.reasons.join(" ")).toMatch(/cart adds item/);
    expect(evaluateAcceptance({ ...featureBase, acceptanceTests: [] }).reasons.join(" ")).toMatch(/require acceptance tests/);
    expect(evaluateAcceptance({ ...featureBase, acceptanceTests: undefined }).verdict).toBe("revise");
  });

  it("refactor: requires behavior parity with a passing baseline", () => {
    const refactor: AcceptanceRequest = {
      taskKind: "refactor",
      implementerActor: "impl-1",
      reviewer: { actor: "rev-1", verdict: "accept", reason: "verified" },
      checks: [],
      parity: parityOk,
    };
    expect(evaluateAcceptance(refactor).verdict).toBe("accept");
    expect(evaluateAcceptance({ ...refactor, parity: undefined }).reasons.join(" ")).toMatch(/behavior-parity/);
    expect(evaluateAcceptance({ ...refactor, parity: { ...parityOk, behaviorMatched: false } }).verdict).toBe("revise");
    expect(
      evaluateAcceptance({ ...refactor, parity: { ...parityOk, before: { ...parityOk.before, passed: false } } }).verdict,
    ).toBe("revise");
  });

  it("docs: requires covered sections plus a passing deterministic check", () => {
    const docs: AcceptanceRequest = {
      taskKind: "docs",
      implementerActor: "impl-1",
      reviewer: { actor: "rev-1", verdict: "accept", reason: "verified" },
      checks: [{ checker: "link-check", passed: true, details: "0 broken links" }],
      docSections: ["quickstart", "api reference"],
    };
    expect(evaluateAcceptance(docs).verdict).toBe("accept");
    expect(evaluateAcceptance({ ...docs, docSections: [] }).verdict).toBe("revise");
    expect(evaluateAcceptance({ ...docs, checks: [] }).reasons.join(" ")).toMatch(/deterministic check/);
  });

  it("research: requires cited sources plus a passing deterministic check", () => {
    const research: AcceptanceRequest = {
      taskKind: "research",
      implementerActor: "impl-1",
      reviewer: { actor: "rev-1", verdict: "accept", reason: "verified" },
      checks: [{ checker: "citation-check", passed: true, details: "" }],
      sources: ["https://example.com/spec", "internal/rfc-12"],
    };
    expect(evaluateAcceptance(research).verdict).toBe("accept");
    expect(evaluateAcceptance({ ...research, sources: undefined }).verdict).toBe("revise");
    expect(evaluateAcceptance({ ...research, checks: [{ checker: "citation-check", passed: false, details: "" }] }).verdict).toBe("revise");
  });
});
