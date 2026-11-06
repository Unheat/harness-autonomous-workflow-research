import { lstatSync, readFileSync, readlinkSync, symlinkSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { contained, MAX_NATIVE_LINKS, NATIVE_VERSION } from "./constants";

// Implements only the reviewed Darwin ARM64 symlink postinstall behavior. Never executes package scripts.
export function nativeLinks(install: string, hydrate: boolean) {
  const pkg = contained(install, join(install, "node_modules/@embedded-postgres/darwin-arm64"));
  const meta = JSON.parse(readFileSync(contained(install, join(pkg, "package.json")), "utf8"));
  if (meta.name !== "@embedded-postgres/darwin-arm64" || meta.version !== NATIVE_VERSION) {
    throw new Error(`Native package must be @embedded-postgres/darwin-arm64@${NATIVE_VERSION}`);
  }
  const manifest = JSON.parse(readFileSync(contained(install, join(pkg, "native/pg-symlinks.json")), "utf8"));
  if (!Array.isArray(manifest) || manifest.length === 0 || manifest.length > MAX_NATIVE_LINKS) throw new Error("Invalid native symlink manifest");
  const seen = new Set<string>();
  const pending: { target: string; link: string }[] = [];
  for (const entry of manifest) {
    if (!entry || Object.keys(entry).sort().join(",") !== "source,target" ||
      typeof entry.source !== "string" || typeof entry.target !== "string" ||
      ![entry.source, entry.target].every(p => /^native\/lib\/[A-Za-z0-9_.+-]+\.dylib$/.test(p))) {
      throw new Error("Native manifest paths must be flat relative native/lib/*.dylib paths");
    }
    const source = contained(install, join(pkg, entry.source));
    const target = join(pkg, entry.target);
    contained(install, dirname(target));
    if (seen.has(target) || source === target) throw new Error("Duplicate/self native link");
    seen.add(target);
    if (!lstatSync(source).isFile()) throw new Error(`Native source is not a regular file: ${source}`);
    const link = relative(dirname(target), source);
    let stat;
    try { stat = lstatSync(target); } catch (error: any) { if (error.code !== "ENOENT") throw error; }
    if (stat) {
      if (!stat.isSymbolicLink() || readlinkSync(target) !== link) throw new Error(`Refusing native link overwrite: ${target}`);
    } else pending.push({ target, link });
  }
  // Validate the complete manifest before the first write.
  if (hydrate) for (const { target, link } of pending) symlinkSync(link, target);
  return pending.length;
}
