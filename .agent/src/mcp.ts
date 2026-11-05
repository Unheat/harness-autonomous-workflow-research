import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { getWorkspacePaths, ensureWorkspaceDirs } from './workspace';
import { getCatalogMcps } from './catalog';
import { GLOBAL_CATALOG_DIR, GLOBAL_MCPS_FILE } from './config';
import type { McpServerConfig, OperationResult } from './types';

/**
 * Reads local .mcp.json servers.
 */
export async function listLocalMcps(workspaceRoot: string): Promise<Record<string, McpServerConfig>> {
  const { mcpFile } = getWorkspacePaths(workspaceRoot);
  if (!fs.existsSync(mcpFile)) return {};

  try {
    const raw = await fsp.readFile(mcpFile, 'utf-8');
    const data = JSON.parse(raw);
    return data.mcpServers || {};
  } catch {
    return {};
  }
}

/**
 * Persists servers to local .mcp.json and reconciles .agents/mcp.json symlink.
 */
export async function saveLocalMcps(
  workspaceRoot: string,
  mcpServers: Record<string, McpServerConfig>
): Promise<void> {
  await ensureWorkspaceDirs(workspaceRoot);
  const { mcpFile, agentMcpSymlink } = getWorkspacePaths(workspaceRoot);

  const payload = { mcpServers };
  await fsp.writeFile(mcpFile, JSON.stringify(payload, null, 2) + '\n', 'utf-8');

  // Ensure compatibility symlink .agents/mcp.json -> ../.mcp.json
  const stat = await fsp.lstat(agentMcpSymlink).catch(() => null);
  if (!stat) {
    try {
      await fsp.symlink('../.mcp.json', agentMcpSymlink);
    } catch {}
  }
}

/**
 * Activates an MCP server for the workspace. Copies from catalog if not present.
 */
export async function enableMcp(workspaceRoot: string, serverName: string): Promise<OperationResult> {
  if (!serverName || typeof serverName !== 'string') {
    return { success: false, message: `Invalid server name: "${serverName}"` };
  }

  const localServers = await listLocalMcps(workspaceRoot);

  if (serverName in localServers) {
    localServers[serverName].enabled = true;
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

  localServers[serverName] = serverConfig;
  await saveLocalMcps(workspaceRoot, localServers);
  return { success: true, message: `Added & Enabled MCP server "${serverName}" in this workspace.` };
}

/**
 * Sets an MCP server to dormant (enabled: false) locally.
 * Prevents token injection while preserving configuration.
 */
export async function disableMcp(workspaceRoot: string, serverName: string): Promise<OperationResult> {
  const localServers = await listLocalMcps(workspaceRoot);

  if (!(serverName in localServers)) {
    return { success: false, message: `MCP server "${serverName}" is not configured in this workspace.` };
  }

  localServers[serverName].enabled = false;
  await saveLocalMcps(workspaceRoot, localServers);
  return { success: true, message: `Disabled MCP server "${serverName}" (set to enabled: false, 0 tokens injected).` };
}

/**
 * Removes an MCP server completely from the local workspace .mcp.json.
 */
export async function removeMcp(workspaceRoot: string, serverName: string): Promise<OperationResult> {
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
  if (!serverName || !config?.command) {
    return { success: false, message: 'Server name and command are required.' };
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
