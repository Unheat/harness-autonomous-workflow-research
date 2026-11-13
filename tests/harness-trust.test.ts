import './isolated-home';
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const { trustProject, listTrust, upsertCodexTrust } = await import('../.agent/src/services/harness-trust');
const { PI_AGENT_DIR_ENV, PI_TRUST_BASENAME } = await import('../.agent/src/config');

let workspace: string;
let canonicalWorkspace: string;

async function write(file: string, content: string): Promise<void> {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, content, 'utf-8');
}

async function readJson(file: string): Promise<any> {
  return JSON.parse(await fsp.readFile(file, 'utf-8'));
}

beforeEach(async () => {
  workspace = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-trust-'));
  canonicalWorkspace = fs.realpathSync(workspace);
  process.env[PI_AGENT_DIR_ENV] = path.join(workspace, '.pi-agent');
  await fsp.mkdir(path.join(workspace, '.pi-agent'), { recursive: true });
  await write(path.join(workspace, '.mcp.json'), JSON.stringify({
    mcpServers: {
      'codebase-memory': { command: 'memory-server', args: ['--x'], env: { A: '1' } }
    }
  }));
  await write(path.join(os.homedir(), '.claude.json'), JSON.stringify({
    projects: { '/keep/me': { hasTrustDialogAccepted: false, allowedTools: ['Bash'] } },
    userID: 'keep'
  }));
  await write(path.join(os.homedir(), '.codex', 'config.toml'),
    '[model]\nname = "keep"\n\n[projects."/keep/me"]\ntrust_level = "untrusted"\n');
  await fsp.mkdir(path.join(os.homedir(), '.cursor'), { recursive: true });
});

afterEach(async () => {
  delete process.env[PI_AGENT_DIR_ENV];
  await Promise.all([
    fsp.rm(workspace, { recursive: true, force: true }),
    fsp.rm(path.join(os.homedir(), '.claude.json'), { force: true }),
    fsp.rm(path.join(os.homedir(), '.codex'), { recursive: true, force: true }),
    fsp.rm(path.join(os.homedir(), '.cursor'), { recursive: true, force: true }),
    fsp.rm(path.join(os.homedir(), '.zcode', 'security'), { recursive: true, force: true })
  ]);
});

