import './isolated-home';
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fsp from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const { buildOpencodeMcpServers, getOpencodeProjectConfigPath, inspectOpencodeProjection, syncOpencodeProjectMcps } = await import('../.agent/src/services/opencode-mcp-projection');
const { syncHarnessProjections } = await import('../.agent/src/services/harness-sync-service');

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'opencode-projection-test-'));
});

afterEach(async () => {
  await fsp.rm(tmpDir, { recursive: true, force: true });
});

describe('OpenCode MCP dialect translation', () => {
  test('stdio: command + args become a command array and env becomes environment', () => {
    const servers = buildOpencodeMcpServers({
      'codebase-memory': {
        command: '/usr/local/bin/codebase-memory-mcp',
        args: ['--verbose'],
        env: { API_KEY: 'test-123' },
        cwd: '/tmp/repo',
        enabled: true
      }
    });

    expect(servers['codebase-memory']).toEqual({
      type: 'local',
      command: ['/usr/local/bin/codebase-memory-mcp', '--verbose'],
      environment: { API_KEY: 'test-123' },
      cwd: '/tmp/repo'
    });
  });

  test('local server without args/env omits empty keys', () => {
    const servers = buildOpencodeMcpServers({ search2ai: { command: '/bin/search2ai-mcp', args: [], env: {} } });
    expect(servers.search2ai).toEqual({ type: 'local', command: ['/bin/search2ai-mcp'] });
  });

  test('remote server maps url and headers with type remote', () => {
    const servers = buildOpencodeMcpServers({
      docs: { command: 'unused', url: 'mcp.example.com/mcp', headers: { Authorization: 'Bearer x' } }
    });
    expect(servers.docs).toEqual({ type: 'remote', url: 'mcp.example.com/mcp', headers: { Authorization: 'Bearer x' } });
  });

  test('dormant servers are omitted so the harness loads only what the manager shows ON', () => {
    const servers = buildOpencodeMcpServers({
      active: { command: '/bin/active', enabled: true },
      offViaEnabled: { command: '/bin/off', enabled: false },
      offViaDisabled: { command: '/bin/off2', disabled: true }
    });
    expect(Object.keys(servers)).toEqual(['active']);
  });

  test('installer-owned entries are not projected into OpenCode', () => {
    const servers = buildOpencodeMcpServers({
      mine: { command: '/bin/mine' },
      hindsight: { command: 'node', args: ['x.js'], env: { HINDSIGHT_MCP_HARNESS: 'zcode' } }
    });
    expect(Object.keys(servers)).toEqual(['mine']);
  });
});

describe('OpenCode project projection lifecycle', () => {
  test('missing before sync, current after sync, and idempotent on a second sync', async () => {
    const servers = { search2ai: { command: '/bin/search2ai-mcp', enabled: true } };
    expect(inspectOpencodeProjection(tmpDir, servers).state).toBe('missing');

    const first = await syncOpencodeProjectMcps(tmpDir, servers);
    expect(first.state).toBe('current');
    expect(first.changed).toBe(true);

    const second = await syncOpencodeProjectMcps(tmpDir, servers);
    expect(second.state).toBe('current');
    expect(second.changed).toBe(false);

    const written = JSON.parse(await fsp.readFile(getOpencodeProjectConfigPath(tmpDir), 'utf-8'));
    expect(written.mcp.servers.search2ai).toEqual({ type: 'local', command: ['/bin/search2ai-mcp'] });
  });

  test('detects drift and regenerates from the hub', async () => {
    const servers = { search2ai: { command: '/bin/search2ai-mcp' } };
    await syncOpencodeProjectMcps(tmpDir, servers);

    const target = getOpencodeProjectConfigPath(tmpDir);
    const tampered = JSON.parse(await fsp.readFile(target, 'utf-8'));
    tampered.mcp.servers.search2ai.command = ['/wrong/path'];
    await fsp.writeFile(target, JSON.stringify(tampered, null, 2) + '\n', 'utf-8');

    expect(inspectOpencodeProjection(tmpDir, servers).state).toBe('stale');
    expect((await syncOpencodeProjectMcps(tmpDir, servers)).changed).toBe(true);
    expect(inspectOpencodeProjection(tmpDir, servers).state).toBe('current');
  });

  test('preserves unrelated config keys and only owns mcp.servers', async () => {
    const target = getOpencodeProjectConfigPath(tmpDir);
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, JSON.stringify({ model: 'opencode/hy4-flash-free', permission: { edit: 'allow' } }), 'utf-8');

    await syncOpencodeProjectMcps(tmpDir, { search2ai: { command: '/bin/search2ai-mcp' } });

    const written = JSON.parse(await fsp.readFile(target, 'utf-8'));
    expect(written.model).toBe('opencode/hy4-flash-free');
    expect(written.permission).toEqual({ edit: 'allow' });
    expect(written.mcp.servers).toBeDefined();
  });

  test('refuses to overwrite a symlink into the hub', async () => {
    await fsp.mkdir(path.dirname(getOpencodeProjectConfigPath(tmpDir)), { recursive: true });
    await fsp.symlink(path.join(tmpDir, '.mcp.json'), getOpencodeProjectConfigPath(tmpDir));

    const result = await syncOpencodeProjectMcps(tmpDir, { search2ai: { command: '/bin/search2ai-mcp' } });
    expect(result.state).toBe('blocked');
    expect(result.changed).toBe(false);
  });

  test('syncHarnessProjections refreshes the OpenCode projection from .mcp.json', async () => {
    await fsp.writeFile(path.join(tmpDir, '.mcp.json'), JSON.stringify({
      mcpServers: { search2ai: { command: '/bin/search2ai-mcp', enabled: true } }
    }), 'utf-8');

    const report = await syncHarnessProjections(tmpDir);
    expect(report.actions.some(action => action.includes('.opencode/opencode.json'))).toBe(true);
    expect(fs.existsSync(getOpencodeProjectConfigPath(tmpDir))).toBe(true);
  });
});
