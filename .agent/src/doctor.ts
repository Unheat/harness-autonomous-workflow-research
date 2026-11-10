import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { GLOBAL_ZCODE_CONFIG } from './config';
import { ensureWorkspaceDirs, ADAPTER_SYMLINKS, reconcileWorkspaceAdapters, GENERATED_PROJECTION_FILES } from './workspace';
import { ensureSkillInvocable } from './catalog';
import { listGlobalActiveSkills } from './skills-global';
import { cleanGlobal, discoverUnmigratedHarnessMcps, centralizeHarnessMcps } from './clean-global';
import { listLocalMcps } from './mcp';
import { listGlobalMcps } from './mcp-global';
import { inspectPiProjection, inspectPiUserScope } from './services/pi-mcp-projection';
import { describePiTrustGaps, listExistingPiAgentDirs } from './services/pi-harness-trust';
import { syncHarnessProjections } from './services/harness-sync-service';
import type { AuditResult, AuditIssue } from './types';

export { cleanGlobal, discoverUnmigratedHarnessMcps, centralizeHarnessMcps };

export { ADAPTER_SYMLINKS } from './workspace';
export type { AdapterSymlinkDef } from './workspace';

/**
 * Audits workspace configuration across all harnesses.
 */
export async function auditWorkspace(workspaceRoot: string): Promise<AuditResult> {
  const issues: AuditIssue[] = [];
  const root = path.resolve(workspaceRoot);

  const isHome = root === path.resolve(os.homedir());

  // Global harness directories are not project adapters.
  for (const item of isHome ? [] : ADAPTER_SYMLINKS) {
    const fullPath = path.join(root, item.link);
    const stat = await fsp.lstat(fullPath).catch(() => null);

    if (!stat) {
      issues.push({ severity: 'warning', message: `Missing adapter link: ${item.link}` });
      continue;
    }
    if (!stat.isSymbolicLink()) {
      if (item.link.endsWith('/mcp.json') && stat.isFile()) {
        continue; // Harness GUIs (ZCode/Cursor/DSH) may edit mcp.json directly in lockstep sync
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

  // 2. Audit dangling and redundant skills in .agents/skills
  const skillsDir = path.join(root, '.agents', 'skills');
  const globalActive = await listGlobalActiveSkills();
  const globalNames = new Set(globalActive.map(g => g.name));

  if (fs.existsSync(skillsDir)) {
    try {
      const entries = await fsp.readdir(skillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isSymbolicLink()) {
          const p = path.join(skillsDir, entry.name);
          if (!fs.existsSync(p)) {
            issues.push({ severity: 'error', message: `Dangling skill symlink in .agents/skills/${entry.name}` });
          } else if (!isHome && globalNames.has(entry.name)) {
            issues.push({
              severity: 'warning',
              message: `Skill "${entry.name}" is active in both Global User Scope and Workspace Scope. Both declarations are preserved; review scope explicitly.`
            });
          }
        }
      }
    } catch {}
  }

  // 3. Audit global MCP shadowing and unmigrated harness MCP configs
  const unmigratedMcps = await discoverUnmigratedHarnessMcps();
  for (const item of unmigratedMcps) {
    const srvNames = Object.keys(item.servers).join(', ');
    issues.push({
      severity: 'warning',
      message: `Found unmigrated harness MCP declaration(s) in ${item.harness} (${path.basename(item.filePath)}: ${srvNames})! Run \`harness heal\` or \`harness clean-global\` to centralize into ~/.agents/catalog/mcps.json.`
    });
  }

  if (fs.existsSync(GLOBAL_ZCODE_CONFIG)) {
    try {
      const zcfg = JSON.parse(await fsp.readFile(GLOBAL_ZCODE_CONFIG, 'utf-8'));
      const zservers = zcfg?.mcp?.servers || {};
      const localMcpFile = path.join(root, '.mcp.json');
      const localServers = fs.existsSync(localMcpFile) ? JSON.parse(await fsp.readFile(localMcpFile, 'utf-8'))?.mcpServers || {} : {};

      for (const [name, cfg] of Object.entries(zservers) as [string, any][]) {
        if (!isHome && cfg.enabled === false && localServers[name] && localServers[name].enabled !== false) {
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

  // 4. Audit poisonous harness projections (.dsh/mcp.json, symlinked .pi/mcp.json)
  for (const projection of GENERATED_PROJECTION_FILES) {
    const full = path.join(root, projection.path);
    const stat = await fsp.lstat(full).catch(() => null);
    if (!stat) continue;
    if (projection.keepPhysicalFile && !stat.isSymbolicLink()) continue;
    issues.push({
      severity: 'error',
      message: `Found poisonous adapter ${projection.path}! ${projection.reason}. Run \`harness heal\` to prune.`
    });
  }

  // 5. Audit the pi-like harness projection against the hub declarations
  const localMcps = await listLocalMcps(root);
  const piProjection = inspectPiProjection(root, localMcps);
  if (piProjection.state === 'missing' || piProjection.state === 'stale') {
    issues.push({
      severity: 'warning',
      message: `pi-like projection ${piProjection.path} is ${piProjection.state} (${piProjection.servers} server(s) expected). Run \`harness heal\` to regenerate.`
    });
  }
  for (const issue of piProjection.issues) {
    issues.push({
      severity: 'warning',
      message: `pi-like harness would reject MCP server "${issue.server}": ${issue.reason}.`
    });
  }
  if (piProjection.servers > 0 && piProjection.state !== 'blocked') {
    for (const warning of describePiTrustGaps(root)) {
      issues.push({ severity: 'warning', message: warning });
    }
  }

  // 6. Audit user-scope projections: `<agentDir>/mcp.json` must mirror the manager's global scope
  const globalMcps = await listGlobalMcps();
  for (const agentDir of listExistingPiAgentDirs()) {
    const userScope = inspectPiUserScope(agentDir, globalMcps);
    if (userScope.state === 'missing' || userScope.state === 'stale') {
      issues.push({
        severity: 'warning',
        message: `${userScope.path} is ${userScope.state} (${userScope.servers} user-scope server(s) expected). Run \`harness mcp sync\` to align it with the manager.`
      });
    }
  }

  // 7. Audit subagent token shields
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
 * Repairs workspace adapters and prunes dead skill links without changing user scope.
 */
export async function healWorkspace(workspaceRoot: string): Promise<string[]> {
  const root = path.resolve(workspaceRoot);
  const isHome = root === path.resolve(os.homedir());
  const actions: string[] = [];
  if (!isHome) {
    await ensureWorkspaceDirs(root);
    await fsp.mkdir(path.join(root, '.agent', 'agents'), { recursive: true });
    actions.push(...await reconcileWorkspaceAdapters(root));
  } else {
    actions.push('Global user scope: project adapter repair skipped; native harness folders preserved.');
    for (const projection of GENERATED_PROJECTION_FILES) {
      const full = path.join(root, projection.path);
      const stat = await fsp.lstat(full).catch(() => null);
      if (!stat) continue;
      if (projection.keepPhysicalFile && !stat.isSymbolicLink()) continue;
      await fsp.unlink(full);
      actions.push(`Pruned poisonous ${projection.path} adapter (${projection.reason})`);
    }
  }

  // Prune broken skill symlinks in .agents/skills & sanitize invocation policy
  const skillsDir = path.join(root, '.agents', 'skills');
  if (fs.existsSync(skillsDir)) {
    try {
      const entries = await fsp.readdir(skillsDir, { withFileTypes: true });
      for (const entry of entries) {
        const p = path.join(skillsDir, entry.name);
        if (entry.isSymbolicLink()) {
          if (!fs.existsSync(p)) {
            await fsp.unlink(p).catch(() => {});
            actions.push(`Pruned dead skill link: ${entry.name}`);
          } else {
            await ensureSkillInvocable(p);
          }
        } else if (entry.isDirectory()) {
          if (await ensureSkillInvocable(p)) {
            actions.push(`Sanitized skill invocation policy: ${entry.name}`);
          }
        }
      }
    } catch {}
  }

  // Centralize any unmigrated global harness MCPs into ~/.agents/catalog/mcps.json
  const mcpMigrationActions = await centralizeHarnessMcps();
  actions.push(...mcpMigrationActions);

  // Refresh every generated harness projection from the manager's stores
  const syncReport = await syncHarnessProjections(root);
  actions.push(...syncReport.actions, ...syncReport.warnings);

  return actions;
}
