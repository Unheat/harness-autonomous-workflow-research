import './isolated-home';
import { test, expect } from 'bun:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { enableGlobalSkill, disableGlobalSkill, listGlobalActiveSkills } from '../.agent/src/skills-global';
import { removeSkill, isSkillActiveGlobally } from '../.agent/src/skills';
import { deleteSkillPermanent } from '../.agent/src/services/skill-service';

const home = os.homedir();
const roots = ['.zcode/skills', '.claude/skills', '.cursor/skills', '.codex/skills', '.dsh/skills', '.agents/skills', '.config/opencode/skills'];
async function skill(dir: string, name: string, body = 'original') {
  await fs.mkdir(path.join(dir, name), { recursive: true });
  await fs.writeFile(path.join(dir, name, 'SKILL.md'), `---\nname: ${name}\ndescription: regression fixture\n---\n${body}`);
}

test('global enable/disable/re-enable projects readable skills to every supported user root', async () => {
  const name = 'parity-fixture';
  await skill(path.join(home, '.agents/catalog/skills'), name);
  expect((await enableGlobalSkill(name)).success).toBe(true);
  for (const root of roots) expect(await fs.readFile(path.join(home, root, name, 'SKILL.md'), 'utf8')).toContain(name);
  expect((await disableGlobalSkill(name)).success).toBe(true);
  for (const root of roots) expect(await fs.lstat(path.join(home, root, name)).catch(() => null)).toBeNull();
  expect((await enableGlobalSkill(name)).success).toBe(true);
  for (const root of roots) expect(await fs.readFile(path.join(home, root, name, 'SKILL.md'), 'utf8')).toContain(name);
  await disableGlobalSkill(name);
});

test('all destructive skill APIs reject dot and traversal before touching sentinel trees', async () => {
  const ws = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-safety-'));
  await skill(path.join(ws, '.agents/skills'), 'sentinel');
  await skill(path.join(home, '.zcode/skills'), 'sentinel');
  for (const invalid of ['.', '..', '../sentinel', 'a/b', 'a\\b', '']) {
    expect((await removeSkill(ws, invalid, true)).success).toBe(false);
    expect((await deleteSkillPermanent(ws, invalid)).success).toBe(false);
    expect((await enableGlobalSkill(invalid)).success).toBe(false);
    expect((await disableGlobalSkill(invalid)).success).toBe(false);
  }
  expect(await fs.readFile(path.join(ws, '.agents/skills/sentinel/SKILL.md'), 'utf8')).toContain('original');
  expect(await fs.readFile(path.join(home, '.zcode/skills/sentinel/SKILL.md'), 'utf8')).toContain('original');
});

test('global toggles preserve divergent physical skill copies rather than overwriting catalog', async () => {
  const name = 'divergent-fixture';
  await skill(path.join(home, '.agents/catalog/skills'), name, 'catalog version');
  await skill(path.join(home, '.zcode/skills'), name, 'private changed version');
  const original = await fs.readFile(path.join(home, '.zcode/skills', name, 'SKILL.md'), 'utf8');
  expect((await enableGlobalSkill(name)).success).toBe(false);
  expect(await fs.readFile(path.join(home, '.zcode/skills', name, 'SKILL.md'), 'utf8')).toBe(original);
  expect((await disableGlobalSkill(name)).success).toBe(false);
  expect(await fs.readFile(path.join(home, '.zcode/skills', name, 'SKILL.md'), 'utf8')).toBe(original);
});

test('permanent delete removes dangling links without touching sibling skills', async () => {
  const ws = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-dangling-'));
  await skill(path.join(ws, '.agents/skills'), 'sentinel');
  const link = path.join(ws, '.agents/skills/broken');
  await fs.symlink('/nonexistent/harness-regression-skill', link);
  expect((await deleteSkillPermanent(ws, 'broken')).success).toBe(true);
  expect(await fs.lstat(link).catch(() => null)).toBeNull();
  expect(await fs.readFile(path.join(ws, '.agents/skills/sentinel/SKILL.md'), 'utf8')).toContain('original');
});

test('ZCode disabled override does not hide a skill still active in another harness', async () => {
  const name = 'scope-fixture';
  const catalog = path.join(home, '.agents/catalog/skills');
  await skill(catalog, name);
  for (const dir of ['.zcode/skills', '.claude/skills']) {
    await fs.mkdir(path.join(home, dir), { recursive: true });
    await fs.symlink(path.join(catalog, name), path.join(home, dir, name));
  }
  const config = path.join(home, '.zcode/cli/config.json');
  const before = await fs.readFile(config, 'utf8');
  const value = JSON.parse(before);
  value.skills = { [path.join(catalog, name, 'SKILL.md')]: { enable: false } };
  await fs.writeFile(config, JSON.stringify(value));
  try {
    expect((await listGlobalActiveSkills()).some(s => s.name === name)).toBe(true);
    expect(isSkillActiveGlobally(name)).toBe(true);
  } finally { await fs.writeFile(config, before); }
});

test('explicit global enable clears only matching ZCode disabled path overrides', async () => {
  const name = 'reenable-fixture';
  await skill(path.join(home, '.agents/catalog/skills'), name);
  const config = path.join(home, '.zcode/cli/config.json');
  const value = JSON.parse(await fs.readFile(config, 'utf8'));
  const md = path.join(home, '.agents/catalog/skills', name, 'SKILL.md');
  value.skills = { [md]: { enable: false }, unrelated: { enable: false } };
  await fs.writeFile(config, JSON.stringify(value));
  expect((await enableGlobalSkill(name)).success).toBe(true);
  const updated = JSON.parse(await fs.readFile(config, 'utf8'));
  expect(updated.skills[md]?.enable).not.toBe(false);
  expect(updated.skills.unrelated.enable).toBe(false);
});

test('fallback shared symlink stays readable without creating a self-link', async () => {
  const name = 'external-fixture';
  const external = await fs.mkdtemp(path.join(os.tmpdir(), 'external-skill-'));
  await skill(external, name);
  await fs.symlink(path.join(external, name), path.join(home, '.agents/skills', name));
  expect((await enableGlobalSkill(name)).success).toBe(true);
  for (const root of roots) expect(await fs.readFile(path.join(home, root, name, 'SKILL.md'), 'utf8')).toContain(name);
  await disableGlobalSkill(name);
});

test('catalog purge refuses to bypass preservation of physical global content', async () => {
  const name = 'purge-fixture';
  await skill(path.join(home, '.agents/catalog/skills'), name, 'catalog');
  await skill(path.join(home, '.zcode/skills'), name, 'private');
  expect((await deleteSkillPermanent(home, name, { fromCatalog: true, fromWorkspace: false })).success).toBe(false);
  expect(await fs.readFile(path.join(home, '.zcode/skills', name, 'SKILL.md'), 'utf8')).toContain('private');
  expect(await fs.readFile(path.join(home, '.agents/catalog/skills', name, 'SKILL.md'), 'utf8')).toContain('catalog');
});

test('malformed ZCode configuration fails before publishing global adapters', async () => {
  const name = 'malformed-config-fixture';
  await skill(path.join(home, '.agents/catalog/skills'), name);
  const config = path.join(home, '.zcode/cli/config.json');
  const before = await fs.readFile(config, 'utf8');
  await fs.writeFile(config, '{broken');
  try {
    expect((await enableGlobalSkill(name)).success).toBe(false);
    for (const root of roots) expect(await fs.lstat(path.join(home, root, name)).catch(() => null)).toBeNull();
    expect(await fs.readFile(config, 'utf8')).toBe('{broken');
  } finally { await fs.writeFile(config, before); }
});
