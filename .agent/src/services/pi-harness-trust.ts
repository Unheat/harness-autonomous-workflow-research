import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  PI_AGENT_DIR_ENV,
  PI_DEFAULT_AGENT_SUBPATH,
  PI_LIKE_AGENT_DIRS_ENV,
  PI_PROJECT_CONFIG_DIR,
  PI_PROJECT_MCP_BASENAME,
  PI_TRUST_BASENAME
} from '../config';

/**
 * pi harness trust resolution.
 *
 * A pi-like harness reads `<project>/.pi/mcp.json` only for a trusted project. Trust lives in
 * `<agentDir>/trust.json`, maps a canonical project path to `true`/`false`, and resolves through
 * the nearest ancestor. In non-interactive runs (rpc/print) there is no UI to ask, so an untrusted
 * project is skipped silently — the most common reason a correct projection appears to do nothing.
 *
 * The manager never writes that file: trust belongs to the harness approval flow, so this module
 * only reports the gap (see `autoTrustWorkspaceMcps` deprecation in `mcp-global.ts`).
 */

export type PiTrustDecision = 'trusted' | 'untrusted' | 'unknown';

export interface PiTrustStatus {
  agentDir: string;
  decision: PiTrustDecision;
  /** Path of the matching trust entry (the project itself or an ancestor). */
  matchedPath?: string;
}

/**
 * Expands a leading `~` the way pi does for configured paths.
 *
 * @param value Raw path from an environment variable.
 * @returns Absolute path.
 */
function expandPiPath(value: string): string {
  if (value === '~') return os.homedir();
  if (value.startsWith('~/')) return path.join(os.homedir(), value.slice(2));
  return path.resolve(value);
}

/**
 * Enumerates every agent directory a pi-like harness on this machine may read.
 *
 * The stock location always participates. Harnesses that embed pi relocate the agent directory, so
 * those are picked up from `PI_CODING_AGENT_DIR` (the variable pi itself reads) and from the
 * opt-in `PI_LIKE_AGENT_DIRS` registry — no vendor path is hardcoded here.
 *
 * @returns Deduplicated absolute agent directories, existing or not.
 */
export function discoverPiAgentDirs(): string[] {
  const candidates: string[] = [];
  const fromEnv = process.env[PI_AGENT_DIR_ENV]?.trim();
  if (fromEnv) candidates.push(fromEnv);

  const fromRegistry = process.env[PI_LIKE_AGENT_DIRS_ENV];
  if (fromRegistry) {
    for (const entry of fromRegistry.split(path.delimiter)) {
      if (entry.trim()) candidates.push(entry.trim());
    }
  }

  candidates.push(path.join(os.homedir(), ...PI_DEFAULT_AGENT_SUBPATH));

  return [...new Set(candidates.map(expandPiPath))];
}

/**
 * Filters {@link discoverPiAgentDirs} down to directories that actually exist.
 *
 * @returns Absolute agent directories present on disk.
 */
export function listExistingPiAgentDirs(): string[] {
  return discoverPiAgentDirs().filter(dir => fs.existsSync(dir));
}

/**
 * Canonicalizes a path the way pi's trust store does before comparing entries.
 *
 * @param target Path to canonicalize.
 * @returns Real path when it exists, otherwise a resolved absolute path.
 */
function canonicalizeForTrust(target: string): string {
  const resolved = path.resolve(target);
  try {
    return fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
}

/**
 * Reads a pi trust file, tolerating a missing, malformed or foreign file.
 *
 * @param trustPath Absolute path of `<agentDir>/trust.json`.
 * @returns Map of canonical project path to decision; empty on any read failure.
 */
function readPiTrustFile(trustPath: string): Record<string, boolean | null> {
  if (!fs.existsSync(trustPath)) return {};
  try {
    const raw = fs.readFileSync(trustPath, 'utf-8').replace(/^\uFEFF/, '');
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const entries: Record<string, boolean | null> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value === true || value === false || value === null) entries[key] = value;
    }
    return entries;
  } catch {
    return {};
  }
}

/**
 * Resolves pi's project trust decision for a workspace, mirroring its nearest-ancestor lookup.
 *
 * @param agentDir Agent directory owning `trust.json`.
 * @param workspaceRoot Workspace being opened.
 * @returns Trust decision plus the entry that decided it.
 */
export function readPiProjectTrust(agentDir: string, workspaceRoot: string): PiTrustStatus {
  const trustPath = path.join(agentDir, PI_TRUST_BASENAME);
  if (!fs.existsSync(trustPath)) return { agentDir, decision: 'unknown' };

  const entries = readPiTrustFile(trustPath);
  if (Object.keys(entries).length === 0) return { agentDir, decision: 'unknown' };

  let current = canonicalizeForTrust(workspaceRoot);
  const root = path.parse(current).root;
  while (true) {
    const value = entries[current];
    if (value === true || value === false) {
      return { agentDir, decision: value ? 'trusted' : 'untrusted', matchedPath: current };
    }
    const parent = path.dirname(current);
    if (current === root || parent === current) return { agentDir, decision: 'untrusted' };
    current = parent;
  }
}

/**
 * Reports trust gaps that silently disable the projection for pi-like harnesses.
 *
 * @param workspaceRoot Workspace being audited.
 * @returns One human-readable warning per discovered agent directory that would ignore it.
 */
export function describePiTrustGaps(workspaceRoot: string): string[] {
  const projectionPath = path.join(workspaceRoot, PI_PROJECT_CONFIG_DIR, PI_PROJECT_MCP_BASENAME);
  return listExistingPiAgentDirs().flatMap(agentDir => {
    const status = readPiProjectTrust(agentDir, workspaceRoot);
    if (status.decision === 'trusted') return [];
    const reason = status.matchedPath
      ? `an inherited "untrusted" decision at ${status.matchedPath}`
      : 'no saved trust decision';
    return [
      `pi-like harness at ${agentDir} ignores ${projectionPath} (${reason}). ` +
      'Approve the project once in that harness, or set "defaultProjectTrust": "always" in its settings; ' +
      'the manager must never grant trust on the harness\'s behalf.'
    ];
  });
}
