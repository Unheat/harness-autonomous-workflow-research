import fs from 'node:fs';
import fsp from 'node:fs/promises';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { GLOBAL_ZCODE_CONFIG } from './config';
import { listLocalMcps } from './mcp';
import { getCatalogMcps } from './catalog';
import type { McpServerConfig, OperationResult, McpScopeState, EffectiveMcpInfo } from './types';

/**
 * Reads Global MCP servers from ~/.zcode/cli/config.json (User Scope).
 */
export async function listGlobalMcps(): Promise<Record<string, McpServerConfig>> {
  if (!fs.existsSync(GLOBAL_ZCODE_CONFIG)) return {};
  try {
    const raw = await fsp.readFile(GLOBAL_ZCODE_CONFIG, 'utf-8');
    const zcfg = JSON.parse(raw);
    return zcfg?.mcp?.servers || {};
  } catch {
    return {};
  }
}

/**
 * Saves Global MCP servers to ~/.zcode/cli/config.json.
 */
export async function saveGlobalMcps(servers: Record<string, McpServerConfig>): Promise<void> {
  if (!fs.existsSync(GLOBAL_ZCODE_CONFIG)) return;
  try {
    const raw = await fsp.readFile(GLOBAL_ZCODE_CONFIG, 'utf-8');
    const zcfg = JSON.parse(raw);
    zcfg.mcp = zcfg.mcp || {};
    zcfg.mcp.servers = servers;
    await fsp.writeFile(GLOBAL_ZCODE_CONFIG, JSON.stringify(zcfg, null, 2) + '\n', 'utf-8');
  } catch (err: any) {
    throw new Error(`Failed to save global config: ${err.message}`);
  }
}

/**
 * Enables a server in Global Scope (User Scope).
 */
export async function enableGlobalMcp(serverName: string): Promise<OperationResult> {
  const globalServers = await listGlobalMcps();
  if (!(serverName in globalServers)) {
    const catalog = await getCatalogMcps();
    if (!(serverName in catalog)) {
      return { success: false, message: `Server "${serverName}" not found in catalog.` };
    }
    globalServers[serverName] = { ...catalog[serverName] };
  }
  delete globalServers[serverName].enabled; // In ZCode, missing enabled or enabled: true is active
  await saveGlobalMcps(globalServers);
  return { success: true, message: `Enabled MCP server "${serverName}" globally (User Scope).` };
}

/**
 * Sets a server to dormant (enabled: false) in Global Scope.
 */
export async function disableGlobalMcp(serverName: string): Promise<OperationResult> {
  const globalServers = await listGlobalMcps();
  if (!(serverName in globalServers)) {
    return { success: false, message: `Server "${serverName}" not in global config.` };
  }
  globalServers[serverName].enabled = false;
  await saveGlobalMcps(globalServers);
  return { success: true, message: `Disabled MCP server "${serverName}" globally (User Scope).` };
}

/**
 * Removes a server from Global Scope.
 * Crucial: Allows individual workspaces to control this server without global shadowing!
 */
export async function removeGlobalMcp(serverName: string): Promise<OperationResult> {
  const globalServers = await listGlobalMcps();
  if (!(serverName in globalServers)) {
    return { success: false, message: `Server "${serverName}" not configured globally.` };
  }
  delete globalServers[serverName];
  await saveGlobalMcps(globalServers);
  return { success: true, message: `Removed "${serverName}" from global config. Workspaces can now manage it independently.` };
}

/**
 * Calculates effective resolution for all servers taking ZCode's "User overrides Workspace" rule into account.
 */
