import './isolated-home';
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fsp from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { readConfigFile, writeConfigFile } from '../.agent/src/services/config-service';
import {
  toggleSubagentTokenShield,
  deleteSubagentFile,
  findSubagentPath
} from '../.agent/src/services/subagent-service';
import { enableMcp, disableMcp, listLocalMcps } from '../.agent/src/mcp';
import { enableGlobalMcp, disableGlobalMcp, listGlobalMcps } from '../.agent/src/mcp-global';
import { deleteSkillPermanent } from '../.agent/src/services/skill-service';
import { enableGlobalSkill, disableGlobalSkill } from '../.agent/src/skills-global';
import { GLOBAL_CATALOG_SKILLS_DIR, GLOBAL_SKILLS_DIR } from '../.agent/src/config';

describe('Spec 007: Unified Control Plane & Global Governance', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-ucp-'));
    await fsp.mkdir(path.join(tempDir, '.agents', 'skills'), { recursive: true });
    await fsp.mkdir(path.join(tempDir, '.agents', 'dormant'), { recursive: true });
    await fsp.mkdir(path.join(tempDir, '.agent', 'agents'), { recursive: true });
  });

  afterEach(async () => {
    try {
      await fsp.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('ConfigService', () => {
    test('readConfigFile: reads existing workspace .mcp.json', async () => {
      const mcpPath = path.join(tempDir, '.mcp.json');
      await fsp.writeFile(mcpPath, JSON.stringify({ mcpServers: { test: { command: 'echo' } } }));

      const res = await readConfigFile('workspace-mcp', tempDir);
      expect(res.success).toBe(true);
      expect(res.format).toBe('json');
      expect(res.content).toContain('echo');
    });

    test('writeConfigFile: rejects invalid JSON syntax without corrupting disk', async () => {
      const mcpPath = path.join(tempDir, '.mcp.json');
      await fsp.writeFile(mcpPath, '{"valid": true}');

      const res = await writeConfigFile('workspace-mcp', '{"invalid": true, missing_brace', tempDir);
      expect(res.success).toBe(false);
      expect(res.message).toContain('JSON syntax error');

      // Verify file on disk is still original
      const diskContent = await fsp.readFile(mcpPath, 'utf-8');
      expect(diskContent).toBe('{"valid": true}');
    });

    test('writeConfigFile: successfully saves valid JSON', async () => {
      const res = await writeConfigFile('workspace-mcp', JSON.stringify({ mcpServers: { new: { command: 'run' } } }), tempDir);
      expect(res.success).toBe(true);

      const mcpPath = path.join(tempDir, '.mcp.json');
      const diskContent = await fsp.readFile(mcpPath, 'utf-8');
      expect(diskContent).toContain('new');
    });

    test('readConfigFile: resolves global-mcp-catalog and skill-lock targets', async () => {
      const { resolveConfigPath } = await import('../.agent/src/services/config-service');
      const mcpRes = resolveConfigPath('global-mcp-catalog', tempDir);
      expect(mcpRes.filePath).toContain('mcps.json');
      expect(mcpRes.format).toBe('json');

      const lockRes = resolveConfigPath('global-skill-lock', tempDir);
      expect(lockRes.filePath).toContain('.skill-lock.json');
      expect(lockRes.format).toBe('json');
    });

    test('readConfigFile: resolves local .agent/skills as fallback candidate', async () => {
      const { resolveConfigPath } = await import('../.agent/src/services/config-service');
      const localAgentSkillDir = path.join(tempDir, '.agent', 'skills', 'my-custom-skill');
      await fsp.mkdir(localAgentSkillDir, { recursive: true });
      await fsp.writeFile(path.join(localAgentSkillDir, 'SKILL.md'), '# Custom Skill');

      const skillRes = resolveConfigPath('skill', tempDir, 'my-custom-skill');
      expect(skillRes.filePath).toBe(fs.realpathSync(path.join(localAgentSkillDir, 'SKILL.md')));
      expect(skillRes.format).toBe('markdown');
    });
  });

  describe('SubagentService', () => {
    test('toggleSubagentTokenShield: adds Skill to disallowedTools when enabled', async () => {
      const agentFile = path.join(tempDir, '.agent', 'agents', 'test-worker.md');
      await fsp.writeFile(agentFile, `---\nname: test-worker\ntools: Read, Bash\n---\n# Body\n`);

      const res = await toggleSubagentTokenShield(agentFile, true);
      expect(res.success).toBe(true);

      const updated = await fsp.readFile(agentFile, 'utf-8');
      expect(updated).toContain('disallowedTools: Skill');
    });

    test('toggleSubagentTokenShield: cleanly strips Skill from disallowedTools when disabled', async () => {
      const agentFile = path.join(tempDir, '.agent', 'agents', 'test-worker.md');
      await fsp.writeFile(agentFile, `---\nname: test-worker\ntools: Read, Bash\ndisallowedTools: Skill, Agent\n---\n# Body\n`);

      const res = await toggleSubagentTokenShield(agentFile, false);
      expect(res.success).toBe(true);

      const updated = await fsp.readFile(agentFile, 'utf-8');
      expect(updated).toContain('disallowedTools: Agent');
      expect(updated).not.toContain('Skill');
    });

    test('deleteSubagentFile: permanently removes subagent file', async () => {
      const agentFile = path.join(tempDir, '.agent', 'agents', 'to-delete.md');
      await fsp.writeFile(agentFile, `---\nname: to-delete\n---\n`);

      const res = await deleteSubagentFile(agentFile);
      expect(res.success).toBe(true);
      expect(fs.existsSync(agentFile)).toBe(false);
    });
  });

  describe('MCP Lifecycle & Global Management', () => {
    test('enableMcp / disableMcp: toggles workspace .mcp.json enabled state', async () => {
      const res = await enableMcp(tempDir, 'codebase-memory');
      expect(res.success).toBe(true);

      const local = await listLocalMcps(tempDir);
      expect(local['codebase-memory'].enabled).toBe(true);

      const disRes = await disableMcp(tempDir, 'codebase-memory');
      expect(disRes.success).toBe(true);
      const localAfter = await listLocalMcps(tempDir);
      expect(localAfter['codebase-memory'].enabled).toBe(false);
    });

    test('enableGlobalMcp / disableGlobalMcp: toggles global user scope', async () => {
      const res = await enableGlobalMcp('codebase-memory');
      expect(res.success).toBe(true);

      const globals = await listGlobalMcps();
      expect(globals['codebase-memory']).toBeDefined();

      const disRes = await disableGlobalMcp('codebase-memory');
      expect(disRes.success).toBe(true);
      const globalsAfter = await listGlobalMcps();
      expect(globalsAfter['codebase-memory'].enabled).toBe(false);
    });
  });

  describe('SkillService & Global Deletion', () => {
    test('deleteSkillPermanent: removes skill from workspace active and dormant', async () => {
      const activeFolder = path.join(tempDir, '.agents', 'skills', 'my-temp-skill');
      const dormantFolder = path.join(tempDir, '.agents', 'dormant', 'my-temp-skill');
      await fsp.mkdir(activeFolder, { recursive: true });
      await fsp.writeFile(path.join(activeFolder, 'SKILL.md'), 'test');

      const res = await deleteSkillPermanent(tempDir, 'my-temp-skill', { fromWorkspace: true });
      expect(res.success).toBe(true);
      expect(fs.existsSync(activeFolder)).toBe(false);
      expect(fs.existsSync(dormantFolder)).toBe(false);
    });

    test('disableGlobalSkill: unlinks from ~/.agents/skills (clearing DSH) as well as ZCode & Claude', async () => {
      const catalogSkill = path.join(GLOBAL_CATALOG_SKILLS_DIR, 'global-test-skill');
      await fsp.mkdir(catalogSkill, { recursive: true });
      await fsp.writeFile(path.join(catalogSkill, 'SKILL.md'), '---\nname: global-test-skill\n---\n');

      await enableGlobalSkill('global-test-skill');

      const dshGlobalTarget = path.join(GLOBAL_SKILLS_DIR, 'global-test-skill');
      expect(fs.existsSync(dshGlobalTarget)).toBe(true);

      const disableRes = await disableGlobalSkill('global-test-skill');
      expect(disableRes.success).toBe(true);
      expect(fs.existsSync(dshGlobalTarget)).toBe(false);
    });
  });
});
