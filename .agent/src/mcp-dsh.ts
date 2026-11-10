import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import yaml from 'yaml';
import type { McpServerConfig } from './types';

export const DSH_DESKTOP_PATCH = path.join(os.homedir(), '.dsh', 'profiles', 'desktop', 'cordis.patch.yml');

/**
 * Plugin name every MCP client row uses, including DSH's own documentation examples.
 * Ownership is decided by this name, never by an id prefix: DSH ships stock plugins such as
 * `mcp-resources` (`@deepseek-ai/dsh-mcp-resources`) whose id also starts with `mcp-`.
 */
export const DSH_MCP_CLIENT_PLUGIN = '@deepseek-ai/dsh-mcp-client';

/**
 * Builds an @deepseek-ai/dsh-mcp-client entry from an McpServerConfig.
 * Accurately handles stdio vs streamable-http/sse, command, args, url, headers, and env.
 */
export function buildDshMcpEntry(name: string, cfg: McpServerConfig): any {
  const isHttp = Boolean(cfg.url) || cfg.transport === 'streamable-http' || cfg.transport === 'sse';
  const transport = isHttp ? 'streamable-http' : 'stdio';

  const config: Record<string, any> = {
    serverName: name,
    transport
  };

  if (isHttp) {
    if (cfg.url) config.url = cfg.url;
    if (cfg.headers && Object.keys(cfg.headers).length > 0) {
      config.headers = cfg.headers;
    }
  } else {
    if (cfg.command) config.command = cfg.command;
    config.args = Array.isArray(cfg.args) ? cfg.args : [];
  }

  if (cfg.env && Object.keys(cfg.env).length > 0) {
    config.env = cfg.env;
  }

  return {
    id: `mcp-${name}`,
    name: DSH_MCP_CLIENT_PLUGIN,
    config
  };
}

/**
 * Reports whether a YAML node is an MCP client row written by this manager.
 *
 * @param node Parsed YAML map node (or anything else found in the profile sequence).
 * @returns True only for entries carrying the MCP client plugin name.
 */
function isManagerOwnedMcpRow(node: any): boolean {
  return typeof node?.get === 'function' && node.get('name') === DSH_MCP_CLIENT_PLUGIN;
}

/**
 * Synchronizes enabled MCP servers into DeepSeek Harness profile (cordis.patch.yml).
 * Uses AST-preserving YAML modification to protect existing comments, formatting, and !!js expressions.
 */
export async function syncDshProfileMcps(
  localServers: Record<string, McpServerConfig>,
  patchPath: string = DSH_DESKTOP_PATCH
): Promise<boolean> {
  if (!fs.existsSync(patchPath)) return false;

  try {
    const raw = await fsp.readFile(patchPath, 'utf-8');
    const doc = yaml.parseDocument(raw);
    if (!doc || !doc.contents || !('items' in (doc.contents as any))) {
      return false;
    }

    const seq: any = doc.contents;

    // Prune only the MCP client rows this manager writes. Stock DSH plugins (for example
    // `mcp-resources` = @deepseek-ai/dsh-mcp-resources) share the `mcp-` id prefix and must survive.
    for (let i = seq.items.length - 1; i >= 0; i--) {
      const item = seq.items[i];
      if (item && typeof item.get === 'function') {
        if (isManagerOwnedMcpRow(item)) {
          seq.items.splice(i, 1);
          continue;
        }

        const insertSeq = item.get('insert');
        if (insertSeq && Array.isArray(insertSeq.items)) {
          for (let j = insertSeq.items.length - 1; j >= 0; j--) {
            if (isManagerOwnedMcpRow(insertSeq.items[j])) {
              insertSeq.items.splice(j, 1);
            }
          }
          if (insertSeq.items.length === 0) {
            seq.items.splice(i, 1);
          }
        }
      }
    }

    // Collect active servers (enabled === true and disabled !== true)
    const mcpEntries: any[] = [];
    for (const [name, cfg] of Object.entries(localServers || {})) {
      if (cfg.enabled === false || (cfg as any).disabled === true) continue;
      mcpEntries.push(buildDshMcpEntry(name, cfg));
    }

    if (mcpEntries.length > 0) {
      const insertNode = doc.createNode({ insert: mcpEntries });
      seq.items.push(insertNode);
    }

    // Only rewrite when the serialized document actually changed, so repeated syncs stay silent
    // and a reported action always means real drift was repaired.
    const next = doc.toString();
    if (next === raw) return false;
    await fsp.writeFile(patchPath, next, 'utf-8');
    return true;
  } catch {
    return false;
  }
}
