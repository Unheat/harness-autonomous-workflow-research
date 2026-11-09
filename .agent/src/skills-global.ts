import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { GLOBAL_CATALOG_SKILLS_DIR, GLOBAL_SKILLS_DIR, GLOBAL_ZCODE_CONFIG } from './config';
import { listLocalSkills } from './skills';
import { getCatalogSkills, getSkillDescription, syncSkillToCatalog } from './catalog';
import { globalSkillRoots, isValidSkillName } from './skill-paths';
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

  const globalDirs = globalSkillRoots().map((dir, index) => ({
    dir, source: (index === 0 ? 'zcode_user' : index === 1 ? 'claude_user' : 'agents_global') as GlobalActiveSkill['source']
  }));

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
            const isDisabled = source === 'zcode_user' && (disabledMap[canonical]?.enable === false || disabledMap[md]?.enable === false);
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
  if (!isValidSkillName(skillName)) return { success: false, message: 'Invalid skill name.' };
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

  const sourceAlias = path.join(source, 'SKILL.md');
  source = await fsp.realpath(source);
  let zcodeRaw: string | undefined;
  let zcodeConfig: any;
  try {
    if (fs.existsSync(GLOBAL_ZCODE_CONFIG)) {
      zcodeRaw = await fsp.readFile(GLOBAL_ZCODE_CONFIG, 'utf8');
      zcodeConfig = JSON.parse(zcodeRaw);
      if (!zcodeConfig || typeof zcodeConfig !== 'object' || Array.isArray(zcodeConfig)) throw new Error('Expected configuration object');
      if (zcodeConfig.skills && (typeof zcodeConfig.skills !== 'object' || Array.isArray(zcodeConfig.skills))) throw new Error('Expected skills object');
    }
  } catch (error: any) { return { success: false, message: `Invalid ZCode config: ${error.message}` }; }
  const roots = globalSkillRoots();
  const targets = [...new Set(roots.map(root => path.join(root, skillName)))];
  // Physical user folders are not disposable adapters. Require explicit migration.
  for (const target of targets) {
    const stat = await fsp.lstat(target).catch(() => null);
    if (stat && !stat.isSymbolicLink()) return { success: false, message: `Preserved physical skill: ${target}; explicit migration required.` };
  }
  for (const root of roots) await fsp.mkdir(root, { recursive: true });

  try {
    for (const target of targets) {
      const stat = await fsp.lstat(target).catch(() => null);
      if (stat) {
        if (stat.isSymbolicLink()) {
          const currentLink = await fsp.readlink(target).catch(() => '');
          if (currentLink === source) continue;
          await fsp.unlink(target);
        }

      }
      await fsp.symlink(source, target);
    }
    if (zcodeRaw !== undefined) {
      const raw = zcodeRaw;
      const config = zcodeConfig;
      if (config.skills) {
        const paths = new Set(targets.map(target => path.join(target, 'SKILL.md')));
        paths.add(sourceAlias);
        paths.add(path.join(source, 'SKILL.md'));
        paths.add(await fsp.realpath(path.join(source, 'SKILL.md')));
        for (const key of Object.keys(config.skills)) {
          if (paths.has(key) && config.skills[key] && typeof config.skills[key] === 'object') delete config.skills[key].enable;
        }
        const updated = JSON.stringify(config, null, 2) + '\n';
        if (updated !== raw) await fsp.writeFile(GLOBAL_ZCODE_CONFIG, updated);
      }
    }
    return { success: true, message: `Skill "${skillName}" enabled globally across supported harnesses.` };
  } catch (err: any) {
    return { success: false, message: `Failed to enable global skill: ${err.message}` };
  }
}

export async function disableGlobalSkill(skillName: string): Promise<OperationResult> {
  if (!isValidSkillName(skillName)) return { success: false, message: 'Invalid skill name.' };
  const targets = globalSkillRoots().map(root => path.join(root, skillName));
  for (const target of targets) {
    const stat = await fsp.lstat(target).catch(() => null);
    if (stat && !stat.isSymbolicLink()) return { success: false, message: `Preserved physical skill: ${target}; explicit migration required.` };
  }
  let disabledAny = false;
  const seen = new Set<string>();
  try {
    for (const target of targets) {
      // Root adapters can alias the same directory.
      const parent = await fsp.realpath(path.dirname(target)).catch(() => path.dirname(target));
      const key = path.join(parent, skillName);
      if (seen.has(key)) continue;
      seen.add(key);
      if (await fsp.lstat(target).catch(() => null)) {
        await fsp.unlink(target);
        disabledAny = true;
      }
    }
    return { success: disabledAny, message: disabledAny ? `Skill "${skillName}" disabled globally.` : 'Skill was not globally active.' };
  } catch (error: any) {
    return { success: false, message: `Failed to disable global skill: ${error.message}` };
  }
}
