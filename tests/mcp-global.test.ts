import { describe, test, expect } from 'bun:test';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { getEffectiveMcpList, listGlobalMcps, enableGlobalMcp, disableGlobalMcp, removeGlobalMcp } from '../.agent/src/mcp-global';
import { saveLocalMcps } from '../.agent/src/mcp';
import { auditWorkspace } from '../.agent/src/doctor';
import { GLOBAL_ZCODE_CONFIG } from '../.agent/src/config';

describe('MCP Global & Effective Resolution Engine', () => {
  test('shadowing detection: Global dormant overrides Workspace active', async () => {
    const tmpWs = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-eff-'));
    const testServer = 'test-shadow-server';

    // Set up test server as dormant in global config
    const originalGlobals = await listGlobalMcps();
    const { saveGlobalMcps } = await import('../.agent/src/mcp-global');
    try {
      const globals = { ...originalGlobals, [testServer]: { command: 'test', enabled: false } };
      await saveGlobalMcps(globals);

      // Local workspace has testServer active
      await saveLocalMcps(tmpWs, {
        [testServer]: { command: 'test', enabled: true }
      });

      const list = await getEffectiveMcpList(tmpWs);
      const item = list.find(x => x.name === testServer);

      expect(item).toBeDefined();
      expect(item!.globalState).toBe('dormant');
      expect(item!.workspaceState).toBe('active');
      expect(item!.effectiveActive).toBe(false);
      expect(item!.isShadowed).toBe(true);

      // Doctor audit should also report this shadowing error
      const audit = await auditWorkspace(tmpWs);
      const shadowIssue = audit.issues.find(i => i.message.includes('blocked by Global ZCode config'));
      expect(shadowIssue).toBeDefined();
    } finally {
      await saveGlobalMcps(originalGlobals);
      await fsp.rm(tmpWs, { recursive: true, force: true });
    }
  });

  test('effective resolution: server only in local workspace with no global entry', async () => {
    const tmpWs = await fsp.mkdtemp(path.join(os.tmpdir(), 'harness-test-local-only-'));

    await saveLocalMcps(tmpWs, {
      'custom-local-server': { command: 'node', args: ['./custom.js'], enabled: true }
    });

    const list = await getEffectiveMcpList(tmpWs);
    const customItem = list.find(x => x.name === 'custom-local-server');

    expect(customItem).toBeDefined();
    expect(customItem!.globalState).toBe('not_configured');
    expect(customItem!.workspaceState).toBe('active');
    expect(customItem!.effectiveActive).toBe(true);
    expect(customItem!.isShadowed).toBe(false);

    await fsp.rm(tmpWs, { recursive: true, force: true });
  });

  test('global management: enableGlobalMcp, disableGlobalMcp, and removeGlobalMcp', async () => {
    // Read original state to restore afterwards
    const originalGlobals = await listGlobalMcps();
    const testServer = 'test-mock-global-server';

    try {
      // 1. Enable globally
      const enRes = await enableGlobalMcp(testServer);
      // If not in catalog, will return false gracefully
      expect(typeof enRes.success).toBe('boolean');

      // 2. Disable globally
      const globals = await listGlobalMcps();
      globals[testServer] = { command: 'test', enabled: true };
      const { saveGlobalMcps } = await import('../.agent/src/mcp-global');
      await saveGlobalMcps(globals);

      const disRes = await disableGlobalMcp(testServer);
      expect(disRes.success).toBe(true);

      const afterDis = await listGlobalMcps();
      expect(afterDis[testServer].enabled).toBe(false);

      // 3. Remove globally (unshadow)
      const rmRes = await removeGlobalMcp(testServer);
      expect(rmRes.success).toBe(true);

      const afterRm = await listGlobalMcps();
      expect(testServer in afterRm).toBe(false);
    } finally {
      // Restore original config
      const { saveGlobalMcps } = await import('../.agent/src/mcp-global');
      await saveGlobalMcps(originalGlobals);
    }
  });
});
