import './isolated-home';
import { describe, test, expect } from 'bun:test';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const { listGlobalActiveSkills, getEffectiveSkillsList } = await import('../.agent/src/skills-global');
const { createLocalSkill, removeSkill, addSkill } = await import('../.agent/src/skills');

describe('Skills Global & Scope Engine', () => {
  test('listGlobalActiveSkills: discovers global user skills', async () => {
    const globals = await listGlobalActiveSkills();
    expect(Array.isArray(globals)).toBe(true);
    // At minimum harness-protocol is in ~/.zcode/skills/
    const hasHarnessProtocol = globals.some(g => g.name === 'harness-protocol');
    expect(hasHarnessProtocol).toBe(true);
  });

  test('getEffectiveSkillsList: distinguishes Global, Project, and Catalog scopes', async () => {
    const tmpWs = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-skills-eff-'));

    try {
      // 1. Create a project-private skill
      await createLocalSkill(tmpWs, 'my-scoped-project-skill', 'Exclusive to project');

      const list1 = await getEffectiveSkillsList(tmpWs);

      // Check project skill
      const projectSkill = list1.find(s => s.name === 'my-scoped-project-skill');
      expect(projectSkill).toBeDefined();
      expect(projectSkill!.scope).toBe('project');
      expect(projectSkill!.isProjectActive).toBe(true);
      expect(projectSkill!.effectiveActive).toBe(true);
      expect(projectSkill!.isGlobalActive).toBe(false);

      // Check global skill
      const globalSkill = list1.find(s => s.name === 'harness-protocol');
      expect(globalSkill).toBeDefined();
      expect(globalSkill!.scope).toBe('global');
      expect(globalSkill!.isGlobalActive).toBe(true);
      expect(globalSkill!.effectiveActive).toBe(true);

      // 2. Move project skill to dormant
      await removeSkill(tmpWs, 'my-scoped-project-skill');
      const list2 = await getEffectiveSkillsList(tmpWs);
      const dormantSkill = list2.find(s => s.name === 'my-scoped-project-skill');
      expect(dormantSkill).toBeDefined();
      expect(dormantSkill!.scope).toBe('project');
      expect(dormantSkill!.isDormant).toBe(true);
      expect(dormantSkill!.effectiveActive).toBe(false);

      // 3. Re-enable project skill
      await addSkill(tmpWs, 'my-scoped-project-skill');
      const list3 = await getEffectiveSkillsList(tmpWs);
      const reenabledSkill = list3.find(s => s.name === 'my-scoped-project-skill');
      expect(reenabledSkill!.effectiveActive).toBe(true);
      expect(reenabledSkill!.isDormant).toBe(false);
    } finally {
      await fsp.rm(tmpWs, { recursive: true, force: true });
    }
  });
});
