import type { McpServerConfig } from '../types';

/**
 * pi MCP dialect translation.
 *
 * pi validates every declaration and silently skips what it cannot express, so the projection must
 * only ever contain entries pi would accept. Three rules differ from the shared `.mcp.json` hub:
 *
 * - transport is inferred from `url`/`command`; a declared `transport` field is not read at all,
 *   and `type: "sse"` is rejected outright because pi supports streamable HTTP only;
 * - server names differing only in `-` and `_` collapse into one tool namespace, so the second
 *   declaration is refused rather than shadowing the first;
 * - `enabled: false` keeps a server listed without connecting it, which is how the hub's dormant
 *   state stays visible in the projection instead of disappearing.
 */

/** Server names pi accepts in configuration (tool names get a wider sanitization). */
export const PI_SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Transports pi rejects outright; such entries must be redeclared with a streamable HTTP url. */
const PI_REJECTED_TRANSPORTS = ['sse'] as const;

/** Keys passed through to pi untouched when the hub declares them. */
const PI_PASSTHROUGH_KEYS = ['exposure', 'toolExposure', 'timeout'] as const;

export interface PiProjectionIssue {
  server: string;
  reason: string;
}

export interface PiMcpProjectionPayload {
  mcpServers: Record<string, unknown>;
}

/**
 * Collapses a server name the way pi compares namespaces, where `-` and `_` are equivalent.
 *
 * @param name Configured server name.
 * @returns Comparable namespace key.
 */
function piNamespace(name: string): string {
  return name.replace(/-/g, '_');
}

/**
 * Translates one hub server declaration into a pi-valid entry.
 *
 * @param name Server name from `.mcp.json`.
 * @param config Hub server declaration.
 * @returns The pi entry plus a reason when pi would reject the declaration.
 */
export function buildPiMcpEntry(
  name: string,
  config: McpServerConfig
): { ok: true; entry: Record<string, unknown> } | { ok: false; reason: string } {
  if (!config || typeof config !== 'object') {
    return { ok: false, reason: 'declaration is not an object' };
  }
  if (!PI_SERVER_NAME_PATTERN.test(name)) {
    return { ok: false, reason: 'name must contain only letters, digits, "_" and "-"' };
  }
  if (PI_REJECTED_TRANSPORTS.includes(config.transport as 'sse')) {
    return { ok: false, reason: 'pi rejects legacy SSE transport; redeclare the server with a streamable HTTP url' };
  }

  const entry: Record<string, unknown> = {};
  const isHttp = Boolean(config.url) || config.transport === 'streamable-http';

  if (isHttp) {
    const url = config.url;
    if (!url || typeof url !== 'string') return { ok: false, reason: 'http transport requires a url' };
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { ok: false, reason: `url "${url}" is not a valid URL` };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, reason: `url "${url}" must use http or https` };
    }
    entry.url = url;
    if (config.headers && Object.keys(config.headers).length > 0) entry.headers = config.headers;
  } else {
    if (!config.command || typeof config.command !== 'string') {
      return { ok: false, reason: 'stdio transport requires a command' };
    }
    entry.command = config.command;
    entry.args = Array.isArray(config.args) ? config.args : [];
    if (config.env && Object.keys(config.env).length > 0) entry.env = config.env;
    if (config.cwd) entry.cwd = config.cwd;
  }

  if (config.description) entry.description = config.description;

  const extended = config as McpServerConfig & Record<string, unknown>;
  for (const key of PI_PASSTHROUGH_KEYS) {
    if (extended[key] !== undefined) entry[key] = extended[key];
  }
  if (config.enabled === false || config.disabled === true) entry.enabled = false;

  return { ok: true, entry };
}

/**
 * Builds the whole pi project projection from the canonical hub declarations.
 *
 * @param localServers Servers declared in the workspace `.mcp.json`.
 * @returns Projection payload plus every declaration pi would refuse.
 */
export function buildPiProjection(localServers: Record<string, McpServerConfig>): {
  payload: PiMcpProjectionPayload;
  issues: PiProjectionIssue[];
} {
  const mcpServers: Record<string, unknown> = {};
  const issues: PiProjectionIssue[] = [];
  const namespaces = new Map<string, string>();

  for (const [name, config] of Object.entries(localServers ?? {})) {
    const built = buildPiMcpEntry(name, config);
    if (!built.ok) {
      issues.push({ server: name, reason: built.reason });
      continue;
    }
    const namespace = piNamespace(name);
    const clash = namespaces.get(namespace);
    if (clash) {
      issues.push({ server: name, reason: `namespace collides with "${clash}" ("-" and "_" are equivalent in pi)` });
      continue;
    }
    namespaces.set(namespace, name);
    mcpServers[name] = built.entry;
  }

  return { payload: { mcpServers }, issues };
}

/**
 * Serializes a projection deterministically so staleness checks are byte-stable.
 *
 * @param payload Projection payload.
 * @returns JSON text with a trailing newline.
 */
export function serializePiProjection(payload: PiMcpProjectionPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}
