import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { GLOBAL_SKILLS_DIR, GLOBAL_MCPS_FILE } from './config';
import type { McpServerConfig, McpCatalog } from './types';

/**
 * Returns sorted list of all skill names in global catalog.
 */
export async function getCatalogSkills(): Promise<string[]> {
  if (!fs.existsSync(GLOBAL_SKILLS_DIR)) {
    return [];
  }

  try {
    const entries = await fsp.readdir(GLOBAL_SKILLS_DIR, { withFileTypes: true });
    const skills: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory() || entry.isSymbolicLink()) {
        const skillMd = path.join(GLOBAL_SKILLS_DIR, entry.name, 'SKILL.md');
        if (fs.existsSync(skillMd)) {
          skills.push(entry.name);
        }
      }
    }

    return skills.sort();
  } catch {
    return [];
  }
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
 * Checks workspace local folders (.agents/skills, .agents/dormant) first, then global catalog.
 */
export async function getSkillDescription(skillName: string, workspaceRoot?: string): Promise<string> {
  const candidatePaths: string[] = [];
  if (workspaceRoot) {
    candidatePaths.push(path.join(workspaceRoot, '.agents', 'skills', skillName, 'SKILL.md'));
    candidatePaths.push(path.join(workspaceRoot, '.agents', 'dormant', skillName, 'SKILL.md'));
  }
  candidatePaths.push(path.join(GLOBAL_SKILLS_DIR, skillName, 'SKILL.md'));

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
