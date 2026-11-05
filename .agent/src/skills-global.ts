import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { GLOBAL_CATALOG_SKILLS_DIR, GLOBAL_SKILLS_DIR, GLOBAL_ZCODE_CONFIG } from './config';
import { listLocalSkills } from './skills';
import { getCatalogSkills, getSkillDescription } from './catalog';
import type { EffectiveSkillInfo, SkillScope, OperationResult } from './types';

export interface GlobalActiveSkill {
  name: string;
  source: 'zcode_user' | 'claude_user' | 'agents_global';
  path: string;
}

/**
 * Lists skills that are active globally across harnesses.
 */
export async function listGlobalActiveSkills(): Promise<GlobalActiveSkill[]> {
  const home = os.homedir();
  const zcodeSkillsDir = path.join(home, '.zcode', 'skills');
  const claudeSkillsDir = path.join(home, '.claude', 'skills');

  let disabledMap: Record<string, { enable?: boolean }> = {};
  if (fs.existsSync(GLOBAL_ZCODE_CONFIG)) {
    try {
      const raw = await fsp.readFile(GLOBAL_ZCODE_CONFIG, 'utf-8');
      const zcfg = JSON.parse(raw);
      disabledMap = zcfg?.skills || {};
    } catch {}
  }

  const activeMap = new Map<string, GlobalActiveSkill>();

  // 1. Check ~/.zcode/skills/ (highest user priority in ZCode)
  if (fs.existsSync(zcodeSkillsDir)) {
    try {
      const entries = await fsp.readdir(zcodeSkillsDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() || e.isSymbolicLink()) {
          const md = path.join(zcodeSkillsDir, e.name, 'SKILL.md');
          if (fs.existsSync(md)) {
            activeMap.set(e.name, { name: e.name, source: 'zcode_user', path: md });
          }
        }
      }
    } catch {}
  }

  // 2. Check ~/.claude/skills/ (user scope in Claude Code)
  if (fs.existsSync(claudeSkillsDir)) {
    try {
      const entries = await fsp.readdir(claudeSkillsDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() || e.isSymbolicLink()) {
          const md = path.join(claudeSkillsDir, e.name, 'SKILL.md');
          if (fs.existsSync(md) && !activeMap.has(e.name)) {
            activeMap.set(e.name, { name: e.name, source: 'claude_user', path: md });
          }
        }
      }
    } catch {}
  }

  // 3. Check ~/.agents/skills/ that are NOT disabled in ZCode config
  if (fs.existsSync(GLOBAL_SKILLS_DIR)) {
    try {
      const entries = await fsp.readdir(GLOBAL_SKILLS_DIR, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() || e.isSymbolicLink()) {
          const md = path.join(GLOBAL_SKILLS_DIR, e.name, 'SKILL.md');
          if (fs.existsSync(md)) {
            let canonical = md;
            try { canonical = fs.realpathSync(md); } catch {}
            const isDisabled = disabledMap[canonical]?.enable === false || disabledMap[md]?.enable === false;
            if (!isDisabled && !activeMap.has(e.name)) {
              activeMap.set(e.name, { name: e.name, source: 'agents_global', path: md });
            }
          }
        }
      }
    } catch {}
  }

  return Array.from(activeMap.values());
}

/**
 * Computes effective resolution for all skills: Global, Project, and Catalog.
 */
export async function getEffectiveSkillsList(workspaceRoot: string): Promise<EffectiveSkillInfo[]> {
  const localSkills = await listLocalSkills(workspaceRoot);
  const globalActiveSkills = await listGlobalActiveSkills();
  const catalogSkills = await getCatalogSkills();

  const localMap = new Map(localSkills.map(s => [s.name, s]));
  const globalMap = new Map(globalActiveSkills.map(s => [s.name, s]));

  const allNames = Array.from(new Set([
    ...localSkills.map(s => s.name),
    ...globalActiveSkills.map(s => s.name),
    ...catalogSkills
  ])).sort();

  const result: EffectiveSkillInfo[] = [];

  for (const name of allNames) {
    const local = localMap.get(name);
    const global = globalMap.get(name);

    const isProjectActive = !!local && !local.isDormant;
    const isGlobalActive = !!global;
    const isDormant = !!local && !!local.isDormant;
    const effectiveActive = isProjectActive || isGlobalActive;

    let scope: SkillScope = 'catalog';
    if (isGlobalActive) {
      scope = 'global';
    } else if (isProjectActive || isDormant) {
      scope = 'project';
    }

    const description = await getSkillDescription(name, workspaceRoot);

    result.push({
      name,
      scope,
      effectiveActive,
      isProjectActive,
      isGlobalActive,
      isDormant,
      isLink: local ? local.isLink : false,
      description
    });
  }

  return result;
}

export async function enableGlobalSkill(skillName: string): Promise<OperationResult> {
  const home = os.homedir();
  const zcodeSkillsDir = path.join(home, '.zcode', 'skills');
  const claudeSkillsDir = path.join(home, '.claude', 'skills');

  let source = path.join(GLOBAL_CATALOG_SKILLS_DIR, skillName);
  if (!fs.existsSync(source)) {
    source = path.join(GLOBAL_SKILLS_DIR, skillName);
  }
  if (!fs.existsSync(path.join(source, 'SKILL.md'))) {
    return { success: false, message: `Skill "${skillName}" not found in catalog.` };
  }

  await fsp.mkdir(zcodeSkillsDir, { recursive: true });
  await fsp.mkdir(claudeSkillsDir, { recursive: true });

  const zTarget = path.join(zcodeSkillsDir, skillName);
  const cTarget = path.join(claudeSkillsDir, skillName);

  try {
    if (!fs.existsSync(zTarget)) await fsp.symlink(source, zTarget);
    if (!fs.existsSync(cTarget)) await fsp.symlink(source, cTarget);
    return { success: true, message: `Skill "${skillName}" enabled globally across ZCode & Claude.` };
  } catch (err: any) {
    return { success: false, message: `Failed to enable global skill: ${err.message}` };
  }
}

export async function disableGlobalSkill(skillName: string): Promise<OperationResult> {
  const home = os.homedir();
  const zcodeSkillsDir = path.join(home, '.zcode', 'skills');
  const claudeSkillsDir = path.join(home, '.claude', 'skills');

  const zTarget = path.join(zcodeSkillsDir, skillName);
  const cTarget = path.join(claudeSkillsDir, skillName);

  let unlinked = false;
  try {
    const zStat = await fsp.lstat(zTarget).catch(() => null);
    if (zStat?.isSymbolicLink()) { await fsp.unlink(zTarget); unlinked = true; }
    const cStat = await fsp.lstat(cTarget).catch(() => null);
    if (cStat?.isSymbolicLink()) { await fsp.unlink(cTarget); unlinked = true; }
  } catch {}

  return {
    success: true,
    message: unlinked
      ? `Skill "${skillName}" disabled globally (unlinked from ~/.zcode and ~/.claude).`
      : `Skill "${skillName}" was not active as a global symlink.`
  };
}
