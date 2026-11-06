/**
 * Deterministic content hashing. Structured values are canonicalized
 * (recursively key-sorted JSON) so hashes pin content, never key order.
 * Raw input artifacts are hashed with a distinct prefix so a raw hash can
 * never collide with a canonical structured hash.
 */

import { createHash } from "node:crypto";

export const HASH_ALGORITHM = "sha256";

export function sha256Hex(text: string): string {
  return createHash(HASH_ALGORITHM).update(text, "utf8").digest("hex");
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) out[key] = canonicalize(source[key]);
    return out;
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

/** Hash of a structured value, independent of key order. */
export function stableHash(value: unknown): string {
  return sha256Hex(canonicalJson(value));
}

/** Hash of a raw input artifact (file content, command output, ...). */
export function inputHash(content: string): string {
  return sha256Hex(`raw:${content}`);
}
