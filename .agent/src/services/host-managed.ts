/**
 * Ownership markers for MCP entries written by a harness installer.
 *
 * An installer that wires its own agent into memory writes the entry itself, and marks it with the
 * harness that will call it. Those entries are the installer's, not declarations the user made:
 * migration and cleanup must not touch them, and they must not be projected into another harness
 * (the marker would then describe the wrong caller).
 */

/** Environment keys a harness installer writes into the entries it owns. */
export const HOST_MANAGED_MCP_ENV_MARKERS = ['HINDSIGHT_MCP_HARNESS'] as const;

/**
 * Installers that own their entries by name + package path instead of an env marker.
 *
 * `billion-context` (`bili plugin install <harness>`) writes a stdio server literally named `bili`
 * whose command/args point into its own installed package (e.g.
 * `.../node_modules/billion-context/dist/mcp.js`). It cannot carry an env marker: the same entry
 * shape is reused across ZCode, Codex and Claude and the installer rewrites it on upgrade, so name
 * plus package path is the only stable signature.
 */
export interface HostManagedMcpRule {
  /** Server name the installer always uses. */
  name: string;
  /** Substrings that must appear in the command or one of its args. */
  pathMarkers: readonly string[];
}

export const HOST_MANAGED_MCP_RULES: readonly HostManagedMcpRule[] = [
  { name: 'bili', pathMarkers: ['billion-context'] },
];

function hasEnvMarker(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const env = (config as Record<string, unknown>).env;
  if (!env || typeof env !== 'object') return false;
  return HOST_MANAGED_MCP_ENV_MARKERS.some(marker => marker in (env as Record<string, unknown>));
}

function matchesRule(name: string, config: unknown): boolean {
  const rule = HOST_MANAGED_MCP_RULES.find(candidate => candidate.name === name);
  if (!rule || !config || typeof config !== 'object') return false;
  const entry = config as Record<string, unknown>;
  const command = typeof entry.command === 'string' ? entry.command : '';
  const args = Array.isArray(entry.args) ? entry.args.filter((arg): arg is string => typeof arg === 'string') : [];
  const haystack = [command, ...args].join('\n');
  return rule.pathMarkers.some(marker => haystack.includes(marker));
}

/**
 * Reports whether a server entry was installed by a harness host rather than declared by the user.
 *
 * @param config Parsed server config from any harness file.
 * @param name Server name from the harness config (enables the name + package-path rules).
 * @returns True when the entry is owned by an installer.
 */
export function isHostManagedMcpEntry(config: unknown, name?: string): boolean {
  if (hasEnvMarker(config)) return true;
  return name ? matchesRule(name, config) : false;
}
