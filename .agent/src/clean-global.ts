import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { GLOBAL_CATALOG_SKILLS_DIR, GLOBAL_SKILLS_DIR, GLOBAL_ZCODE_CONFIG, GLOBAL_CATALOG_DIR, GLOBAL_MCPS_FILE } from './config';
import { syncSkillToCatalog, getCatalogMcps } from './catalog';
import { listExistingPiAgentDirs } from './services/pi-harness-trust';
import { listGlobalMcps } from './mcp-global';
import type { CleanGlobalResult } from './types';

export interface CleanGlobalOptions {
  skills?: boolean;
  mcp?: boolean;
  all?: boolean;
  keepSkills?: string[];
}

export const DEFAULT_GLOBAL_SKILLS_WHITELIST = ['harness-protocol', 'agent-reach'];

/**
 * Harness built-in internal / system servers that MUST NEVER be migrated or stripped.
 * Examples: Codex's internal node_repl bridge or native computer-use runtime.
 */
export const HARNESS_INTERNAL_SERVERS = new Set(['node_repl', 'computer-use']);

export interface UnmigratedHarnessMcp {
  harness: string;
  filePath: string;
  servers: Record<string, any>;
}

/**
 * Discovers any unmigrated global MCP servers defined directly inside harness configs:
 * - ~/.zcode/cli/config.json (mcp.servers)
 * - ~/.claude/.mcp.json or ~/.claude/settings.json (mcpServers)
 * - ~/.cursor/mcp.json (mcpServers)
 * - ~/.codex/config.toml (mcp_servers)
 * - ~/.config/opencode/opencode.json (mcpServers)
 * - <agentDir>/mcp.json for every pi-like harness (stock ~/.pi/agent plus registered relocations)
 */
export async function discoverUnmigratedHarnessMcps(): Promise<UnmigratedHarnessMcp[]> {
  const home = os.homedir();
  const results: UnmigratedHarnessMcp[] = [];

  // Helper to filter out harness internal/system servers
  const filterExternal = (servers: Record<string, any>) => {
    return Object.fromEntries(
      Object.entries(servers).filter(([name, cfg]) => {
        if (HARNESS_INTERNAL_SERVERS.has(name)) return false;
        return cfg && Object.keys(cfg).length > 0;
      })
    );
  };

  // 1. ZCode: ~/.zcode/cli/config.json
  if (fs.existsSync(GLOBAL_ZCODE_CONFIG)) {
    try {
      const raw = await fsp.readFile(GLOBAL_ZCODE_CONFIG, 'utf-8');
      const zcfg = JSON.parse(raw);
      const servers = filterExternal(zcfg?.mcp?.servers || {});
      if (Object.keys(servers).length > 0) {
        results.push({ harness: 'ZCode', filePath: GLOBAL_ZCODE_CONFIG, servers });
      }
    } catch {}
  }

  // 2. Claude: ~/.claude/.mcp.json
  const claudeMcp = path.join(home, '.claude', '.mcp.json');
  if (fs.existsSync(claudeMcp)) {
    try {
      const raw = await fsp.readFile(claudeMcp, 'utf-8');
      const cfg = JSON.parse(raw);
      const servers = filterExternal(cfg?.mcpServers || {});
      if (Object.keys(servers).length > 0) {
        results.push({ harness: 'Claude Code', filePath: claudeMcp, servers });
      }
    } catch {}
  }

  // 3. Cursor: ~/.cursor/mcp.json
  const cursorMcp = path.join(home, '.cursor', 'mcp.json');
  if (fs.existsSync(cursorMcp)) {
    try {
      const raw = await fsp.readFile(cursorMcp, 'utf-8');
      const cfg = JSON.parse(raw);
      const servers = filterExternal(cfg?.mcpServers || {});
      if (Object.keys(servers).length > 0) {
        results.push({ harness: 'Cursor', filePath: cursorMcp, servers });
      }
    } catch {}
  }

  // 4. Codex: ~/.codex/config.toml ([mcp_servers])
  const codexToml = path.join(home, '.codex', 'config.toml');
  if (fs.existsSync(codexToml)) {
    try {
      const raw = await fsp.readFile(codexToml, 'utf-8');
      const { TOML } = await import('bun');
      const parsed: any = TOML.parse(raw);
      const servers = filterExternal(parsed?.mcp_servers || {});
      if (Object.keys(servers).length > 0) {
        results.push({ harness: 'Codex', filePath: codexToml, servers });
      }
    } catch {}
  }

  // 5. OpenCode: ~/.config/opencode/opencode.json or ~/.opencode/opencode.json
  const opencodeLocations = [
    path.join(home, '.config', 'opencode', 'opencode.json'),
    path.join(home, '.opencode', 'opencode.json'),
    path.join(home, '.config', 'opencode', 'config.json')
  ];
  for (const loc of opencodeLocations) {
    if (fs.existsSync(loc)) {
      try {
        const raw = await fsp.readFile(loc, 'utf-8');
        const cfg = JSON.parse(raw);
        const servers = filterExternal(cfg?.mcpServers || cfg?.mcp?.servers || {});
        if (Object.keys(servers).length > 0) {
          results.push({ harness: 'OpenCode', filePath: loc, servers });
          break;
        }
      } catch {}
    }
  }

  // 6. pi-like harnesses: <agentDir>/mcp.json. Stock pi lives at ~/.pi/agent; hosts that embed
  // pi relocate their agent directory, so the registry is consulted instead of a vendor path.
  // The file is a GENERATED projection of the manager's user scope, so names the manager already
  // owns are not declarations: only extra names are unmigrated and worth centralising.
  const managedUserScope = new Set(Object.keys(await listGlobalMcps()));
  for (const agentDir of listExistingPiAgentDirs()) {
    const piMcp = path.join(agentDir, 'mcp.json');
    if (!fs.existsSync(piMcp)) continue;
    try {
      const raw = await fsp.readFile(piMcp, 'utf-8');
      const cfg = JSON.parse(raw);
      const declared = filterExternal(cfg?.mcpServers || {});
      const servers = Object.fromEntries(
        Object.entries(declared).filter(([name]) => !managedUserScope.has(name))
      );
      if (Object.keys(servers).length > 0) {
        results.push({ harness: `pi-like (${agentDir})`, filePath: piMcp, servers });
      }
    } catch {}
  }

  return results;
}

