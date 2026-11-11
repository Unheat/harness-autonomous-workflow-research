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
 * Reports whether a server entry was installed by a harness host rather than declared by the user.
 *
 * @param config Parsed server config from any harness file.
 * @returns True when the entry carries a host-managed environment marker.
 */
export function isHostManagedMcpEntry(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const env = (config as Record<string, unknown>).env;
  if (!env || typeof env !== 'object') return false;
  return HOST_MANAGED_MCP_ENV_MARKERS.some(marker => marker in (env as Record<string, unknown>));
}
