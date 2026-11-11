import './isolated-home';
import { describe, test, expect, afterEach } from 'bun:test';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import yaml from 'yaml';

const { syncDshProfileMcps, DSH_MCP_CLIENT_PLUGIN } = await import('../.agent/src/mcp-dsh');
const { removeTomlTable } = await import('../.agent/src/clean-global');
const { checkClaudeManagedMcpPolicy } = await import('../.agent/src/doctor');
const { healWorkspace } = await import('../.agent/src/doctor');
const { GLOBAL_ZCODE_CONFIG, GLOBAL_MCPS_FILE } = await import('../.agent/src/config');

/** Every profile fixture gets one stock DSH plugin whose id also starts with `mcp-`. */
const STOCK_MCP_RESOURCES = `- id: mcp-resources
  name: '@deepseek-ai/dsh-mcp-resources'
`;

const tmpDirs: string[] = [];

async function makeTmp(prefix: string): Promise<string> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
  tmpDirs.push(dir);
  return dir;
}

afterEach(async () => {
  for (const dir of tmpDirs.splice(0)) await fsp.rm(dir, { recursive: true, force: true });
});

describe('harness-shipped defaults survive manager cleanup', () => {
  test('DSH: a stock plugin whose id starts with mcp- is never pruned', async () => {
    const dir = await makeTmp('dsh-stock-');
    const patch = path.join(dir, 'cordis.patch.yml');
    await fsp.writeFile(patch, STOCK_MCP_RESOURCES, 'utf-8');

    const wrote = await syncDshProfileMcps({ search2ai: { command: '/bin/search2ai' } }, patch);
    expect(wrote).toBe(true);

    const doc: any = yaml.parse(await fsp.readFile(patch, 'utf-8'));
    const ids = doc.flatMap((entry: any) => entry.insert ?? [entry]).map((entry: any) => entry.id);
    expect(ids).toContain('mcp-resources');
    expect(ids).toContain('mcp-search2ai');

    const stock = doc.find((entry: any) => entry.id === 'mcp-resources');
    expect(stock.name).toBe('@deepseek-ai/dsh-mcp-resources');
  });

  test('DSH: only rows carrying the client plugin name are replaced or pruned', async () => {
    const dir = await makeTmp('dsh-own-');
    const patch = path.join(dir, 'cordis.patch.yml');
    await fsp.writeFile(
      patch,
      `${STOCK_MCP_RESOURCES}- id: mcp-stale-own
  name: '${DSH_MCP_CLIENT_PLUGIN}'
  config:
    serverName: stale
    transport: stdio
    command: /bin/stale
`,
      'utf-8'
    );

    await syncDshProfileMcps({ fresh: { command: '/bin/fresh' } }, patch);
    const doc: any = yaml.parse(await fsp.readFile(patch, 'utf-8'));
    const ids = doc.flatMap((entry: any) => entry.insert ?? [entry]).map((entry: any) => entry.id);

    expect(ids).not.toContain('mcp-stale-own');
    expect(ids).toContain('mcp-resources');
    expect(ids).toContain('mcp-fresh');
  });

  test('DSH: an insert block holding a stock plugin is kept, its client rows dropped', async () => {
    const dir = await makeTmp('dsh-insert-');
    const patch = path.join(dir, 'cordis.patch.yml');
    await fsp.writeFile(
      patch,
      `- insert:
    - id: mcp-web-stock
      name: '@deepseek-ai/dsh-mcp-resources'
    - id: mcp-managed
      name: '${DSH_MCP_CLIENT_PLUGIN}'
`,
      'utf-8'
    );

    await syncDshProfileMcps({}, patch);
    const doc: any = yaml.parse(await fsp.readFile(patch, 'utf-8'));
    const inserted = doc.flatMap((entry: any) => entry.insert ?? []);
    const ids = inserted.map((entry: any) => entry.id);

    expect(ids).toContain('mcp-web-stock');
    expect(ids).not.toContain('mcp-managed');
  });

  test('Codex: removing a table never touches a longer table name that shares its prefix', () => {
    const toml = `[mcp_servers.foo]
command = "a"

[mcp_servers.foo.env]
TOKEN = "x"

[mcp_servers.foo_bar]
command = "b"

[projects."/work"]
trust_level = "trusted"
`;

    const { content, removed } = removeTomlTable(toml, 'mcp_servers.foo');
    expect(removed).toBe(true);
    expect(content).not.toContain('[mcp_servers.foo]');
    expect(content).not.toContain('[mcp_servers.foo.env]');
    expect(content).toContain('[mcp_servers.foo_bar]');
    expect(content).toContain('[projects."/work"]');
  });

  test('ZCode: centralisation removes migrated servers but keeps sibling mcp settings', async () => {
    const ws = await makeTmp('zcode-sibling-ws-');
    const zcode = {
      mcp: {
        timeout: 45,
        servers: {
          migrated: { command: '/bin/migrated' },
          handwritten: { command: '/bin/keep-me' }
        }
      },
      features: { memory: false }
    };
    await fsp.mkdir(path.dirname(GLOBAL_ZCODE_CONFIG), { recursive: true });
    await fsp.writeFile(GLOBAL_ZCODE_CONFIG, JSON.stringify(zcode, null, 2), 'utf-8');

    await healWorkspace(ws);

    const after = JSON.parse(await fsp.readFile(GLOBAL_ZCODE_CONFIG, 'utf-8'));
    expect(after.mcp.timeout).toBe(45);
    expect(after.mcp.servers.migrated).toBeUndefined();
    expect(after.features).toEqual({ memory: false });
    // Any other server left in the harness is a declaration by policy: it moves to the catalog.
    expect(after.mcp.servers.handwritten).toBeUndefined();
    expect(JSON.parse(await fsp.readFile(GLOBAL_MCPS_FILE, 'utf-8')).mcpServers.handwritten).toBeDefined();

    const catalog = JSON.parse(await fsp.readFile(GLOBAL_MCPS_FILE, 'utf-8'));
    expect(catalog.mcpServers.migrated).toBeDefined();
  });

  test('Claude: administrator MCP policy is reported, absent policy is not', async () => {
    const dir = await makeTmp('claude-policy-');
    const missing = path.join(dir, 'managed-mcp.json');
    expect(checkClaudeManagedMcpPolicy(missing)).toBeNull();

    await fsp.writeFile(missing, JSON.stringify({ mcpServers: {} }), 'utf-8');
    const warning = checkClaudeManagedMcpPolicy(missing);
    expect(warning).toContain('administrator MCP policy');
    expect(warning).toContain('have no effect');
  });
});

