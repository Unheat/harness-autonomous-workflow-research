import './isolated-home';
import { describe, test, expect } from 'bun:test';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import yaml from 'yaml';

const { syncDshProfileMcps, buildDshMcpEntry } = await import('../.agent/src/mcp-dsh');
const { createLocalSkill, addSkill, removeSkill, listLocalSkills } = await import('../.agent/src/skills');
const { ensureWorkspaceDirs, reconcileWorkspaceAdapters } = await import('../.agent/src/workspace');

describe('DSH Sync & Edge Cases Engine', () => {
  describe('MCP Profile Synchronization', () => {
    test('buildDshMcpEntry: formats stdio and streamable-http configurations accurately', () => {
      // stdio server
      const stdioEntry = buildDshMcpEntry('search2ai', {
        command: '/usr/local/bin/search2ai-mcp',
        args: ['--verbose'],
        env: { API_KEY: 'test-123' },
        enabled: true
      });
      expect(stdioEntry.id).toBe('mcp-search2ai');
      expect(stdioEntry.name).toBe('@deepseek-ai/dsh-mcp-client');
      expect(stdioEntry.config.serverName).toBe('search2ai');
      expect(stdioEntry.config.transport).toBe('stdio');
      expect(stdioEntry.config.command).toBe('/usr/local/bin/search2ai-mcp');
      expect(stdioEntry.config.args).toEqual(['--verbose']);
      expect(stdioEntry.config.env).toEqual({ API_KEY: 'test-123' });

      // streamable-http remote server
      const httpEntry = buildDshMcpEntry('remote-mcp', {
        url: 'https://mcp.example.com/api',
        headers: { Authorization: 'Bearer token' },
        enabled: true
      });
      expect(httpEntry.id).toBe('mcp-remote-mcp');
      expect(httpEntry.config.transport).toBe('streamable-http');
      expect(httpEntry.config.url).toBe('https://mcp.example.com/api');
      expect(httpEntry.config.headers).toEqual({ Authorization: 'Bearer token' });
      expect(httpEntry.config.command).toBeUndefined();
    });

    test('syncDshProfileMcps: preserves existing comments, configurations and !!js tags while syncing', async () => {
      const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'dsh-sync-test-'));
      const patchFile = path.join(tmpDir, 'cordis.patch.yml');

      const initialYaml = `# Existing DSH User Configuration
- id: ui-settings
  name: '@deepseek-ai/dsh-client-ui-settings'
  config:
    enabled: true
- id: llm-provider
  config:
    key: !!js process.env.API_KEY
- insert:
    - id: old-plugin
      name: 'some-custom-bundle'
`;
      await fsp.writeFile(patchFile, initialYaml, 'utf-8');

      // 1. Sync active and dormant MCPs
      const localServers = {
        'search2ai': {
          command: '/bin/search2ai',
          enabled: true
        },
        'codebase-memory': {
          command: '/bin/codebase-memory',
          enabled: true
        },
        'hound': {
          command: '/bin/hound',
          enabled: false,
          disabled: true
        }
      };

      const res = await syncDshProfileMcps(localServers, patchFile);
      expect(res).toBe(true);

      const updatedContent = await fsp.readFile(patchFile, 'utf-8');

      // Must preserve original comments and !!js expression
      expect(updatedContent).toContain('# Existing DSH User Configuration');
      expect(updatedContent).toContain('!!js process.env.API_KEY');
      expect(updatedContent).toContain('old-plugin');

      // Must contain enabled servers under insert
      expect(updatedContent).toContain('mcp-search2ai');
      expect(updatedContent).toContain('mcp-codebase-memory');

      // Must NOT contain disabled/dormant servers
      expect(updatedContent).not.toContain('mcp-hound');

      // 2. Idempotency test: syncing again with identical input produces no duplicate entries
      await syncDshProfileMcps(localServers, patchFile);
      const secondContent = await fsp.readFile(patchFile, 'utf-8');
      expect(secondContent).toBe(updatedContent);

      // 3. Disabling a server removes it from cordis.patch.yml
      localServers['search2ai'].enabled = false;
      await syncDshProfileMcps(localServers, patchFile);
      const afterDisable = await fsp.readFile(patchFile, 'utf-8');
      expect(afterDisable).not.toContain('mcp-search2ai');
      expect(afterDisable).toContain('mcp-codebase-memory');

      // 4. Disabling ALL servers removes the insert directive cleanly
      localServers['codebase-memory'].enabled = false;
      await syncDshProfileMcps(localServers, patchFile);
      const allDisabled = await fsp.readFile(patchFile, 'utf-8');
      expect(allDisabled).not.toContain('mcp-codebase-memory');
      expect(allDisabled).not.toContain('mcp-search2ai');
      expect(allDisabled).toContain('# Existing DSH User Configuration');
      expect(allDisabled).toContain('old-plugin');

      await fsp.rm(tmpDir, { recursive: true, force: true });
    });

    test('syncDshProfileMcps: handles non-existent patch file gracefully without throwing', async () => {
      const nonExistent = '/tmp/definitely-not-existing-cordis-patch-file.yml';
      const res = await syncDshProfileMcps({ server1: { command: 'test', enabled: true } }, nonExistent);
      expect(res).toBe(false);
    });
  });

  describe('Skills DSH Parity Lifecycle', () => {
    test('local skill operations immediately reflect in .dsh/skills via adapter symlink', async () => {
      const wsDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-ws-skills-'));
      await ensureWorkspaceDirs(wsDir);
      await reconcileWorkspaceAdapters(wsDir);

      const dshSkillsDir = path.join(wsDir, '.dsh', 'skills');

      // 1. Create local skill
      await createLocalSkill(wsDir, 'my-custom-skill');

      // Check reflection in .dsh/skills
      const dshSkillFile = path.join(dshSkillsDir, 'my-custom-skill', 'SKILL.md');
      const existsInDsh = await fsp.stat(dshSkillFile).then(() => true).catch(() => false);
      expect(existsInDsh).toBe(true);

      // 2. Disable (move to dormant)
      const disableRes = await removeSkill(wsDir, 'my-custom-skill', false);
      expect(disableRes.success).toBe(true);
      const existsWhileDormant = await fsp.stat(dshSkillFile).then(() => true).catch(() => false);
      expect(existsWhileDormant).toBe(false);

      // 3. Re-enable (restore from dormant)
      const restoreRes = await addSkill(wsDir, 'my-custom-skill');
      expect(restoreRes.success).toBe(true);
      const existsAfterRestore = await fsp.stat(dshSkillFile).then(() => true).catch(() => false);
      expect(existsAfterRestore).toBe(true);

      // 4. Permanently remove skill
      const permRes = await removeSkill(wsDir, 'my-custom-skill', true);
      expect(permRes.success).toBe(true);
      const existsAfterRemove = await fsp.stat(dshSkillFile).then(() => true).catch(() => false);
      expect(existsAfterRemove).toBe(false);

      await fsp.rm(wsDir, { recursive: true, force: true });
    });
  });
});
