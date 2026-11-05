import { describe, test, expect } from 'bun:test';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { findWorkspaceRoot, getWorkspacePaths, ensureWorkspaceDirs, initWorkspace } from '../.agent/src/workspace';

describe('workspace module', () => {
  test('findWorkspaceRoot: discovers root with .git / .agents', async () => {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-ws-'));
    const nested = path.join(tmpDir, 'src', 'components', 'deep');
    await fsp.mkdir(nested, { recursive: true });

    // Before creating marker: falls back to start directory
    const rootBefore = findWorkspaceRoot(nested);
    expect(rootBefore).toBe(path.resolve(nested));

    // Create .agents directory as marker
    await fsp.mkdir(path.join(tmpDir, '.agents'), { recursive: true });

    const rootAfter = findWorkspaceRoot(nested);
    expect(rootAfter).toBe(path.resolve(tmpDir));

    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  test('getWorkspacePaths: maps paths correctly', () => {
    const wsRoot = '/tmp/dummy-workspace';
    const paths = getWorkspacePaths(wsRoot);

    expect(paths.root).toBe(path.resolve(wsRoot));
    expect(paths.name).toBe('dummy-workspace');
    expect(paths.skillsDir).toBe(path.join(path.resolve(wsRoot), '.agents', 'skills'));
    expect(paths.mcpFile).toBe(path.join(path.resolve(wsRoot), '.mcp.json'));
    expect(paths.agentMcpSymlink).toBe(path.join(path.resolve(wsRoot), '.agents', 'mcp.json'));
  });

  test('ensureWorkspaceDirs: creates .agents/skills and reconciles .agents/mcp.json symlink', async () => {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-ensure-'));
    const mcpFile = path.join(tmpDir, '.mcp.json');
    await fsp.writeFile(mcpFile, JSON.stringify({ mcpServers: {} }));

    await ensureWorkspaceDirs(tmpDir);

    const skillsDir = path.join(tmpDir, '.agents', 'skills');
    const agentMcp = path.join(tmpDir, '.agents', 'mcp.json');

    const skillsStat = await fsp.stat(skillsDir);
    expect(skillsStat.isDirectory()).toBe(true);

    const mcpStat = await fsp.lstat(agentMcp);
    expect(mcpStat.isSymbolicLink()).toBe(true);

    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  test('initWorkspace: scaffolds 3-layer adapter architecture', async () => {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-init-'));
    const res = await initWorkspace(tmpDir);

    expect(res.success).toBe(true);
    expect(res.name).toBe(path.basename(tmpDir));

    // Verify adapters exist
    const claudeSkills = path.join(tmpDir, '.claude', 'skills');
    const zcodeSkills = path.join(tmpDir, '.zcode', 'skills');
    const dshAgents = path.join(tmpDir, '.dsh', 'agents');

    expect((await fsp.lstat(claudeSkills)).isSymbolicLink()).toBe(true);
    expect((await fsp.lstat(zcodeSkills)).isSymbolicLink()).toBe(true);
    expect((await fsp.lstat(dshAgents)).isSymbolicLink()).toBe(true);

    await fsp.rm(tmpDir, { recursive: true, force: true });
  });
});
