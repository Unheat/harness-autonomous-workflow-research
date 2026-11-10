import './isolated-home';
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fsp from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const { buildPiMcpEntry, buildPiProjection } = await import('../.agent/src/services/pi-mcp-dialect');
const {
  getPiProjectMcpPath,
  getPiUserScopeMcpPath,
  inspectPiProjection,
  inspectPiUserScope,
  syncPiProjectMcps,
  syncPiUserScopeMcps
} = await import('../.agent/src/services/pi-mcp-projection');
const {
  readPiProjectTrust,
  describePiTrustGaps,
  discoverPiAgentDirs
} = await import('../.agent/src/services/pi-harness-trust');
const { PI_AGENT_DIR_ENV, PI_LIKE_AGENT_DIRS_ENV, PI_TRUST_BASENAME } = await import('../.agent/src/config');
const { reconcileWorkspaceAdapters } = await import('../.agent/src/workspace');
const { enableMcp, disableMcp, saveLocalMcps } = await import('../.agent/src/mcp');
const { enableGlobalMcp } = await import('../.agent/src/mcp-global');
const { syncHarnessProjections } = await import('../.agent/src/services/harness-sync-service');

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pi-projection-test-'));
});

afterEach(async () => {
  delete process.env[PI_AGENT_DIR_ENV];
  delete process.env[PI_LIKE_AGENT_DIRS_ENV];
  await fsp.rm(tmpDir, { recursive: true, force: true });
});

describe('pi-like harness dialect translation', () => {
  test('stdio: keeps command, args, env, cwd, description and drops hub-only keys', () => {
    const built = buildPiMcpEntry('codebase-memory', {
      command: '/usr/local/bin/codebase-memory-mcp',
      args: ['--verbose'],
      env: { API_KEY: 'test-123' },
      cwd: '/tmp/repo',
      description: 'Structural code search',
      enabled: true
    });

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.entry).toEqual({
      command: '/usr/local/bin/codebase-memory-mcp',
      args: ['--verbose'],
      env: { API_KEY: 'test-123' },
      cwd: '/tmp/repo',
      description: 'Structural code search',
      exposure: 'direct'
    });
    expect('transport' in built.entry).toBe(false);
    expect('disabled' in built.entry).toBe(false);
  });

  test('stdio: omits empty env so the projection stays byte-stable', () => {
    const built = buildPiMcpEntry('empty-ish', { command: 'node', args: [], env: {} });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.entry).toEqual({ command: 'node', args: [], exposure: 'direct' });
  });

  test('exposure defaults to direct (parity with other harnesses) and honours a per-server override', () => {
    const parity = buildPiMcpEntry('a', { command: 'x' });
    const optedOut = buildPiMcpEntry('b', { command: 'x', exposure: 'deferred' } as any);

    expect(parity.ok && parity.entry.exposure).toBe('direct');
    expect(optedOut.ok && optedOut.entry.exposure).toBe('deferred');
  });

  test('dormant servers stay listed with enabled: false (pi lists but does not connect)', () => {
    const viaEnabled = buildPiMcpEntry('a', { command: 'x', enabled: false });
    const viaDisabled = buildPiMcpEntry('b', { command: 'x', disabled: true });
    expect(viaEnabled.ok && viaEnabled.entry.enabled).toBe(false);
    expect(viaDisabled.ok && viaDisabled.entry.enabled).toBe(false);
  });

  test('http: url and headers win over command; transport is not emitted', () => {
    const built = buildPiMcpEntry('remote', {
      command: 'ignored',
      url: 'https://mcp.example.com/mcp',
      headers: { Authorization: 'Bearer token' },
      transport: 'streamable-http'
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.entry.url).toBe('https://mcp.example.com/mcp');
    expect(built.entry.headers).toEqual({ Authorization: 'Bearer token' });
    expect('command' in built.entry).toBe(false);
    expect(built.entry.exposure).toBe('direct');
  });

  test('rejects what pi rejects instead of writing an entry it would silently skip', () => {
    expect(buildPiMcpEntry('legacy', { command: 'x', url: 'https://x.dev/sse', transport: 'sse' }).ok).toBe(false);
    expect(buildPiMcpEntry('bad', { command: 'x', url: 'ftp://x.dev/mcp' }).ok).toBe(false);
    expect(buildPiMcpEntry('nocommand', { command: '' }).ok).toBe(false);
    expect(buildPiMcpEntry('has space', { command: 'x' }).ok).toBe(false);
  });

  test('collapses "-" and "_" namespaces the way pi does, keeping the first declaration', () => {
    const { payload, issues } = buildPiProjection({
      'codebase-memory': { command: 'a' },
      codebase_memory: { command: 'b' }
    });

    expect(Object.keys(payload.mcpServers)).toEqual(['codebase-memory']);
    expect(issues).toHaveLength(1);
    expect(issues[0].server).toBe('codebase_memory');
    expect(issues[0].reason).toContain('collides');
  });
});

