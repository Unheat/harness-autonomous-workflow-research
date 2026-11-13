import './isolated-home';
import { describe, test, expect } from 'bun:test';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const { promoteSkillToCatalog } = await import('../.agent/src/skill-promote');
const { createLocalSkill } = await import('../.agent/src/skills');
const { getCatalogSkills } = await import('../.agent/src/catalog');
const { GLOBAL_CATALOG_SKILLS_DIR } = await import('../.agent/src/config');

async function makeWorkspace(prefix: string): Promise<string> {
  return fsp.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe('promoteSkillToCatalog', () => {
  test('copies a local skill into the catalog and relinks the workspace entry', async () => {
    const ws = await makeWorkspace('harness-test-promote-');

    try {
      await createLocalSkill(ws, 'promote-me', 'Promote this one');
      const localPath = path.join(ws, '.agents', 'skills', 'promote-me');
      expect((await fsp.lstat(localPath)).isSymbolicLink()).toBe(false);

      const res = await promoteSkillToCatalog(ws, 'promote-me');
      expect(res.success).toBe(true);
      expect(res.message).toContain('machine catalog');

      const catalogTarget = path.join(GLOBAL_CATALOG_SKILLS_DIR, 'promote-me');
      const md = await fsp.readFile(path.join(catalogTarget, 'SKILL.md'), 'utf-8');
      expect(md).toContain('promote-me');

      const stat = await fsp.lstat(localPath);
      expect(stat.isSymbolicLink()).toBe(true);
      expect(await fsp.realpath(localPath)).toBe(await fsp.realpath(catalogTarget));
      expect(await getCatalogSkills()).toContain('promote-me');

      // No staging leftovers
      const entries = await fsp.readdir(path.join(ws, '.agents', 'skills'));
      expect(entries.filter(e => e.startsWith('.promote-'))).toEqual([]);
    } finally {
      await fsp.rm(path.join(GLOBAL_CATALOG_SKILLS_DIR, 'promote-me'), { recursive: true, force: true });
      await fsp.rm(ws, { recursive: true, force: true });
    }
  });

  test('refuses to overwrite an existing catalog skill with a divergent local copy', async () => {
    const ws = await makeWorkspace('harness-test-promote-conflict-');
    const catalogTarget = path.join(GLOBAL_CATALOG_SKILLS_DIR, 'catalog-owned');

    try {
      await fsp.mkdir(catalogTarget, { recursive: true });
      await fsp.writeFile(path.join(catalogTarget, 'SKILL.md'), '---\nname: catalog-owned\n---\nCatalog version\n');
      await createLocalSkill(ws, 'catalog-owned', 'Local fork');

      const res = await promoteSkillToCatalog(ws, 'catalog-owned');
      expect(res.success).toBe(false);
      expect(res.message).toContain('already contains');

      // Neither side was overwritten: local folder kept, catalog untouched
      const localStat = await fsp.lstat(path.join(ws, '.agents', 'skills', 'catalog-owned'));
      expect(localStat.isSymbolicLink()).toBe(false);
      expect(await fsp.readFile(path.join(catalogTarget, 'SKILL.md'), 'utf-8')).toContain('Catalog version');
    } finally {
      await fsp.rm(catalogTarget, { recursive: true, force: true });
      await fsp.rm(ws, { recursive: true, force: true });
    }
  });

  test('rejects unknown, inactive, and already-linked skills', async () => {
    const ws = await makeWorkspace('harness-test-promote-guard-');

    try {
      const missing = await promoteSkillToCatalog(ws, 'never-existed');
      expect(missing.success).toBe(false);

      const invalid = await promoteSkillToCatalog(ws, '../escape');
      expect(invalid.success).toBe(false);

      await createLocalSkill(ws, 'link-target', 'Linked skill');
      // Simulate an already-linked skill
      const linkedPath = path.join(ws, '.agents', 'skills', 'linked-already');
      await fsp.symlink(path.join(ws, '.agents', 'skills', 'link-target'), linkedPath);

      const linked = await promoteSkillToCatalog(ws, 'linked-already');
      expect(linked.success).toBe(false);
      expect(linked.message).toContain('already linked');
    } finally {
      await fsp.rm(ws, { recursive: true, force: true });
    }
  });
});
