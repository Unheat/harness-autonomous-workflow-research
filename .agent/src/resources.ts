import { getEffectiveSkillsList } from './skills-global';
import { getEffectiveMcpList } from './mcp-global';
import { listAllSubagents } from './subagents';
import type { EffectiveSkillInfo, EffectiveMcpInfo, SubagentInfo } from './types';

export type ResourceKind = 'skill' | 'mcp' | 'hook' | 'plugin' | 'subagent';
export type UnifiedScope = 'global' | 'project' | 'catalog';
export type UnifiedState = 'active' | 'dormant' | 'not_configured';

export interface UnifiedResource {
  id: string;
  name: string;
  kind: ResourceKind;
  scope: UnifiedScope;
  globalState: UnifiedState;
  workspaceState: UnifiedState;
  effectiveActive: boolean;
  isShadowed: boolean;
  shadowReason?: string;
  description: string;
  tokenCostEstimate: number;
}

const TOKENS_PER_SKILL = 350;
const TOKENS_PER_MCP = 300;
const TOKENS_PER_SUBAGENT = 200;

export function normalizeSubagent(a: SubagentInfo): UnifiedResource {
  return {
    id: `subagent:${a.name}`,
    name: a.name,
    kind: 'subagent',
    scope: a.scope,
    globalState: a.scope === 'global' ? 'active' : 'not_configured',
    workspaceState: a.scope === 'project' ? 'active' : 'not_configured',
    effectiveActive: true,
    isShadowed: false,
    description: a.description,
    tokenCostEstimate: TOKENS_PER_SUBAGENT
  };
}

export function normalizeSkill(s: EffectiveSkillInfo): UnifiedResource {
  const globalState: UnifiedState = s.isGlobalActive ? 'active' : 'not_configured';
  const workspaceState: UnifiedState = s.isProjectActive ? 'active' : (s.isDormant ? 'dormant' : 'not_configured');

  return {
    id: `skill:${s.name}`,
    name: s.name,
    kind: 'skill',
    scope: s.scope,
    globalState,
    workspaceState,
    effectiveActive: s.effectiveActive,
    isShadowed: false,
    description: s.description,
    tokenCostEstimate: s.effectiveActive ? TOKENS_PER_SKILL : 0
  };
}

export function normalizeMcp(m: EffectiveMcpInfo): UnifiedResource {
  const scope: UnifiedScope = m.globalState === 'active'
    ? 'global'
    : (m.workspaceState !== 'not_configured' ? 'project' : 'catalog');

  const desc = m.config?.description || (m.config?.command ? `${m.config.command} ${(m.config.args || []).join(' ')}` : '');

  return {
    id: `mcp:${m.name}`,
    name: m.name,
    kind: 'mcp',
    scope,
    globalState: m.globalState,
    workspaceState: m.workspaceState,
    effectiveActive: m.effectiveActive,
    isShadowed: m.isShadowed,
    shadowReason: m.shadowReason,
    description: desc,
    tokenCostEstimate: m.effectiveActive ? TOKENS_PER_MCP : 0
  };
}

/**
 * Returns all workspace and global resources unified into a single normalized structure.
 */
export async function getUnifiedResources(workspaceRoot: string): Promise<UnifiedResource[]> {
  const skills = await getEffectiveSkillsList(workspaceRoot);
  const mcps = await getEffectiveMcpList(workspaceRoot);
  const subagents = await listAllSubagents(workspaceRoot);

  return [
    ...skills.map(normalizeSkill),
    ...mcps.map(normalizeMcp),
    ...subagents.map(normalizeSubagent)
  ];
}
