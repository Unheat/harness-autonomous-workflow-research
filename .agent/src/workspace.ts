import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { WorkspacePaths, InitWorkspaceResult } from './types';
import { syncPiProjectMcps } from './services/pi-mcp-projection';

export interface AdapterSymlinkDef {
  link: string;
  target: string;
}

/**
 * Harness files that must stay generated projections, never symlinks into the hub.
 * A symlink would feed the hub dialect to that harness and let harness-side writes
 * mutate `.mcp.json` through the link.
 */
export interface GeneratedProjectionDef {
  /** Workspace-relative path of the harness projection. */
  path: string;
  /** Whether a physical file is legitimate (generated) or always poisonous. */
  keepPhysicalFile: boolean;
  /** Why a symlink at this path is poisonous, quoted in doctor/heal output. */
  reason: string;
}

export const GENERATED_PROJECTION_FILES: GeneratedProjectionDef[] = [
  { path: '.dsh/mcp.json', keepPhysicalFile: false, reason: 'DSH toolbox double-mounts raw MCP tools' },
  { path: '.pi/mcp.json', keepPhysicalFile: true, reason: 'pi reads a generated projection, not the hub' }
];

// ZCode reads .agents/skills natively: a second skills adapter duplicates prompts.
export const ADAPTER_SYMLINKS: AdapterSymlinkDef[] = [
  // Skills adapters
  { link: '.claude/skills', target: '../.agents/skills' },
  { link: '.cursor/skills', target: '../.agents/skills' },
  { link: '.dsh/skills', target: '../.agents/skills' },
  { link: '.codex/skills', target: '../.agents/skills' },
  { link: '.opencode/skills', target: '../.agents/skills' },

  // Subagents adapters
  { link: '.claude/agents', target: '../.agent/agents' },
  { link: '.zcode/agents', target: '../.agent/agents' },
  { link: '.cursor/agents', target: '../.agent/agents' },
  { link: '.codex/agents', target: '../.agent/agents' },
  { link: '.dsh/agents', target: '../.agent/agents' },
  { link: '.opencode/agents', target: '../.agent/agents' },

  // MCP configuration adapters
  { link: '.agents/mcp.json', target: '../.mcp.json' },
  { link: '.cursor/mcp.json', target: '../.mcp.json' }
];

/** Only repair links; physical folders and files require an explicit migration. */
export async function reconcileWorkspaceAdapters(root: string): Promise<string[]> {
  const actions: string[] = [];
  for (const { link, target } of ADAPTER_SYMLINKS) {
    if (link.endsWith('/mcp.json') && !fs.existsSync(path.join(root, '.mcp.json'))) continue;
    const full = path.join(root, link);
    await fsp.mkdir(path.dirname(full), { recursive: true });
    const stat = await fsp.lstat(full).catch((err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') return null;
      throw err;
    });
    if (stat && !stat.isSymbolicLink()) {
      actions.push(`Preserved physical adapter: ${link} (manual migration required)`);
      continue;
    }
    if (stat) {
      if (await fsp.readlink(full) === target) continue;
      await fsp.unlink(full);
    }
    await fsp.symlink(target, full);
    actions.push(`Reconciled adapter: ${link}`);
  }
  const zcodeSkills = path.join(root, '.zcode', 'skills');
  const stat = await fsp.lstat(zcodeSkills).catch((err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT') return null;
    throw err;
  });
  if (stat?.isSymbolicLink() && path.resolve(path.dirname(zcodeSkills), await fsp.readlink(zcodeSkills)) === path.join(root, '.agents', 'skills')) {
    await fsp.unlink(zcodeSkills);
    actions.push('Pruned redundant .zcode/skills adapter (native .agents/skills discovery)');
  }

  // Active safety guard: prune symlinked harness projections that would double-mount or
  // re-enter the hub. Generated physical projections keep working; only links are poisonous.
  for (const projection of GENERATED_PROJECTION_FILES) {
    const full = path.join(root, projection.path);
    const stat = await fsp.lstat(full).catch((err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') return null;
      throw err;
    });
    if (!stat) continue;
    if (projection.keepPhysicalFile && !stat.isSymbolicLink()) continue;
    await fsp.unlink(full);
    actions.push(`Pruned poisonous ${projection.path} adapter (${projection.reason})`);
  }

  return actions;
}

/**
 * Ascends directory tree to find repository or workspace root.
 * Marker indicators: .git, .agents, .mcp.json
 */
export function findWorkspaceRoot(startDir: string = process.cwd()): string {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;
  const home = os.homedir();

  while (current !== root) {
    // Never treat HOME_DIR as a workspace when ascending from a subfolder
    // because ~/.agents is the global catalog/storage, not a project root
    if (current === home && path.resolve(startDir) !== home) {
      break;
    }

    if (
      fs.existsSync(path.join(current, '.git')) ||
      fs.existsSync(path.join(current, '.agents')) ||
      fs.existsSync(path.join(current, '.mcp.json'))
    ) {
      return current;
    }
    current = path.dirname(current);
  }

  // Root level check (only if startDir itself was root)
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

  await reconcileWorkspaceAdapters(root);
  await syncPiProjectMcps(root, {});

  return { success: true, message: `Initialized workspace "${paths.name}"`, root, name: paths.name };
}
