import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { getWorkspacePaths } from '../workspace';
import { isValidSkillName } from '../skill-paths';
import { GLOBAL_CATALOG_SKILLS_DIR, GLOBAL_SKILLS_DIR } from '../config';
import { addSkill, removeSkill, isSkillActiveGlobally } from '../skills';
import { enableGlobalSkill, disableGlobalSkill, getEffectiveSkillsList } from '../skills-global';
import type { OperationResult, EffectiveSkillInfo } from '../types';

export interface DeleteSkillOptions {
  fromWorkspace?: boolean;
  fromCatalog?: boolean;
}

/**
 * Permanently deletes a skill from workspace (active + dormant) and optionally central catalog.
 */
export async function deleteSkillPermanent(
  workspaceRoot: string,
  rawSkillName: string,
  options: DeleteSkillOptions = { fromWorkspace: true }
): Promise<OperationResult> {
  const skillName = (rawSkillName || '').trim();
  if (!isValidSkillName(skillName)) {
    return { success: false, message: `Invalid skill name: "${rawSkillName}"` };
  }

  if (options.fromCatalog) {
    const disabled = await disableGlobalSkill(skillName);
    if (!disabled.success && disabled.message !== 'Skill was not globally active.') return disabled;
  }
  const actions: string[] = [];
  const { skillsDir, dormantSkillsDir } = getWorkspacePaths(workspaceRoot);
  const localTarget = path.join(skillsDir, skillName);
  const dormantTarget = path.join(dormantSkillsDir, skillName);

  if (options.fromWorkspace !== false) {
    if (await fsp.lstat(localTarget).catch(() => null)) {
      try {
        const stat = await fsp.lstat(localTarget);
        if (stat.isSymbolicLink()) {
          await fsp.unlink(localTarget);
          actions.push(`Unlinked from workspace skills`);
        } else {
          await fsp.rm(localTarget, { recursive: true, force: true });
          actions.push(`Deleted physical folder from workspace skills`);
        }
      } catch {}
    }

    if (fs.existsSync(dormantTarget)) {
      try {
        await fsp.rm(dormantTarget, { recursive: true, force: true });
        actions.push(`Removed from dormant stash`);
      } catch {}
    }
  }

  if (options.fromCatalog) {
    const catalogTarget = path.join(GLOBAL_CATALOG_SKILLS_DIR, skillName);
    const globalSkillsTarget = path.join(GLOBAL_SKILLS_DIR, skillName);

    if (fs.existsSync(catalogTarget)) {
      try {
        await fsp.rm(catalogTarget, { recursive: true, force: true });
        actions.push(`Permanently purged from ~/.agents/catalog/skills/`);
      } catch {}
    }
    if (fs.existsSync(globalSkillsTarget)) {
      try {
        await fsp.rm(globalSkillsTarget, { recursive: true, force: true });
        actions.push(`Purged from ~/.agents/skills/`);
      } catch {}
    }
  }

  if (actions.length === 0) {
    return { success: false, message: `Skill "${skillName}" was not found in workspace or catalog.` };
  }

  return {
    success: true,
    message: `Skill "${skillName}" deleted permanently: ${actions.join(', ')}.`
  };
}

export { addSkill, removeSkill, enableGlobalSkill, disableGlobalSkill, getEffectiveSkillsList, isSkillActiveGlobally };