describe('pi project projection lifecycle', () => {
  test('writes .pi/mcp.json derived from the hub, then reports current', async () => {
    const servers = { search2ai: { command: '/bin/search2ai-mcp', enabled: true } };
    const first = await syncPiProjectMcps(tmpDir, servers);
    expect(first.state).toBe('current');
    expect(first.servers).toBe(1);

    const target = getPiProjectMcpPath(tmpDir);
    expect(JSON.parse(await fsp.readFile(target, 'utf-8'))).toEqual({
      mcpServers: { search2ai: { command: '/bin/search2ai-mcp', args: [], exposure: 'direct' } }
    });

    expect((await syncPiProjectMcps(tmpDir, servers)).state).toBe('current');
  });

  test('creates no project file when the workspace has no servers', async () => {
    const result = await syncPiProjectMcps(tmpDir, {});
    expect(result.state).toBe('current');
    expect(fs.existsSync(getPiProjectMcpPath(tmpDir))).toBe(false);
  });

  test('clears an existing projection when the last server is removed', async () => {
    await syncPiProjectMcps(tmpDir, { hack: { command: 'x' } });
    expect((await syncPiProjectMcps(tmpDir, {})).state).toBe('current');
    expect(JSON.parse(await fsp.readFile(getPiProjectMcpPath(tmpDir), 'utf-8'))).toEqual({ mcpServers: {} });
  });

  test('detects drift when a harness edits the projection by hand', async () => {
    await syncPiProjectMcps(tmpDir, { a: { command: 'x' } });
    await fsp.writeFile(getPiProjectMcpPath(tmpDir), JSON.stringify({ mcpServers: { a: { command: 'tampered' } } }), 'utf-8');

    expect(inspectPiProjection(tmpDir, { a: { command: 'x' } }).state).toBe('stale');
    expect((await syncPiProjectMcps(tmpDir, { a: { command: 'x' } })).state).toBe('current');
  });

  test('refuses to write through a symlinked projection and heal prunes the link', async () => {
    const hubServers = { a: { command: 'x' } };
    await fsp.writeFile(path.join(tmpDir, '.mcp.json'), JSON.stringify({ mcpServers: hubServers }), 'utf-8');
    await fsp.mkdir(path.join(tmpDir, '.pi'), { recursive: true });
    await fsp.symlink('../.mcp.json', path.join(tmpDir, '.pi', 'mcp.json'));

    expect(inspectPiProjection(tmpDir, hubServers).state).toBe('blocked');

    await syncPiProjectMcps(tmpDir, hubServers);
    expect(JSON.parse(await fsp.readFile(path.join(tmpDir, '.mcp.json'), 'utf-8'))).toEqual({ mcpServers: hubServers });

    const actions = await reconcileWorkspaceAdapters(tmpDir);
    expect(actions.some(a => a.includes('.pi/mcp.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.pi', 'mcp.json'))).toBe(false);
  });

  test('preserves a generated physical projection during adapter reconciliation', async () => {
    await syncPiProjectMcps(tmpDir, { a: { command: 'x' } });
    await reconcileWorkspaceAdapters(tmpDir);
    expect(fs.existsSync(getPiProjectMcpPath(tmpDir))).toBe(true);
  });
});