/**
 * Removes one TOML table plus its sub-tables from a config file's text.
 *
 * The table path is matched exactly (`[mcp_servers.foo]`, `[mcp_servers.foo.env]`), never as a
 * prefix, so migrating `foo` cannot delete `foo_bar`. Sub-tables are removed one pass at a time
 * because each removal ends at the next `[` header.
 *
 * @param content Full TOML text.
 * @param tablePath Dotted table path without brackets, e.g. `mcp_servers.search2ai`.
 * @returns Text with the table removed plus whether anything matched.
 */
export function removeTomlTable(content: string, tablePath: string): { content: string; removed: boolean } {
  const escaped = tablePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // `(?:\.[^\]]*)?` after the path prevents `foo` from matching `foo_bar`.
  const source = `\\[${escaped}(?:\\.[^\\]]*)?\\][\\s\\S]*?(?=\\n\\[|$)`;
  const probe = new RegExp(source);
  let removed = false;
  let current = content;
  while (probe.test(current)) {
    current = current.replace(new RegExp(source, 'g'), '');
    removed = true;
  }
  return { content: current, removed };
}

/**
 * Migrates unmigrated harness MCP servers into the central catalog (~/.agents/catalog/mcps.json)
 * and cleans them up from the harness configs to eliminate duplicate declarations.
 */
