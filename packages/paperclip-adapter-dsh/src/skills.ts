import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AdapterSkillContext, AdapterSkillEntry, AdapterSkillSnapshot } from "@paperclipai/adapter-utils";
import type { PaperclipSkillEntry } from "@paperclipai/adapter-utils/server-utils";

const MANAGED_MARKER = ".paperclip-managed.json";
const RUNTIME_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Paperclip runtime names may contain "--" (e.g. "issue-triage--527450ed81"); DSH silently
 * drops skills whose directory name is not strict kebab-case. Sanitize deterministically so
 * list and sync derive the same installed directory without extra state. */
export function sanitizeRuntimeName(name: string): string {
  const cleaned = name.toLowerCase().replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
  if (!RUNTIME_NAME.test(cleaned)) throw new Error(`Runtime skill name cannot be sanitized for DSH: ${name}`);
  return cleaned;
}

function runtimeSkillEntries(config: Record<string, unknown>): PaperclipSkillEntry[] {
  const raw = config.paperclipRuntimeSkills;
  return Array.isArray(raw) ? raw.filter((e): e is PaperclipSkillEntry =>
    e !== null && typeof e === "object" && typeof (e as PaperclipSkillEntry).key === "string"
    && typeof (e as PaperclipSkillEntry).runtimeName === "string"
    && typeof (e as PaperclipSkillEntry).source === "string") : [];
}

function skillsRoot(config: Record<string, unknown>): string {
  const cwd = typeof config.cwd === "string" && config.cwd ? config.cwd : null;
  if (!cwd) throw new Error("cwd is required for DSH skill sync");
  return path.join(path.resolve(cwd), ".dsh", "skills");
}

function targetFor(root: string, runtimeName: string): string {
  const dir = sanitizeRuntimeName(runtimeName);
  const target = path.join(root, dir);
  if (target !== root && !target.startsWith(root + path.sep)) throw new Error("Skill target escapes workspace");
  return target;
}

async function hashTree(dir: string): Promise<string | null> {
  if (!existsSync(dir)) return null;
  const hash = createHash("sha256");
  const files: string[] = [];
  const walk = async (current: string): Promise<void> => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.name === MANAGED_MARKER) continue;
      if (entry.isSymbolicLink()) throw new Error(`Refusing symlinked skill content: ${full}`);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) files.push(full);
    }
  };
  await walk(dir);
  files.sort();
  for (const file of files) {
    hash.update(path.relative(dir, file));
    hash.update(await readFile(file));
  }
  return hash.digest("hex");
}

async function readManagedMarker(target: string): Promise<{ key: string } | null> {
  try {
    const parsed = JSON.parse(await readFile(path.join(target, MANAGED_MARKER), "utf8"));
    return typeof parsed?.key === "string" ? { key: parsed.key } : null;
  } catch {
    return null;
  }
}

function entryFor(key: string, runtimeName: string, desired: boolean, managed: boolean,
  state: AdapterSkillEntry["state"], extra: Partial<AdapterSkillEntry> = {}): AdapterSkillEntry {
  return { key, runtimeName: sanitizeRuntimeName(runtimeName), desired, managed, state, origin: managed ? "company_managed" : "user_installed", ...extra };
}

export async function listSkills(ctx: AdapterSkillContext): Promise<AdapterSkillSnapshot> {
  const root = skillsRoot(ctx.config);
  const entries: AdapterSkillEntry[] = [];
  const warnings: string[] = [];
  const managedNames = new Set<string>();
  for (const skill of runtimeSkillEntries(ctx.config)) {
    const target = targetFor(root, skill.runtimeName);
    managedNames.add(skill.runtimeName);
    if (skill.sourceStatus === "missing") {
      entries.push(entryFor(skill.key, skill.runtimeName, true, true, "missing", { detail: skill.missingDetail ?? undefined }));
      continue;
    }
    const [sourceHash, targetHash] = await Promise.all([hashTree(skill.source), hashTree(target)]);
    entries.push(entryFor(skill.key, skill.runtimeName, true, true,
      sourceHash !== null && sourceHash === targetHash ? "installed" : targetHash === null ? "missing" : "stale",
      { sourcePath: skill.source, targetPath: target }));
  }
  if (existsSync(root)) {
    for (const dir of await readdir(root, { withFileTypes: true })) {
      if (!dir.isDirectory() || managedNames.has(dir.name)) continue;
      if (!existsSync(path.join(root, dir.name, "SKILL.md"))) continue;
      const marker = await readManagedMarker(path.join(root, dir.name));
      let runtimeName = dir.name;
      try {
        runtimeName = sanitizeRuntimeName(dir.name);
      } catch {
        warnings.push(`Skill directory "${dir.name}" is not DSH kebab-case; DSH will not discover it.`);
      }
      entries.push(entryFor(marker?.key ?? `local:${dir.name}`, runtimeName, false, marker !== null,
        marker ? "stale" : "external", { targetPath: path.join(root, dir.name) }));
    }
  }
  return { adapterType: "dsh", supported: true, mode: "persistent",
    desiredSkills: runtimeSkillEntries(ctx.config).map(s => s.key),
    desiredSkillEntries: runtimeSkillEntries(ctx.config).map(s => ({ key: s.key, versionId: s.versionId ?? null })),
    entries, warnings };
}

export async function syncSkills(ctx: AdapterSkillContext, desiredSkills: string[]): Promise<AdapterSkillSnapshot> {
  const root = skillsRoot(ctx.config);
  await mkdir(root, { recursive: true });
  const desired = new Set(desiredSkills);
  const warnings: string[] = [];
  const managed = runtimeSkillEntries(ctx.config);
  for (const skill of managed) {
    const target = targetFor(root, skill.runtimeName);
    if (!desired.has(skill.key)) {
      if (await readManagedMarker(target)) await rm(target, { recursive: true, force: true });
      continue;
    }
    if (skill.sourceStatus === "missing") continue;
    if (existsSync(target) && !(await readManagedMarker(target))) {
      warnings.push(`Refusing to replace unmanaged directory for "${skill.key}" at ${target}; remove it or adopt it manually.`);
      continue;
    }
    const staging = await mkdtemp(path.join(path.dirname(root), ".dsh-staging-"));
    try {
      await cp(skill.source, staging, { recursive: true, verbatimSymlinks: false });
      await writeFile(path.join(staging, MANAGED_MARKER), JSON.stringify({ key: skill.key, syncedAt: new Date().toISOString() }) + "\n");
      await mkdir(path.dirname(target), { recursive: true });
      try {
        await rename(staging, target);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
        await cp(staging, target, { recursive: true });
        await rm(staging, { recursive: true, force: true });
      }
      if ((await stat(target)).isDirectory() !== true) throw new Error("Skill install target is not a directory");
    } finally {
      await rm(staging, { recursive: true, force: true }).catch(() => {});
    }
  }
  const snapshot = await listSkills(ctx);
  return { ...snapshot, warnings: [...warnings, ...snapshot.warnings] };
}
