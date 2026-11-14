import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { GLOBAL_CATALOG_SKILLS_DIR, GLOBAL_SKILLS_DIR } from '../config';

/**
 * Mirrors the Agent Skills / pi `SKILL.md` acceptance rules so the manager can report skills
 * a harness will silently refuse to load.
 *
 * Hard blockers (harness drops the skill, usually with only a startup warning):
 * missing `SKILL.md`, invalid YAML frontmatter, missing or empty `description`.
 *
 * Soft deviations (spec violations some harnesses enforce harder than pi does):
 * malformed `name`, oversized `description`.
 */

const SKILL_FILE_NAME = 'SKILL.md';
const FRONTMATTER_FENCE = '---';
/** Agent Skills spec: name length cap. */
const MAX_NAME_LENGTH = 64;
/** Agent Skills spec: description length cap. */
const MAX_DESCRIPTION_LENGTH = 1024;
const VALID_NAME_PATTERN = /^[a-z0-9-]+$/;

export interface SkillLoadability {
  /** False when no harness can load this skill at all. */
  loadable: boolean;
  /** Why the skill cannot load (only when `loadable` is false). */
  reason?: string;
  /** Spec deviations that pi tolerates but other harnesses may not. */
  warnings: string[];
}

/**
 * Extracts the YAML frontmatter block the same way pi does: between the opening `---` line and
 * the next line starting with `---`. Returns null when the file has no frontmatter block.
 */
function extractFrontmatter(content: string): string | null {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, '');
  if (!normalized.startsWith(FRONTMATTER_FENCE)) return null;
  const endIndex = normalized.indexOf(`\n${FRONTMATTER_FENCE}`, FRONTMATTER_FENCE.length);
  if (endIndex === -1) return null;
  return normalized.slice(FRONTMATTER_FENCE.length + 1, endIndex);
}

/**
 * Returns a human-readable problem with a skill name, or null when the name is spec-valid.
 */
function describeNameProblem(name: string): string | null {
  if (name.length > MAX_NAME_LENGTH) return `name exceeds ${MAX_NAME_LENGTH} characters`;
  if (!VALID_NAME_PATTERN.test(name)) return 'name must use lowercase a-z, 0-9 and hyphens only';
  if (name.startsWith('-') || name.endsWith('-')) return 'name must not start or end with a hyphen';
  if (name.includes('--')) return 'name must not contain consecutive hyphens';
  return null;
}

/**
 * Inspects whether a harness will load the skill living in `skillDir`.
 *
 * @param skillDir Directory that should contain `SKILL.md` (a symlink is followed).
 */
export function inspectSkillLoadability(skillDir: string): SkillLoadability {
  const warnings: string[] = [];
  const skillFile = path.join(skillDir, SKILL_FILE_NAME);

  let content: string;
  try {
    content = fs.readFileSync(skillFile, 'utf-8');
  } catch {
    return { loadable: false, reason: `${SKILL_FILE_NAME} is missing or unreadable`, warnings };
  }

  const yamlString = extractFrontmatter(content);
  let frontmatter: Record<string, unknown> = {};
  if (yamlString !== null) {
    try {
      frontmatter = (parseYaml(yamlString) ?? {}) as Record<string, unknown>;
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message.split('\n')[0] : 'unknown parse error';
      return { loadable: false, reason: `frontmatter is not valid YAML (${detail})`, warnings };
    }
  }

  const description = frontmatter.description;
  if (typeof description !== 'string' || description.trim() === '') {
    return { loadable: false, reason: 'frontmatter has no description, so no harness can advertise it', warnings };
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    warnings.push(`description exceeds ${MAX_DESCRIPTION_LENGTH} characters (${description.length})`);
  }

  const declaredName = typeof frontmatter.name === 'string' ? frontmatter.name : path.basename(path.resolve(skillDir));
  const nameProblem = describeNameProblem(declaredName);
  if (nameProblem) warnings.push(nameProblem);

  return { loadable: true, warnings };
}

/**
 * Finds the directory a skill is actually installed in, following the manager's resolution order:
 * project scope, project dormant folder, catalog, then global user scope.
 *
 * @returns Absolute skill directory, or null when the skill is not installed anywhere.
 */
export function resolveSkillDir(skillName: string, workspaceRoot?: string): string | null {
  const candidates: string[] = [];
  if (workspaceRoot) {
    candidates.push(path.join(workspaceRoot, '.agents', 'skills', skillName));
    candidates.push(path.join(workspaceRoot, '.agents', 'dormant', skillName));
  }
  candidates.push(path.join(GLOBAL_CATALOG_SKILLS_DIR, skillName));
  candidates.push(path.join(GLOBAL_SKILLS_DIR, skillName));

  const home = os.homedir();
  candidates.push(path.join(home, '.zcode', 'skills', skillName));
  candidates.push(path.join(home, '.claude', 'skills', skillName));

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, SKILL_FILE_NAME))) return candidate;
  }
  return null;
}