export async function centralizeHarnessMcps(): Promise<string[]> {
  const actions: string[] = [];
  const unmigrated = await discoverUnmigratedHarnessMcps();
  if (unmigrated.length === 0) return actions;

  const catalog = await getCatalogMcps();
  let catalogUpdated = false;

  for (const item of unmigrated) {
    for (const [name, srvConfig] of Object.entries(item.servers)) {
      if (!catalog[name]) {
        // Deep clone config and normalize
        const clone = { ...srvConfig };
        catalog[name] = clone;
        catalogUpdated = true;
        actions.push(`Centralized MCP "${name}" from ${item.harness} into central catalog (~/.agents/catalog/mcps.json)`);
      } else {
        actions.push(`Merged duplicate MCP "${name}" from ${item.harness} into central catalog`);
      }
    }

    // Clean up harness config
    try {
      if (item.filePath === GLOBAL_ZCODE_CONFIG) {
        const raw = await fsp.readFile(GLOBAL_ZCODE_CONFIG, 'utf-8');
        const zcfg = JSON.parse(raw);
        // ZCode stores sibling `mcp.*` settings beside `mcp.servers` and preserves them itself
        // (`mcp: { ...previous, servers }`), so only the migrated names may be removed.
        if (zcfg.mcp?.servers) {
          let removed = 0;
          for (const name of Object.keys(item.servers)) {
            if (name in zcfg.mcp.servers) {
              delete zcfg.mcp.servers[name];
              removed++;
            }
          }
          if (removed > 0) {
            const mcpKeys = Object.keys(zcfg.mcp);
            if (mcpKeys.length === 1 && mcpKeys[0] === 'servers') delete zcfg.mcp;
            await fsp.writeFile(GLOBAL_ZCODE_CONFIG, JSON.stringify(zcfg, null, 2) + '\n', 'utf-8');
            actions.push(`Removed ${removed} migrated MCP server(s) from ${item.harness} config (${path.basename(item.filePath)})`);
          }
        }
      } else if (item.filePath.endsWith('.toml')) {
        // For TOML configs like ~/.codex/config.toml, surgical regex removal of migrated [mcp_servers.<name>] sections
        let content = await fsp.readFile(item.filePath, 'utf-8');
        let modified = false;
        for (const name of Object.keys(item.servers)) {
          const { content: next, removed } = removeTomlTable(content, `mcp_servers.${name}`);
          if (removed) {
            content = next;
            modified = true;
          }
        }
        if (modified) {
          await fsp.writeFile(item.filePath, content, 'utf-8');
          actions.push(`Removed migrated MCP servers from ${item.harness} config (${path.basename(item.filePath)})`);
        }
      } else {
        const raw = await fsp.readFile(item.filePath, 'utf-8');
        const cfg = JSON.parse(raw);
        let modified = false;
        if (cfg.mcpServers) {
          for (const name of Object.keys(item.servers)) {
            delete cfg.mcpServers[name];
            modified = true;
          }
        }
        if (cfg.mcp && cfg.mcp.servers) {
          for (const name of Object.keys(item.servers)) {
            delete cfg.mcp.servers[name];
            modified = true;
          }
        }
        if (modified) {
          await fsp.writeFile(item.filePath, JSON.stringify(cfg, null, 2) + '\n', 'utf-8');
          actions.push(`Removed migrated MCP servers from ${item.harness} config (${path.basename(item.filePath)})`);
        }
      }
    } catch (err: any) {
      actions.push(`Warning: Failed to clean ${item.filePath}: ${err.message}`);
    }
  }

  if (catalogUpdated) {
    await fsp.mkdir(GLOBAL_CATALOG_DIR, { recursive: true });
    await fsp.writeFile(GLOBAL_MCPS_FILE, JSON.stringify({ version: '1.0.0', mcpServers: catalog }, null, 2) + '\n', 'utf-8');
  }

  return actions;
}

/**
 * Re-targets workspace symlinks that were pointing to old ~/.agents/skills/ to ~/.agents/catalog/skills/.
 */
export async function retargetWorkspaceSkillSymlinks(workspaceRoot: string): Promise<string[]> {
  const actions: string[] = [];
  const skillsDir = path.join(workspaceRoot, '.agents', 'skills');
  if (!fs.existsSync(skillsDir)) return actions;

  try {
    const entries = await fsp.readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        const linkPath = path.join(skillsDir, entry.name);
        try {
          const currentTarget = await fsp.readlink(linkPath);
          if (currentTarget.includes('.agents/skills/') && !currentTarget.includes('.agents/catalog/skills/')) {
            const skillName = path.basename(currentTarget);
            const catalogTarget = path.join(GLOBAL_CATALOG_SKILLS_DIR, skillName);
            if (fs.existsSync(catalogTarget)) {
              await fsp.unlink(linkPath);
              await fsp.symlink(catalogTarget, linkPath);
              actions.push(`Re-targeted skill link "${entry.name}" to central catalog`);
            }
          }
        } catch {}
      }
    }
  } catch {}
  return actions;
}

/**
 * Sweeps skills from global user scope, archiving them to central catalog first.
 */
