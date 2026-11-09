import './isolated-home';
import { test, expect } from 'bun:test';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { auditWorkspace, healWorkspace } from '../.agent/src/doctor';
import { handleApiRoute } from '../.agent/ui/routes';

test('home audit does not apply project adapters or compare global skills to themselves', async () => {
  const home = os.homedir();
  await fsp.mkdir(path.join(home, '.claude/skills'), { recursive: true });
  await fsp.mkdir(path.join(home, '.agents/skills'), { recursive: true });
  const active = path.join(home, '.agents/skills/harness-protocol');
  if (!await fsp.lstat(active).catch(() => null)) {
    await fsp.symlink(path.join(home, '.agents/catalog/skills/harness-protocol'), active);
  }
  const report = await auditWorkspace(home);
  expect(report.issues.filter(i => /adapter|physical directory|both Global User Scope/.test(i.message))).toEqual([]);
});

test('home audit still detects dangling global skill links', async () => {
  const broken = path.join(os.homedir(), '.agents/skills/doctor-broken');
  await fsp.symlink(path.join(os.homedir(), 'missing-doctor-skill'), broken);
  try {
    const report = await auditWorkspace(os.homedir());
    expect(report.issues.some(i => i.message.includes('Dangling skill symlink in .agents/skills/doctor-broken'))).toBe(true);
  } finally {
    await fsp.unlink(broken);
  }
});

test('home heal does not create project adapters or project directories', async () => {
  const home = os.homedir();
  await fsp.mkdir(path.join(home, '.dsh'), { recursive: true });
  const dshMcp = path.join(home, '.dsh/mcp.json');
  await fsp.writeFile(dshMcp, '{}');
  expect((await auditWorkspace(home)).issues.some(i => i.message.includes('poisonous adapter'))).toBe(true);
  await healWorkspace(home);
  expect(await fsp.lstat(dshMcp).catch(() => null)).toBeNull();
  expect(await fsp.lstat(path.join(home, '.cursor/agents')).catch(() => null)).toBeNull();
  expect(await fsp.lstat(path.join(home, '.agent')).catch(() => null)).toBeNull();
});

test('project heal preserves custom folders and API reports unresolved issues', async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'doctor-scope-'));
  await fsp.mkdir(path.join(root, '.claude/skills'), { recursive: true });
  const custom = path.join(root, '.claude/skills/custom.txt');
  await fsp.writeFile(custom, 'user content');
  let response: any;
  try {
    await handleApiRoute({ method: 'POST' } as any, {
      writeHead(status: number) { expect(status).toBe(200); },
      end(text: string) { response = JSON.parse(text); },
    } as any, '/api/heal', root, 'fixture');
    expect(await fsp.readFile(custom, 'utf8')).toBe('user content');
    expect(response.report.passed).toBe(false);
    expect(response.report.issues.some((i: any) => i.message.includes('.claude/skills'))).toBe(true);
    expect(response.message).not.toContain('healed all');
    expect(response.actions.some((s: string) => s.includes('Preserved physical adapter'))).toBe(true);
  } finally {
    await fsp.rm(root, { recursive: true, force: true });
  }
});

test('heal UI keeps results visible, escapes action text and rejects HTTP failures', async () => {
  const html = await fsp.readFile(new URL('../.agent/ui/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
  const body = { innerHTML: '', insertAdjacentHTML(_where: string, text: string) { this.innerHTML += text; } };
  const modal = { style: { display: 'none' } };
  let failed = false;
  const context = vm.createContext({
    window: {}, console, setInterval() {},
    document: { getElementById: (id: string) => id === 'doctor-body' ? body : modal },
    fetch: async () => ({ ok: !failed, json: async () => ({ success: true, message: '1 issue remains', actions: ['Preserved <custom>'], report: { passed: false, issues: [{ severity: 'error', message: '<custom> remains' }] } }) }),
  });
  vm.runInContext(script, context);
  vm.runInContext('loadStatus = async () => {}; showToast = () => {};', context);
  await vm.runInContext('healSymlinks()', context);
  expect(modal.style.display).toBe('flex');
  expect(body.innerHTML).toContain('Preserved &lt;custom&gt;');
  expect(body.innerHTML).not.toContain('<custom>');
  failed = true;
  await vm.runInContext('healSymlinks()', context);
  expect(body.innerHTML).toContain('Failed');
  expect(html).not.toContain('healSymlinks(); closeDoctorModal();');
});
