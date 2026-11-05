import { describe, test, expect } from 'bun:test';
import { getUnifiedResources, normalizeSkill, normalizeMcp } from '../.agent/src/resources';

describe('Unified Resource Abstraction (Skills & MCPs)', () => {
  test('normalizeSkill: maps EffectiveSkillInfo into UnifiedResource', () => {
    const raw = {
      name: 'test-skill',
      scope: 'global' as const,
      effectiveActive: true,
      isProjectActive: false,
      isGlobalActive: true,
      isDormant: false,
      isLink: false,
      description: 'Test description'
    };
    const unified = normalizeSkill(raw);
    expect(unified.id).toBe('skill:test-skill');
    expect(unified.kind).toBe('skill');
    expect(unified.scope).toBe('global');
    expect(unified.effectiveActive).toBe(true);
    expect(unified.globalState).toBe('active');
    expect(unified.tokenCostEstimate).toBe(350);
  });

  test('normalizeMcp: maps EffectiveMcpInfo into UnifiedResource', () => {
    const raw = {
      name: 'test-mcp',
      effectiveActive: false,
      workspaceActive: true,
      globalState: 'dormant' as const,
      workspaceState: 'active' as const,
      isShadowed: true,
      shadowReason: 'Local is ON, but Global is OFF',
      config: { command: 'node', description: 'MCP Server' }
    };
    const unified = normalizeMcp(raw);
    expect(unified.id).toBe('mcp:test-mcp');
    expect(unified.kind).toBe('mcp');
    expect(unified.isShadowed).toBe(true);
    expect(unified.shadowReason).toContain('Local is ON');
    expect(unified.tokenCostEstimate).toBe(0); // inactive
  });

  test('getUnifiedResources: returns aggregated, normalized list for workspace', async () => {
    const resources = await getUnifiedResources(process.cwd());
    expect(Array.isArray(resources)).toBe(true);
    expect(resources.length).toBeGreaterThan(0);

    const hasSkills = resources.some(r => r.kind === 'skill');
    const hasMcps = resources.some(r => r.kind === 'mcp');
    const hasSubagents = resources.some(r => r.kind === 'subagent');
    expect(hasSkills).toBe(true);
    expect(hasMcps).toBe(true);
    expect(hasSubagents).toBe(true);

    for (const r of resources) {
      expect(r.id).toBeDefined();
      expect(['skill', 'mcp', 'hook', 'plugin', 'subagent']).toContain(r.kind);
      expect(['global', 'project', 'catalog']).toContain(r.scope);
      expect(['active', 'dormant', 'not_configured']).toContain(r.globalState);
      expect(['active', 'dormant', 'not_configured']).toContain(r.workspaceState);
    }
  });
});
