import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import yaml from 'yaml';
import type { McpServerConfig } from './types';

export const DSH_DESKTOP_PATCH = path.join(os.homedir(), '.dsh', 'profiles', 'desktop', 'cordis.patch.yml');

/**
 * Synchronizes enabled MCP servers into DeepSeek Harness desktop profile (cordis.patch.yml).
 * Ensures DSH model sessions can natively call external MCP servers via @deepseek-ai/dsh-mcp-client.
 */
export async function syncDshProfileMcps(localServers: Record<string, McpServerConfig>): Promise<void> {
  if (!fs.existsSync(DSH_DESKTOP_PATCH)) return;

  try {
    const raw = await fsp.readFile(DSH_DESKTOP_PATCH, 'utf-8');
    const doc = yaml.parse(raw);
    if (!Array.isArray(doc)) return;

    // Filter out previous mcp-* entries from top level or insert lists
    const cleaned = doc.filter((item: any) => {
      if (item && item.id && typeof item.id === 'string' && item.id.startsWith('mcp-')) return false;
      if (item && Array.isArray(item.insert)) {
        item.insert = item.insert.filter((sub: any) => !sub?.id || !String(sub.id).startsWith('mcp-'));
        return item.insert.length > 0;
      }
      return true;
    });

    const mcpEntries: any[] = [];
    for (const [name, cfg] of Object.entries(localServers)) {
      if (cfg.enabled === false || cfg.disabled === true) continue;
      mcpEntries.push({
        id: `mcp-${name}`,
        name: '@deepseek-ai/dsh-mcp-client',
        config: {
          serverName: name,
          transport: cfg.transport || 'stdio',
          command: cfg.command,
          args: cfg.args || [],
          ...(cfg.env && Object.keys(cfg.env).length > 0 ? { env: cfg.env } : {})
        }
      });
    }

    if (mcpEntries.length > 0) {
      cleaned.push({ insert: mcpEntries });
    }

    await fsp.writeFile(DSH_DESKTOP_PATCH, yaml.stringify(cleaned), 'utf-8');
  } catch {
    // Non-blocking sync error
  }
}