export async function getEffectiveMcpList(workspaceRoot: string): Promise<EffectiveMcpInfo[]> {
  const localMcps = await listLocalMcps(workspaceRoot);
  const globalMcps = await listGlobalMcps();
  const catalogMcps = await getCatalogMcps();

  const allNames = Array.from(new Set([
    ...Object.keys(localMcps),
    ...Object.keys(globalMcps),
    ...Object.keys(catalogMcps)
  ])).sort();

  return allNames.map(name => {
    const inGlobal = name in globalMcps;
    const inLocal = name in localMcps;

    const globalState: McpScopeState = !inGlobal
      ? 'not_configured'
      : (globalMcps[name].enabled !== false ? 'active' : 'dormant');

    const workspaceState: McpScopeState = !inLocal
      ? 'not_configured'
      : (localMcps[name].enabled !== false ? 'active' : 'dormant');

    let effectiveActive = false;
    let isShadowed = false;
    let shadowReason: string | undefined;

    if (globalState === 'active') {
      effectiveActive = true;
      if (workspaceState === 'dormant') {
        isShadowed = true;
        shadowReason = 'Local is OFF, but Global User Scope forces it ON!';
      }
    } else if (globalState === 'dormant') {
      effectiveActive = false;
      if (workspaceState === 'active') {
        isShadowed = true;
        shadowReason = 'Local is ON, but Global User Scope (enabled: false) overrides and blocks it!';
      }
    } else {
      // Not in global -> workspace scope determines effective state
      effectiveActive = (workspaceState === 'active');
    }

    const config = catalogMcps[name] || globalMcps[name] || localMcps[name] || { command: '' };

    return {
      name,
      effectiveActive,
      workspaceActive: (workspaceState === 'active'),
      globalState,
      workspaceState,
      isShadowed,
      shadowReason,
      config
    };
  });
}

/**
 * Automatically grants trust for workspace MCP servers in ~/.zcode/security/workspace-mcp-trust-v1.json.
 */
export async function autoTrustWorkspaceMcps(workspaceRoot: string): Promise<number> {
  const zcodeHome = path.join(os.homedir(), '.zcode');
  if (!fs.existsSync(zcodeHome)) return 0; // Only applies if ZCode is present

  const trustFile = path.join(zcodeHome, 'security', 'workspace-mcp-trust-v1.json');
  const workingDirectory = path.resolve(workspaceRoot);
  const sourcePaths = [path.join(workingDirectory, '.agents', 'mcp.json')];

  const localServers = await listLocalMcps(workingDirectory);
  const catalog = await getCatalogMcps();
  const allServers = { ...catalog, ...localServers };

  let existingRecords: any[] = [];
  try {
    if (fs.existsSync(trustFile)) {
      existingRecords = JSON.parse(await fsp.readFile(trustFile, 'utf-8')).records || [];
    }
  } catch {}

  const recordMap = new Map<string, any>(existingRecords.map(r => [`${r.workspaceIdentity}:${r.serverName}`, r]));
  let grantedCount = 0;

  for (const [serverName, cfg] of Object.entries(allServers)) {
    const config = {
      type: 'stdio',
      command: cfg.command,
      args: cfg.args || [],
      env: cfg.env || {},
      cwd: workingDirectory
    };
    const payload = { version: 1, workspaceIdentity: workingDirectory, workingDirectory, serverName, sourcePaths, config };
    const digest = crypto.createHash('sha256').update(
      JSON.stringify(payload, (t, n) => n && typeof n === 'object' && !Array.isArray(n) ? Object.fromEntries(Object.keys(n).sort().map(o => [o, (n as any)[o]])) : n)
    ).digest('hex');

    const key = `${workingDirectory}:${serverName}`;
    if (!recordMap.has(key) || recordMap.get(key).declarationDigest !== digest) {
      recordMap.set(key, { workspaceIdentity: workingDirectory, serverName, declarationDigest: digest, grantedAt: new Date().toISOString() });
      grantedCount++;
    }
  }

  await fsp.mkdir(path.dirname(trustFile), { recursive: true });
  await fsp.writeFile(trustFile, JSON.stringify({ schemaVersion: 1, records: Array.from(recordMap.values()) }, null, 2) + '\n', 'utf-8');
  return grantedCount;
}
