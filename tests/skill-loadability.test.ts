import './isolated-home';
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const { inspectSkillLoadability, resolveSkillDir } = await import('../.agent/src/services/skill-loadability');

let skillDir: string;

beforeEach(async () => {
  skillDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-skill-loadability-'));
});

afterEach(async () => {
  await fsp.rm(skillDir, { recursive: true, force: true });
});

async function writeSkill(content: string): Promise<void> {
  await fsp.writeFile(path.join(skillDir, 'SKILL.md'), content);
}

describe('skill loadability (mirrors harness frontmatter acceptance)', () => {
  test('accepts a spec-valid skill', async () => {
    await writeSkill('---\nname: my-skill\ndescription: Does a thing. Use when the thing is needed.\n---\n\n# Body\n');
    expect(inspectSkillLoadability(skillDir)).toEqual({ loadable: true, warnings: [] });
  });

  test('falls back to the directory name when frontmatter declares no name', async () => {
    const named = path.join(skillDir, 'dir-named-skill');
    await fsp.mkdir(named);
    await fsp.writeFile(path.join(named, 'SKILL.md'), '---\ndescription: Does a thing.\n---\n');
    const result = inspectSkillLoadability(named);
    expect(result.loadable).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  test('rejects unquoted "Triggers on:" description (invalid YAML, silently dropped by harnesses)', async () => {
    await writeSkill('---\nname: my-skill\ndescription: Graph queries. Triggers on: explore the codebase, trace calls.\n---\n');
    const result = inspectSkillLoadability(skillDir);
    expect(result.loadable).toBe(false);
    expect(result.reason).toContain('not valid YAML');
  });

  test('accepts the same description once quoted', async () => {
    await writeSkill('---\nname: my-skill\ndescription: "Graph queries. Triggers on: explore the codebase, trace calls."\n---\n');
    expect(inspectSkillLoadability(skillDir).loadable).toBe(true);
  });

  test('rejects a skill with no frontmatter block', async () => {
    await writeSkill('# Just a body, no frontmatter\n');
    const result = inspectSkillLoadability(skillDir);
    expect(result.loadable).toBe(false);
    expect(result.reason).toContain('no description');
  });

  test('rejects an empty or blank description', async () => {
    await writeSkill('---\nname: my-skill\ndescription: "   "\n---\n');
    expect(inspectSkillLoadability(skillDir).loadable).toBe(false);
  });

  test('rejects a missing SKILL.md', async () => {
    const result = inspectSkillLoadability(path.join(skillDir, 'not-a-skill'));
    expect(result.loadable).toBe(false);
    expect(result.reason).toContain('SKILL.md');
  });

  test('loads but warns on spec-invalid names and oversized descriptions', async () => {
    await writeSkill(`---\nname: Bad_Name\ndescription: ${'x'.repeat(1100)}\n---\n`);
    const result = inspectSkillLoadability(skillDir);
    expect(result.loadable).toBe(true);
    expect(result.warnings.length).toBe(2);
    expect(result.warnings.join(' ')).toContain('lowercase a-z');
    expect(result.warnings.join(' ')).toContain('exceeds 1024');
  });

  test('normalizes CRLF frontmatter', async () => {
    await writeSkill('---\r\nname: my-skill\r\ndescription: Does a thing.\r\n---\r\n');
    expect(inspectSkillLoadability(skillDir).loadable).toBe(true);
  });
});

describe('skill directory resolution', () => {
  test('prefers the workspace copy, then falls back to the catalog', async () => {
    const workspace = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-skill-resolve-'));
    const linked = path.join(workspace, '.agents', 'skills', 'resolved-skill');
    await fsp.mkdir(linked, { recursive: true });
    await fsp.writeFile(path.join(linked, 'SKILL.md'), '---\nname: resolved-skill\ndescription: Linked.\n---\n');

    expect(resolveSkillDir('resolved-skill', workspace)).toBe(linked);
    // Catalog-only skill (isolated-home seeds harness-protocol) resolves without a workspace copy.
    expect(resolveSkillDir('harness-protocol', workspace)).toContain(path.join('.agents', 'catalog', 'skills'));
    expect(resolveSkillDir('definitely-not-installed', workspace)).toBeNull();

    await fsp.rm(workspace, { recursive: true, force: true });
  });
});
