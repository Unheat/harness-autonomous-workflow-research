import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { GLOBAL_ZCODE_CONFIG } from './config';
import { ensureWorkspaceDirs } from './workspace';
import { autoTrustWorkspaceMcps } from './mcp-global';
import { getCatalogSkills } from './catalog';
import { retargetWorkspaceSkillSymlinks, cleanGlobal } from './clean-global';
import type { AuditResult, AuditIssue, CleanGlobalResult } from './types';

export { cleanGlobal };

export interface AdapterSymlinkDef {
  link: string;
  target: string;
}

export const ADAPTER_SYMLINKS: AdapterSymlinkDef[] = [
  { link: '.claude/skills', target: '../.agents/skills' },
  { link: '.zcode/skills', target: '../.agents/skills' },
  { link: '.cursor/skills', target: '../.agents/skills' },
  { link: '.dsh/skills', target: '../.agents/skills' },
  { link: '.claude/agents', target: '../.agent/agents' },
  { link: '.zcode/agents', target: '../.agent/agents' },
  { link: '.codex/agents', target: '../.agent/agents' },
  { link: '.dsh/agents', target: '../.agent/agents' },
  { link: '.opencode/agents', target: '../.agent/agents' },
  { link: '.agents/mcp.json', target: '../.mcp.json' }
];

/**
 * Audits workspace configuration across all harnesses.
 */
export async function auditWorkspace(workspaceRoot: string): Promise<AuditResult> {
  const issues: AuditIssue[] = [];
  const root = path.resolve(workspaceRoot);

  // 1. Audit adapter symlinks
  for (const item of ADAPTER_SYMLINKS) {
    const fullPath = path.join(root, item.link);
    const stat = await fsp.lstat(fullPath).catch(() => null);

    if (!stat) {
      issues.push({ severity: 'warning', message: `Missing adapter link: ${item.link}` });
      continue;
    }
    if (!stat.isSymbolicLink()) {
      if (item.link === '.agents/mcp.json' && stat.isFile()) {
        continue; // ZCode GUI edits .agents/mcp.json directly in lockstep sync
      }
      issues.push({ severity: 'error', message: `${item.link} is a physical directory, not a symlink! Causes duplication.` });
      continue;
    }

    try {
      const currentTarget = await fsp.readlink(fullPath);
      if (currentTarget !== item.target) {
        issues.push({ severity: 'warning', message: `${item.link} target is "${currentTarget}", expected "${item.target}".` });
      }
      if (!fs.existsSync(fullPath)) {
        issues.push({ severity: 'error', message: `${item.link} is a broken / dangling symlink.` });
      }
    } catch (err: any) {
      issues.push({ severity: 'error', message: `Cannot read symlink ${item.link}: ${err.message}` });
    }
  }

  // 2. Audit dangling skills in .agents/skills
  const skillsDir = path.join(root, '.agents', 'skills');
  if (fs.existsSync(skillsDir)) {
    try {
      const entries = await fsp.readdir(skillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isSymbolicLink()) {
          const p = path.join(skillsDir, entry.name);
          if (!fs.existsSync(p)) {
            issues.push({ severity: 'error', message: `Dangling skill symlink in .agents/skills/${entry.name}` });
          }
        }
      }
    } catch {}
  }

  // 3. Audit global MCP shadowing in ~/.zcode/cli/config.json
  if (fs.existsSync(GLOBAL_ZCODE_CONFIG)) {
    try {
      const zcfg = JSON.parse(await fsp.readFile(GLOBAL_ZCODE_CONFIG, 'utf-8'));
      const zservers = zcfg?.mcp?.servers || {};
      const localMcpFile = path.join(root, '.mcp.json');
      const localServers = fs.existsSync(localMcpFile) ? JSON.parse(await fsp.readFile(localMcpFile, 'utf-8'))?.mcpServers || {} : {};

      for (const [name, cfg] of Object.entries(zservers) as [string, any][]) {
        if (cfg.enabled === false && localServers[name] && localServers[name].enabled !== false) {
          issues.push({
            severity: 'error',
            message: `MCP server "${name}" is enabled locally, but blocked by Global ZCode config! Run \`harness mcp global rm ${name}\` to unblock.`
          });
        }
        if (['rea', 'local-pdf-rag'].includes(name) && cfg.enabled !== false) {
          issues.push({
            severity: 'error',
            message: `Global ZCode config has heavy server "${name}" enabled! This leaks 100+ tools into all projects.`
          });
        }
      }
    } catch {}
  }

  // 4. Audit subagent token shields
  const subagentsDir = path.join(root, '.agent', 'agents');
  if (fs.existsSync(subagentsDir)) {
    try {
      const files = await fsp.readdir(subagentsDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fsp.readFile(path.join(subagentsDir, file), 'utf-8');
          if (!content.includes('disallowedTools: Skill') && !content.includes('Skill')) {
            issues.push({
              severity: 'error',
              message: `Subagent ${file} is missing tool 'Skill' stripping! Will leak 8,000+ preview tokens.`
            });
          }
        }
      }
    } catch {}
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Reconciles, repairs adapter symlinks, prunes dead links, and auto-syncs catalog.
 */
export async function healWorkspace(workspaceRoot: string): Promise<string[]> {
  const root = path.resolve(workspaceRoot);
  await ensureWorkspaceDirs(root);
  const actions: string[] = [];

  for (const item of ADAPTER_SYMLINKS) {
    const fullPath = path.join(root, item.link);
    const parentDir = path.dirname(fullPath);
    await fsp.mkdir(parentDir, { recursive: true });

    const stat = await fsp.lstat(fullPath).catch(() => null);

    if (stat) {
      if (stat.isSymbolicLink()) {
        try {
          const currentTarget = await fsp.readlink(fullPath);
          if (currentTarget === item.target && fs.existsSync(fullPath)) continue;
          await fsp.unlink(fullPath);
        } catch {
          await fsp.unlink(fullPath).catch(() => {});
        }
      } else if (stat.isDirectory()) {
        const contents = await fsp.readdir(fullPath).catch(() => []);
        if (contents.length === 0) await fsp.rmdir(fullPath).catch(() => {});
      }
    }

    try {
      await fsp.symlink(item.target, fullPath);
      actions.push(`Reconciled adapter: ${item.link}`);
    } catch {}
  }

  // Prune broken skill symlinks in .agents/skills
  const skillsDir = path.join(root, '.agents', 'skills');
  if (fs.existsSync(skillsDir)) {
    try {
      const entries = await fsp.readdir(skillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isSymbolicLink()) {
          const p = path.join(skillsDir, entry.name);
          if (!fs.existsSync(p)) {
            await fsp.unlink(p).catch(() => {});
            actions.push(`Pruned dead skill link: ${entry.name}`);
          }
        }
      }
    } catch {}
  }

  // Re-target legacy links pointing to ~/.agents/skills/ to ~/.agents/catalog/skills/
  const retargetActions = await retargetWorkspaceSkillSymlinks(root);
  actions.push(...retargetActions);

  // Auto-sync catalog (ingests any rogue/manual skills)
  const catSkills = await getCatalogSkills();
  actions.push(`Synced central catalog (${catSkills.length} skills available)`);

  // Automatically grant trust signatures for all workspace MCP servers in ZCode
  const trustedCount = await autoTrustWorkspaceMcps(root);
  if (trustedCount > 0) {
    actions.push(`Granted ZCode SHA-256 trust for ${trustedCount} workspace MCP(s)`);
  }

  return actions;
}
