import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { getSkillDescription, isSkillInCatalog } from './catalog';
import { GLOBAL_CATALOG_SKILLS_DIR, GLOBAL_SKILLS_DIR } from './config';
import { isValidSkillName } from './skill-paths';
import { ensureWorkspaceDirs, getWorkspacePaths } from './workspace';
import type { OperationResult } from './types';

/** One skill a foreign workspace can offer for import. */
export interface ImportableSkill {
  name: string;
  /** True when the source entry is a symlink (its content is shared, usually from the catalog). */
  isLink: boolean;
  /** Resolved content path for symlinked entries. */
  linkTarget?: string;
  /** True when the machine catalog already owns a skill with this name. */
  inCatalog: boolean;
  /** True when a symlinked entry resolves inside the machine catalog (content is catalog-owned). */
  linkedFromCatalog: boolean;
  description: string;
  /** Set when the target workspace already has this name; import is blocked. */
  conflict?: 'active' | 'dormant';
}

export interface ImportableSkillList {
  success: boolean;
  message: string;
  sourceRoot?: string;
  skills?: ImportableSkill[];
}

/** Catalog-owned content lives under ~/.agents/catalog/skills/ (or the legacy global skills dir). */
function isInsideCatalog(realPath: string): boolean {
  // Compare canonical paths: /var on macOS resolves to /private/var, and the roots may not exist yet.
  const canonical = (p: string) => {
    try { return fs.realpathSync(p); } catch { return path.resolve(p); }
  };
  const candidate = canonical(realPath);
  return [GLOBAL_CATALOG_SKILLS_DIR, GLOBAL_SKILLS_DIR]
    .map(root => canonical(root) + path.sep)
    .some(root => candidate.startsWith(root));
}

async function resolveSourceWorkspace(rawRoot: string): Promise<{ root: string } | { error: string }> {
  const input = (rawRoot || '').trim();
  if (!input) return { error: 'Choose a workspace folder to import from.' };
  const root = path.resolve(input);
  const stat = await fsp.stat(root).catch(() => null);
  if (!stat || !stat.isDirectory()) return { error: `Not a directory: ${root}` };
  const { skillsDir, dormantSkillsDir } = getWorkspacePaths(root);
  if (!fs.existsSync(skillsDir) && !fs.existsSync(dormantSkillsDir)) {
    return { error: `No .agents/skills/ folder in ${root} — that is not a harness workspace.` };
  }
  return { root };
}

/**
 * Lists the active local skills of another workspace, annotated with how each would be imported.
 * Symlinked entries stay symlinked (shared content); physical folders are copied as private skills.
 */
export async function listImportableSkills(
  targetRoot: string,
  rawSourceRoot: string
): Promise<ImportableSkillList> {
  const source = await resolveSourceWorkspace(rawSourceRoot);
  if ('error' in source) return { success: false, message: source.error };

  const target = path.resolve(targetRoot);
  if (source.root === target) {
    return { success: false, message: 'Source and target are the same workspace.' };
  }

  const { skillsDir } = getWorkspacePaths(source.root);
  const targetPaths = getWorkspacePaths(target);
  const skills: ImportableSkill[] = [];

  const entries = await fsp.readdir(skillsDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const fullPath = path.join(skillsDir, entry.name);
    if (!isValidSkillName(entry.name)) continue;
    const stat = await fsp.lstat(fullPath).catch(() => null);
    if (!stat) continue;

    const isLink = stat.isSymbolicLink();
    let linkTarget: string | undefined;
    if (isLink) {
      linkTarget = await fsp.realpath(fullPath).catch(() => undefined);
      if (!linkTarget || !fs.existsSync(path.join(linkTarget, 'SKILL.md'))) continue; // broken link
    } else if (!stat.isDirectory() || !fs.existsSync(path.join(fullPath, 'SKILL.md'))) {
      continue;
    }

    let conflict: ImportableSkill['conflict'];
    if (await fsp.lstat(path.join(targetPaths.skillsDir, entry.name)).catch(() => null)) conflict = 'active';
    else if (await fsp.lstat(path.join(targetPaths.dormantSkillsDir, entry.name)).catch(() => null)) conflict = 'dormant';

    skills.push({
      name: entry.name,
      isLink,
      linkTarget,
      inCatalog: isSkillInCatalog(entry.name),
      linkedFromCatalog: !!linkTarget && isInsideCatalog(linkTarget),
      description: await getSkillDescription(entry.name, source.root),
      conflict
    });
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));
  return {
    success: true,
    message: skills.length === 0 ? 'That workspace has no active local skills.' : `${skills.length} skill(s) available.`,
    sourceRoot: source.root,
    skills
  };
}

