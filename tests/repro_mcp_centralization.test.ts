import './isolated-home';
import { describe, test, expect } from 'bun:test';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const { auditWorkspace, healWorkspace } = await import('../.agent/src/doctor');
const { GLOBAL_CATALOG_DIR, GLOBAL_MCPS_FILE, GLOBAL_ZCODE_CONFIG } = await import('../.agent/src/config');

describe('repro_mcp_centralization: Doctor audits and heals global harness MCPs into central catalog', () => {
  test('doctor detects unmigrated MCPs in ~/.zcode/cli/config.json, ~/.claude/.mcp.json, and ~/.cursor/mcp.json, and healWorkspace centralizes them into ~/.agents/catalog/mcps.json', async () => {
    const home = os.homedir();
    const tmpWs = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-centralize-mcp-'));

    try {
      // 1. Setup mock legacy MCP declarations across harnesses
      // In ~/.zcode/cli/config.json:
      const zcodeCfg = {
        mcp: {
          servers: {
            hindsight: {
              command: 'node',
              args: ['/path/to/hindsight/dist/mcp-server.js'],
              env: { HINDSIGHT_MCP_HARNESS: 'zcode' }
            }
          }
        }
      };
      await fsp.mkdir(path.dirname(GLOBAL_ZCODE_CONFIG), { recursive: true });
      await fsp.writeFile(GLOBAL_ZCODE_CONFIG, JSON.stringify(zcodeCfg, null, 2), 'utf-8');

      // In ~/.claude/.mcp.json:
      const claudeDir = path.join(home, '.claude');
      await fsp.mkdir(claudeDir, { recursive: true });
      await fsp.writeFile(path.join(claudeDir, '.mcp.json'), JSON.stringify({
        mcpServers: {
          hindsight: {
            command: 'node',
            args: ['/path/to/hindsight/dist/mcp-server.js']
          },
          'codebase-memory-mcp': {
            command: '/path/to/codebase-memory-mcp'
          }
        }
      }, null, 2), 'utf-8');

      // In ~/.cursor/mcp.json:
      const cursorDir = path.join(home, '.cursor');
      await fsp.mkdir(cursorDir, { recursive: true });
      await fsp.writeFile(path.join(cursorDir, 'mcp.json'), JSON.stringify({
        mcpServers: {
          'codebase-memory-mcp': {
            command: '/path/to/codebase-memory-mcp'
          }
        }
      }, null, 2), 'utf-8');

      // In ~/.codex/config.toml (contains external search2ai plus internal node_repl):
      const codexDir = path.join(home, '.codex');
      await fsp.mkdir(codexDir, { recursive: true });
      await fsp.writeFile(path.join(codexDir, 'config.toml'), `
model = "gpt-5"

[mcp_servers.node_repl]
command = "/Applications/ChatGPT.app/node_repl"

[mcp_servers.search2ai]
command = "/Users/dangtruongan/.local/bin/search2ai-mcp"
`);

      // In ~/.config/opencode/opencode.json:
      const opencodeDir = path.join(home, '.config', 'opencode');
      await fsp.mkdir(opencodeDir, { recursive: true });
      await fsp.writeFile(path.join(opencodeDir, 'opencode.json'), JSON.stringify({
        mcpServers: {
          'gitmcp-opencode': {
            command: '/path/to/gitmcp'
          }
        }
      }, null, 2), 'utf-8');

      // 2. Audit should flag unmigrated harness MCP servers
      const auditResult = await auditWorkspace(tmpWs);
      const mcpIssues = auditResult.issues.filter(i => i.message.includes('unmigrated harness MCP') || i.message.includes('legacy harness MCP'));
      expect(mcpIssues.length).toBeGreaterThan(0);

      // 3. Heal workspace should migrate and centralize into ~/.agents/catalog/mcps.json without duplicates
      const actions = await healWorkspace(tmpWs);
      expect(actions.some(a => a.includes('Centralized') || a.includes('Migrated') || a.includes('catalog'))).toBe(true);

      // 4. Verify central catalog contains migrated servers
      const catalogRaw = await fsp.readFile(GLOBAL_MCPS_FILE, 'utf-8');
      const catalog = JSON.parse(catalogRaw);
      expect(catalog.mcpServers.hindsight).toBeDefined();
      expect(catalog.mcpServers.hindsight.command).toBe('node');
      expect(catalog.mcpServers['codebase-memory-mcp']).toBeDefined();
      expect(catalog.mcpServers.search2ai).toBeDefined();
      expect(catalog.mcpServers['gitmcp-opencode']).toBeDefined();
      // Internal harness server should NOT be in catalog
      expect(catalog.mcpServers.node_repl).toBeUndefined();

      // 5. Verify config files:
      // Internal node_repl must still remain in ~/.codex/config.toml, but external search2ai must be removed!
      const codexContent = await fsp.readFile(path.join(codexDir, 'config.toml'), 'utf-8');
      expect(codexContent).toContain('node_repl');
      expect(codexContent).not.toContain('search2ai');

      const opencodeContent = JSON.parse(await fsp.readFile(path.join(opencodeDir, 'opencode.json'), 'utf-8'));
      expect(opencodeContent.mcpServers?.['gitmcp-opencode']).toBeUndefined();

      // 6. Running audit again should have no unmigrated harness MCP issues
      const auditResult2 = await auditWorkspace(tmpWs);
      const mcpIssues2 = auditResult2.issues.filter(i => i.message.includes('unmigrated harness MCP') || i.message.includes('legacy harness MCP'));
      expect(mcpIssues2.length).toBe(0);

    } finally {
      await fsp.rm(tmpWs, { recursive: true, force: true });
    }
  });
});
