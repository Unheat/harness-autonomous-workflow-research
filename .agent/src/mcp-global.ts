import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { GLOBAL_ZCODE_CONFIG } from './config';
import { listLocalMcps } from './mcp';
import { getCatalogMcps } from './catalog';
import { syncDshProfileMcps } from './mcp-dsh';
import { syncPiUserScopeMcps } from './services/pi-mcp-projection';
import { isHostManagedMcpEntry } from './services/host-managed';
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
 * User scope is the manager's store, so every projection that mirrors it (DSH profile, pi-like
 * agent directories) is refreshed here — a global toggle must reach every harness at once.
 */
export async function saveGlobalMcps(servers: Record<string, McpServerConfig>): Promise<void> {
  if (!fs.existsSync(GLOBAL_ZCODE_CONFIG)) return;
  try {
    const raw = await fsp.readFile(GLOBAL_ZCODE_CONFIG, 'utf-8');
    const zcfg = JSON.parse(raw);
    zcfg.mcp = zcfg.mcp || {};
    zcfg.mcp.servers = servers;
    await fsp.writeFile(GLOBAL_ZCODE_CONFIG, JSON.stringify(zcfg, null, 2) + '\n', 'utf-8');
    await syncDshProfileMcps(servers).catch(() => {});
    await syncPiUserScopeMcps(servers).catch(() => {});
  } catch (err: any) {
    throw new Error(`Failed to save global config: ${err.message}`);
  }
}

/**
 * Enables a server in Global Scope (User Scope).
 */
export async function enableGlobalMcp(serverName: string): Promise<OperationResult> {
  const globalServers = await listGlobalMcps();
  const owned = describeOwnership(serverName, globalServers[serverName]);
  if (owned) return { success: false, message: owned };
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
  const owned = describeOwnership(serverName, globalServers[serverName]);
  if (owned) return { success: false, message: owned };
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
  const owned = describeOwnership(serverName, globalServers[serverName]);
  if (owned) return { success: false, message: owned };
  delete globalServers[serverName];
  await saveGlobalMcps(globalServers);
  return { success: true, message: `Removed "${serverName}" from global config. Workspaces can now manage it independently.` };
}

/**
 * Explains why the manager must not mutate an installer-owned entry.
 *
 * Ownership is decided by `isHostManagedMcpEntry` (env marker, or installer name + path into that
 * installer's own package). Toggling or removing such an entry would desynchronise it from the
 * installer that rewrites it on upgrade, so the manager refuses and names the real owner.
 *
 * @param serverName Server name as declared in the harness config.
 * @param config Parsed server config, when present.
 * @returns A refusal message, or null when the entry is the manager's to mutate.
 */
function describeOwnership(serverName: string, config?: McpServerConfig): string | null {
  if (!isHostManagedMcpEntry(config, serverName)) return null;
  return `Server "${serverName}" is owned by its installer, not by the manager. Use that installer's own command (for billion-context: \`bili plugin remove <host>\`) so its routing and hooks are removed together.`;
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
    // Report installer-owned entries instead of hiding them, but mark them so printers, migration
    // and deletion treat them as another tool's wiring rather than the manager's declaration.
    const hostManaged = isHostManagedMcpEntry(globalMcps[name] || localMcps[name], name);

    return {
      name,
      effectiveActive,
      workspaceActive: (workspaceState === 'active'),
      globalState,
      workspaceState,
      isShadowed,
      shadowReason,
      hostManaged,
      config
    };
  });
}

/**
 * @deprecated Trust belongs to the harness approval flow, never workspace repair.
 * Retained as a no-op for callers using the previous API.
 */
export async function autoTrustWorkspaceMcps(_workspaceRoot: string): Promise<number> {
  return 0;
}
