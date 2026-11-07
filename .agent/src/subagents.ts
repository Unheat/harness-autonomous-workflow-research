import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { SubagentInfo } from './types';

function parseFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const lines = match[1].split('\n');
  const result: Record<string, any> = {};
  let currentKey = '';
  let isArray = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('- ') && currentKey && isArray) {
      result[currentKey].push(trimmed.slice(2).trim().replace(/^['"]|['"]$/g, ''));
      continue;
    }
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx !== -1) {
      const key = trimmed.slice(0, colonIdx).trim();
      const val = trimmed.slice(colonIdx + 1).trim();
      if (!val) {
        currentKey = key;
        isArray = true;
        result[key] = [];
      } else {
        currentKey = key;
        isArray = false;
        result[key] = val.replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return result;
}

function parseToolList(val: any): string[] {
  if (Array.isArray(val)) return val.map(t => String(t).trim().replace(/^[\[\]"']|[\[\]"']$/g, '')).filter(Boolean);
  if (typeof val === 'string') {
    const cleaned = val.replace(/^[\[\]]|[\[\]]$/g, '').trim();
    return cleaned.split(',').map(t => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  }
  return [];
}

export async function parseSubagentFile(filePath: string, scope: 'global' | 'project'): Promise<SubagentInfo | null> {
  try {
    const content = await fsp.readFile(filePath, 'utf-8');
    const fm = parseFrontmatter(content);
    const defaultName = path.basename(filePath, path.extname(filePath));
    const name = fm.name || defaultName;
    const description = fm.description || '';
    const tools = parseToolList(fm.tools);
    const disallowedTools = parseToolList(fm.disallowedTools);
    const hasTokenShield = disallowedTools.some(t => t.toLowerCase() === 'skill');

    return {
      name,
      description,
      scope,
      filePath,
      tools,
      disallowedTools,
      hasTokenShield,
      model: fm.model,
      color: fm.color,
      thoughtLevel: fm.thoughtLevel
    };
  } catch {
    return null;
  }
}

export async function listProjectSubagents(workspaceRoot: string): Promise<SubagentInfo[]> {
  const dir = path.join(workspaceRoot, '.agent', 'agents');
  const dormantDir = path.join(workspaceRoot, '.agent', 'dormant-agents');
  const results: SubagentInfo[] = [];

  if (fs.existsSync(dir)) {
    try {
      const entries = await fsp.readdir(dir);
      for (const entry of entries.filter(e => e.endsWith('.md'))) {
        const info = await parseSubagentFile(path.join(dir, entry), 'project');
        if (info) {
          info.isActive = true;
          info.isDormant = false;
          results.push(info);
        }
      }
    } catch {}
  }

  if (fs.existsSync(dormantDir)) {
    try {
      const entries = await fsp.readdir(dormantDir);
      for (const entry of entries.filter(e => e.endsWith('.md'))) {
        const info = await parseSubagentFile(path.join(dormantDir, entry), 'project');
        if (info) {
          info.isActive = false;
          info.isDormant = true;
          results.push(info);
        }
      }
    } catch {}
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listGlobalSubagents(): Promise<SubagentInfo[]> {
  const home = os.homedir();
  const dirs = [
    path.join(home, '.agents', 'agents'),
    path.join(home, '.zcode', 'agents'),
    path.join(home, '.claude', 'agents')
  ];
  const dormantDir = path.join(home, '.agents', 'dormant-agents');
  const seen = new Set<string>();
  const results: SubagentInfo[] = [];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const entries = await fsp.readdir(dir);
      for (const entry of entries.filter(e => e.endsWith('.md'))) {
        const fullPath = path.join(dir, entry);
        const info = await parseSubagentFile(fullPath, 'global');
        if (info && !seen.has(info.name)) {
          seen.add(info.name);
          info.isActive = true;
          info.isDormant = false;
          results.push(info);
        }
      }
    } catch {}
  }

  if (fs.existsSync(dormantDir)) {
    try {
      const entries = await fsp.readdir(dormantDir);
      for (const entry of entries.filter(e => e.endsWith('.md'))) {
        const fullPath = path.join(dormantDir, entry);
        const info = await parseSubagentFile(fullPath, 'global');
        if (info && !seen.has(info.name)) {
          seen.add(info.name);
          info.isActive = false;
          info.isDormant = true;
          results.push(info);
        }
      }
    } catch {}
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listAllSubagents(workspaceRoot: string): Promise<SubagentInfo[]> {
  const projectAgents = await listProjectSubagents(workspaceRoot);
  const globalAgents = await listGlobalSubagents();
  const seen = new Set<string>();
  const all: SubagentInfo[] = [];

  for (const a of projectAgents) {
    seen.add(a.name);
    all.push(a);
  }
  for (const a of globalAgents) {
    if (!seen.has(a.name)) {
      seen.add(a.name);
      all.push(a);
    }
  }
  return all;
}
