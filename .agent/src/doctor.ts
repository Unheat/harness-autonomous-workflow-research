import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { GLOBAL_ZCODE_CONFIG } from './config';
import { ensureWorkspaceDirs } from './workspace';
import type { AuditResult, AuditIssue, CleanGlobalResult } from './types';

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
      let localServers: Record<string, any> = {};
      if (fs.existsSync(localMcpFile)) {
        localServers = JSON.parse(await fsp.readFile(localMcpFile, 'utf-8'))?.mcpServers || {};
      }

      for (const [name, cfg] of Object.entries(zservers) as [string, any][]) {
        if (cfg.enabled === false && localServers[name] && localServers[name].enabled !== false) {
          issues.push({
            severity: 'error',
            message: `MCP server "${name}" is enabled locally, but blocked by Global ZCode config! Run \`harness mcp global rm ${name}\` to unshadow.`
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
 * Reconciles and repairs all harness adapter symlinks.
 */
export async function healWorkspace(workspaceRoot: string): Promise<void> {
  const root = path.resolve(workspaceRoot);
  await ensureWorkspaceDirs(root);

  for (const item of ADAPTER_SYMLINKS) {
    const fullPath = path.join(root, item.link);
    const parentDir = path.dirname(fullPath);
    await fsp.mkdir(parentDir, { recursive: true });

    const stat = await fsp.lstat(fullPath).catch(() => null);

    if (stat) {
      if (stat.isSymbolicLink()) {
        try {
          const currentTarget = await fsp.readlink(fullPath);
          if (currentTarget === item.target && fs.existsSync(fullPath)) {
            continue; // Already healthy
          }
          await fsp.unlink(fullPath);
        } catch {
          await fsp.unlink(fullPath).catch(() => {});
        }
      } else if (stat.isDirectory()) {
        // If empty directory, remove it so we can symlink
        const contents = await fsp.readdir(fullPath).catch(() => []);
        if (contents.length === 0) {
          await fsp.rmdir(fullPath).catch(() => {});
        }
      }
    }

    try {
      await fsp.symlink(item.target, fullPath);
    } catch {}
  }
}

/**
 * Sanitizes global harness configurations so global scope does not override workspace scopes.
 * Ensures heavy servers ('rea', 'local-pdf-rag') in ~/.zcode/cli/config.json are dormant.
 */
export async function cleanGlobal(): Promise<CleanGlobalResult> {
  const actions: string[] = [];
  if (fs.existsSync(GLOBAL_ZCODE_CONFIG)) {
    try {
      const raw = await fsp.readFile(GLOBAL_ZCODE_CONFIG, 'utf-8');
      const zcfg = JSON.parse(raw);
      zcfg.mcp = zcfg.mcp || { servers: {} };
      zcfg.mcp.servers = zcfg.mcp.servers || {};

      for (const heavy of ['rea', 'local-pdf-rag']) {
        if (heavy in zcfg.mcp.servers) {
          delete zcfg.mcp.servers[heavy];
          actions.push(`Removed "${heavy}" from global ZCode config (prevents global shadowing; local projects can now manage it)`);
        }
      }

      await fsp.writeFile(GLOBAL_ZCODE_CONFIG, JSON.stringify(zcfg, null, 2) + '\n', 'utf-8');
    } catch (err: any) {
      actions.push(`Failed to update ZCode global config: ${err.message}`);
    }
  }

  return {
    success: true,
    actions: actions.length > 0 ? actions : ['Global configuration is already clean and optimal.']
  };
}
