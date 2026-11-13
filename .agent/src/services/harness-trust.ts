import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { PI_TRUST_BASENAME } from '../config';
import { listExistingPiAgentDirs, readPiProjectTrust } from './pi-harness-trust';
import { listLocalMcps } from '../mcp';
import type { McpServerConfig } from '../types';

/**
 * Explicit, user-invoked project trust.
 *
 * Trust belongs to the harness approval flow; the manager never grants it during audit or repair.
 * This module backs `harness trust`, where the user names the project themselves, and then writes
 * the same durable decision each harness would have saved after its own "Trust this folder?" prompt.
 *
 * Only harnesses with a documented on-disk trust format participate. Everything else is reported as
 * having no project-trust gate rather than being silently skipped, so "trusted everywhere" is never
 * claimed without evidence.
 */

export type TrustActionStatus = 'trusted' | 'untrusted' | 'already' | 'unsupported' | 'failed';

export interface TrustActionResult {
  harness: string;
  status: TrustActionStatus;
  detail: string;
}

/** Harnesses without a documented project-trust file we can safely write. */
const NO_PROJECT_TRUST_GATE: Array<{ harness: string; dir: string; detail: string }> = [
  {
    harness: 'Cursor',
    dir: '.cursor',
    detail: 'Cursor keeps workspace trust in its own UI state (SQLite); it is not safe to forge from a CLI.'
  },
  {
    harness: 'OpenCode',
    dir: '.opencode',
    detail: 'OpenCode has no project-trust gate; it loads the workspace as-is.'
  },
  {
    harness: 'DSH',
    dir: '.dsh',
    detail: 'DSH has no project-trust gate; it loads the workspace as-is.'
  }
];

/**
 * Reads JSON without inventing defaults on corruption: a broken user config must fail loudly.
 *
 * @param file Absolute path.
 * @returns Parsed object, or `null` when the file does not exist.
 */
async function readJsonObject(file: string): Promise<Record<string, any> | null> {
  if (!fs.existsSync(file)) return null;
  const parsed: unknown = JSON.parse(await fsp.readFile(file, 'utf-8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${file} is not a JSON object`);
  }
  return parsed as Record<string, any>;
}

/**
 * Writes JSON with a trailing newline, matching how these harnesses serialize their own config.
 */
async function writeJsonObject(file: string, value: unknown): Promise<void> {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, JSON.stringify(value, null, 2) + '\n', 'utf-8');
}

