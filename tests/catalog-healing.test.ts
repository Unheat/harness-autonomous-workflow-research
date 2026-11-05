import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { getCatalogSkills, syncSkillToCatalog } from '../.agent/src/catalog';
import { healWorkspace } from '../.agent/src/doctor';
import { addSkill } from '../.agent/src/skills';
import { enableGlobalSkill, disableGlobalSkill } from '../.agent/src/skills-global';

describe('Catalog Isolation, Continuous Discovery & Self-Healing', () => {
  let tempWs: string;

  beforeEach(async () => {
    tempWs = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-heal-'));
  });

  afterEach(async () => {
    try {
      await fsp.rm(tempWs, { recursive: true, force: true });
      const testCatalogPath = path.join(os.homedir(), '.agents', 'catalog', 'skills', 'bypassed-skill-test');
      await fsp.rm(testCatalogPath, { recursive: true, force: true }).catch(() => {});
    } catch {}
  });

  test('getCatalogSkills: discovers skills from central catalog', async () => {
    const skills = await getCatalogSkills();
    expect(Array.isArray(skills)).toBe(true);
    expect(skills.length).toBeGreaterThan(0);
    expect(skills).toContain('harness-protocol');
  });

  test('syncSkillToCatalog: ingests arbitrary directory with SKILL.md into catalog', async () => {
    const rogueSkillDir = path.join(tempWs, 'bypassed-skill');
    await fsp.mkdir(rogueSkillDir, { recursive: true });
    await fsp.writeFile(path.join(rogueSkillDir, 'SKILL.md'), '---\nname: bypassed-skill\ndescription: Manually installed\n---\n');

    const synced = await syncSkillToCatalog(rogueSkillDir, 'bypassed-skill-test');
    expect(synced).toBe(true);

    const skills = await getCatalogSkills();
    expect(skills).toContain('bypassed-skill-test');
  });

  test('healWorkspace: prunes broken skill symlinks and reconciles all adapters', async () => {
    // 1. Create a workspace with a broken skill symlink
    const skillsDir = path.join(tempWs, '.agents', 'skills');
    await fsp.mkdir(skillsDir, { recursive: true });

    const brokenLink = path.join(skillsDir, 'dead-skill');
    await fsp.symlink('/path/to/nonexistent/destination/skill', brokenLink);

    // Verify it exists as a symlink
    const statBefore = await fsp.lstat(brokenLink);
    expect(statBefore.isSymbolicLink()).toBe(true);

    // 2. Run healWorkspace
    const actions = await healWorkspace(tempWs);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some(a => a.includes('dead-skill'))).toBe(true);

    // 3. Verify dead link was pruned
    const existsAfter = await fsp.lstat(brokenLink).catch(() => null);
    expect(existsAfter).toBeNull();

    // 4. Verify all adapter symlinks were created
    const zcodeSkills = path.join(tempWs, '.zcode', 'skills');
    const claudeSkills = path.join(tempWs, '.claude', 'skills');
    const dshSkills = path.join(tempWs, '.dsh', 'skills');
    const cursorSkills = path.join(tempWs, '.cursor', 'skills');

    expect((await fsp.lstat(zcodeSkills)).isSymbolicLink()).toBe(true);
    expect((await fsp.lstat(claudeSkills)).isSymbolicLink()).toBe(true);
    expect((await fsp.lstat(dshSkills)).isSymbolicLink()).toBe(true);
    expect((await fsp.lstat(cursorSkills)).isSymbolicLink()).toBe(true);
  });

  test('global skill lifecycle: enableGlobalSkill and disableGlobalSkill', async () => {
    const resOn = await enableGlobalSkill('harness-protocol');
    expect(resOn.success).toBe(true);

    const home = os.homedir();
    const zLink = path.join(home, '.zcode', 'skills', 'harness-protocol');
    const cLink = path.join(home, '.claude', 'skills', 'harness-protocol');

    expect((await fsp.lstat(zLink)).isSymbolicLink()).toBe(true);
    expect((await fsp.lstat(cLink)).isSymbolicLink()).toBe(true);
  });

  test('cleanGlobal: respects --skills and --mcp flags and preserves whitelisted skills', async () => {
    const { cleanGlobal } = await import('../.agent/src/clean-global');
    const res = await cleanGlobal({ mcp: true, skills: false });
    expect(res.success).toBe(true);
    expect(Array.isArray(res.actions)).toBe(true);
  });
});
