import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { OPENCODE_PROJECT_CONFIG_DIR, OPENCODE_PROJECT_CONFIG_BASENAME } from '../config';
import type { McpServerConfig } from '../types';
import { isHostManagedMcpEntry } from './host-managed';

/**
 * OpenCode 2 project MCP projection.
 *
 * OpenCode does not read the shared `.mcp.json`; it reads `opencode.json` (or
 * `.opencode/opencode.json`) with servers under `mcp.servers`. Without a generated projection the
 * manager reports workspace servers as ON while OpenCode loads none of them, which breaks the
 * "manager is ground truth" invariant. This file is that projection, regenerated from the hub on
 * every write instead of hand-maintained or symlinked (the dialects differ).
 */

export type OpencodeProjectionState = 'current' | 'missing' | 'stale' | 'blocked';

export interface OpencodeProjectionResult {
  state: OpencodeProjectionState;
  path: string;
  servers: number;
  /** True only when a sync actually rewrote the file (drives idempotent reporting). */
  changed: boolean;
}

/**
 * Resolves the generated OpenCode project config path.
 *
 * @param workspaceRoot Absolute workspace path.
 * @returns Absolute path of `<workspace>/.opencode/opencode.json`.
 */
export function getOpencodeProjectConfigPath(workspaceRoot: string): string {
  return path.join(path.resolve(workspaceRoot), OPENCODE_PROJECT_CONFIG_DIR, OPENCODE_PROJECT_CONFIG_BASENAME);
}

/**
 * Translates hub server declarations into OpenCode 2's `mcp.servers` dialect.
 *
 * Dormant servers are omitted (the manager shows them OFF, so the harness must not load them), and
 * entries owned by another harness installer are skipped so a connection is not duplicated.
 *
 * @param localServers Servers declared in the workspace `.mcp.json`.
 * @returns Server entries ready to place under `mcp.servers`.
 */
export function buildOpencodeMcpServers(localServers: Record<string, McpServerConfig>): Record<string, unknown> {
  const servers: Record<string, unknown> = {};

  for (const [name, config] of Object.entries(localServers ?? {})) {
    if (isHostManagedMcpEntry(config)) continue;
    if (config.enabled === false || config.disabled === true) continue;

    if (config.url) {
      const entry: Record<string, unknown> = { type: 'remote', url: config.url };
      if (config.headers && Object.keys(config.headers).length > 0) entry.headers = config.headers;
      servers[name] = entry;
    } else if (config.command) {
      const entry: Record<string, unknown> = {
        type: 'local',
        command: [config.command, ...(config.args ?? [])]
      };
      if (config.env && Object.keys(config.env).length > 0) entry.environment = config.env;
      if (config.cwd) entry.cwd = config.cwd;
      servers[name] = entry;
    }
  }

  return servers;
}

/**
 * Reads a config file without treating a malformed or foreign file as fatal.
 *
 * @param target Absolute config path.
 * @returns Parsed top-level object, or an empty object.
 */
function readConfigObject(target: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(fs.readFileSync(target, 'utf-8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Builds the projected file, preserving unrelated user settings (model, permissions, ...).
 *
 * @param target Absolute config path.
 * @param servers Projected `mcp.servers`.
 * @returns Deterministic JSON payload.
 */
function buildPayload(target: string, servers: Record<string, unknown>): Record<string, unknown> {
  const existing = readConfigObject(target);
  const existingMcp = existing.mcp && typeof existing.mcp === 'object' && !Array.isArray(existing.mcp)
    ? existing.mcp as Record<string, unknown>
    : {};
  return { ...existing, mcp: { ...existingMcp, servers } };
}

/**
 * Reports whether the projection path is a symlink, which would re-enter the hub.
 *
 * @param target Absolute config path.
 * @returns True when the path is a symbolic link.
 */
function isSymlink(target: string): boolean {
  try {
    return fs.lstatSync(target).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Computes the projection state without writing anything.
 *
 * Only `mcp.servers` is compared, so unrelated user edits to the config file are preserved and do
 * not produce false drift.
 *
 * @param workspaceRoot Workspace being inspected.
 * @param localServers Servers declared in the workspace `.mcp.json`.
 * @returns State, path and projected server count.
 */
export function inspectOpencodeProjection(
  workspaceRoot: string,
  localServers: Record<string, McpServerConfig>
): OpencodeProjectionResult {
  const target = getOpencodeProjectConfigPath(workspaceRoot);
  const expected = buildOpencodeMcpServers(localServers);
  const count = Object.keys(expected).length;

  if (isSymlink(target)) return { state: 'blocked', path: target, servers: count, changed: false };
  if (!fs.existsSync(target)) {
    return { state: count > 0 ? 'missing' : 'current', path: target, servers: count, changed: false };
  }

  const current = readConfigObject(target).mcp;
  const currentServers = current && typeof current === 'object' && !Array.isArray(current)
    ? (current as Record<string, unknown>).servers
    : undefined;
  const matches = JSON.stringify(currentServers ?? {}) === JSON.stringify(expected);

  return { state: matches ? 'current' : 'stale', path: target, servers: count, changed: false };
}

/**
 * Regenerates the OpenCode project projection from the hub declarations.
 *
 * @param workspaceRoot Workspace being synced.
 * @param localServers Servers declared in the workspace `.mcp.json`.
 * @returns State after the sync, path, server count and whether a write occurred.
 */
export async function syncOpencodeProjectMcps(
  workspaceRoot: string,
  localServers: Record<string, McpServerConfig>
): Promise<OpencodeProjectionResult> {
  const inspected = inspectOpencodeProjection(workspaceRoot, localServers);
  if (inspected.state === 'blocked' || inspected.state === 'current') return inspected;

  const servers = buildOpencodeMcpServers(localServers);
  if (Object.keys(servers).length === 0 && !fs.existsSync(inspected.path)) return inspected;

  await fsp.mkdir(path.dirname(inspected.path), { recursive: true });
  const payload = buildPayload(inspected.path, servers);
  const tmpPath = `${inspected.path}.tmp`;
  await fsp.writeFile(tmpPath, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
  await fsp.rename(tmpPath, inspected.path);

  return { ...inspected, state: 'current', changed: true };
}
