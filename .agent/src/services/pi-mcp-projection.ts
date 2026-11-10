import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { PI_PROJECT_CONFIG_DIR, PI_PROJECT_MCP_BASENAME } from '../config';
import type { McpServerConfig } from '../types';
import { buildPiProjection, serializePiProjection, type PiProjectionIssue } from './pi-mcp-dialect';

/**
 * pi project MCP projection lifecycle.
 *
 * pi-like harnesses do not read the shared `.mcp.json`; they read `<workspace>/.pi/mcp.json`. That
 * file is therefore GENERATED from the hub instead of symlinked, for two reasons:
 *
 * 1. the dialects differ (see `pi-mcp-dialect.ts`), and a link would feed hub keys to pi verbatim;
 * 2. a link would turn any pi-side write (`/mcp` toggles rewrite the file that defines a server)
 *    into a mutation of the shared hub, silently breaking every other harness.
 */

export type PiProjectionState = 'current' | 'missing' | 'stale' | 'blocked';

export interface PiProjectionResult {
  state: PiProjectionState;
  path: string;
  servers: number;
  issues: PiProjectionIssue[];
}

/**
 * Resolves the project-scope config path for pi-like harnesses.
 *
 * @param workspaceRoot Absolute workspace path.
 * @returns Absolute path of `<workspace>/.pi/mcp.json`.
 */
export function getPiProjectMcpPath(workspaceRoot: string): string {
  return path.join(path.resolve(workspaceRoot), PI_PROJECT_CONFIG_DIR, PI_PROJECT_MCP_BASENAME);
}

/**
 * Reports whether the projection path is a symlink, which would re-enter the hub.
 *
 * @param target Absolute projection path.
 * @returns True when the path is a symbolic link.
 */
function isSymlinkedProjection(target: string): boolean {
  try {
    return fs.lstatSync(target).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Computes the projection state without writing anything.
 *
 * A workspace without servers needs no projection, so a missing file counts as current there.
 *
 * @param workspaceRoot Workspace being inspected.
 * @param localServers Servers declared in the workspace `.mcp.json`.
 * @returns State, path, projected server count and per-server issues.
 */
export function inspectPiProjection(
  workspaceRoot: string,
  localServers: Record<string, McpServerConfig>
): PiProjectionResult {
  const target = getPiProjectMcpPath(workspaceRoot);
  const { payload, issues } = buildPiProjection(localServers);
  const servers = Object.keys(payload.mcpServers).length;

  if (isSymlinkedProjection(target)) return { state: 'blocked', path: target, servers, issues };
  if (!fs.existsSync(target)) {
    return { state: servers > 0 ? 'missing' : 'current', path: target, servers, issues };
  }

  try {
    const current = fs.readFileSync(target, 'utf-8');
    return { state: current === serializePiProjection(payload) ? 'current' : 'stale', path: target, servers, issues };
  } catch {
    return { state: 'stale', path: target, servers, issues };
  }
}

/**
 * Regenerates the pi project projection from the hub declarations.
 *
 * Skips work when the target is a symlink (heal prunes it instead), when the workspace has no
 * servers and no file yet, or when the content is already current. The write is atomic so a crash
 * cannot leave a truncated config in a harness load path.
 *
 * @param workspaceRoot Workspace being synced.
 * @param localServers Servers declared in the workspace `.mcp.json`.
 * @returns State after the sync, path, server count and per-server issues.
 */
export async function syncPiProjectMcps(
  workspaceRoot: string,
  localServers: Record<string, McpServerConfig>
): Promise<PiProjectionResult> {
  const inspected = inspectPiProjection(workspaceRoot, localServers);
  if (inspected.state === 'blocked' || inspected.state === 'current') return inspected;

  const { payload } = buildPiProjection(localServers);
  const servers = Object.keys(payload.mcpServers).length;
  if (servers === 0 && !fs.existsSync(inspected.path)) return inspected;

  await fsp.mkdir(path.dirname(inspected.path), { recursive: true });
  const tmpPath = `${inspected.path}.tmp`;
  await fsp.writeFile(tmpPath, serializePiProjection(payload), 'utf-8');
  await fsp.rename(tmpPath, inspected.path);

  return { ...inspected, state: 'current' };
}
