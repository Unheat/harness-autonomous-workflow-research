import { describe, test, expect } from 'bun:test';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { listLocalMcps, enableMcp, disableMcp, removeMcp } from '../.agent/src/mcp';

describe('mcp module', () => {
  test('lifecycle: enable, disable, and remove per-workspace', async () => {
    const tmpWs = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-mcp-'));

    try {
      // 1. Initially empty
      const initial = await listLocalMcps(tmpWs);
      expect(initial).toEqual({});

      // 2. Enable an existing catalog server (e.g. codebase-memory)
      const enRes = await enableMcp(tmpWs, 'codebase-memory');
      expect(enRes.success).toBe(true);

      const afterEn = await listLocalMcps(tmpWs);
      expect('codebase-memory' in afterEn).toBe(true);
      expect(afterEn['codebase-memory'].enabled).toBe(true);

      // Verify .agents/mcp.json exists and is synchronized in lockstep
      const agentMcp = path.join(tmpWs, '.agents', 'mcp.json');
      const lstat = await fsp.lstat(agentMcp);
      expect(lstat.isSymbolicLink() || lstat.isFile()).toBe(true);

      // 3. Disable the server locally (dormancy)
      const disRes = await disableMcp(tmpWs, 'codebase-memory');
      expect(disRes.success).toBe(true);

      const afterDis = await listLocalMcps(tmpWs);
      expect(afterDis['codebase-memory'].enabled).toBe(false);

      // 4. Remove the server completely
      const rmRes = await removeMcp(tmpWs, 'codebase-memory');
      expect(rmRes.success).toBe(true);

      const afterRm = await listLocalMcps(tmpWs);
      expect('codebase-memory' in afterRm).toBe(false);

      // 5. Non-existent server fails cleanly
      const badRes = await enableMcp(tmpWs, 'non-existent-server-xyz-999');
      expect(badRes.success).toBe(false);
    } finally {
      await fsp.rm(tmpWs, { recursive: true, force: true });
    }
  });
});
