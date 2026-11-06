import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { GLOBAL_CATALOG_SKILLS_DIR, GLOBAL_SKILLS_DIR, GLOBAL_ZCODE_CONFIG } from './config';
import { syncSkillToCatalog } from './catalog';
import type { CleanGlobalResult } from './types';

export interface CleanGlobalOptions {
  skills?: boolean;
  mcp?: boolean;
  all?: boolean;
  keepSkills?: string[];
}

export const DEFAULT_GLOBAL_SKILLS_WHITELIST = ['harness-protocol', 'agent-reach'];

/**
 * Re-targets workspace symlinks that were pointing to old ~/.agents/skills/ to ~/.agents/catalog/skills/.
 */
export async function retargetWorkspaceSkillSymlinks(workspaceRoot: string): Promise<string[]> {
  const actions: string[] = [];
  const skillsDir = path.join(workspaceRoot, '.agents', 'skills');
  if (!fs.existsSync(skillsDir)) return actions;

  try {
    const entries = await fsp.readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        const linkPath = path.join(skillsDir, entry.name);
        try {
          const currentTarget = await fsp.readlink(linkPath);
          if (currentTarget.includes('.agents/skills/') && !currentTarget.includes('.agents/catalog/skills/')) {
            const skillName = path.basename(currentTarget);
            const catalogTarget = path.join(GLOBAL_CATALOG_SKILLS_DIR, skillName);
            if (fs.existsSync(catalogTarget)) {
              await fsp.unlink(linkPath);
              await fsp.symlink(catalogTarget, linkPath);
              actions.push(`Re-targeted skill link "${entry.name}" to central catalog`);
            }
          }
        } catch {}
      }
    }
  } catch {}
  return actions;
}

/**
 * Sweeps skills from global user scope, archiving them to central catalog first.
 */
export async function cleanGlobalSkills(keepSkills: string[] = DEFAULT_GLOBAL_SKILLS_WHITELIST): Promise<string[]> {
  const actions: string[] = [];
  const home = os.homedir();

  // 1. Clean ~/.agents/skills/
  if (fs.existsSync(GLOBAL_SKILLS_DIR)) {
    try {
      const entries = await fsp.readdir(GLOBAL_SKILLS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (keepSkills.includes(entry.name)) continue;

        const fullPath = path.join(GLOBAL_SKILLS_DIR, entry.name);
        const catalogPath = path.join(GLOBAL_CATALOG_SKILLS_DIR, entry.name);

        // Ensure archived in catalog
        if (!fs.existsSync(path.join(catalogPath, 'SKILL.md'))) {
          if (!await syncSkillToCatalog(fullPath, entry.name)) {
            actions.push(`Preserved global skill ${entry.name}: catalog archive failed`);
            continue;
          }
        }

        try {
          if (entry.isSymbolicLink()) {
            await fsp.unlink(fullPath);
          } else {
            await fsp.rm(fullPath, { recursive: true, force: true });
          }
          actions.push(`Archived to catalog & removed global skill: ${entry.name}`);
        } catch (err: any) {
          actions.push(`Failed to remove global skill ${entry.name}: ${err.message}`);
        }
      }
    } catch {}
  }

  // 2. Clean ~/.claude/skills and ~/.zcode/skills
  const auxiliaryDirs = [
    path.join(home, '.claude', 'skills'),
    path.join(home, '.zcode', 'skills')
  ];

  for (const dir of auxiliaryDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (keepSkills.includes(entry.name)) continue;
        const p = path.join(dir, entry.name);
        if (!await syncSkillToCatalog(p, entry.name)) {
          actions.push(`Preserved global skill ${entry.name}: catalog archive failed`);
          continue;
        }
        try {
          if (entry.isSymbolicLink()) {
            await fsp.unlink(p);
          } else {
            await fsp.rm(p, { recursive: true, force: true });
          }
        } catch {}
      }
    } catch {}
  }

  // 3. Prune dead skill paths from ~/.zcode/cli/config.json
  if (fs.existsSync(GLOBAL_ZCODE_CONFIG)) {
    try {
      const raw = await fsp.readFile(GLOBAL_ZCODE_CONFIG, 'utf-8');
      const zcfg = JSON.parse(raw);
      if (zcfg.skills) {
        const cleanedSkills: Record<string, any> = {};
        let pruned = 0;
        for (const [k, v] of Object.entries(zcfg.skills)) {
          if (fs.existsSync(k)) {
            cleanedSkills[k] = v;
          } else {
            pruned++;
          }
        }
        if (pruned > 0) {
          zcfg.skills = cleanedSkills;
          await fsp.writeFile(GLOBAL_ZCODE_CONFIG, JSON.stringify(zcfg, null, 2) + '\n', 'utf-8');
          actions.push(`Pruned ${pruned} stale skill restriction(s) from ZCode config`);
        }
      }
    } catch {}
  }

  return actions;
}

/**
 * Sanitizes global MCP servers in ~/.zcode/cli/config.json.
 */
export async function cleanGlobalMcps(): Promise<string[]> {
  const actions: string[] = [];
  if (fs.existsSync(GLOBAL_ZCODE_CONFIG)) {
    try {
      const raw = await fsp.readFile(GLOBAL_ZCODE_CONFIG, 'utf-8');
      const zcfg = JSON.parse(raw);
      zcfg.mcp = zcfg.mcp || { servers: {} };
      zcfg.mcp.servers = zcfg.mcp.servers || {};

      for (const heavy of ['rea', 'local-pdf-rag']) {
        if (zcfg.mcp.servers[heavy] && zcfg.mcp.servers[heavy].enabled !== false) {
          zcfg.mcp.servers[heavy].enabled = false;
          actions.push(`Set global server "${heavy}" to inactive (enabled: false) to prevent token bloat`);
        }
      }

      await fsp.writeFile(GLOBAL_ZCODE_CONFIG, JSON.stringify(zcfg, null, 2) + '\n', 'utf-8');
    } catch (err: any) {
      actions.push(`Failed to update ZCode global config: ${err.message}`);
    }
  }
  return actions;
}

/**
 * Unified clean-global supporting flags:
 * - default: cleans both MCP and skills
 * - --skills: cleans only skills
 * - --mcp: cleans only MCPs
 * - --all: cleans all skills without whitelist
 */
export async function cleanGlobal(options?: CleanGlobalOptions): Promise<CleanGlobalResult> {
  const doSkills = options?.skills ?? (options?.mcp ? false : true);
  const doMcp = options?.mcp ?? (options?.skills ? false : true);
  const keepSkills = options?.all ? [] : (options?.keepSkills ?? DEFAULT_GLOBAL_SKILLS_WHITELIST);

  const actions: string[] = [];
  if (doSkills) {
    const skillActions = await cleanGlobalSkills(keepSkills);
    actions.push(...skillActions);
  }
  if (doMcp) {
    const mcpActions = await cleanGlobalMcps();
    actions.push(...mcpActions);
  }

  return {
    success: true,
    actions: actions.length > 0 ? actions : ['Global configuration is already clean and optimal.']
  };
}
