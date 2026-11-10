import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import yaml from 'yaml';
import type { McpServerConfig } from './types';

export const DSH_DESKTOP_PATCH = path.join(os.homedir(), '.dsh', 'profiles', 'desktop', 'cordis.patch.yml');

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
    name: '@deepseek-ai/dsh-mcp-client',
    config
  };
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

    // Prune existing mcp-* entries from top level and insert blocks
    for (let i = seq.items.length - 1; i >= 0; i--) {
      const item = seq.items[i];
      if (item && typeof item.get === 'function') {
        const id = item.get('id');
        if (typeof id === 'string' && id.startsWith('mcp-')) {
          seq.items.splice(i, 1);
          continue;
        }

        const insertSeq = item.get('insert');
        if (insertSeq && Array.isArray(insertSeq.items)) {
          for (let j = insertSeq.items.length - 1; j >= 0; j--) {
            const sub = insertSeq.items[j];
            const subId = typeof sub?.get === 'function' ? sub.get('id') : sub?.id;
            if (typeof subId === 'string' && subId.startsWith('mcp-')) {
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
