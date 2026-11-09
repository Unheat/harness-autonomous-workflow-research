import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { GLOBAL_CATALOG_SKILLS_DIR, GLOBAL_SKILLS_DIR } from './config';
import { ensureSkillInvocable } from './catalog';
import { getWorkspacePaths, ensureWorkspaceDirs } from './workspace';
import type { LocalSkillInfo, OperationResult, SkillRemoveResult, SkillCreateResult } from './types';

import { isValidSkillName, globalSkillRoots } from './skill-paths';

export function isSkillActiveGlobally(skillName: string): boolean {
  return isValidSkillName(skillName) && globalSkillRoots().some(root => fs.existsSync(path.join(root, skillName, 'SKILL.md')));
}

/**
 * Lists all active and dormant skills in a workspace.
 */
export async function listLocalSkills(workspaceRoot: string): Promise<LocalSkillInfo[]> {
  const { skillsDir, dormantSkillsDir } = getWorkspacePaths(workspaceRoot);
  const skills: LocalSkillInfo[] = [];

  if (fs.existsSync(skillsDir)) {
    try {
      const entries = await fsp.readdir(skillsDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(skillsDir, entry.name);
        const isLink = entry.isSymbolicLink();
        let target: string | undefined;
        if (isLink) {
          try { target = await fsp.readlink(fullPath); } catch {}
        }
        if (isLink || fs.existsSync(path.join(fullPath, 'SKILL.md'))) {
          skills.push({ name: entry.name, isLink, target, isDormant: false });
        }
      }
    } catch {}
  }

  if (fs.existsSync(dormantSkillsDir)) {
    try {
      const dormantEntries = await fsp.readdir(dormantSkillsDir, { withFileTypes: true });
      for (const entry of dormantEntries) {
        const fullPath = path.join(dormantSkillsDir, entry.name);
        if (fs.existsSync(path.join(fullPath, 'SKILL.md'))) {
          skills.push({ name: entry.name, isLink: false, isDormant: true });
        }
      }
    } catch {}
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Activates a skill in the workspace.
 * Restores from dormant if present, or symlinks from global catalog.
 */
export async function addSkill(workspaceRoot: string, rawSkillName: string): Promise<OperationResult> {
  const skillName = (rawSkillName || '').trim();
  if (!isValidSkillName(skillName)) {
    return { success: false, message: `Invalid skill name: "${rawSkillName}"` };
  }

  await ensureWorkspaceDirs(workspaceRoot);
  const { skillsDir, dormantSkillsDir } = getWorkspacePaths(workspaceRoot);
  const localTarget = path.join(skillsDir, skillName);
  const dormantTarget = path.join(dormantSkillsDir, skillName);
  let catalogSource = path.join(GLOBAL_CATALOG_SKILLS_DIR, skillName);
  if (!fs.existsSync(catalogSource)) {
    catalogSource = path.join(GLOBAL_SKILLS_DIR, skillName);
  }

  const localStat = await fsp.lstat(localTarget).catch(() => null);
  if (localStat) {
    return { success: false, message: `Skill "${skillName}" is already active in this workspace.` };
  }

  if (fs.existsSync(dormantTarget)) {
    try {
      await fsp.rename(dormantTarget, localTarget);
      await ensureSkillInvocable(localTarget);
      return { success: true, message: `Enabled local skill "${skillName}" (restored from dormant).` };
    } catch (err: any) {
      return { success: false, message: `Failed to restore dormant skill: ${err.message}` };
    }
  }

  if (isSkillActiveGlobally(skillName)) {
    return {
      success: true,
      message: `Skill "${skillName}" is already active machine-wide via Global scope. No local symlink created (avoids duplicate prompt injection).`
    };
  }

  if (fs.existsSync(catalogSource)) {
    try {
      await fsp.symlink(catalogSource, localTarget);
      await ensureSkillInvocable(catalogSource);
      return { success: true, message: `Enabled skill "${skillName}" (symlinked from catalog).` };
    } catch (err: any) {
      return { success: false, message: `Failed to create symlink: ${err.message}` };
    }
  }

  return { success: false, message: `Skill "${skillName}" not found in dormant skills or catalog.` };
}

/**
 * Deactivates a skill. If symlink, safely unlinks.
 * If local physical directory, moves to .agents/dormant/ so code is never lost.
 */
export async function removeSkill(
  workspaceRoot: string,
  rawSkillName: string,
  permanentDelete = false
): Promise<SkillRemoveResult> {
  const skillName = (rawSkillName || '').trim();
  if (!isValidSkillName(skillName)) {
    return { success: false, message: `Invalid skill name: "${rawSkillName}"` };
  }

  const { skillsDir, dormantSkillsDir } = getWorkspacePaths(workspaceRoot);
  const localTarget = path.join(skillsDir, skillName);
  const dormantTarget = path.join(dormantSkillsDir, skillName);

  const localStat = await fsp.lstat(localTarget).catch(() => null);
  if (!localStat) {
    return { success: false, message: `Skill "${skillName}" is not active in this workspace.` };
  }

  if (localStat.isSymbolicLink()) {
    try {
      await fsp.unlink(localTarget);
      return { success: true, message: `Disabled skill "${skillName}" (symlink removed, catalog file preserved).` };
    } catch (err: any) {
      return { success: false, message: `Failed to remove symlink: ${err.message}` };
    }
  }

  if (permanentDelete) {
    try {
      await fsp.rm(localTarget, { recursive: true, force: true });
      return { success: true, message: `Permanently deleted local skill folder "${skillName}".` };
    } catch (err: any) {
      return { success: false, message: `Failed to delete folder: ${err.message}` };
    }
  }

  try {
    await fsp.mkdir(dormantSkillsDir, { recursive: true });
    await fsp.rename(localTarget, dormantTarget);
    return { success: true, message: `Disabled local skill "${skillName}" (moved to dormant, 0 tokens injected).` };
  } catch (err: any) {
    return { success: false, message: `Failed to move skill to dormant: ${err.message}` };
  }
}

/**
 * Creates a project-private local skill (never exported to global catalog).
 */
export async function createLocalSkill(
  workspaceRoot: string,
  rawSkillName: string,
  description = ''
): Promise<SkillCreateResult> {
  const skillName = (rawSkillName || '').trim();
  if (!isValidSkillName(skillName)) {
    return { success: false, message: `Invalid skill name: "${rawSkillName}"` };
  }

  await ensureWorkspaceDirs(workspaceRoot);
  const { skillsDir, dormantSkillsDir } = getWorkspacePaths(workspaceRoot);
  const skillFolder = path.join(skillsDir, skillName);
  const dormantFolder = path.join(dormantSkillsDir, skillName);

  if (fs.existsSync(skillFolder) || fs.existsSync(dormantFolder)) {
    return { success: false, message: `Skill "${skillName}" already exists in .agents/skills/ or .agents/dormant/` };
  }

  const desc = description.trim() || `Project-specific capability for ${skillName}.`;
  const content = `---\nname: ${skillName}\ndescription: "${desc}"\n---\n\n# ${skillName}\n\n${desc}\n\n## Instructions\n\n1. Describe step-by-step guidance here.\n`;

  try {
    await fsp.mkdir(skillFolder, { recursive: true });
    await fsp.writeFile(path.join(skillFolder, 'SKILL.md'), content, 'utf-8');
    return {
      success: true,
      message: `Created project-private skill "${skillName}" in .agents/skills/${skillName}/`,
      path: path.join(skillFolder, 'SKILL.md')
    };
  } catch (err: any) {
    return { success: false, message: `Failed to create local skill: ${err.message}` };
  }
}