describe('pi trust resolution (mirrors nearest-ancestor semantics)', () => {
  async function seedAgentDir(trust: Record<string, boolean | null> | null): Promise<string> {
    const agentDir = path.join(tmpDir, '.pi', 'agent');
    await fsp.mkdir(agentDir, { recursive: true });
    if (trust) await fsp.writeFile(path.join(agentDir, PI_TRUST_BASENAME), JSON.stringify(trust), 'utf-8');
    return agentDir;
  }

  test('missing or empty trust store reports unknown, never trusted', async () => {
    const agentDir = await seedAgentDir(null);
    expect(readPiProjectTrust(agentDir, tmpDir).decision).toBe('unknown');

    await fsp.writeFile(path.join(agentDir, PI_TRUST_BASENAME), '{}', 'utf-8');
    expect(readPiProjectTrust(agentDir, tmpDir).decision).toBe('unknown');
  });

  test('honours exact entries, inherited ancestors and the nearest decision', async () => {
    const workspace = path.join(tmpDir, 'nested', 'repo');
    await fsp.mkdir(workspace, { recursive: true });
    // pi keys trust.json by REAL path, so fixtures must canonicalize too (macOS /var -> /private/var).
    const canonicalRoot = fs.realpathSync(tmpDir);
    const canonicalWorkspace = fs.realpathSync(workspace);
    const agentDir = await seedAgentDir({ [canonicalRoot]: true });

    expect(readPiProjectTrust(agentDir, workspace)).toMatchObject({
      decision: 'trusted',
      matchedPath: canonicalRoot
    });

    await fsp.writeFile(
      path.join(agentDir, PI_TRUST_BASENAME),
      JSON.stringify({ [canonicalRoot]: true, [canonicalWorkspace]: false }),
      'utf-8'
    );
    expect(readPiProjectTrust(agentDir, workspace)).toMatchObject({
      decision: 'untrusted',
      matchedPath: canonicalWorkspace
    });
  });

  test('a non-canonical trust key does not match, mirroring pi exactly', async () => {
    const workspace = path.join(tmpDir, 'nested', 'repo');
    await fsp.mkdir(workspace, { recursive: true });
    const agentDir = await seedAgentDir({ [path.resolve(tmpDir)]: true });

    const canonicalRoot = fs.realpathSync(tmpDir);
    if (canonicalRoot === path.resolve(tmpDir)) return; // no symlinked temp root on this host

    expect(readPiProjectTrust(agentDir, workspace).decision).toBe('untrusted');
  });

  test('tolerates a corrupt trust file instead of throwing', async () => {
    const agentDir = await seedAgentDir(null);
    await fsp.writeFile(path.join(agentDir, PI_TRUST_BASENAME), '{not json', 'utf-8');
    expect(readPiProjectTrust(agentDir, tmpDir).decision).toBe('unknown');
  });

  test('agent dir discovery follows the pi env var and the opt-in registry', () => {
    const relocated = path.join(tmpDir, 'app-instance');
    const registered = path.join(tmpDir, 'second-instance');
    process.env[PI_AGENT_DIR_ENV] = relocated;
    process.env[PI_LIKE_AGENT_DIRS_ENV] = `${registered}${path.delimiter}${relocated}`;

    const dirs = discoverPiAgentDirs();
    expect(dirs).toContain(path.resolve(relocated));
    expect(dirs).toContain(path.resolve(registered));
    expect(dirs).toContain(path.join(os.homedir(), '.pi', 'agent'));
    expect(new Set(dirs).size).toBe(dirs.length);
  });

  test('reports a trust gap for an untrusted harness without offering to grant it', async () => {
    const agentDir = await seedAgentDir({});
    process.env[PI_AGENT_DIR_ENV] = agentDir;

    const gaps = describePiTrustGaps(tmpDir);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toContain('never grant trust');
  });
});

