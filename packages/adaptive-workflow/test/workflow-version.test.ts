import { describe, expect, it } from "bun:test";
import { createWorkflowVersion, WorkflowRegistry } from "../src/workflow-version.js";
import { ValidationError } from "../src/errors.js";

const stagesA = [
  { id: "reproduce", purpose: "capture symptom-specific repro", requiresEvidenceKinds: ["repro"] },
  { id: "fix", purpose: "implement fix", requiresEvidenceKinds: ["diff"] },
];
const permissionsA = { allow: ["fs:read"], deny: ["net:write"] };
const resourcesA = { prompts: ["bug-repro"], checkers: ["bun-test"] };
const contentA = { stages: stagesA, permissions: permissionsA, resources: resourcesA };
const contentB = {
  stages: stagesA,
  permissions: { allow: ["fs:read", "net:read"], deny: ["net:write"] },
  resources: resourcesA,
};
const contentC = {
  stages: [...stagesA, { id: "verify", purpose: "verify fix", requiresEvidenceKinds: ["test-output"] }],
  permissions: permissionsA,
  resources: resourcesA,
};

describe("createWorkflowVersion", () => {
  it("builds a deep-frozen, hash-pinned document", () => {
    const doc = createWorkflowVersion({ name: "bugfix-flow", version: 1, ...contentA });
    expect(doc.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.isFrozen(doc)).toBe(true);
    expect(Object.isFrozen(doc.stages)).toBe(true);
    expect(Object.isFrozen(doc.permissions)).toBe(true);
    expect(() => {
      (doc as Record<string, unknown>).version = 9;
    }).toThrow();
    expect(() => {
      (doc.stages as unknown[])[0]!.id = "tampered";
    }).toThrow();
  });

  it("hash is deterministic and content-sensitive", () => {
    const a = createWorkflowVersion({ name: "n", version: 1, ...contentA });
    const b = createWorkflowVersion({ name: "n", version: 1, ...contentA });
    const c = createWorkflowVersion({ name: "n", version: 1, ...contentB });
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.contentHash).not.toBe(c.contentHash);
  });

  it("rejects malformed boundaries", () => {
    expect(() => createWorkflowVersion({ name: "", version: 1, ...contentA })).toThrow(ValidationError);
    expect(() => createWorkflowVersion({ name: "n", version: 0, ...contentA })).toThrow(/must be >= 1/);
    expect(() => createWorkflowVersion({ name: "n", version: 1, stages: [], permissions: permissionsA, resources: resourcesA })).toThrow(ValidationError);
    expect(() =>
      createWorkflowVersion({
        name: "n",
        version: 1,
        stages: [{ id: "s", purpose: "p", requiresEvidenceKinds: [] }],
        permissions: permissionsA,
        resources: resourcesA,
      }),
    ).toThrow(/requiresEvidenceKinds/);
    expect(() =>
      createWorkflowVersion({
        name: "n",
        version: 1,
        stages: [
          { id: "s", purpose: "p", requiresEvidenceKinds: ["repro"] },
          { id: "s", purpose: "q", requiresEvidenceKinds: ["diff"] },
        ],
        permissions: permissionsA,
        resources: resourcesA,
      }),
    ).toThrow(/duplicate stage id/);
    expect(() =>
      createWorkflowVersion({ name: "n", version: 1, stages: stagesA, permissions: { allow: "all", deny: [] }, resources: resourcesA }),
    ).toThrow(ValidationError);
    expect(() =>
      createWorkflowVersion({ name: "n", version: 1, stages: stagesA, permissions: permissionsA, resources: { prompts: ["p"] } }),
    ).toThrow(/resources\.checkers/);
  });
});

describe("WorkflowRegistry", () => {
  it("promotes sequential versions and rejects no-op promotes", () => {
    const registry = new WorkflowRegistry();
    registry.register(createWorkflowVersion({ name: "flow", version: 1, ...contentA }));
    registry.promote("flow", contentB);
    expect(registry.active("flow").version).toBe(2);
    expect(() => registry.promote("flow", contentB)).toThrow(/identical/);
  });

  it("rejects gaps, unknown workflows, and unknown versions", () => {
    const registry = new WorkflowRegistry();
    expect(() => registry.promote("ghost", contentA)).toThrow(/no workflow registered/);
    expect(() => registry.register(createWorkflowVersion({ name: "g", version: 2, ...contentA }))).toThrow(/expected version 1/);
    registry.register(createWorkflowVersion({ name: "g", version: 1, ...contentA }));
    expect(() => registry.get("g", 7)).toThrow(/not found/);
    expect(() => registry.history("nope")).toThrow(/no workflow registered/);
  });

  it("rollback moves the active pointer and forbids forward targets", () => {
    const registry = new WorkflowRegistry();
    registry.register(createWorkflowVersion({ name: "f", version: 1, ...contentA }));
    registry.promote("f", contentB);
    registry.promote("f", contentC);
    expect(registry.rollback("f").version).toBe(2);
    expect(registry.active("f").version).toBe(2);
    expect(() => registry.rollback("f", 3)).toThrow(/older than active version 2/);
    expect(() => registry.rollback("f", 0)).toThrow(/must be >= 1/);
    expect(registry.rollback("f", 1).version).toBe(1);
  });

  it("promoting after rollback never reuses version numbers", () => {
    const registry = new WorkflowRegistry();
    registry.register(createWorkflowVersion({ name: "f", version: 1, ...contentA }));
    registry.promote("f", contentB);
    registry.rollback("f");
    const next = registry.promote("f", contentC);
    expect(next.version).toBe(3);
    expect(registry.history("f").length).toBe(3);
  });

  it("pinned run snapshots stay immutable across promote and rollback", () => {
    const registry = new WorkflowRegistry();
    const v1 = createWorkflowVersion({ name: "f", version: 1, ...contentA });
    registry.register(v1);
    const pinned = registry.pin("f");
    registry.promote("f", contentB);
    registry.rollback("f");
    expect(registry.active("f").version).toBe(1);
    expect(pinned.version).toBe(1);
    expect(pinned.contentHash).toBe(v1.contentHash);
    expect(Object.isFrozen(pinned)).toBe(true);
    expect(() => {
      (pinned as Record<string, unknown>).version = 42;
    }).toThrow();
  });
});
