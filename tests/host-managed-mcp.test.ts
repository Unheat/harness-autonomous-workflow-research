import './isolated-home';
import { describe, test, expect } from 'bun:test';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const { isHostManagedMcpEntry, HOST_MANAGED_MCP_RULES } = await import('../.agent/src/services/host-managed');
const { auditWorkspace, healWorkspace } = await import('../.agent/src/doctor');
const { GLOBAL_ZCODE_CONFIG, PI_AGENT_DIR_ENV } = await import('../.agent/src/config');
const { syncPiUserScopeMcps, getPiUserScopeMcpPath } = await import('../.agent/src/services/pi-mcp-projection');

const BILI_ARGS = ['/Users/someone/.local/lib/node_modules/billion-context/dist/mcp.js'];

describe('host_managed_mcp: installer-owned entries are never migrated or re-projected', () => {
  test('recognizes a billion-context entry by its installer name + package path', () => {
    expect(isHostManagedMcpEntry({ command: 'node', args: BILI_ARGS }, 'bili')).toBe(true);
    expect(isHostManagedMcpEntry({ command: BILI_ARGS[0], args: [] }, 'bili')).toBe(true);
    // Name alone is not enough, and the package path alone is not enough: both must line up.
    expect(isHostManagedMcpEntry({ command: 'node', args: ['/opt/other/index.js'] }, 'bili')).toBe(false);
    expect(isHostManagedMcpEntry({ command: 'node', args: BILI_ARGS }, 'my-own-server')).toBe(false);
    expect(isHostManagedMcpEntry({ command: 'node', args: BILI_ARGS })).toBe(false);
    // The env-marker rule keeps working for installers that stamp it.
    expect(isHostManagedMcpEntry({ command: 'node', env: { HINDSIGHT_MCP_HARNESS: 'codex' } })).toBe(true);
  });

  test('pi projection skips the installer entry and keeps user declarations', async () => {
    const { buildPiProjection } = await import('../.agent/src/services/pi-mcp-dialect');
    const { payload } = buildPiProjection({
      bili: { command: 'node', args: BILI_ARGS },
      search2ai: { command: '/usr/local/bin/search2ai-mcp' }
    });
    expect(Object.keys(payload.mcpServers)).toEqual(['search2ai']);
  });

  test('doctor does not flag bili entries and heal leaves them in place', async () => {
    const tmpWs = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-host-managed-'));

    try {
      await fsp.mkdir(path.dirname(GLOBAL_ZCODE_CONFIG), { recursive: true });
      await fsp.writeFile(GLOBAL_ZCODE_CONFIG, JSON.stringify({
        mcp: { servers: { bili: { type: 'stdio', command: 'node', args: BILI_ARGS } } }
      }, null, 2), 'utf-8');

      const codexDir = path.join(os.homedir(), '.codex');
      await fsp.mkdir(codexDir, { recursive: true });
      const codexPath = path.join(codexDir, 'config.toml');
      await fsp.writeFile(codexPath, `
model = "gpt-5"

[mcp_servers.bili]
command = "node"
args = ["/Users/someone/.local/lib/node_modules/billion-context/dist/mcp.js"]
`, 'utf-8');

      const audit = await auditWorkspace(tmpWs);
      expect(audit.issues.filter(i => i.message.includes('unmigrated harness MCP')).length).toBe(0);

      await healWorkspace(tmpWs);

      const zcode = JSON.parse(await fsp.readFile(GLOBAL_ZCODE_CONFIG, 'utf-8'));
      expect(zcode.mcp.servers.bili).toBeDefined();
      expect(await fsp.readFile(codexPath, 'utf-8')).toContain('[mcp_servers.bili]');
    } finally {
      // Later test files share this isolated home: leave no harness config behind.
      await fsp.writeFile(GLOBAL_ZCODE_CONFIG, JSON.stringify({ mcp: { servers: {} } }, null, 2), 'utf-8');
      await fsp.rm(path.join(os.homedir(), '.codex'), { recursive: true, force: true });
      await fsp.rm(tmpWs, { recursive: true, force: true });
    }
  });

  test('a pi-like user-scope projection never receives another harness installer entry', async () => {
    const agentDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-pi-agent-'));
    const previous = process.env[PI_AGENT_DIR_ENV];
    process.env[PI_AGENT_DIR_ENV] = agentDir;

    try {
      const results = await syncPiUserScopeMcps({
        bili: { command: 'node', args: BILI_ARGS },
        search2ai: { command: '/usr/local/bin/search2ai-mcp' }
      });

      const target = results.find(result => result.path === getPiUserScopeMcpPath(agentDir));
      expect(target).toBeDefined();
      const written = JSON.parse(await fsp.readFile(getPiUserScopeMcpPath(agentDir), 'utf-8'));
      expect(Object.keys(written.mcpServers)).toEqual(['search2ai']);
      expect(HOST_MANAGED_MCP_RULES.map(rule => rule.name)).toContain('bili');
    } finally {
      if (previous === undefined) delete process.env[PI_AGENT_DIR_ENV];
      else process.env[PI_AGENT_DIR_ENV] = previous;
      await fsp.rm(agentDir, { recursive: true, force: true });
    }
  });
});
