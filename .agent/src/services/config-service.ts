import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { getWorkspacePaths } from '../workspace';
import { GLOBAL_ZCODE_CONFIG, GLOBAL_CLAUDE_CONFIG, GLOBAL_CATALOG_SKILLS_DIR, GLOBAL_SKILLS_DIR } from '../config';
import type { OperationResult } from '../types';

export type ConfigTarget = 'workspace-mcp' | 'zcode-global' | 'claude-settings' | 'subagent' | 'skill';

export interface ConfigReadResult {
  success: boolean;
  content?: string;
  filePath: string;
  format: 'json' | 'markdown' | 'yaml';
  message?: string;
}

export function resolveConfigPath(target: ConfigTarget, workspaceRoot: string, subagentName?: string): { filePath: string; format: 'json' | 'markdown' | 'yaml' } {
  const home = os.homedir();
  switch (target) {
    case 'workspace-mcp': {
      const { mcpFile } = getWorkspacePaths(workspaceRoot);
      return { filePath: mcpFile, format: 'json' };
    }
    case 'zcode-global': {
      return { filePath: GLOBAL_ZCODE_CONFIG, format: 'json' };
    }
    case 'claude-settings': {
      return { filePath: GLOBAL_CLAUDE_CONFIG, format: 'json' };
    }
    case 'subagent': {
      if (!subagentName) {
        throw new Error('Subagent name is required to resolve config path.');
      }
      const safeName = path.basename(subagentName).replace(/\.md$/, '');
      const projectPath = path.join(workspaceRoot, '.agent', 'agents', `${safeName}.md`);
      if (fs.existsSync(projectPath)) {
        return { filePath: projectPath, format: 'markdown' };
      }
      const globalPath = path.join(home, '.agents', 'agents', `${safeName}.md`);
      return { filePath: fs.existsSync(globalPath) ? globalPath : projectPath, format: 'markdown' };
    }
    case 'skill': {
      if (!subagentName) {
        throw new Error('Skill name is required to resolve skill config path.');
      }
      const safeName = path.basename(subagentName);
      const candidates = [
        path.join(workspaceRoot, '.agents', 'skills', safeName, 'SKILL.md'),
        path.join(workspaceRoot, '.agents', 'dormant', safeName, 'SKILL.md'),
        path.join(GLOBAL_CATALOG_SKILLS_DIR, safeName, 'SKILL.md'),
        path.join(GLOBAL_SKILLS_DIR, safeName, 'SKILL.md'),
        path.join(home, '.claude', 'skills', safeName, 'SKILL.md'),
        path.join(home, '.zcode', 'skills', safeName, 'SKILL.md')
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          let real = c;
          try { real = fs.realpathSync(c); } catch {}
          return { filePath: real, format: 'markdown' };
        }
      }
      return { filePath: path.join(GLOBAL_CATALOG_SKILLS_DIR, safeName, 'SKILL.md'), format: 'markdown' };
    }
    default:
      throw new Error(`Unknown config target: ${target}`);
  }
}

/**
 * Safely reads the requested configuration file.
 */
export async function readConfigFile(
  target: ConfigTarget,
  workspaceRoot: string,
  subagentName?: string
): Promise<ConfigReadResult> {
  try {
    const { filePath, format } = resolveConfigPath(target, workspaceRoot, subagentName);
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        filePath,
        format,
        message: `File not found: ${filePath}`
      };
    }
    const content = await fsp.readFile(filePath, 'utf-8');
    return {
      success: true,
      filePath,
      format,
      content
    };
  } catch (err: any) {
    return {
      success: false,
      filePath: '',
      format: 'json',
      message: err.message
    };
  }
}

/**
 * Safely validates and writes the configuration file.
 * Prevents corrupt syntax from reaching the disk.
 */
export async function writeConfigFile(
  target: ConfigTarget,
  content: string,
  workspaceRoot: string,
  subagentName?: string
): Promise<OperationResult> {
  try {
    const { filePath, format } = resolveConfigPath(target, workspaceRoot, subagentName);

    if (format === 'json') {
      try {
        JSON.parse(content);
      } catch (parseErr: any) {
        return {
          success: false,
          message: `JSON syntax error: ${parseErr.message}. File was NOT saved.`
        };
      }
    }

    const dir = path.dirname(filePath);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(filePath, content, 'utf-8');

    return {
      success: true,
      message: `Successfully saved ${path.basename(filePath)}.`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to save configuration: ${err.message}`
    };
  }
}
