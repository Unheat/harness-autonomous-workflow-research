import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { GLOBAL_CATALOG_SKILLS_DIR, GLOBAL_SKILLS_DIR, GLOBAL_MCPS_FILE } from './config';
import type { McpServerConfig, McpCatalog } from './types';

/**
 * Copies a skill directory into central catalog (~/.agents/catalog/skills/) if not already there.
 */
export async function syncSkillToCatalog(sourcePath: string, skillName: string): Promise<boolean> {
  try {
    const targetDir = path.join(GLOBAL_CATALOG_SKILLS_DIR, skillName);
    if (fs.existsSync(path.join(targetDir, 'SKILL.md'))) return true;

    await fsp.mkdir(GLOBAL_CATALOG_SKILLS_DIR, { recursive: true });
    // If source is a symlink, resolve real path so we copy actual content
    const realSource = fs.realpathSync(sourcePath);
    if (!fs.existsSync(path.join(realSource, 'SKILL.md'))) return false;

    await fsp.cp(realSource, targetDir, { recursive: true, dereference: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns sorted list of all skill names in global catalog.
 * Read-only: private user and workspace skills are never automatically archived.
 */
export async function getCatalogSkills(): Promise<string[]> {
  const skillsSet = new Set<string>();

  // 1. Primary Catalog Storage
  if (fs.existsSync(GLOBAL_CATALOG_SKILLS_DIR)) {
    try {
      const entries = await fsp.readdir(GLOBAL_CATALOG_SKILLS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() || entry.isSymbolicLink()) {
          const md = path.join(GLOBAL_CATALOG_SKILLS_DIR, entry.name, 'SKILL.md');
          if (fs.existsSync(md)) skillsSet.add(entry.name);
        }
      }
    } catch {}
  }

  return Array.from(skillsSet).sort();
}

/**
 * Reads central MCP servers catalog.
 */
export async function getCatalogMcps(): Promise<Record<string, McpServerConfig>> {
  if (!fs.existsSync(GLOBAL_MCPS_FILE)) {
    return {};
  }
  try {
    const raw = await fsp.readFile(GLOBAL_MCPS_FILE, 'utf-8');
    const data: McpCatalog = JSON.parse(raw);
    return data.mcpServers || {};
  } catch {
    return {};
  }
}

/**
 * Parses description from a skill's SKILL.md.
 * Checks workspace local folders (.agents/skills, .agents/dormant) first, then catalog, then auxiliaries.
 */
export async function getSkillDescription(skillName: string, workspaceRoot?: string): Promise<string> {
  const candidatePaths: string[] = [];
  if (workspaceRoot) {
    candidatePaths.push(path.join(workspaceRoot, '.agents', 'skills', skillName, 'SKILL.md'));
    candidatePaths.push(path.join(workspaceRoot, '.agents', 'dormant', skillName, 'SKILL.md'));
  }
  candidatePaths.push(path.join(GLOBAL_CATALOG_SKILLS_DIR, skillName, 'SKILL.md'));
  candidatePaths.push(path.join(GLOBAL_SKILLS_DIR, skillName, 'SKILL.md'));

  const home = os.homedir();
  candidatePaths.push(path.join(home, '.zcode', 'skills', skillName, 'SKILL.md'));
  candidatePaths.push(path.join(home, '.claude', 'skills', skillName, 'SKILL.md'));

  for (const skillMd of candidatePaths) {
    if (fs.existsSync(skillMd)) {
      try {
        const content = await fsp.readFile(skillMd, 'utf-8');
        const descMatch = content.match(/description:\s*(?:>|\|)?\s*([^\n]+(?:\n\s+[^\n]+)*)/);
        if (descMatch) {
          return descMatch[1].replace(/\n\s+/g, ' ').replace(/^["']|["']$/g, '').trim();
        }
      } catch {}
    }
  }
  return '';
}
