import './isolated-home';
import { describe, test, expect } from 'bun:test';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const { listLocalSkills, addSkill, removeSkill, createLocalSkill } = await import('../.agent/src/skills');
const { GLOBAL_CATALOG_SKILLS_DIR } = await import('../.agent/src/config');

describe('skills module', () => {
  test('boundary validation: rejects malicious or empty names', async () => {
    const tmpWs = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-skills-'));

    const bad1 = await addSkill(tmpWs, '../sneaky');
    expect(bad1.success).toBe(false);

    const bad2 = await addSkill(tmpWs, 'nested/skill');
    expect(bad2.success).toBe(false);

    const bad3 = await removeSkill(tmpWs, '');
    expect(bad3.success).toBe(false);

    await fsp.rm(tmpWs, { recursive: true, force: true });
  });

  test('lifecycle: add, list, idempotency, and remove symlink', async () => {
    const tmpWs = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-skills-lifecycle-'));

    // Create a mock skill in global catalog
    const mockSkillName = 'test-mock-skill-xyz';
    const mockGlobalDir = path.join(GLOBAL_CATALOG_SKILLS_DIR, mockSkillName);
    await fsp.mkdir(mockGlobalDir, { recursive: true });
    await fsp.writeFile(path.join(mockGlobalDir, 'SKILL.md'), '---\nname: mock\n---\nMock content');

    try {
      // 1. Add skill to workspace
      const addRes = await addSkill(tmpWs, mockSkillName);
      expect(addRes.success).toBe(true);

      // 2. Verify listLocalSkills detects it as symlink
      const list1 = await listLocalSkills(tmpWs);
      expect(list1.length).toBe(1);
      expect(list1[0].name).toBe(mockSkillName);
      expect(list1[0].isLink).toBe(true);

      // 3. Adding again is a no-op success: the requested end state (active) already holds
      const addDup = await addSkill(tmpWs, mockSkillName);
      expect(addDup.success).toBe(true);
      expect(addDup.message).toContain('already active');
      expect((await listLocalSkills(tmpWs)).length).toBe(1);

      // 4. Remove skill
      const remRes = await removeSkill(tmpWs, mockSkillName);
      expect(remRes.success).toBe(true);

      // 5. Verify local list is now empty
      const list2 = await listLocalSkills(tmpWs);
      expect(list2.length).toBe(0);

      // 6. Verify global catalog file was NOT deleted
      const catalogExists = await fsp.stat(mockGlobalDir).then(() => true).catch(() => false);
      expect(catalogExists).toBe(true);
    } finally {
      await fsp.rm(mockGlobalDir, { recursive: true, force: true });
      await fsp.rm(tmpWs, { recursive: true, force: true });
    }
  });

  test('createLocalSkill: scaffolds project-private skill', async () => {
    const tmpWs = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-skills-create-'));

    try {
      const res = await createLocalSkill(tmpWs, 'private-skill-123', 'Private workspace task');
      expect(res.success).toBe(true);

      const list = await listLocalSkills(tmpWs);
      expect(list.length).toBe(1);
      expect(list[0].name).toBe('private-skill-123');
      expect(list[0].isLink).toBe(false); // Physical folder, not symlink

      // Deactivate local skill -> moves to dormant, not deleted!
      const deact = await removeSkill(tmpWs, 'private-skill-123');
      expect(deact.success).toBe(true);

      const listDormant = await listLocalSkills(tmpWs);
      expect(listDormant.length).toBe(1);
      expect(listDormant[0].name).toBe('private-skill-123');
      expect(listDormant[0].isDormant).toBe(true);

      // Reactivate local skill -> restored to active
      const react = await addSkill(tmpWs, 'private-skill-123');
      expect(react.success).toBe(true);

      const listActive = await listLocalSkills(tmpWs);
      expect(listActive[0].isDormant).toBe(false);
    } finally {
      await fsp.rm(tmpWs, { recursive: true, force: true });
    }
  });

  test('duplicate active + dormant copy: active wins and both toggles work', async () => {
    const tmpWs = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-skills-dup-'));

    try {
      // Reproduce the broken state: same name active in .agents/skills/ and left in .agents/dormant/
      await createLocalSkill(tmpWs, 'dup-skill', 'Active copy');
      const dormantDir = path.join(tmpWs, '.agents', 'dormant', 'dup-skill');
      await fsp.mkdir(dormantDir, { recursive: true });
      await fsp.writeFile(path.join(dormantDir, 'SKILL.md'), '---\nname: dup-skill\n---\nStale copy\n');

      // Listing must report exactly one entry, and it must be the active one
      const list = await listLocalSkills(tmpWs);
      expect(list.length).toBe(1);
      expect(list[0].isDormant).toBe(false);

      // Turning it ON must succeed (and heal the stale dormant twin), not error out
      const on = await addSkill(tmpWs, 'dup-skill');
      expect(on.success).toBe(true);
      expect(on.message).toContain('already active');
      expect(await fsp.stat(dormantDir).then(() => true).catch(() => false)).toBe(false);

      // Recreate the stale twin, then turning it OFF must still succeed
      await fsp.mkdir(dormantDir, { recursive: true });
      await fsp.writeFile(path.join(dormantDir, 'SKILL.md'), '---\nname: dup-skill\n---\nStale copy\n');
      const off = await removeSkill(tmpWs, 'dup-skill');
      expect(off.success).toBe(true);

      const afterOff = await listLocalSkills(tmpWs);
      expect(afterOff.length).toBe(1);
      expect(afterOff[0].isDormant).toBe(true);
      const content = await fsp.readFile(path.join(dormantDir, 'SKILL.md'), 'utf-8');
      expect(content).toContain('Active copy');
    } finally {
      await fsp.rm(tmpWs, { recursive: true, force: true });
    }
  });
});
