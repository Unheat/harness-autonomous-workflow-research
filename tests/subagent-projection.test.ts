import './isolated-home';
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const {
  buildCodexAgentToml,
  inspectCodexSubagentProjection,
  syncCodexSubagentProjection,
  CODEX_AGENTS_DIR,
  CODEX_PROJECTION_MARKER,
  READ_ONLY_INSTRUCTION
} = await import('../.agent/src/services/subagent-projection');
const { initWorkspace } = await import('../.agent/src/workspace');

const JUDGE = `---
name: judge-plan
description: Independent evidence-backed plan review; no implementation or delegation.
tools: Read, Bash
disallowedTools: Edit, Write, Skill, Agent
omitClaudeMd: true
---

Read the rubric and grade the plan. Paths with 'quotes' and a backslash \\n stay literal.
`;

describe('Codex subagent projection', () => {
  let root: string;

  beforeEach(async () => {
    root = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-codex-agents-'));
    await fsp.mkdir(path.join(root, '.agent', 'agents'), { recursive: true });
    await fsp.writeFile(path.join(root, '.agent', 'agents', 'judge-plan.md'), JUDGE);
  });

  afterEach(async () => {
    await fsp.rm(root, { recursive: true, force: true });
  });

  test('buildCodexAgentToml: emits required Codex keys and the read-only instruction', () => {
    const toml = buildCodexAgentToml('judge-plan.md', JUDGE);
    expect(toml.startsWith(CODEX_PROJECTION_MARKER)).toBe(true);
    expect(toml).toContain('name = "judge-plan"');
    expect(toml).toContain('description = "Independent evidence-backed plan review');
    expect(toml).toContain('developer_instructions = ');
    expect(toml).toContain(READ_ONLY_INSTRUCTION);
    // The body is carried verbatim: no escaping of the literal backslash.
    expect(toml).toContain('a backslash \\n stay literal');
    // Frontmatter must not leak into the system prompt.
    expect(toml).not.toContain('disallowedTools');
  });

  test('buildCodexAgentToml: no read-only instruction when the agent may write', () => {
    const toml = buildCodexAgentToml('worker.md', '---\nname: worker\ndescription: writes\n---\nDo the work.\n');
    expect(toml).not.toContain(READ_ONLY_INSTRUCTION);
    expect(toml).toContain('Do the work.');
  });

  test('sync: creates TOML, is idempotent, and reports state', async () => {
    const first = await syncCodexSubagentProjection(root);
    expect(first.changed).toBe(true);
    const target = path.join(root, CODEX_AGENTS_DIR, 'judge-plan.toml');
    expect(await fsp.readFile(target, 'utf-8')).toBe(buildCodexAgentToml('judge-plan.md', JUDGE));

    const second = await syncCodexSubagentProjection(root);
    expect(second.changed).toBe(false);
    expect(second.actions).toEqual([]);

    const state = await inspectCodexSubagentProjection(root);
    expect(state.state).toBe('current');
    expect(state.agents).toBe(1);
  });

  test('sync: prunes a Markdown symlink that Codex would ignore', async () => {
    await fsp.mkdir(path.join(root, '.codex'), { recursive: true });
    await fsp.symlink('../.agent/agents', path.join(root, CODEX_AGENTS_DIR));

    const state = await inspectCodexSubagentProjection(root);
    expect(state.state).toBe('blocked');

    const result = await syncCodexSubagentProjection(root);
    expect(result.actions.some(a => a.includes('Pruned poisonous'))).toBe(true);
    const stat = await fsp.lstat(path.join(root, CODEX_AGENTS_DIR));
    expect(stat.isSymbolicLink()).toBe(false);
    expect(await fsp.readFile(path.join(root, CODEX_AGENTS_DIR, 'judge-plan.toml'), 'utf-8'))
      .toContain('name = "judge-plan"');
  });

  test('sync: preserves hand-written TOML and removes only its own orphans', async () => {
    await syncCodexSubagentProjection(root);
    await fsp.writeFile(path.join(root, CODEX_AGENTS_DIR, 'mine.toml'), 'name = "mine"\n');
    await fsp.writeFile(path.join(root, CODEX_AGENTS_DIR, 'gone.toml'), `${CODEX_PROJECTION_MARKER}gone.md\nname = "gone"\n`);

    const result = await syncCodexSubagentProjection(root);
    expect(result.actions.some(a => a.includes('Preserved hand-written'))).toBe(true);
    expect(await fsp.readFile(path.join(root, CODEX_AGENTS_DIR, 'mine.toml'), 'utf-8')).toContain('mine');
    expect(await fsp.readFile(path.join(root, CODEX_AGENTS_DIR, 'gone.toml'), 'utf-8').catch(() => null)).toBeNull();
  });

  test('sync: does nothing in a workspace with no canonical agents', async () => {
    const empty = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-codex-empty-'));
    const result = await syncCodexSubagentProjection(empty);
    expect(result.changed).toBe(false);
    expect(await fsp.lstat(path.join(empty, CODEX_AGENTS_DIR)).catch(() => null)).toBeNull();
    await fsp.rm(empty, { recursive: true, force: true });
  });

  test('initWorkspace: Codex gets generated TOML while Markdown harnesses get links', async () => {
    const ws = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-codex-init-'));
    await fsp.mkdir(path.join(ws, '.agent', 'agents'), { recursive: true });
    await fsp.writeFile(path.join(ws, '.agent', 'agents', 'judge-pr.md'), JUDGE.replace('judge-plan', 'judge-pr'));

    await initWorkspace(ws);

    const codexDir = await fsp.lstat(path.join(ws, CODEX_AGENTS_DIR));
    expect(codexDir.isDirectory()).toBe(true);
    expect(await fsp.readFile(path.join(ws, CODEX_AGENTS_DIR, 'judge-pr.toml'), 'utf-8')).toContain('name = "judge-pr"');

    for (const harness of ['.claude', '.zcode', '.cursor', '.dsh', '.opencode']) {
      const link = path.join(ws, harness, 'agents');
      expect((await fsp.lstat(link)).isSymbolicLink()).toBe(true);
      expect(await fsp.readlink(link)).toBe('../.agent/agents');
    }

    await fsp.rm(ws, { recursive: true, force: true });
  });
});
