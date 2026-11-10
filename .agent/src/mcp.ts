import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { getWorkspacePaths, ensureWorkspaceDirs } from './workspace';
import { getCatalogMcps } from './catalog';
import { GLOBAL_CATALOG_DIR, GLOBAL_MCPS_FILE } from './config';
import { syncDshProfileMcps } from './mcp-dsh';
import { syncPiProjectMcps } from './services/pi-mcp-projection';
import type { McpServerConfig, OperationResult } from './types';

function isValidName(name: string): boolean {
  return !(!name || typeof name !== 'string' || name.includes('..') || name.includes('/') || name.includes('\\'));
}

/**
 * Reads local .mcp.json servers.
 * Bi-directional sync: If .agents/mcp.json was edited by ZCode GUI, auto-syncs to .mcp.json.
 */
export async function listLocalMcps(workspaceRoot: string): Promise<Record<string, McpServerConfig>> {
  const { mcpFile, agentMcpSymlink } = getWorkspacePaths(workspaceRoot);

  try {
    const statLocal = fs.existsSync(mcpFile) ? await fsp.stat(mcpFile) : null;
    const statAgents = fs.existsSync(agentMcpSymlink) ? await fsp.stat(agentMcpSymlink) : null;

    if (statAgents && (!statLocal || statAgents.mtimeMs > statLocal.mtimeMs)) {
      const raw = await fsp.readFile(agentMcpSymlink, 'utf-8');
      const data = JSON.parse(raw);
      const servers = (data && typeof data === 'object' && data.mcpServers) ? data.mcpServers : {};
      if (fs.existsSync(mcpFile)) {
        await fsp.writeFile(mcpFile, JSON.stringify({ mcpServers: servers }, null, 2) + '\n', 'utf-8');
      }
      return servers;
    }
  } catch {}

  if (!fs.existsSync(mcpFile)) return {};

  try {
    const raw = await fsp.readFile(mcpFile, 'utf-8');
    const data = JSON.parse(raw);
    return (data && typeof data === 'object' && data.mcpServers) ? data.mcpServers : {};
  } catch {
    return {};
  }
}

/**
 * Persists servers to local .mcp.json and .agents/mcp.json in lockstep.
 * Also projects them into every harness whose dialect differs from the hub
 * (DeepSeek Harness profile, pi-like `.pi/mcp.json`).
 */
export async function saveLocalMcps(
  workspaceRoot: string,
  mcpServers: Record<string, McpServerConfig>
): Promise<void> {
  await ensureWorkspaceDirs(workspaceRoot);
  const { mcpFile, agentMcpSymlink } = getWorkspacePaths(workspaceRoot);

  const payload = JSON.stringify({ mcpServers: mcpServers || {} }, null, 2) + '\n';
  await fsp.writeFile(mcpFile, payload, 'utf-8');

  try {
    await fsp.writeFile(agentMcpSymlink, payload, 'utf-8');
  } catch {}

  // Synchronize enabled MCP servers into DeepSeek Harness desktop profile
  await syncDshProfileMcps(mcpServers).catch(() => {});

  // Regenerate the pi-like harness projection (.pi/mcp.json) from the same source of truth
  await syncPiProjectMcps(workspaceRoot, mcpServers).catch(() => {});
}

/**
 * Activates an MCP server for the workspace. Copies from catalog if not present.
 */
export async function enableMcp(workspaceRoot: string, serverName: string): Promise<OperationResult> {
  if (!isValidName(serverName)) {
    return { success: false, message: `Invalid server name: "${serverName}"` };
  }

  const localServers = await listLocalMcps(workspaceRoot);

  if (serverName in localServers) {
    localServers[serverName].enabled = true;
    delete (localServers[serverName] as any).disabled;
    await saveLocalMcps(workspaceRoot, localServers);
    return { success: true, message: `Enabled MCP server "${serverName}" in this workspace.` };
  }

  const catalog = await getCatalogMcps();
  if (!(serverName in catalog)) {
    return { success: false, message: `MCP server "${serverName}" not found in catalog (~/.agents/catalog/mcps.json).` };
  }

  const serverConfig: McpServerConfig = { ...catalog[serverName] };
  delete serverConfig.description; // Keep local JSON lean
  serverConfig.enabled = true;
  delete (serverConfig as any).disabled;

  localServers[serverName] = serverConfig;
  await saveLocalMcps(workspaceRoot, localServers);
  return { success: true, message: `Added & Enabled MCP server "${serverName}" in this workspace.` };
}

/**
 * Sets an MCP server to dormant (enabled: false & disabled: true) locally.
 * Prevents token injection across both Claude/Cursor and DSH while preserving configuration.
 */
export async function disableMcp(workspaceRoot: string, serverName: string): Promise<OperationResult> {
  if (!isValidName(serverName)) {
    return { success: false, message: `Invalid server name: "${serverName}"` };
  }

  const localServers = await listLocalMcps(workspaceRoot);

  if (!(serverName in localServers)) {
    return { success: false, message: `MCP server "${serverName}" is not configured in this workspace.` };
  }

  localServers[serverName].enabled = false;
  (localServers[serverName] as any).disabled = true;
  await saveLocalMcps(workspaceRoot, localServers);
  return { success: true, message: `Disabled MCP server "${serverName}" (set to enabled: false, 0 tokens injected).` };
}

/**
 * Removes an MCP server completely from the local workspace .mcp.json.
 */
export async function removeMcp(workspaceRoot: string, serverName: string): Promise<OperationResult> {
  if (!isValidName(serverName)) {
    return { success: false, message: `Invalid server name: "${serverName}"` };
  }

  const localServers = await listLocalMcps(workspaceRoot);

  if (!(serverName in localServers)) {
    return { success: false, message: `MCP server "${serverName}" is not configured in this workspace.` };
  }

  delete localServers[serverName];
  await saveLocalMcps(workspaceRoot, localServers);
  return { success: true, message: `Removed MCP server "${serverName}" from local .mcp.json.` };
}

/**
 * Registers or updates a server definition in the central machine catalog (~/.agents/catalog/mcps.json).
 */
export async function registerMcpInCatalog(
  serverName: string,
  config: { command: string; args?: string[]; env?: Record<string, string>; description?: string }
): Promise<OperationResult> {
  if (!isValidName(serverName) || !config?.command) {
    return { success: false, message: 'Valid server name and command are required.' };
  }

  const catalog = await getCatalogMcps();
  catalog[serverName] = {
    command: config.command,
    args: config.args || [],
    env: config.env || {},
    description: config.description || 'Custom MCP Server'
  };

  await fsp.mkdir(GLOBAL_CATALOG_DIR, { recursive: true });
  await fsp.writeFile(GLOBAL_MCPS_FILE, JSON.stringify({ version: '1.0.0', mcpServers: catalog }, null, 2) + '\n', 'utf-8');

  return { success: true, message: `Registered MCP server "${serverName}" in global catalog (~/.agents/catalog/mcps.json).` };
}
