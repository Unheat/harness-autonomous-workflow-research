import './isolated-home';
import { describe, test, expect } from 'bun:test';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const { importSkillFromWorkspace, listImportableSkills } = await import('../.agent/src/skill-import');
const { createLocalSkill } = await import('../.agent/src/skills');
const { GLOBAL_CATALOG_SKILLS_DIR } = await import('../.agent/src/config');

async function makeWorkspace(prefix: string): Promise<string> {
  return fsp.mkdtemp(path.join(os.tmpdir(), prefix));
}

/** A source workspace: one private local skill plus one skill symlinked from the catalog. */
async function seedSourceWorkspace(): Promise<{ ws: string; catalogSkill: string }> {
  const ws = await makeWorkspace('harness-test-import-src-');
  await createLocalSkill(ws, 'src-private', 'Private source skill');

  const catalogSkill = path.join(GLOBAL_CATALOG_SKILLS_DIR, 'src-linked');
  await fsp.mkdir(catalogSkill, { recursive: true });
  await fsp.writeFile(path.join(catalogSkill, 'SKILL.md'), '---\nname: src-linked\ndescription: Shared catalog skill\n---\nShared\n');
  await fsp.symlink(catalogSkill, path.join(ws, '.agents', 'skills', 'src-linked'), 'dir');

  return { ws, catalogSkill };
}

describe('cross-workspace skill import', () => {
  test('lists symlinked and physical skills with catalog state', async () => {
    const source = await seedSourceWorkspace();
    const target = await makeWorkspace('harness-test-import-target-');

    try {
      const res = await listImportableSkills(target, source.ws);
      expect(res.success).toBe(true);
      expect(res.sourceRoot).toBe(source.ws);

      const linked = res.skills!.find(s => s.name === 'src-linked')!;
      expect(linked.isLink).toBe(true);
      expect(linked.inCatalog).toBe(true);
      expect(linked.linkedFromCatalog).toBe(true);
      expect(linked.conflict).toBeUndefined();

      const priv = res.skills!.find(s => s.name === 'src-private')!;
      expect(priv.isLink).toBe(false);
      expect(priv.inCatalog).toBe(false);
      expect(priv.linkedFromCatalog).toBe(false);
      expect(priv.description).toContain('Private source skill');
    } finally {
      await fsp.rm(source.catalogSkill, { recursive: true, force: true });
      await fsp.rm(source.ws, { recursive: true, force: true });
      await fsp.rm(target, { recursive: true, force: true });
    }
  });

  test('a linked source is re-linked (shared content), a private source is copied', async () => {
    const source = await seedSourceWorkspace();
    const target = await makeWorkspace('harness-test-import-run-');

    try {
      const linked = await importSkillFromWorkspace(target, source.ws, 'src-linked');
      expect(linked.success).toBe(true);
      const targetLinked = path.join(target, '.agents', 'skills', 'src-linked');
      expect((await fsp.lstat(targetLinked)).isSymbolicLink()).toBe(true);
      expect(await fsp.realpath(targetLinked)).toBe(await fsp.realpath(source.catalogSkill));

      const priv = await importSkillFromWorkspace(target, source.ws, 'src-private');
      expect(priv.success).toBe(true);
      const targetPriv = path.join(target, '.agents', 'skills', 'src-private');
      const privStat = await fsp.lstat(targetPriv);
      expect(privStat.isSymbolicLink()).toBe(false);
      expect(privStat.isDirectory()).toBe(true);
      // The import never writes to the catalog
      expect(await fsp.stat(path.join(GLOBAL_CATALOG_SKILLS_DIR, 'src-private')).then(() => true).catch(() => false)).toBe(false);

      // Importing again must not overwrite the existing entry
      const again = await importSkillFromWorkspace(target, source.ws, 'src-private');
      expect(again.success).toBe(false);
      expect(again.message).toContain('already active');
    } finally {
      await fsp.rm(source.catalogSkill, { recursive: true, force: true });
      await fsp.rm(source.ws, { recursive: true, force: true });
      await fsp.rm(target, { recursive: true, force: true });
    }
  });

  test('reports conflicts and rejects invalid sources', async () => {
    const source = await seedSourceWorkspace();
    const target = await makeWorkspace('harness-test-import-conflict-');

    try {
      await createLocalSkill(target, 'src-private', 'Same name here');

      const listing = await listImportableSkills(target, source.ws);
      expect(listing.skills!.find(s => s.name === 'src-private')!.conflict).toBe('active');

      const sameWorkspace = await listImportableSkills(source.ws, source.ws);
      expect(sameWorkspace.success).toBe(false);

      const notAWorkspace = await makeWorkspace('harness-test-import-empty-');
      const bad = await listImportableSkills(target, notAWorkspace);
      expect(bad.success).toBe(false);
      expect(bad.message).toContain('not a harness workspace');
      await fsp.rm(notAWorkspace, { recursive: true, force: true });

      const missingSource = await importSkillFromWorkspace(target, '/definitely/not/here', 'src-private');
      expect(missingSource.success).toBe(false);

      const invalidName = await importSkillFromWorkspace(target, source.ws, '../escape');
      expect(invalidName.success).toBe(false);
    } finally {
      await fsp.rm(source.catalogSkill, { recursive: true, force: true });
      await fsp.rm(source.ws, { recursive: true, force: true });
      await fsp.rm(target, { recursive: true, force: true });
    }
  });
});