describe('installer-owned MCP wiring is not treated as a user declaration', () => {
  test('entries carrying a host-managed env marker are skipped, plain ones are not', async () => {
    const ws = await makeTmp('host-managed-ws-');
    const home = os.homedir();
    const cursorDir = path.join(home, '.cursor');
    await fsp.mkdir(cursorDir, { recursive: true });
    await fsp.writeFile(
      path.join(cursorDir, 'mcp.json'),
      JSON.stringify({
        mcpServers: {
          hindsight: {
            command: 'node',
            args: ['/Users/x/.hindsight/coding-agents/dist/mcp-server.js'],
            env: { HINDSIGHT_MCP_HARNESS: 'cursor-cli' }
          },
          'my-own-server': { command: '/bin/mine' }
        }
      }),
      'utf-8'
    );

    const { discoverUnmigratedHarnessMcps } = await import('../.agent/src/clean-global');
    const found = await discoverUnmigratedHarnessMcps();
    const cursor = found.find(entry => entry.filePath === path.join(cursorDir, 'mcp.json'));

    expect(cursor).toBeDefined();
    expect(cursor!.servers.hindsight).toBeUndefined();
    expect(cursor!.servers['my-own-server']).toBeDefined();
  });
});

describe('host-managed entries are never projected into another harness', () => {
  test('buildPiProjection skips installer-owned entries but keeps user declarations', async () => {
    const { buildPiProjection } = await import('../.agent/src/services/pi-mcp-dialect');
    const { payload } = buildPiProjection({
      hindsight: {
        command: 'node',
        args: ['/x/mcp-server.js'],
        env: { HINDSIGHT_MCP_HARNESS: 'zcode' }
      },
      'my-notes': { command: '/bin/notes' }
    });

    expect(Object.keys(payload.mcpServers)).toEqual(['my-notes']);
  });
});

describe('DSH projection honours host-managed ownership too', () => {
  test('syncDshProfileMcps skips entries another harness installer owns', async () => {
    const dir = await makeTmp('dsh-host-managed-');
    const patch = path.join(dir, 'cordis.patch.yml');
    await fsp.writeFile(patch, '- id: keep-me\n  name: "@deepseek-ai/dsh-tools"\n', 'utf-8');

    await syncDshProfileMcps(
      {
        hindsight: { command: 'node', args: ['/x/mcp-server.js'], env: { HINDSIGHT_MCP_HARNESS: 'zcode' } },
        'my-notes': { command: '/bin/notes' }
      },
      patch
    );

    const ids: string[] = yaml.parse(await fsp.readFile(patch, 'utf-8'))
      .flatMap((entry: any) => entry.insert ?? [entry])
      .map((entry: any) => entry.id);
    expect(ids).toContain('mcp-my-notes');
    expect(ids).not.toContain('mcp-hindsight');
  });
});