/**
 * Imports one skill from another workspace into the target workspace, preserving its nature:
 * a symlinked source is re-linked (shared content, nothing duplicated), a physical folder is
 * copied in as a project-private skill. The catalog is never modified here.
 */
export async function importSkillFromWorkspace(
  targetRoot: string,
  rawSourceRoot: string,
  rawSkillName: string
): Promise<OperationResult> {
  const skillName = (rawSkillName || '').trim();
  if (!isValidSkillName(skillName)) {
    return { success: false, message: `Invalid skill name: "${rawSkillName}"` };
  }

  const source = await resolveSourceWorkspace(rawSourceRoot);
  if ('error' in source) return { success: false, message: source.error };

  const target = path.resolve(targetRoot);
  if (source.root === target) {
    return { success: false, message: 'Source and target are the same workspace.' };
  }

  const sourcePath = path.join(getWorkspacePaths(source.root).skillsDir, skillName);
  const sourceStat = await fsp.lstat(sourcePath).catch(() => null);
  if (!sourceStat) {
    return { success: false, message: `Skill "${skillName}" is not active in ${source.root}.` };
  }

  await ensureWorkspaceDirs(target);
  const targetPaths = getWorkspacePaths(target);
  const targetPath = path.join(targetPaths.skillsDir, skillName);

  if (await fsp.lstat(targetPath).catch(() => null)) {
    return { success: false, message: `Skill "${skillName}" is already active in this workspace.` };
  }
  if (await fsp.lstat(path.join(targetPaths.dormantSkillsDir, skillName)).catch(() => null)) {
    return {
      success: false,
      message: `Skill "${skillName}" exists in this workspace's dormant stash; remove it or re-enable it locally instead.`
    };
  }

  if (sourceStat.isSymbolicLink()) {
    const realSource = await fsp.realpath(sourcePath).catch(() => null);
    if (!realSource || !fs.existsSync(path.join(realSource, 'SKILL.md'))) {
      return { success: false, message: `Skill "${skillName}" is a broken symlink in the source workspace.` };
    }
    try {
      await fsp.symlink(realSource, targetPath, 'dir');
    } catch (err: any) {
      return { success: false, message: `Failed to link "${skillName}": ${err.message}` };
    }
    const inCatalog = isSkillInCatalog(skillName);
    return {
      success: true,
      message: `Imported "${skillName}" as a symlink to ${realSource}${inCatalog ? ' (machine catalog copy)' : ''}.`
    };
  }

  if (!sourceStat.isDirectory() || !fs.existsSync(path.join(sourcePath, 'SKILL.md'))) {
    return { success: false, message: `Skill "${skillName}" is not a valid skill folder.` };
  }

  try {
    await fsp.cp(sourcePath, targetPath, { recursive: true, dereference: true });
  } catch (err: any) {
    return { success: false, message: `Failed to copy "${skillName}": ${err.message}` };
  }

  const catalogNote = isSkillInCatalog(skillName)
    ? ' The catalog also has a skill with this name; this workspace now uses its own copy.'
    : '';
  return {
    success: true,
    message: `Imported "${skillName}" as a private local copy (not added to the catalog).${catalogNote}`
  };
}
