import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import type { WorkspacePaths, InitWorkspaceResult } from './types';

/**
 * Ascends directory tree to find repository or workspace root.
 * Marker indicators: .git, .agents, .mcp.json
 */
export function findWorkspaceRoot(startDir: string = process.cwd()): string {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    if (
      fs.existsSync(path.join(current, '.git')) ||
      fs.existsSync(path.join(current, '.agents')) ||
      fs.existsSync(path.join(current, '.mcp.json'))
    ) {
      return current;
    }
    current = path.dirname(current);
  }

  // Root level check
  if (
    fs.existsSync(path.join(root, '.git')) ||
    fs.existsSync(path.join(root, '.agents')) ||
    fs.existsSync(path.join(root, '.mcp.json'))
  ) {
    return root;
  }

  return path.resolve(startDir);
}

/**
 * Returns structured workspace paths.
 */
export function getWorkspacePaths(workspaceRoot: string): WorkspacePaths {
  const root = path.resolve(workspaceRoot);
  const agentsDir = path.join(root, '.agents');
  return {
    root,
    name: path.basename(root),
    agentsDir,
    skillsDir: path.join(agentsDir, 'skills'),
    dormantSkillsDir: path.join(agentsDir, 'dormant'),
    mcpFile: path.join(root, '.mcp.json'),
    agentMcpSymlink: path.join(agentsDir, 'mcp.json'),
    agentDir: path.join(root, '.agent'),
    subagentsDir: path.join(root, '.agent', 'agents'),
    hooksDir: path.join(root, '.agent', 'hooks')
  };
}

/**
 * Ensures required directories and compatibility symlinks exist.
 */
export async function ensureWorkspaceDirs(workspaceRoot: string): Promise<void> {
  const paths = getWorkspacePaths(workspaceRoot);
  await fsp.mkdir(paths.skillsDir, { recursive: true });
  await fsp.mkdir(paths.dormantSkillsDir, { recursive: true });

  // Guarantee .agents/mcp.json -> ../.mcp.json for ZCode & Codex compatibility
  if (fs.existsSync(paths.mcpFile)) {
    try {
      const stat = await fsp.lstat(paths.agentMcpSymlink).catch(() => null);
      if (!stat) {
        await fsp.symlink('../.mcp.json', paths.agentMcpSymlink);
      }
    } catch {
      // Ignore if exists
    }
  }
}

/**
 * Initializes a clean 3-layer cross-harness architecture in a new or existing workspace.
 */
export async function initWorkspace(targetDir: string = process.cwd()): Promise<InitWorkspaceResult> {
  const root = path.resolve(targetDir);
  const paths = getWorkspacePaths(root);

  await fsp.mkdir(paths.skillsDir, { recursive: true });
  await fsp.mkdir(paths.subagentsDir, { recursive: true });
  await fsp.mkdir(paths.hooksDir, { recursive: true });

  // Initialize empty .mcp.json if not present
  if (!fs.existsSync(paths.mcpFile)) {
    await fsp.writeFile(paths.mcpFile, JSON.stringify({ mcpServers: {} }, null, 2) + '\n', 'utf-8');
  }

  // Create .agents/mcp.json symlink
  const mcpSymStat = await fsp.lstat(paths.agentMcpSymlink).catch(() => null);
  if (!mcpSymStat) {
    try {
      await fsp.symlink('../.mcp.json', paths.agentMcpSymlink);
    } catch {}
  }

  // Link adapters: Claude, ZCode, Cursor, DSH, Codex
  const adapters: Array<{ dir: string; skills?: string; agents?: string }> = [
    { dir: '.claude', skills: '../.agents/skills', agents: '../.agent/agents' },
    { dir: '.zcode', skills: '../.agents/skills', agents: '../.agent/agents' },
    { dir: '.cursor', skills: '../.agents/skills' },
    { dir: '.dsh', skills: '../.agents/skills', agents: '../.agent/agents' },
    { dir: '.codex', agents: '../.agent/agents' },
    { dir: '.opencode', agents: '../.agent/agents' }
  ];

  for (const a of adapters) {
    const harnessDir = path.join(root, a.dir);
    await fsp.mkdir(harnessDir, { recursive: true });

    if (a.skills) {
      const linkPath = path.join(harnessDir, 'skills');
      const stat = await fsp.lstat(linkPath).catch(() => null);
      if (!stat) {
        await fsp.symlink(a.skills, linkPath).catch(() => {});
      }
    }

    if (a.agents) {
      const linkPath = path.join(harnessDir, 'agents');
      const stat = await fsp.lstat(linkPath).catch(() => null);
      if (!stat) {
        await fsp.symlink(a.agents, linkPath).catch(() => {});
      }
    }
  }

  return { success: true, message: `Initialized workspace "${paths.name}"`, root, name: paths.name };
}
