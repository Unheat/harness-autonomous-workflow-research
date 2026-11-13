import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { GLOBAL_CATALOG_SKILLS_DIR } from './config';
import { isSkillInCatalog, syncSkillToCatalog } from './catalog';
import { isValidSkillName } from './skill-paths';
import { getWorkspacePaths } from './workspace';
import type { OperationResult } from './types';

/**
 * Promotes a project-local skill folder into the machine catalog.
 *
 * The catalog copy becomes the single source of truth: the workspace entry is replaced with a
 * symlink into the catalog, so later edits are shared with every workspace that links it.
 * A physical folder that differs from an existing catalog skill is never overwritten — the
 * caller gets a refusal instead of silent data loss.
 */
export async function promoteSkillToCatalog(
  workspaceRoot: string,
  rawSkillName: string
): Promise<OperationResult> {
  const skillName = (rawSkillName || '').trim();
  if (!isValidSkillName(skillName)) {
    return { success: false, message: `Invalid skill name: "${rawSkillName}"` };
  }

  const { skillsDir } = getWorkspacePaths(workspaceRoot);
  const localTarget = path.join(skillsDir, skillName);
  const catalogTarget = path.join(GLOBAL_CATALOG_SKILLS_DIR, skillName);

  const localStat = await fsp.lstat(localTarget).catch(() => null);
  if (!localStat) {
    return { success: false, message: `Skill "${skillName}" is not an active local skill in this workspace.` };
  }
  if (localStat.isSymbolicLink()) {
    const resolved = await fsp.realpath(localTarget).catch(() => localTarget);
    return {
      success: false,
      message: `Skill "${skillName}" is already linked to ${resolved}; nothing to promote.`
    };
  }
  if (!localStat.isDirectory()) {
    return { success: false, message: `Skill "${skillName}" is not a directory.` };
  }
  if (!fs.existsSync(path.join(localTarget, 'SKILL.md'))) {
    return { success: false, message: `Skill "${skillName}" has no SKILL.md.` };
  }
  if (isSkillInCatalog(skillName)) {
    return {
      success: false,
      message: `Catalog already contains "${skillName}"; the local folder was kept. Delete the catalog copy first if you want this version to replace it.`
    };
  }

  if (!await syncSkillToCatalog(localTarget, skillName)) {
    return { success: false, message: `Failed to copy "${skillName}" into the catalog.` };
  }

  // Swap the physical folder for a symlink. The folder is staged first so a failed link
  // restores the original instead of leaving the workspace without the skill.
  const staging = path.join(skillsDir, `.promote-${skillName}-${process.pid}`);
  try {
    await fsp.rename(localTarget, staging);
    try {
      await fsp.symlink(catalogTarget, localTarget, 'dir');
    } catch (linkErr: any) {
      await fsp.rename(staging, localTarget);
      return { success: false, message: `Added to catalog but failed to relink workspace copy: ${linkErr.message}` };
    }
    await fsp.rm(staging, { recursive: true, force: true });
  } catch (err: any) {
    return { success: false, message: `Failed to relink "${skillName}" to the catalog: ${err.message}` };
  }

  return {
    success: true,
    message: `Added "${skillName}" to the machine catalog and relinked this workspace to it.`
  };
}
