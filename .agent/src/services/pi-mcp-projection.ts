import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { PI_PROJECT_CONFIG_DIR, PI_PROJECT_MCP_BASENAME } from '../config';
import type { McpServerConfig } from '../types';
import { buildPiProjection, serializePiProjection, type PiProjectionIssue } from './pi-mcp-dialect';
import { listExistingPiAgentDirs } from './pi-harness-trust';

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
  /** True only when a sync actually rewrote the file (drives idempotent reporting). */
  changed: boolean;
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
 * Computes the projection state at an arbitrary target without writing anything.
 *
 * A target that does not exist yet and has nothing to project counts as current, so a harness
 * that was never used on this machine is not reported as drifted.
 *
 * @param target Absolute projection path.
 * @param servers Servers the manager wants that harness to load.
 * @returns State, path, projected server count and per-server issues.
 */
function inspectAt(target: string, servers: Record<string, McpServerConfig>): PiProjectionResult {
  const { payload, issues } = buildPiProjection(servers);
  const count = Object.keys(payload.mcpServers).length;

  if (isSymlinkedProjection(target)) return { state: 'blocked', path: target, servers: count, issues, changed: false };
  if (!fs.existsSync(target)) {
    return { state: count > 0 ? 'missing' : 'current', path: target, servers: count, issues, changed: false };
  }

  try {
    const current = fs.readFileSync(target, 'utf-8');
    return {
      state: current === serializePiProjection(payload) ? 'current' : 'stale',
      path: target,
      servers: count,
      issues,
      changed: false
    };
  } catch {
    return { state: 'stale', path: target, servers: count, issues, changed: false };
  }
}

/**
 * Writes the projection at an arbitrary target when it drifted.
 *
 * Skips work when the target is a symlink (heal prunes it instead), when there is nothing to
 * project and no file yet, or when the content is already current. The write is atomic so a crash
 * cannot leave a truncated config in a harness load path.
 *
 * @param target Absolute projection path.
 * @param servers Servers the manager wants that harness to load.
 * @returns State after the sync.
 */
async function syncAt(target: string, servers: Record<string, McpServerConfig>): Promise<PiProjectionResult> {
  const inspected = inspectAt(target, servers);
  if (inspected.state === 'blocked' || inspected.state === 'current') return inspected;

  const { payload } = buildPiProjection(servers);
  if (Object.keys(payload.mcpServers).length === 0 && !fs.existsSync(inspected.path)) return inspected;

  await fsp.mkdir(path.dirname(inspected.path), { recursive: true });
  const tmpPath = `${inspected.path}.tmp`;
  await fsp.writeFile(tmpPath, serializePiProjection(payload), 'utf-8');
  await fsp.rename(tmpPath, inspected.path);

  return { ...inspected, state: 'current', changed: true };
}

/**
 * Computes the project-scope projection state without writing anything.
 *
 * @param workspaceRoot Workspace being inspected.
 * @param localServers Servers declared in the workspace `.mcp.json`.
 * @returns State, path, projected server count and per-server issues.
 */
export function inspectPiProjection(
  workspaceRoot: string,
  localServers: Record<string, McpServerConfig>
): PiProjectionResult {
  return inspectAt(getPiProjectMcpPath(workspaceRoot), localServers);
}

/**
 * Regenerates the pi project projection from the hub declarations.
 *
 * @param workspaceRoot Workspace being synced.
 * @param localServers Servers declared in the workspace `.mcp.json`.
 * @returns State after the sync, path, server count and per-server issues.
 */
export async function syncPiProjectMcps(
  workspaceRoot: string,
  localServers: Record<string, McpServerConfig>
): Promise<PiProjectionResult> {
  return syncAt(getPiProjectMcpPath(workspaceRoot), localServers);
}

/**
 * Resolves the user-scope config path for one pi-like agent directory.
 *
 * @param agentDir Absolute agent directory of that harness.
 * @returns Absolute path of `<agentDir>/mcp.json`.
 */
export function getPiUserScopeMcpPath(agentDir: string): string {
  return path.join(path.resolve(agentDir), PI_PROJECT_MCP_BASENAME);
}

/**
 * Computes the user-scope projection state for one agent directory without writing anything.
 *
 * @param agentDir Absolute agent directory of that harness.
 * @param globalServers Servers active in the manager's user scope.
 * @returns State, path, projected server count and per-server issues.
 */
export function inspectPiUserScope(
  agentDir: string,
  globalServers: Record<string, McpServerConfig>
): PiProjectionResult {
  return inspectAt(getPiUserScopeMcpPath(agentDir), globalServers);
}

/**
 * Projects the manager's user scope into every pi-like harness present on this machine.
 *
 * This is what keeps a hand-maintained `<agentDir>/mcp.json` from drifting away from the manager:
 * the file becomes a generated artifact of the same global scope that `harness mcp global` edits,
 * exactly like the DSH profile patch. Directories that do not exist are skipped, so an unused
 * harness is never materialised. Hand-declared harness servers are not silently dropped: run
 * `harness clean-global` first, which migrates them into the catalog before this projection
 * narrows the file to the manager's active set.
 *
 * @param globalServers Servers active in the manager's user scope.
 * @returns One result per existing pi-like agent directory.
 */
export async function syncPiUserScopeMcps(
  globalServers: Record<string, McpServerConfig>
): Promise<PiProjectionResult[]> {
  const results: PiProjectionResult[] = [];
  for (const agentDir of listExistingPiAgentDirs()) {
    results.push(await syncAt(getPiUserScopeMcpPath(agentDir), globalServers));
  }
  return results;
}
