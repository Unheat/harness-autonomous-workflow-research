import './isolated-home';
import { describe, test, expect } from 'bun:test';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const { listLocalMcps, saveLocalMcps, enableMcp, disableMcp, removeMcp } = await import('../.agent/src/mcp');
const { listLocalSkills, addSkill, removeSkill, createLocalSkill } = await import('../.agent/src/skills');
const { checkPortAvailable, findAvailablePort } = await import('../.agent/ui/server-helpers');

describe('Exhaustive Edge Cases & Fault Tolerance', () => {
  test('MCP: handles malformed JSON without crashing', async () => {
    const tmpWs = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-edge-mcp-json-'));
    const mcpFile = path.join(tmpWs, '.mcp.json');

    // Write completely corrupted JSON
    await fsp.writeFile(mcpFile, '{ corrupted syntax !!!', 'utf-8');

    const result = await listLocalMcps(tmpWs);
    expect(result).toEqual({});

    await fsp.rm(tmpWs, { recursive: true, force: true });
  });

  test('MCP: bi-directional sync when .agents/mcp.json is updated by ZCode GUI', async () => {
    const tmpWs = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-edge-sync-'));
    const mcpFile = path.join(tmpWs, '.mcp.json');
    const agentsDir = path.join(tmpWs, '.agents');
    const agentsMcp = path.join(agentsDir, 'mcp.json');

    await fsp.mkdir(agentsDir, { recursive: true });

    // 1. Initial state in .mcp.json
    await fsp.writeFile(mcpFile, JSON.stringify({ mcpServers: { s1: { command: 's1', enabled: true } } }), 'utf-8');

    // 2. Simulate ZCode GUI atomic write to .agents/mcp.json (with slightly newer timestamp)
    await new Promise(r => setTimeout(r, 20));
    await fsp.writeFile(agentsMcp, JSON.stringify({ mcpServers: { s1: { command: 's1', enabled: false }, s2: { command: 's2' } } }), 'utf-8');

    // 3. listLocalMcps() should detect newer .agents/mcp.json and sync back to .mcp.json
    const synced = await listLocalMcps(tmpWs);
    expect(synced.s1.enabled).toBe(false);
    expect('s2' in synced).toBe(true);

    // Verify .mcp.json was updated
    const rootData = JSON.parse(await fsp.readFile(mcpFile, 'utf-8'));
    expect(rootData.mcpServers.s1.enabled).toBe(false);

    await fsp.rm(tmpWs, { recursive: true, force: true });
  });

  test('MCP: rejects path traversal and malicious characters in server names', async () => {
    const tmpWs = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-edge-traversal-'));

    expect((await enableMcp(tmpWs, '../sneaky')).success).toBe(false);
    expect((await disableMcp(tmpWs, 'foo/bar')).success).toBe(false);
    expect((await removeMcp(tmpWs, 'foo\\bar')).success).toBe(false);

    await fsp.rm(tmpWs, { recursive: true, force: true });
  });

  test('Skills: trims whitespace and handles idempotent operations', async () => {
    const tmpWs = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-edge-skill-trim-'));

    // Create skill with surrounding whitespace
    const created = await createLocalSkill(tmpWs, '   clean-name   ', 'Trimmed test');
    expect(created.success).toBe(true);

    const skills = await listLocalSkills(tmpWs);
    expect(skills.length).toBe(1);
    expect(skills[0].name).toBe('clean-name');

    // Creating again should fail gracefully (idempotent)
    const duplicate = await createLocalSkill(tmpWs, 'clean-name');
    expect(duplicate.success).toBe(false);

    // Remove to dormant
    const removed = await removeSkill(tmpWs, 'clean-name');
    expect(removed.success).toBe(true);

    // Removing again when already removed should fail gracefully
    const removeAgain = await removeSkill(tmpWs, 'clean-name');
    expect(removeAgain.success).toBe(false);

    // Re-add restores from dormant
    const readded = await addSkill(tmpWs, 'clean-name');
    expect(readded.success).toBe(true);

    await fsp.rm(tmpWs, { recursive: true, force: true });
  });

  test('Network: port probing handles available and unavailable ports', async () => {
    const port = await findAvailablePort(25000, 5);
    expect(typeof port).toBe('number');
    expect(port).toBeGreaterThanOrEqual(25000);

    const isAvail = await checkPortAvailable(port);
    expect(isAvail).toBe(true);
  });
});
