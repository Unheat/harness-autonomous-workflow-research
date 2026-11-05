import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  parseSubagentFile,
  listProjectSubagents,
  listGlobalSubagents,
  listAllSubagents
} from '../.agent/src/subagents';
import { normalizeSubagent } from '../.agent/src/resources';

describe('Subagent Discovery & Token Shield Governance', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-subagents-'));
  });

  afterEach(async () => {
    try {
      await fsp.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  test('parseSubagentFile: parses YAML frontmatter with comma-separated tools and verifies Token Shield', async () => {
    const filePath = path.join(tempDir, 'worker.md');
    await fsp.writeFile(filePath, `---
name: my-worker
description: Specialized worker for code tasks
tools: Read, Edit, Write, Bash
disallowedTools: Skill, Agent
model: test-model
---

# Instruction body
`);

    const info = await parseSubagentFile(filePath, 'project');
    expect(info).not.toBeNull();
    expect(info!.name).toBe('my-worker');
    expect(info!.description).toBe('Specialized worker for code tasks');
    expect(info!.scope).toBe('project');
    expect(info!.tools).toEqual(['Read', 'Edit', 'Write', 'Bash']);
    expect(info!.disallowedTools).toEqual(['Skill', 'Agent']);
    expect(info!.hasTokenShield).toBe(true);
    expect(info!.model).toBe('test-model');
  });

  test('parseSubagentFile: parses YAML frontmatter with array list tools', async () => {
    const filePath = path.join(tempDir, 'lister.md');
    await fsp.writeFile(filePath, `---
name: lister
description: List-based subagent
tools:
  - Read
  - Bash
disallowedTools:
  - Skill
---
`);

    const info = await parseSubagentFile(filePath, 'global');
    expect(info).not.toBeNull();
    expect(info!.name).toBe('lister');
    expect(info!.scope).toBe('global');
    expect(info!.tools).toEqual(['Read', 'Bash']);
    expect(info!.disallowedTools).toEqual(['Skill']);
    expect(info!.hasTokenShield).toBe(true);
  });

  test('parseSubagentFile: flags subagents missing Token Shield (no Skill stripping)', async () => {
    const filePath = path.join(tempDir, 'unshielded.md');
    await fsp.writeFile(filePath, `---
name: unshielded
description: Agent without tool restrictions
tools: Read, Write
disallowedTools: Bash
---
`);

    const info = await parseSubagentFile(filePath, 'project');
    expect(info).not.toBeNull();
    expect(info!.name).toBe('unshielded');
    expect(info!.hasTokenShield).toBe(false);
  });

  test('parseSubagentFile: falls back to filename if name is not declared in frontmatter', async () => {
    const filePath = path.join(tempDir, 'fallback-agent.md');
    await fsp.writeFile(filePath, `---
description: No explicit name
tools: Read
---
`);

    const info = await parseSubagentFile(filePath, 'project');
    expect(info).not.toBeNull();
    expect(info!.name).toBe('fallback-agent');
    expect(info!.hasTokenShield).toBe(false);
  });

  test('listProjectSubagents: discovers agents in .agent/agents directory', async () => {
    const agentsDir = path.join(tempDir, '.agent', 'agents');
    await fsp.mkdir(agentsDir, { recursive: true });

    await fsp.writeFile(path.join(agentsDir, 'agent-a.md'), `---
name: agent-a
description: Agent A
tools: Read
disallowedTools: Skill
---
`);
    await fsp.writeFile(path.join(agentsDir, 'agent-b.md'), `---
name: agent-b
description: Agent B
tools: Bash
---
`);

    const list = await listProjectSubagents(tempDir);
    expect(list.length).toBe(2);
    expect(list.map(a => a.name)).toEqual(['agent-a', 'agent-b']);
    expect(list.every(a => a.scope === 'project')).toBe(true);
    expect(list.find(a => a.name === 'agent-a')!.hasTokenShield).toBe(true);
    expect(list.find(a => a.name === 'agent-b')!.hasTokenShield).toBe(false);
  });

  test('listAllSubagents: loads real workspace subagents and merges them with global agents', async () => {
    const agents = await listAllSubagents(process.cwd());
    expect(agents.length).toBeGreaterThan(0);

    const sddWorker = agents.find(a => a.name === 'sdd-worker');
    expect(sddWorker).toBeDefined();
    expect(sddWorker!.scope).toBe('project');
    expect(sddWorker!.hasTokenShield).toBe(true);

    const sddReviewer = agents.find(a => a.name === 'sdd-reviewer');
    expect(sddReviewer).toBeDefined();
    expect(sddReviewer!.scope).toBe('project');
    expect(sddReviewer!.hasTokenShield).toBe(true);
  });

  test('normalizeSubagent: maps SubagentInfo into UnifiedResource with token estimate', () => {
    const subagent = {
      name: 'sdd-worker',
      description: 'Implementer worker',
      scope: 'project' as const,
      filePath: '/path/to/worker.md',
      tools: ['Read', 'Write'],
      disallowedTools: ['Skill'],
      hasTokenShield: true
    };

    const unified = normalizeSubagent(subagent);
    expect(unified.id).toBe('subagent:sdd-worker');
    expect(unified.name).toBe('sdd-worker');
    expect(unified.kind).toBe('subagent');
    expect(unified.scope).toBe('project');
    expect(unified.workspaceState).toBe('active');
    expect(unified.effectiveActive).toBe(true);
    expect(unified.tokenCostEstimate).toBe(200);
  });
});
