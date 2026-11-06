import './isolated-home';
import { test, expect } from 'bun:test';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
const { getCatalogSkills } = await import('../.agent/src/catalog');
const { healWorkspace, auditWorkspace, ADAPTER_SYMLINKS } = await import('../.agent/src/doctor');
const { initWorkspace } = await import('../.agent/src/workspace');
const { autoTrustWorkspaceMcps, getEffectiveMcpList } = await import('../.agent/src/mcp-global');
const { enableMcp, saveLocalMcps } = await import('../.agent/src/mcp');
const { createLocalSkill, removeSkill, addSkill } = await import('../.agent/src/skills');
const { getEffectiveSkillsList } = await import('../.agent/src/skills-global');

function snapshot(dir: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) result[entry.name] = `link:${fs.readlinkSync(full)}`;
    else if (entry.isDirectory()) result[entry.name] = JSON.stringify(snapshot(full));
    else result[entry.name] = fs.readFileSync(full, 'utf8');
  }
  return result;
}

async function workspace(run: (root: string) => Promise<void>) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-localization-'));
  try { await run(root); } finally { await fsp.rm(root, { recursive: true, force: true }); }
}

const hook = path.resolve(import.meta.dir, '../.agent/hooks/auto-heal-symlinks.sh');

test('catalog and status reads never ingest private user skills or write HOME', async () => {
  const privateDir = path.join(os.homedir(), '.claude/skills/private-user-skill');
  await fsp.mkdir(privateDir, { recursive: true });
  await fsp.writeFile(path.join(privateDir, 'SKILL.md'), 'private contents');
  try {
    await workspace(async root => {
      await createLocalSkill(root, 'workspace-private');
      const before = snapshot(os.homedir());
      expect(await getCatalogSkills()).not.toContain('private-user-skill');
      await getEffectiveSkillsList(root);
      await getEffectiveMcpList(root);
      await auditWorkspace(root);
      expect(snapshot(os.homedir())).toEqual(before);
    });
  } finally { await fsp.rm(privateDir, { recursive: true, force: true }); }
});

test('heal and enable leave globals and trust records untouched; legacy trust API cannot grant trust', async () => {
  await workspace(async root => {
    await saveLocalMcps(root, { private: { command: 'private-server' } });
    const security = path.join(os.homedir(), '.zcode/security');
    await fsp.mkdir(security, { recursive: true });
    const trust = path.join(security, 'workspace-mcp-trust-v1.json');
    await fsp.writeFile(trust, '{"schemaVersion":1,"records":[]}\n');
    const before = snapshot(os.homedir());
    await enableMcp(root, 'private');
    await healWorkspace(root);
    expect(await autoTrustWorkspaceMcps(root)).toBe(0);
    expect(snapshot(os.homedir())).toEqual(before);
    await fsp.unlink(trust);
    await healWorkspace(root);
    expect(fs.existsSync(trust)).toBe(false);
  });
});

test('init, doctor heal, and shell auto-heal share adapter policy and remain idempotent', async () => {
  for (const mode of ['init', 'heal', 'hook']) {
    await workspace(async root => {
      await fsp.writeFile(path.join(root, '.mcp.json'), '{"mcpServers":{}}');
      const run = async () => {
        if (mode === 'init') await initWorkspace(root);
        else if (mode === 'heal') await healWorkspace(root);
        else execFileSync('bash', [hook], { cwd: root, env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
      };
      await run();
      for (const { link, target } of ADAPTER_SYMLINKS) {
        expect(await fsp.readlink(path.join(root, link))).toBe(target);
      }
      expect(fs.existsSync(path.join(root, '.zcode/skills'))).toBe(false);
      expect((await auditWorkspace(root)).passed).toBe(true);
      const before = snapshot(root);
      await run();
      expect(snapshot(root)).toEqual(before);
    });
  }
});

test('all repair paths preserve physical folders, dotfiles, MCP files and unrelated ZCode links', async () => {
  for (const mode of ['init', 'heal', 'hook']) {
    await workspace(async root => {
      await fsp.mkdir(path.join(root, '.claude/skills'), { recursive: true });
      await fsp.writeFile(path.join(root, '.claude/skills/.private'), 'keep');
      await fsp.mkdir(path.join(root, '.cursor/skills'), { recursive: true });
      await fsp.mkdir(path.join(root, '.agents'), { recursive: true });
      await fsp.writeFile(path.join(root, '.mcp.json'), '{"mcpServers":{}}');
      await fsp.writeFile(path.join(root, '.agents/mcp.json'), '{"private":true}');
      await fsp.mkdir(path.join(root, '.zcode'), { recursive: true });
      await fsp.symlink('../private-zcode-skills', path.join(root, '.zcode/skills'));
      if (mode === 'init') await initWorkspace(root);
      else if (mode === 'heal') await healWorkspace(root);
      else execFileSync('bash', [hook], { cwd: root, env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
      expect(await fsp.readFile(path.join(root, '.claude/skills/.private'), 'utf8')).toBe('keep');
      expect((await fsp.lstat(path.join(root, '.cursor/skills'))).isDirectory()).toBe(true);
      expect(await fsp.readFile(path.join(root, '.agents/mcp.json'), 'utf8')).toBe('{"private":true}');
      expect(await fsp.readlink(path.join(root, '.zcode/skills'))).toBe('../private-zcode-skills');
    });
  }
});

test('a dormant private skill restores locally despite a global skill with the same name', async () => {
  await workspace(async root => {
    await createLocalSkill(root, 'harness-protocol', 'private project implementation');
    await removeSkill(root, 'harness-protocol');
    expect((await addSkill(root, 'harness-protocol')).success).toBe(true);
    expect(await fsp.readFile(path.join(root, '.agents/skills/harness-protocol/SKILL.md'), 'utf8')).toContain('private project implementation');
    await healWorkspace(root);
    expect(fs.existsSync(path.join(root, '.agents/skills/harness-protocol/SKILL.md'))).toBe(true);
  });
});

test('explicit global cleanup archives auxiliary skills and preserves unarchivable folders', async () => {
  const { cleanGlobalSkills } = await import('../.agent/src/clean-global');
  const base = path.join(os.homedir(), '.claude/skills');
  const exported = path.join(base, 'explicit-export');
  const unarchivable = path.join(base, 'not-a-skill');
  await fsp.mkdir(exported, { recursive: true });
  await fsp.mkdir(unarchivable, { recursive: true });
  await fsp.writeFile(path.join(exported, 'SKILL.md'), 'explicit archival');
  await fsp.writeFile(path.join(unarchivable, '.private'), 'preserve');
  await cleanGlobalSkills();
  expect(await fsp.readFile(path.join(os.homedir(), '.agents/catalog/skills/explicit-export/SKILL.md'), 'utf8')).toBe('explicit archival');
  expect(fs.existsSync(exported)).toBe(false);
  expect(await fsp.readFile(path.join(unarchivable, '.private'), 'utf8')).toBe('preserve');
});
