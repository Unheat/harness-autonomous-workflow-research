/**
 * Boundary validation helpers: parse at the boundary, fail fast internally.
 * Every public factory validates its input and throws a typed ValidationError
 * instead of letting malformed data flow deeper into the domain.
 */

export type ValidationCode =
  | "INVALID_TYPE"
  | "EMPTY_VALUE"
  | "INVALID_ENUM"
  | "INVALID_STATE"
  | "POLICY_DENIED";

export class ValidationError extends Error {
  readonly code: ValidationCode;

  constructor(code: ValidationCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = "ValidationError";
    this.code = code;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new ValidationError("INVALID_TYPE", `${field} must be an object`);
  return value;
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") throw new ValidationError("INVALID_TYPE", `${field} must be a string`);
  return value;
}

export function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError("EMPTY_VALUE", `${field} must be a non-empty string`);
  }
  return value;
}

export function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new ValidationError("INVALID_TYPE", `${field} must be a boolean`);
  return value;
}

export function requireEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T {
  requireNonEmptyString(value, field);
  if (!(allowed as readonly string[]).includes(value)) {
    throw new ValidationError(
      "INVALID_ENUM",
      `${field} must be one of ${allowed.join(", ")}; got "${value}"`,
    );
  }
  return value as T;
}

export function requireArrayOfStrings(
  value: unknown,
  field: string,
  { minItems = 0 }: { minItems?: number } = {},
): string[] {
  if (!Array.isArray(value)) throw new ValidationError("INVALID_TYPE", `${field} must be an array`);
  if (value.length < minItems) {
    throw new ValidationError("EMPTY_VALUE", `${field} must have at least ${minItems} items`);
  }
  return value.map((item, index) => requireNonEmptyString(item, `${field}[${index}]`));
}

export function requireInt(
  value: unknown,
  field: string,
  { min, max }: { min?: number; max?: number } = {},
): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ValidationError("INVALID_TYPE", `${field} must be an integer`);
  }
  if (min !== undefined && value < min) {
    throw new ValidationError("INVALID_STATE", `${field} must be >= ${min}`);
  }
  if (max !== undefined && value > max) {
    throw new ValidationError("INVALID_STATE", `${field} must be <= ${max}`);
  }
  return value;
}