describe('harness trust grants one explicit user decision per harness', () => {
  test('writes pi, Claude and Codex trust and reports harnesses without a gate', async () => {
    const results = await trustProject(workspace);
    const byHarness = new Map(results.map(result => [result.harness, result]));

    expect(byHarness.get('pi (DeepAI Code)')?.status).toBe('trusted');
    expect(byHarness.get('Claude Code')?.status).toBe('trusted');
    expect(byHarness.get('Codex')?.status).toBe('trusted');
    expect(byHarness.get('ZCode')?.status).toBe('trusted');
    expect(byHarness.get('Cursor')?.status).toBe('unsupported');

    const piStore = await readJson(path.join(workspace, '.pi-agent', PI_TRUST_BASENAME));
    expect(piStore[canonicalWorkspace]).toBe(true);

    const claude = await readJson(path.join(os.homedir(), '.claude.json'));
    expect(claude.projects[canonicalWorkspace].hasTrustDialogAccepted).toBe(true);
    expect(claude.projects['/keep/me']).toEqual({ hasTrustDialogAccepted: false, allowedTools: ['Bash'] });
    expect(claude.userID).toBe('keep');

    const codex = await fsp.readFile(path.join(os.homedir(), '.codex', 'config.toml'), 'utf-8');
    expect(codex).toContain('[projects."/keep/me"]\ntrust_level = "untrusted"');
    expect(codex).toContain(`[projects."${canonicalWorkspace}"]\ntrust_level = "trusted"`);
    expect(codex).toContain('[model]\nname = "keep"');
  });

  test('is idempotent: a second run changes nothing and reports already', async () => {
    await trustProject(workspace);
    const before = {
      pi: await fsp.readFile(path.join(workspace, '.pi-agent', PI_TRUST_BASENAME), 'utf-8'),
      claude: await fsp.readFile(path.join(os.homedir(), '.claude.json'), 'utf-8'),
      codex: await fsp.readFile(path.join(os.homedir(), '.codex', 'config.toml'), 'utf-8'),
      zcode: await fsp.readFile(path.join(os.homedir(), '.zcode', 'security', 'workspace-mcp-trust-v1.json'), 'utf-8')
    };

    const results = await trustProject(workspace);
    const statuses = results.filter(result => result.harness !== 'Cursor').map(result => result.status);
    expect(statuses.every(status => status === 'already')).toBe(true);

    expect(await fsp.readFile(path.join(workspace, '.pi-agent', PI_TRUST_BASENAME), 'utf-8')).toBe(before.pi);
    expect(await fsp.readFile(path.join(os.homedir(), '.claude.json'), 'utf-8')).toBe(before.claude);
    expect(await fsp.readFile(path.join(os.homedir(), '.codex', 'config.toml'), 'utf-8')).toBe(before.codex);
    expect(await fsp.readFile(path.join(os.homedir(), '.zcode', 'security', 'workspace-mcp-trust-v1.json'), 'utf-8')).toBe(before.zcode);
  });

  test('ZCode records one digest per local declaration and regenerates it when the server changes', async () => {
    await trustProject(workspace);
    const file = path.join(os.homedir(), '.zcode', 'security', 'workspace-mcp-trust-v1.json');
    const initial = await readJson(file);
    expect(initial.schemaVersion).toBe(1);
    const mine = initial.records.filter((record: any) => record.workspaceIdentity === path.resolve(workspace));
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ serverName: 'codebase-memory' });
    expect(mine[0].declarationDigest).toMatch(/^[0-9a-f]{64}$/);

    await write(path.join(workspace, '.mcp.json'), JSON.stringify({
      mcpServers: { 'codebase-memory': { command: 'memory-server', args: ['--changed'] } }
    }));
    const second = await trustProject(workspace);
    expect(second.find(result => result.harness === 'ZCode')?.status).toBe('trusted');
    const updated = await readJson(file);
    const updatedMine = updated.records.filter((record: any) => record.workspaceIdentity === path.resolve(workspace));
    expect(updatedMine).toHaveLength(1);
    expect(updatedMine[0].declarationDigest).not.toBe(mine[0].declarationDigest);
  });

  test('listTrust reads the same decision back without writing', async () => {
    expect((await listTrust(workspace)).every(result => result.status === 'untrusted')).toBe(true);

    await trustProject(workspace);
    const trusted = await listTrust(workspace);
    expect(trusted.find(result => result.harness === 'pi (DeepAI Code)')?.status).toBe('trusted');
    expect(trusted.find(result => result.harness === 'Claude Code')?.status).toBe('trusted');
    expect(trusted.find(result => result.harness === 'Codex')?.status).toBe('trusted');
  });
});

describe('Codex TOML editing is exact and non-destructive', () => {
  test('does not modify a sibling project whose path starts with the same prefix', () => {
    const content = '[projects."/repo"]\ntrust_level = "trusted"\n\n[projects."/repo-extra"]\ntrust_level = "untrusted"\n';
    const result = upsertCodexTrust(content, '/repo-extra');
    expect(result.changed).toBe(true);
    expect(result.content).toContain('[projects."/repo"]\ntrust_level = "trusted"');
    expect(result.content).toContain('[projects."/repo-extra"]\ntrust_level = "trusted"');
  });

  test('replaces an existing untrusted level in place', () => {
    const content = '[projects."/repo"]\nfoo = 1\ntrust_level = "untrusted"\n';
    const result = upsertCodexTrust(content, '/repo');
    expect(result.content).toBe('[projects."/repo"]\nfoo = 1\ntrust_level = "trusted"\n');
  });
});