describe('user scope: agent-dir projection is the manager, not a hand-maintained file', () => {
  async function seedAgentDir(): Promise<string> {
    const agentDir = path.join(tmpDir, '.pi', 'agent');
    await fsp.mkdir(agentDir, { recursive: true });
    process.env[PI_AGENT_DIR_ENV] = agentDir;
    return agentDir;
  }

  test('projects the manager global scope into every existing agent directory', async () => {
    const agentDir = await seedAgentDir();
    const results = await syncPiUserScopeMcps({ hindsight: { command: '/bin/hindsight' } });

    expect(results).toHaveLength(1);
    expect(results[0].path).toBe(getPiUserScopeMcpPath(agentDir));
    expect(JSON.parse(await fsp.readFile(results[0].path, 'utf-8'))).toEqual({
      mcpServers: { hindsight: { command: '/bin/hindsight', args: [], exposure: 'direct' } }
    });
  });

  test('narrows a hand-written agent-dir file down to the manager active set', async () => {
    const agentDir = await seedAgentDir();
    const handWritten = {
      mcpServers: {
        hindsight: { command: '/bin/hindsight' },
        stale: { command: '/bin/stale' }
      }
    };
    await fsp.writeFile(getPiUserScopeMcpPath(agentDir), JSON.stringify(handWritten), 'utf-8');

    expect(inspectPiUserScope(agentDir, { hindsight: { command: '/bin/hindsight' } }).state).toBe('stale');
    await syncPiUserScopeMcps({ hindsight: { command: '/bin/hindsight' } });

    const written = JSON.parse(await fsp.readFile(getPiUserScopeMcpPath(agentDir), 'utf-8'));
    expect(Object.keys(written.mcpServers)).toEqual(['hindsight']);
  });

  test('skips agent directories that do not exist instead of materialising them', async () => {
    process.env[PI_AGENT_DIR_ENV] = path.join(tmpDir, 'never-used-harness');
    const results = await syncPiUserScopeMcps({ hindsight: { command: '/bin/hindsight' } });

    expect(results).toHaveLength(0);
    expect(fs.existsSync(path.join(tmpDir, 'never-used-harness'))).toBe(false);
  });

  test('a global toggle reaches the agent-dir projection in the same call', async () => {
    const agentDir = await seedAgentDir();
    await enableGlobalMcp('codebase-memory');

    const written = JSON.parse(await fsp.readFile(getPiUserScopeMcpPath(agentDir), 'utf-8'));
    expect(written.mcpServers['codebase-memory']).toEqual({ command: 'test-memory-server', args: [], exposure: 'direct' });
  });

  test('syncHarnessProjections reports both scopes and keeps the hub untouched', async () => {
    const agentDir = await seedAgentDir();
    // Written directly so the projection is missing: sync must create it and report it.
    await fsp.writeFile(
      path.join(tmpDir, '.mcp.json'),
      JSON.stringify({ mcpServers: { gitmcp: { command: '/bin/gitmcp' } } }),
      'utf-8'
    );

    const report = await syncHarnessProjections(tmpDir);

    expect(JSON.parse(await fsp.readFile(path.join(tmpDir, '.mcp.json'), 'utf-8'))).toEqual({
      mcpServers: { gitmcp: { command: '/bin/gitmcp' } }
    });
    expect(JSON.parse(await fsp.readFile(getPiProjectMcpPath(tmpDir), 'utf-8')).mcpServers.gitmcp).toBeDefined();
    expect(report.actions.some(a => a.includes(path.join(tmpDir, '.pi', 'mcp.json')))).toBe(true);
    expect(report.warnings).toEqual([]);
    expect(fs.existsSync(getPiUserScopeMcpPath(agentDir))).toBe(true);
  });

  test('a second sync is a no-op, so the manager never rewrites what already matches', async () => {
    await seedAgentDir();
    await saveLocalMcps(tmpDir, { gitmcp: { command: '/bin/gitmcp' } });

    await syncHarnessProjections(tmpDir);
    const second = await syncHarnessProjections(tmpDir);

    expect(second.actions).toEqual([]);
    expect(second.warnings).toEqual([]);
  });
});

describe('hub integration', () => {
  test('mcp on / off keep the pi projection in lockstep with the hub', async () => {
    expect((await enableMcp(tmpDir, 'codebase-memory')).success).toBe(true);

    const afterEnable = JSON.parse(await fsp.readFile(getPiProjectMcpPath(tmpDir), 'utf-8'));
    expect(afterEnable.mcpServers['codebase-memory']).toEqual({ command: 'test-memory-server', args: [], exposure: 'direct' });

    expect((await disableMcp(tmpDir, 'codebase-memory')).success).toBe(true);
    const afterDisable = JSON.parse(await fsp.readFile(getPiProjectMcpPath(tmpDir), 'utf-8'));
    expect(afterDisable.mcpServers['codebase-memory'].enabled).toBe(false);
    expect('disabled' in afterDisable.mcpServers['codebase-memory']).toBe(false);

    const hub = JSON.parse(await fsp.readFile(path.join(tmpDir, '.mcp.json'), 'utf-8'));
    expect(hub.mcpServers['codebase-memory'].disabled).toBe(true);
  });

  test('saveLocalMcps regenerates the projection without touching the hub payload', async () => {
    await saveLocalMcps(tmpDir, { remote: { command: 'x', url: 'https://x.dev/mcp' } });
    const hub = JSON.parse(await fsp.readFile(path.join(tmpDir, '.mcp.json'), 'utf-8'));
    expect(hub).toEqual({ mcpServers: { remote: { command: 'x', url: 'https://x.dev/mcp' } } });

    const projection = JSON.parse(await fsp.readFile(getPiProjectMcpPath(tmpDir), 'utf-8'));
    expect(projection.mcpServers.remote).toEqual({ url: 'https://x.dev/mcp', exposure: 'direct' });
  });
});
