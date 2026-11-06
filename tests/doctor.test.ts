import './isolated-home';
import { describe, test, expect } from 'bun:test';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const { auditWorkspace, healWorkspace } = await import('../.agent/src/doctor');

describe('doctor module', () => {
  test('auditWorkspace: detects missing adapter links and healWorkspace repairs them', async () => {
    const tmpWs = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-doctor-'));

    try {
      // 1. Initial empty workspace has no adapter symlinks -> audit should report warnings/errors
      const audit1 = await auditWorkspace(tmpWs);
      expect(audit1.passed).toBe(false);
      expect(audit1.issues.length).toBeGreaterThan(0);

      // 2. Run healWorkspace to reconstruct adapter symlinks
      await healWorkspace(tmpWs);

      // Verify cross-harness symlinks exist, and .zcode/skills is omitted to avoid duplicate prompt injection
      const claudeSkills = path.join(tmpWs, '.claude', 'skills');
      const cursorSkills = path.join(tmpWs, '.cursor', 'skills');
      const codexSkills = path.join(tmpWs, '.codex', 'skills');
      const opencodeSkills = path.join(tmpWs, '.opencode', 'skills');
      const zcodeSkills = path.join(tmpWs, '.zcode', 'skills');

      const statClaude = await fsp.lstat(claudeSkills);
      const statCursor = await fsp.lstat(cursorSkills);
      const statCodex = await fsp.lstat(codexSkills);
      const statOpencode = await fsp.lstat(opencodeSkills);
      const statZcode = await fsp.lstat(zcodeSkills).catch(() => null);

      expect(statClaude.isSymbolicLink()).toBe(true);
      expect(statCursor.isSymbolicLink()).toBe(true);
      expect(statCodex.isSymbolicLink()).toBe(true);
      expect(statOpencode.isSymbolicLink()).toBe(true);
      expect(statZcode).toBeNull();

      const targetClaude = await fsp.readlink(claudeSkills);
      expect(targetClaude).toBe('../.agents/skills');
    } finally {
      await fsp.rm(tmpWs, { recursive: true, force: true });
    }
  });
});
