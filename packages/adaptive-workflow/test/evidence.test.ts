import { describe, expect, it } from "bun:test";
import {
  createEvidence,
  EvidenceLedger,
  isEvidenceStale,
  verifyEvidenceIntegrity,
  type EvidenceRecord,
} from "../src/evidence.js";
import { inputHash } from "../src/hash.js";
import { ValidationError } from "../src/errors.js";

const inputs = [
  { label: "cmd-output", content: "server returned 500" },
  { label: "diff", content: "+ fix parser" },
];

function buildRecord(id = "ev-1") {
  return createEvidence({ id, kind: "repro", stageId: "reproduce", summary: "captured 500", inputs });
}

describe("createEvidence", () => {
  it("pins hashes of every raw input and is deterministic", () => {
    const a = buildRecord();
    const b = buildRecord();
    expect(a.inputs[0]!.hash).toBe(inputHash("server returned 500"));
    expect(a.inputs[0]!.algorithm).toBe("sha256");
    expect(a.recordHash).toBe(b.recordHash);
    expect(Object.isFrozen(a)).toBe(true);
    const changedSummary = createEvidence({ id: "ev-1", kind: "repro", stageId: "reproduce", summary: "different", inputs });
    expect(changedSummary.recordHash).not.toBe(a.recordHash);
  });

  it("rejects malformed boundaries", () => {
    expect(() => createEvidence({ id: "", kind: "repro", stageId: "s", summary: "x", inputs })).toThrow(ValidationError);
    expect(() => createEvidence({ id: "e", kind: "screenshot", stageId: "s", summary: "x", inputs })).toThrow(/must be one of/);
    expect(() => createEvidence({ id: "e", kind: "repro", stageId: "s", summary: "x", inputs: [] })).toThrow(/non-empty array/);
    expect(() => createEvidence({ id: "e", kind: "repro", stageId: "s", summary: "x", inputs: [{ label: "a", content: "" }] })).toThrow(/content/);
    expect(() =>
      createEvidence({
        id: "e",
        kind: "repro",
        stageId: "s",
        summary: "x",
        inputs: [
          { label: "same", content: "a" },
          { label: "same", content: "b" },
        ],
      }),
    ).toThrow(/duplicate input label/);
  });
});

describe("isEvidenceStale", () => {
  it("is fresh when inputs are unchanged", () => {
    expect(isEvidenceStale(buildRecord(), inputs)).toEqual({ stale: false, changedLabels: [], missingLabels: [] });
  });

  it("flags changed inputs with the exact labels", () => {
    const report = isEvidenceStale(buildRecord(), [
      { label: "cmd-output", content: "server returned 501" },
      { label: "diff", content: "+ fix parser" },
    ]);
    expect(report.stale).toBe(true);
    expect(report.changedLabels).toEqual(["cmd-output"]);
    expect(report.missingLabels).toEqual([]);
  });

  it("flags missing inputs and ignores extra inputs", () => {
    const missing = isEvidenceStale(buildRecord(), [{ label: "cmd-output", content: "server returned 500" }]);
    expect(missing.stale).toBe(true);
    expect(missing.missingLabels).toEqual(["diff"]);
    const extra = isEvidenceStale(buildRecord(), [
      ...inputs,
      { label: "extra-log", content: "unrelated" },
    ]);
    expect(extra.stale).toBe(false);
  });

  it("rejects malformed current inputs", () => {
    expect(() => isEvidenceStale(buildRecord(), [])).toThrow(/non-empty array/);
    expect(() => isEvidenceStale(buildRecord(), "nope")).toThrow(ValidationError);
  });
});

describe("verifyEvidenceIntegrity", () => {
  it("detects tampered records", () => {
    const record = buildRecord();
    expect(verifyEvidenceIntegrity(record)).toBe(true);
    const forged = { ...record, summary: "forged after the fact" } as EvidenceRecord;
    expect(verifyEvidenceIntegrity(forged)).toBe(false);
  });
});

describe("EvidenceLedger", () => {
  it("adds, gets, and rejects duplicate ids", () => {
    const ledger = new EvidenceLedger();
    ledger.add(buildRecord("ev-1"));
    expect(ledger.get("ev-1").id).toBe("ev-1");
    expect(() => ledger.add(buildRecord("ev-1"))).toThrow(/already recorded/);
    expect(() => ledger.get("missing")).toThrow(/unknown evidence id/);
    expect(() => ledger.add({} as EvidenceRecord)).toThrow(ValidationError);
  });

  it("classifies fresh, stale, tampered, and unknown ids", () => {
    const ledger = new EvidenceLedger();
    ledger.add(buildRecord("ev-1"));
    ledger.add(createEvidence({ id: "ev-2", kind: "diff", stageId: "fix", summary: "patch", inputs: [{ label: "diff", content: "+ fix parser" }] }));
    const fresh = ledger.validateFresh(["ev-1", "ev-2"], inputs);
    expect(fresh.fresh).toEqual(["ev-1", "ev-2"]);
    const drifted = ledger.validateFresh(["ev-1", "ev-2", "ev-x"], [
      { label: "cmd-output", content: "server returned 501" },
      { label: "diff", content: "+ fix parser" },
    ]);
    expect(drifted.stale).toEqual(["ev-1"]);
    expect(drifted.fresh).toEqual(["ev-2"]);
    expect(drifted.unknown).toEqual(["ev-x"]);
    const rec3 = createEvidence({ id: "ev-3", kind: "doc", stageId: "write", summary: "notes", inputs: [{ label: "doc", content: "text" }] });
    ledger.add({ ...rec3, summary: "forged" } as EvidenceRecord);
    const tampered = ledger.validateFresh(["ev-3"], [{ label: "doc", content: "text" }]);
    expect(tampered.tampered).toEqual(["ev-3"]);
    expect(tampered.fresh).toEqual([]);
  });
});
