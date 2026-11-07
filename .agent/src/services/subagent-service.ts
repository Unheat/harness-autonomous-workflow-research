import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import type { OperationResult, SubagentInfo } from '../types';
import { listProjectSubagents, listGlobalSubagents } from '../subagents';

/**
 * Toggles Token Shield (disallowedTools: Skill) for a subagent file.
 */
export async function toggleSubagentTokenShield(
  filePath: string,
  enableShield: boolean
): Promise<OperationResult> {
  if (!fs.existsSync(filePath)) {
    return { success: false, message: `Subagent file not found: ${filePath}` };
  }

  try {
    const raw = await fsp.readFile(filePath, 'utf-8');
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---([\s\S]*)$/);

    if (!fmMatch) {
      // If no frontmatter exists, create one
      const name = path.basename(filePath, path.extname(filePath));
      const newContent = enableShield
        ? `---\nname: ${name}\ndisallowedTools: Skill\n---\n\n${raw}`
        : raw;
      await fsp.writeFile(filePath, newContent, 'utf-8');
      return { success: true, message: `Token shield ${enableShield ? 'enabled' : 'disabled'} for "${name}".` };
    }

    const fmBody = fmMatch[1];
    const rest = fmMatch[2];
    const lines = fmBody.split('\n');
    let hasDisallowedKey = false;
    let modifiedLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('disallowedTools:')) {
        hasDisallowedKey = true;
        const rawVal = line.slice(line.indexOf(':') + 1).trim();
        let tools = rawVal.split(',').map(t => t.trim()).filter(Boolean);

        if (enableShield) {
          if (!tools.some(t => t.toLowerCase() === 'skill')) {
            tools.push('Skill');
          }
        } else {
          tools = tools.filter(t => t.toLowerCase() !== 'skill');
        }

        if (tools.length > 0) {
          modifiedLines.push(`disallowedTools: ${tools.join(', ')}`);
        }
      } else {
        modifiedLines.push(line);
      }
    }

    if (!hasDisallowedKey && enableShield) {
      modifiedLines.push('disallowedTools: Skill');
    }

    const updatedContent = `---\n${modifiedLines.join('\n')}\n---${rest}`;
    await fsp.writeFile(filePath, updatedContent, 'utf-8');

    return {
      success: true,
      message: `Token shield ${enableShield ? 'enabled (Skill stripped)' : 'disabled'} for ${path.basename(filePath)}.`
    };
  } catch (err: any) {
    return { success: false, message: `Failed to update token shield: ${err.message}` };
  }
}

/**
 * Permanently deletes a subagent file.
 */
export async function deleteSubagentFile(filePath: string): Promise<OperationResult> {
  if (!fs.existsSync(filePath)) {
    return { success: false, message: `Subagent file not found: ${filePath}` };
  }

  try {
    await fsp.unlink(filePath);
    return { success: true, message: `Deleted subagent file: ${path.basename(filePath)}` };
  } catch (err: any) {
    return { success: false, message: `Failed to delete subagent: ${err.message}` };
  }
}

/**
 * Finds a subagent's path by name across workspace and global scopes, checking active and dormant.
 */
export async function findSubagentPath(
  name: string,
  workspaceRoot: string,
  preferredScope?: 'project' | 'global'
): Promise<{ filePath: string; scope: 'project' | 'global'; isDormant?: boolean } | null> {
  const safeName = path.basename(name).replace(/\.md$/, '');
  const home = os.homedir();

  const projectActive = path.join(workspaceRoot, '.agent', 'agents', `${safeName}.md`);
  const projectDormant = path.join(workspaceRoot, '.agent', 'dormant-agents', `${safeName}.md`);

  const globalActiveDirs = [
    path.join(home, '.agents', 'agents', `${safeName}.md`),
    path.join(home, '.zcode', 'agents', `${safeName}.md`),
    path.join(home, '.claude', 'agents', `${safeName}.md`)
  ];
  const globalDormant = path.join(home, '.agents', 'dormant-agents', `${safeName}.md`);

  if (preferredScope === 'project') {
    if (fs.existsSync(projectActive)) return { filePath: projectActive, scope: 'project', isDormant: false };
    if (fs.existsSync(projectDormant)) return { filePath: projectDormant, scope: 'project', isDormant: true };
  }

  for (const gPath of globalActiveDirs) {
    if (fs.existsSync(gPath)) return { filePath: gPath, scope: 'global', isDormant: false };
  }
  if (fs.existsSync(globalDormant)) {
    return { filePath: globalDormant, scope: 'global', isDormant: true };
  }

  if (fs.existsSync(projectActive)) return { filePath: projectActive, scope: 'project', isDormant: false };
  if (fs.existsSync(projectDormant)) return { filePath: projectDormant, scope: 'project', isDormant: true };

  return null;
}

/**
 * Toggles a subagent between active and dormant state.
 */
export async function toggleSubagentActive(
  name: string,
  workspaceRoot: string,
  preferredScope: 'project' | 'global',
  enable: boolean
): Promise<OperationResult> {
  const safeName = path.basename(name).replace(/\.md$/, '');
  const home = os.homedir();

  if (preferredScope === 'project') {
    const activeDir = path.join(workspaceRoot, '.agent', 'agents');
    const dormantDir = path.join(workspaceRoot, '.agent', 'dormant-agents');
    const activePath = path.join(activeDir, `${safeName}.md`);
    const dormantPath = path.join(dormantDir, `${safeName}.md`);

    await fsp.mkdir(activeDir, { recursive: true });
    await fsp.mkdir(dormantDir, { recursive: true });

    if (enable) {
      if (fs.existsSync(dormantPath)) {
        await fsp.rename(dormantPath, activePath);
        return { success: true, message: `Activated subagent "${safeName}".` };
      }
      return { success: true, message: `Subagent "${safeName}" is already active.` };
    } else {
      if (fs.existsSync(activePath)) {
        await fsp.rename(activePath, dormantPath);
        return { success: true, message: `Deactivated subagent "${safeName}" (moved to dormant).` };
      }
      return { success: true, message: `Subagent "${safeName}" is already dormant.` };
    }
  } else {
    const activeDir = path.join(home, '.agents', 'agents');
    const dormantDir = path.join(home, '.agents', 'dormant-agents');
    const activePath = path.join(activeDir, `${safeName}.md`);
    const dormantPath = path.join(dormantDir, `${safeName}.md`);

    await fsp.mkdir(activeDir, { recursive: true });
    await fsp.mkdir(dormantDir, { recursive: true });

    if (enable) {
      if (fs.existsSync(dormantPath)) {
        await fsp.rename(dormantPath, activePath);
        return { success: true, message: `Activated global subagent "${safeName}".` };
      }
      return { success: true, message: `Global subagent "${safeName}" is already active.` };
    } else {
      if (fs.existsSync(activePath)) {
        await fsp.rename(activePath, dormantPath);
        return { success: true, message: `Deactivated global subagent "${safeName}" (moved to dormant).` };
      }
      return { success: true, message: `Global subagent "${safeName}" is already dormant.` };
    }
  }
}