/** The canonical key both pi and Claude use: the project's real path when it exists. */
function canonicalProjectPath(workspaceRoot: string): string {
  const resolved = path.resolve(workspaceRoot);
  try {
    return fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
}

async function grantPi(canonicalPath: string): Promise<TrustActionResult> {
  const agentDirs = listExistingPiAgentDirs();
  if (agentDirs.length === 0) {
    return { harness: 'pi (DeepAI Code)', status: 'unsupported', detail: 'no agent directory found on this machine' };
  }
  let changed = 0;
  const failures: string[] = [];
  for (const agentDir of agentDirs) {
    const file = path.join(agentDir, PI_TRUST_BASENAME);
    try {
      const store = await readJsonObject(file) ?? {};
      if (store[canonicalPath] !== true) {
        store[canonicalPath] = true;
        await writeJsonObject(file, store);
        changed++;
      }
    } catch (err) {
      failures.push(`${file}: ${(err as Error).message}`);
    }
  }
  if (failures.length > 0) {
    return { harness: 'pi (DeepAI Code)', status: 'failed', detail: failures.join('; ') };
  }
  return {
    harness: 'pi (DeepAI Code)',
    status: changed > 0 ? 'trusted' : 'already',
    detail: changed > 0
      ? `wrote ${changed} of ${agentDirs.length} agent dir(s)`
      : `already trusted in ${agentDirs.length} agent dir(s)`
  };
}

async function grantClaude(canonicalPath: string): Promise<TrustActionResult> {
  const file = path.join(os.homedir(), '.claude.json');
  const store = await readJsonObject(file);
  if (!store) {
    return { harness: 'Claude Code', status: 'unsupported', detail: '~/.claude.json not found' };
  }
  const projects = (store.projects && typeof store.projects === 'object') ? store.projects : {};
  const entry = (projects[canonicalPath] && typeof projects[canonicalPath] === 'object') ? projects[canonicalPath] : {};
  if (entry.hasTrustDialogAccepted === true) {
    return { harness: 'Claude Code', status: 'already', detail: `already trusted (${canonicalPath})` };
  }
  entry.hasTrustDialogAccepted = true;
  projects[canonicalPath] = entry;
  store.projects = projects;
  await writeJsonObject(file, store);
  return { harness: 'Claude Code', status: 'trusted', detail: `hasTrustDialogAccepted = true (${canonicalPath})` };
}

/** Quotes a string for a TOML basic key/table segment. */
function tomlQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Upserts `[projects."<path>"] trust_level = "trusted"` without touching any other table.
 *
 * The section is matched exactly, so a sibling project path cannot be modified by prefix.
 */
export function upsertCodexTrust(content: string, projectPath: string): { content: string; changed: boolean } {
  const header = `[projects.${tomlQuote(projectPath)}]`;
  const lines = content.split('\n');
  const start = lines.findIndex(line => line.trim() === header);
  if (start === -1) {
    const prefix = content.length === 0 ? '' : (content.endsWith('\n') ? `${content}\n` : `${content}\n\n`);
    return { content: `${prefix}${header}\ntrust_level = "trusted"\n`, changed: true };
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*\[/.test(lines[i])) { end = i; break; }
  }
  for (let i = start + 1; i < end; i++) {
    if (!/^\s*trust_level\s*=/.test(lines[i])) continue;
    if (lines[i].trim() === 'trust_level = "trusted"') return { content, changed: false };
    lines[i] = 'trust_level = "trusted"';
    return { content: lines.join('\n'), changed: true };
  }
  lines.splice(start + 1, 0, 'trust_level = "trusted"');
  return { content: lines.join('\n'), changed: true };
}

async function grantCodex(canonicalPath: string): Promise<TrustActionResult> {
  const file = path.join(os.homedir(), '.codex', 'config.toml');
  if (!fs.existsSync(file)) {
    return { harness: 'Codex', status: 'unsupported', detail: '~/.codex/config.toml not found' };
  }
  const current = await fsp.readFile(file, 'utf-8');
  const { content, changed } = upsertCodexTrust(current, canonicalPath);
  if (!changed) {
    return { harness: 'Codex', status: 'already', detail: `already trusted (${canonicalPath})` };
  }
  await fsp.writeFile(file, content, 'utf-8');
  return { harness: 'Codex', status: 'trusted', detail: `trust_level = "trusted" (${canonicalPath})` };
}

/** Deterministic JSON so a digest pins declaration content, never key order. */
function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, node) =>
    node && typeof node === 'object' && !Array.isArray(node)
      ? Object.fromEntries(Object.keys(node).sort().map(key => [key, (node as Record<string, unknown>)[key]]))
      : node
  );
}

/**
 * ZCode trusts each workspace MCP declaration by SHA-256 digest, not the folder itself.
 *
 * @returns One trust record per locally declared server.
 */
function buildZcodeTrustRecords(workspaceRoot: string, servers: Record<string, McpServerConfig>) {
  const workingDirectory = path.resolve(workspaceRoot);
  const sourcePaths = [path.join(workingDirectory, '.agents', 'mcp.json')];
  return Object.entries(servers).map(([serverName, cfg]) => {
    const payload = {
      version: 1,
      workspaceIdentity: workingDirectory,
      workingDirectory,
      serverName,
      sourcePaths,
      config: {
        type: 'stdio',
        command: cfg.command,
        args: cfg.args || [],
        env: cfg.env || {},
        cwd: workingDirectory
      }
    };
    return {
      workspaceIdentity: workingDirectory,
      serverName,
      declarationDigest: crypto.createHash('sha256').update(canonicalJson(payload)).digest('hex'),
      grantedAt: new Date().toISOString()
    };
  });
}

