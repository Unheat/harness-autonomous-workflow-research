/**
 * Immutable, versioned workflow documents (stages, permissions, resources)
 * with a registry providing promote/rollback. Every version object is
 * deep-frozen and hash-pinned at creation; registry mutations only move an
 * "active" pointer, so a pinned snapshot taken for an active run can never
 * change underneath the run.
 */

import { deepFreeze } from "./contracts.js";
import {
  isRecord,
  requireArrayOfStrings,
  requireInt,
  requireNonEmptyString,
  requireRecord,
  ValidationError,
} from "./errors.js";
import { HASH_ALGORITHM, stableHash } from "./hash.js";

export interface WorkflowStage {
  readonly id: string;
  readonly purpose: string;
  /** Evidence-first: every stage declares which evidence kinds it requires. */
  readonly requiresEvidenceKinds: readonly string[];
}

export interface WorkflowPermissions {
  readonly allow: readonly string[];
  readonly deny: readonly string[];
}

export interface WorkflowResources {
  readonly prompts: readonly string[];
  readonly checkers: readonly string[];
}

export interface WorkflowContent {
  readonly stages: readonly WorkflowStage[];
  readonly permissions: WorkflowPermissions;
  readonly resources: WorkflowResources;
}

export interface WorkflowDocument {
  readonly name: string;
  readonly version: number;
  /** Pins the exact content (stages/permissions/resources), not the lineage slot. */
  readonly contentHash: string;
  readonly stages: readonly WorkflowStage[];
  readonly permissions: WorkflowPermissions;
  readonly resources: WorkflowResources;
}

export interface WorkflowVersionInput {
  readonly name: string;
  readonly version: number;
  readonly stages: unknown;
  readonly permissions: unknown;
  readonly resources: unknown;
}

export function createWorkflowVersion(input: WorkflowVersionInput): WorkflowDocument {
  if (!isRecord(input)) throw new ValidationError("INVALID_TYPE", "workflow version input must be an object");
  const name = requireNonEmptyString(input.name, "name");
  const version = requireInt(input.version, "version", { min: 1 });
  const stages = validateStages(input.stages);
  const permissions = validatePermissions(input.permissions);
  const resources = validateResources(input.resources);
  const contentHash = stableHash({ stages, permissions, resources });
  return deepFreeze({ name, version, contentHash, stages, permissions, resources });
}

function validateStages(value: unknown): WorkflowStage[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError("EMPTY_VALUE", "stages must be a non-empty array");
  }
  const seen = new Set<string>();
  return value.map((raw, index) => {
    const stage = requireRecord(raw, `stages[${index}]`);
    const id = requireNonEmptyString(stage.id, `stages[${index}].id`);
    if (seen.has(id)) throw new ValidationError("INVALID_STATE", `duplicate stage id: ${id}`);
    seen.add(id);
    return {
      id,
      purpose: requireNonEmptyString(stage.purpose, `stages[${index}].purpose`),
      requiresEvidenceKinds: requireArrayOfStrings(
        stage.requiresEvidenceKinds,
        `stages[${index}].requiresEvidenceKinds`,
        { minItems: 1 },
      ),
    };
  });
}

function validatePermissions(value: unknown): WorkflowPermissions {
  const perms = requireRecord(value, "permissions");
  return {
    allow: requireArrayOfStrings(perms.allow, "permissions.allow"),
    deny: requireArrayOfStrings(perms.deny, "permissions.deny"),
  };
}

function validateResources(value: unknown): WorkflowResources {
  const res = requireRecord(value, "resources");
  return {
    prompts: requireArrayOfStrings(res.prompts, "resources.prompts"),
    checkers: requireArrayOfStrings(res.checkers, "resources.checkers"),
  };
}

export class WorkflowRegistry {
  readonly #history = new Map<string, WorkflowDocument[]>();
  readonly #active = new Map<string, number>();

  register(doc: WorkflowDocument): WorkflowDocument {
    if (!isRecord(doc)) throw new ValidationError("INVALID_TYPE", "workflow document required");
    const name = requireNonEmptyString(doc.name, "name");
    const version = requireInt(doc.version, "version", { min: 1 });
    requireNonEmptyString(doc.contentHash, "contentHash");
    const history = this.#history.get(name) ?? [];
    const expected = history.length === 0 ? 1 : history[history.length - 1]!.version + 1;
    if (version !== expected) {
      throw new ValidationError("INVALID_STATE", `${name}: expected version ${expected}, got ${version}`);
    }
    history.push(doc);
    this.#history.set(name, history);
    this.#active.set(name, version);
    return doc;
  }

  /**
   * Create and register the next version. Version numbers are never reused:
   * the new version is max(history)+1, so promoting after a rollback stays
   * monotonic. No-op promotes (content identical to the active version) are
   * rejected.
   */
  promote(
    name: string,
    content: { stages: unknown; permissions: unknown; resources: unknown },
  ): WorkflowDocument {
    const active = this.active(name);
    const nextVersion = this.#maxVersion(name) + 1;
    const next = createWorkflowVersion({ name, version: nextVersion, ...content });
    if (next.contentHash === active.contentHash) {
      throw new ValidationError(
        "INVALID_STATE",
        `promote rejected: candidate content is identical to active version ${active.version}`,
      );
    }
    return this.register(next);
  }

  /** Move the active pointer back to an older version (default: previous). */
  rollback(name: string, toVersion?: number): WorkflowDocument {
    const current = this.active(name);
    const target = requireInt(toVersion ?? current.version - 1, "toVersion", { min: 1 });
    if (target >= current.version) {
      throw new ValidationError(
        "INVALID_STATE",
        `rollback target ${target} must be older than active version ${current.version}`,
      );
    }
    const doc = this.get(name, target);
    this.#active.set(name, target);
    return doc;
  }

  /**
   * Pin an immutable snapshot for an active run. The returned object is the
   * deep-frozen version document; later promote/rollback never mutates it.
   */
  pin(name: string, version?: number): WorkflowDocument {
    return version === undefined ? this.active(name) : this.get(name, version);
  }

  active(name: string): WorkflowDocument {
    const version = this.#active.get(requireNonEmptyString(name, "name"));
    if (version === undefined) {
      throw new ValidationError("INVALID_STATE", `no workflow registered for "${name}"`);
    }
    return this.get(name, version);
  }

  get(name: string, version: number): WorkflowDocument {
    const doc = this.#history.get(name)?.find((d) => d.version === version);
    if (!doc) {
      throw new ValidationError("INVALID_STATE", `${name}: version ${version} not found`);
    }
    return doc;
  }

  history(name: string): readonly WorkflowDocument[] {
    const history = this.#history.get(requireNonEmptyString(name, "name"));
    if (!history) {
      throw new ValidationError("INVALID_STATE", `no workflow registered for "${name}"`);
    }
    return history;
  }

  #maxVersion(name: string): number {
    const history = this.#history.get(name)!;
    return history[history.length - 1]!.version;
  }
}
