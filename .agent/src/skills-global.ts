import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { GLOBAL_CATALOG_SKILLS_DIR, GLOBAL_SKILLS_DIR, GLOBAL_ZCODE_CONFIG } from './config';
import { listLocalSkills } from './skills';
import { getCatalogSkills, getSkillDescription, syncSkillToCatalog } from './catalog';
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

  const globalDirs: { dir: string; source: 'zcode_user' | 'claude_user' | 'agents_global' }[] = [
    { dir: path.join(home, '.zcode', 'skills'), source: 'zcode_user' },
    { dir: path.join(home, '.claude', 'skills'), source: 'claude_user' },
    { dir: path.join(home, '.cursor', 'skills'), source: 'agents_global' },
    { dir: path.join(home, '.codex', 'skills'), source: 'agents_global' },
    { dir: GLOBAL_SKILLS_DIR, source: 'agents_global' }
  ];

  for (const { dir, source } of globalDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() || e.isSymbolicLink()) {
          const md = path.join(dir, e.name, 'SKILL.md');
          if (fs.existsSync(md)) {
            let canonical = md;
            try { canonical = fs.realpathSync(md); } catch {}
            const isDisabled = disabledMap[canonical]?.enable === false || disabledMap[md]?.enable === false;
            if (!isDisabled && !activeMap.has(e.name)) {
              activeMap.set(e.name, { name: e.name, source, path: md });
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
    const cSource = path.join(claudeSkillsDir, skillName);
    const zSource = path.join(zcodeSkillsDir, skillName);
    if (fs.existsSync(path.join(cSource, 'SKILL.md'))) {
      await syncSkillToCatalog(cSource, skillName);
      source = path.join(GLOBAL_CATALOG_SKILLS_DIR, skillName);
    } else if (fs.existsSync(path.join(zSource, 'SKILL.md'))) {
      await syncSkillToCatalog(zSource, skillName);
      source = path.join(GLOBAL_CATALOG_SKILLS_DIR, skillName);
    }
  }

  if (!fs.existsSync(path.join(source, 'SKILL.md'))) {
    return { success: false, message: `Skill "${skillName}" not found in catalog.` };
  }

  await fsp.mkdir(zcodeSkillsDir, { recursive: true });
  await fsp.mkdir(claudeSkillsDir, { recursive: true });
  await fsp.mkdir(GLOBAL_SKILLS_DIR, { recursive: true });

  const targets = [
    path.join(zcodeSkillsDir, skillName),
    path.join(claudeSkillsDir, skillName),
    path.join(GLOBAL_SKILLS_DIR, skillName)
  ];

  try {
    for (const target of targets) {
      const stat = await fsp.lstat(target).catch(() => null);
      if (stat) {
        if (stat.isSymbolicLink()) {
          const currentLink = await fsp.readlink(target).catch(() => '');
          if (currentLink === source) continue;
          await fsp.unlink(target);
        } else if (stat.isDirectory()) {
          await syncSkillToCatalog(target, skillName);
          await fsp.rm(target, { recursive: true, force: true });
        }
      }
      await fsp.symlink(source, target);
    }
    return { success: true, message: `Skill "${skillName}" enabled globally across ZCode, Claude, and DSH.` };
  } catch (err: any) {
    return { success: false, message: `Failed to enable global skill: ${err.message}` };
  }
}

export async function disableGlobalSkill(skillName: string): Promise<OperationResult> {
  const home = os.homedir();
  const targets = [
    path.join(home, '.zcode', 'skills', skillName),
    path.join(home, '.claude', 'skills', skillName),
    path.join(home, '.cursor', 'skills', skillName),
    path.join(home, '.codex', 'skills', skillName),
    path.join(GLOBAL_SKILLS_DIR, skillName)
  ];

  let disabledAny = false;

  for (const target of targets) {
    try {
      const stat = await fsp.lstat(target).catch(() => null);
      if (!stat) continue;

      if (stat.isSymbolicLink()) {
        await fsp.unlink(target);
        disabledAny = true;
      } else if (stat.isDirectory()) {
        await syncSkillToCatalog(target, skillName);
        await fsp.rm(target, { recursive: true, force: true });
        disabledAny = true;
      }
    } catch {}
  }

  return {
    success: disabledAny,
    message: disabledAny
      ? `Skill "${skillName}" disabled globally across all harnesses.`
      : `Skill "${skillName}" was not active as a global skill.`
  };
}
