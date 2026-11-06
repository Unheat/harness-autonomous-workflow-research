import { existsSync, lstatSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const VERSION = "2026.1023.0";
export const NATIVE_VERSION = "18.1.0-beta.16";
export const HOST = "127.0.0.1";
export const PORT = 3100;
export const HEALTH_TIMEOUT_MS = 2500;
export const MAX_HEALTH_BYTES = 16384;
export const MAX_NATIVE_LINKS = 64;
export const DB_PORT = 54329;
export const DISCOVERY_TIMEOUT_MS = 3000;
export const BASE_URL = `http://${HOST}:${PORT}`;
export const SOURCE = dirname(fileURLToPath(import.meta.url));
export function paths(root: string) {
  const base = resolve(root);
  const workbench = join(base, ".workbench");
  const state = join(workbench, "state");
  const instance = join(state, "instances/default");
  return { root: base, workbench, state, instance, install: join(workbench, "paperclip"),
    config: join(instance, "config.json") };
}
export type Paths = ReturnType<typeof paths>;

// Existing ancestors must be real directories, never redirects to another tree.
export function contained(root: string, target: string) {
  const rel = relative(root, target);
  if (isAbsolute(rel) || rel === ".." || rel.startsWith("../")) throw new Error(`Path escapes managed root: ${target}`);
  let current = root;
  for (const part of ["", ...rel.split("/").filter(Boolean)]) {
    current = part ? join(current, part) : current;
    try {
      if (lstatSync(current).isSymbolicLink()) throw new Error(`Refusing symlink path: ${current}`);
    } catch (error: any) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  if (existsSync(target) && relative(realpathSync(root), realpathSync(target)).startsWith("../")) {
    throw new Error(`Resolved path escapes managed root: ${target}`);
  }
  return target;
}