async function grantZcode(workspaceRoot: string): Promise<TrustActionResult> {
  const zcodeHome = path.join(os.homedir(), '.zcode');
  if (!fs.existsSync(zcodeHome)) {
    return { harness: 'ZCode', status: 'unsupported', detail: '~/.zcode not found' };
  }
  const servers = await listLocalMcps(workspaceRoot);
  const fresh = buildZcodeTrustRecords(workspaceRoot, servers);
  if (fresh.length === 0) {
    return { harness: 'ZCode', status: 'already', detail: 'no workspace MCP declarations to trust' };
  }
  const file = path.join(zcodeHome, 'security', 'workspace-mcp-trust-v1.json');
  const store = await readJsonObject(file) ?? { schemaVersion: 1, records: [] };
  const records: any[] = Array.isArray(store.records) ? store.records : [];
  const byKey = new Map(records.map(record => [`${record.workspaceIdentity}:${record.serverName}`, record]));
  let changed = 0;
  for (const record of fresh) {
    const key = `${record.workspaceIdentity}:${record.serverName}`;
    const existing = byKey.get(key);
    if (existing && existing.declarationDigest === record.declarationDigest) continue;
    byKey.set(key, record);
    changed++;
  }
  if (changed > 0) {
    await writeJsonObject(file, { schemaVersion: 1, records: Array.from(byKey.values()) });
  }
  return {
    harness: 'ZCode',
    status: changed > 0 ? 'trusted' : 'already',
    detail: `${fresh.length} workspace MCP declaration(s); ${changed} updated`
  };
}

/**
 * Grants the user's explicit trust decision to every harness that stores one on disk.
 *
 * @param workspaceRoot Project the user named.
 * @returns One result per detected harness; unsupported harnesses are reported, not skipped.
 */
export async function trustProject(workspaceRoot: string): Promise<TrustActionResult[]> {
  const canonicalPath = canonicalProjectPath(workspaceRoot);
  const results: TrustActionResult[] = [];

  for (const grant of [grantPi, grantClaude, grantCodex]) {
    try {
      results.push(await grant(canonicalPath));
    } catch (err) {
      results.push({ harness: grant.name, status: 'failed', detail: (err as Error).message });
    }
  }
  try {
    results.push(await grantZcode(workspaceRoot));
  } catch (err) {
    results.push({ harness: 'ZCode', status: 'failed', detail: (err as Error).message });
  }

  for (const harness of NO_PROJECT_TRUST_GATE) {
    if (!fs.existsSync(path.join(os.homedir(), harness.dir))) continue;
    results.push({ harness: harness.harness, status: 'unsupported', detail: harness.detail });
  }
  return results;
}

/**
 * Reads back what each harness currently believes about the project (no writes).
 *
 * @param workspaceRoot Project to inspect.
 * @returns One status line per detected harness.
 */
export async function listTrust(workspaceRoot: string): Promise<TrustActionResult[]> {
  const canonicalPath = canonicalProjectPath(workspaceRoot);
  const results: TrustActionResult[] = [];
  const agentDirs = listExistingPiAgentDirs();

  if (agentDirs.length > 0) {
    const decisions = agentDirs.map(dir => readPiProjectTrust(dir, workspaceRoot).decision);
    const trusted = decisions.every(decision => decision === 'trusted');
    results.push({
      harness: 'pi (DeepAI Code)',
      status: trusted ? 'trusted' : 'untrusted',
      detail: decisions.join(', ')
    });
  }

  const claudeFile = path.join(os.homedir(), '.claude.json');
  const claude = await readJsonObject(claudeFile);
  if (claude) {
    const accepted = claude.projects?.[canonicalPath]?.hasTrustDialogAccepted === true;
    results.push({
      harness: 'Claude Code',
      status: accepted ? 'trusted' : 'untrusted',
      detail: accepted ? 'hasTrustDialogAccepted = true' : 'not trusted'
    });
  }

  const codexFile = path.join(os.homedir(), '.codex', 'config.toml');
  if (fs.existsSync(codexFile)) {
    const content = await fsp.readFile(codexFile, 'utf-8');
    const trusted = new RegExp(`\\[projects\\.${tomlQuote(canonicalPath).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\][^\\[]*?trust_level\\s*=\\s*"trusted"`).test(content);
    results.push({
      harness: 'Codex',
      status: trusted ? 'trusted' : 'untrusted',
      detail: trusted ? 'trust_level = "trusted"' : 'not trusted'
    });
  }

  return results;
}