export async function cleanGlobalSkills(keepSkills: string[] = DEFAULT_GLOBAL_SKILLS_WHITELIST): Promise<string[]> {
  const actions: string[] = [];
  const home = os.homedir();

  // 1. Clean ~/.agents/skills/
  if (fs.existsSync(GLOBAL_SKILLS_DIR)) {
    try {
      const entries = await fsp.readdir(GLOBAL_SKILLS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (keepSkills.includes(entry.name)) continue;

        const fullPath = path.join(GLOBAL_SKILLS_DIR, entry.name);
        const catalogPath = path.join(GLOBAL_CATALOG_SKILLS_DIR, entry.name);

        // Ensure archived in catalog
        if (!fs.existsSync(path.join(catalogPath, 'SKILL.md'))) {
          if (!await syncSkillToCatalog(fullPath, entry.name)) {
            actions.push(`Preserved global skill ${entry.name}: catalog archive failed`);
            continue;
          }
        }

        try {
          if (entry.isSymbolicLink()) {
            await fsp.unlink(fullPath);
          } else {
            await fsp.rm(fullPath, { recursive: true, force: true });
          }
          actions.push(`Archived to catalog & removed global skill: ${entry.name}`);
        } catch (err: any) {
          actions.push(`Failed to remove global skill ${entry.name}: ${err.message}`);
        }
      }
    } catch {}
  }

  // 2. Clean ~/.claude/skills and ~/.zcode/skills
  const auxiliaryDirs = [
    path.join(home, '.claude', 'skills'),
    path.join(home, '.zcode', 'skills')
  ];

  for (const dir of auxiliaryDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (keepSkills.includes(entry.name)) continue;
        const p = path.join(dir, entry.name);
        if (!await syncSkillToCatalog(p, entry.name)) {
          actions.push(`Preserved global skill ${entry.name}: catalog archive failed`);
          continue;
        }
        try {
          if (entry.isSymbolicLink()) {
            await fsp.unlink(p);
          } else {
            await fsp.rm(p, { recursive: true, force: true });
          }
        } catch {}
      }
    } catch {}
  }

  // 3. Prune dead skill paths from ~/.zcode/cli/config.json
  if (fs.existsSync(GLOBAL_ZCODE_CONFIG)) {
    try {
      const raw = await fsp.readFile(GLOBAL_ZCODE_CONFIG, 'utf-8');
      const zcfg = JSON.parse(raw);
      if (zcfg.skills) {
        const cleanedSkills: Record<string, any> = {};
        let pruned = 0;
        for (const [k, v] of Object.entries(zcfg.skills)) {
          if (fs.existsSync(k)) {
            cleanedSkills[k] = v;
          } else {
            pruned++;
          }
        }
        if (pruned > 0) {
          zcfg.skills = cleanedSkills;
          await fsp.writeFile(GLOBAL_ZCODE_CONFIG, JSON.stringify(zcfg, null, 2) + '\n', 'utf-8');
          actions.push(`Pruned ${pruned} stale skill restriction(s) from ZCode config`);
        }
      }
    } catch {}
  }

  return actions;
}

/**
 * Sanitizes global MCP servers in ~/.zcode/cli/config.json and centralizes them.
 */
export async function cleanGlobalMcps(): Promise<string[]> {
  const actions: string[] = [];
  const migrationActions = await centralizeHarnessMcps();
  actions.push(...migrationActions);

  if (fs.existsSync(GLOBAL_ZCODE_CONFIG)) {
    try {
      const raw = await fsp.readFile(GLOBAL_ZCODE_CONFIG, 'utf-8');
      const zcfg = JSON.parse(raw);
      if (zcfg.mcp && zcfg.mcp.servers) {
        for (const heavy of ['rea', 'local-pdf-rag']) {
          if (zcfg.mcp.servers[heavy] && zcfg.mcp.servers[heavy].enabled !== false) {
            zcfg.mcp.servers[heavy].enabled = false;
            actions.push(`Set global server "${heavy}" to inactive (enabled: false) to prevent token bloat`);
          }
        }
        await fsp.writeFile(GLOBAL_ZCODE_CONFIG, JSON.stringify(zcfg, null, 2) + '\n', 'utf-8');
      }
    } catch (err: any) {
      actions.push(`Failed to update ZCode global config: ${err.message}`);
    }
  }
  return actions;
}

/**
 * Unified clean-global supporting flags:
 * - default: cleans both MCP and skills
 * - --skills: cleans only skills
 * - --mcp: cleans only MCPs
 * - --all: cleans all skills without whitelist
 */
export async function cleanGlobal(options?: CleanGlobalOptions): Promise<CleanGlobalResult> {
  const doSkills = options?.skills ?? (options?.mcp ? false : true);
  const doMcp = options?.mcp ?? (options?.skills ? false : true);
  const keepSkills = options?.all ? [] : (options?.keepSkills ?? DEFAULT_GLOBAL_SKILLS_WHITELIST);

  const actions: string[] = [];
  if (doSkills) {
    const skillActions = await cleanGlobalSkills(keepSkills);
    actions.push(...skillActions);
  }
  if (doMcp) {
    const mcpActions = await cleanGlobalMcps();
    actions.push(...mcpActions);
  }

  return {
    success: true,
    actions: actions.length > 0 ? actions : ['Global configuration is already clean and optimal.']
  };
}
