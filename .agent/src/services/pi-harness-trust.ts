import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  PI_AGENT_DIR_ENV,
  PI_DEFAULT_AGENT_SUBPATH,
  PI_LIKE_AGENT_DIRS_ENV,
  PI_PROJECT_CONFIG_DIR,
  PI_PROJECT_MCP_BASENAME,
  PI_SETTINGS_BASENAME,
  PI_TRUST_BASENAME,
  PI_DEFAULT_PROJECT_TRUST_VALUES,
  type PiDefaultProjectTrust
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
  /** Settings fallback pi uses when no trust entry matches. */
  defaultProjectTrust?: PiDefaultProjectTrust;
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
 * Symlinked duplicates are collapsed by real path: an app that relocates its agent dir and also
 * leaves the stock `~/.pi/agent` symlink pointing at it is one harness, not two.
 *
 * @returns Absolute agent directories present on disk, first spelling preserved.
 */
export function listExistingPiAgentDirs(): string[] {
  const seen = new Set<string>();
  const dirs: string[] = [];
  for (const dir of discoverPiAgentDirs()) {
    if (!fs.existsSync(dir)) continue;
    const key = canonicalizeForTrust(dir);
    if (seen.has(key)) continue;
    seen.add(key);
    dirs.push(dir);
  }
  return dirs;
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
 * Reads pi's `defaultProjectTrust` setting from `<agentDir>/settings.json`.
 *
 * pi consults this only when `trust.json` holds no matching entry. The manager reports gaps, so it
 * must honour the same fallback — otherwise a user who followed the warning's advice keeps the
 * warning forever, which is a false report.
 *
 * @param agentDir Agent directory owning `settings.json`.
 * @returns The configured value, or `undefined` when absent/invalid (pi's `"ask"` default).
 */
export function readPiDefaultProjectTrust(agentDir: string): PiDefaultProjectTrust | undefined {
  const settingsPath = path.join(agentDir, PI_SETTINGS_BASENAME);
  try {
    const raw = fs.readFileSync(settingsPath, 'utf-8').replace(/^\uFEFF/, '');
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    const value = (parsed as Record<string, unknown>).defaultProjectTrust;
    return typeof value === 'string' && (PI_DEFAULT_PROJECT_TRUST_VALUES as readonly string[]).includes(value)
      ? value as PiDefaultProjectTrust
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolves pi's project trust decision for a workspace, mirroring its nearest-ancestor lookup.
 *
 * Order matches pi: a saved trust entry (nearest ancestor) wins, then `defaultProjectTrust`, then
 * the interactive prompt — which a headless harness cannot show, so it resolves to untrusted.
 *
 * @param agentDir Agent directory owning `trust.json`.
 * @param workspaceRoot Workspace being opened.
 * @returns Trust decision plus the entry (if any) and settings fallback that decided it.
 */
export function readPiProjectTrust(agentDir: string, workspaceRoot: string): PiTrustStatus {
  const defaultProjectTrust = readPiDefaultProjectTrust(agentDir);
  const trustPath = path.join(agentDir, PI_TRUST_BASENAME);
  const entries = readPiTrustFile(trustPath);

  let current = canonicalizeForTrust(workspaceRoot);
  const root = path.parse(current).root;
  const hasEntries = Object.keys(entries).length > 0;
  while (hasEntries) {
    const value = entries[current];
    if (value === true || value === false) {
      return {
        agentDir,
        decision: value ? 'trusted' : 'untrusted',
        matchedPath: current,
        defaultProjectTrust
      };
    }
    const parent = path.dirname(current);
    if (current === root || parent === current) break;
    current = parent;
  }

  if (defaultProjectTrust === 'always') return { agentDir, decision: 'trusted', defaultProjectTrust };
  if (defaultProjectTrust === 'never') return { agentDir, decision: 'untrusted', defaultProjectTrust };

  // "ask" (or no setting): with a trust store that simply has no match pi still cannot prompt here.
  return { agentDir, decision: hasEntries ? 'untrusted' : 'unknown', defaultProjectTrust };
}

/**
 * Lists the project resources pi loads only for a trusted project.
 *
 * Skills matter as much as the MCP projection: pi reads project `.agents/skills` (and `.pi/skills`)
 * only after trust, so an untrusted workspace silently loses every project skill while the manager
 * still reports it as active.
 *
 * @param workspaceRoot Workspace being audited.
 * @returns Human-readable resource labels; empty when the workspace has nothing trust-gated.
 */
export function listPiTrustGatedResources(workspaceRoot: string): string[] {
  const resources: string[] = [];

  const projectionPath = path.join(workspaceRoot, PI_PROJECT_CONFIG_DIR, PI_PROJECT_MCP_BASENAME);
  if (fs.existsSync(projectionPath)) resources.push(path.join(PI_PROJECT_CONFIG_DIR, PI_PROJECT_MCP_BASENAME));

  for (const skillsSubpath of [path.join('.agents', 'skills'), path.join(PI_PROJECT_CONFIG_DIR, 'skills')]) {
    const skillsDir = path.join(workspaceRoot, skillsSubpath);
    if (!fs.existsSync(skillsDir)) continue;
    const skillNames = fs
      .readdirSync(skillsDir, { withFileTypes: true })
      .filter(entry => fs.existsSync(path.join(skillsDir, entry.name, 'SKILL.md')))
      .map(entry => entry.name);
    if (skillNames.length > 0) resources.push(`${skillsSubpath} (${skillNames.join(', ')})`);
  }

  return resources;
}

/**
 * Reports trust gaps that silently disable project resources for pi-like harnesses.
 *
 * @param workspaceRoot Workspace being audited.
 * @returns One human-readable warning per discovered agent directory that would ignore it.
 */
export function describePiTrustGaps(workspaceRoot: string): string[] {
  const resources = listPiTrustGatedResources(workspaceRoot);
  // Nothing trust-gated means pi loads the workspace unconditionally: reporting a gap would be a lie.
  if (resources.length === 0) return [];
  const resourceLabel = resources.join(', ');

  return listExistingPiAgentDirs().flatMap(agentDir => {
    const status = readPiProjectTrust(agentDir, workspaceRoot);
    if (status.decision === 'trusted') return [];
    const reason = status.matchedPath
      ? `an inherited "untrusted" decision at ${status.matchedPath}`
      : status.defaultProjectTrust === 'never'
        ? `"defaultProjectTrust" is "never" in ${path.join(agentDir, PI_SETTINGS_BASENAME)}`
        : `no saved trust decision and "defaultProjectTrust" is "${status.defaultProjectTrust ?? 'ask'}"`;
    return [
      `pi-like harness at ${agentDir} ignores ${resourceLabel} (${reason}). ` +
      'A headless harness (desktop app or RPC) has no trust prompt, so the "ask" default resolves to ' +
      'untrusted and project skills and MCP servers never load. Approve the project once in an interactive ' +
      `pi session, or set "defaultProjectTrust": "always" in ${path.join(agentDir, PI_SETTINGS_BASENAME)}; ` +
      'the manager must never grant trust on the harness\'s behalf.'
    ];
  });
}
