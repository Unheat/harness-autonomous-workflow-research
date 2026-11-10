export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  description?: string;
  enabled?: boolean;
  /** Hub-level dormant marker kept for GUI round-trips (see `disabled` semantics in pi). */
  disabled?: boolean;
  /** Remote transports; `type` is the MCP-client spelling, `transport` the DSH-era one. */
  url?: string;
  headers?: Record<string, string>;
  type?: 'stdio' | 'http' | 'streamable-http';
  transport?: 'stdio' | 'streamable-http' | 'sse';
}

export interface McpCatalog {
  version?: string;
  description?: string;
  mcpServers?: Record<string, McpServerConfig>;
}

export interface WorkspacePaths {
  root: string;
  name: string;
  agentsDir: string;
  skillsDir: string;
  dormantSkillsDir: string;
  mcpFile: string;
  agentMcpSymlink: string;
  agentDir: string;
  subagentsDir: string;
  hooksDir: string;
}

export interface LocalSkillInfo {
  name: string;
  isLink: boolean;
  target?: string;
  isDormant?: boolean;
}

export interface OperationResult {
  success: boolean;
  message: string;
}

export interface SkillRemoveResult extends OperationResult {
  requiresConfirmation?: boolean;
}

export interface SkillCreateResult extends OperationResult {
  path?: string;
}

export interface InitWorkspaceResult extends OperationResult {
  root: string;
  name: string;
}

export type SeverityLevel = 'error' | 'warning';

export interface AuditIssue {
  severity: SeverityLevel;
  message: string;
}

export interface AuditResult {
  passed: boolean;
  issues: AuditIssue[];
}

export type SkillScope = 'global' | 'project' | 'catalog';

export interface EffectiveSkillInfo {
  name: string;
  scope: SkillScope;
  effectiveActive: boolean;
  isProjectActive: boolean;
  isGlobalActive: boolean;
  isDormant: boolean;
  isLink: boolean;
  description: string;
}

export type McpScopeState = 'active' | 'dormant' | 'not_configured';

export interface EffectiveMcpInfo {
  name: string;
  effectiveActive: boolean;
  workspaceActive?: boolean;
  globalState: McpScopeState;
  workspaceState: McpScopeState;
  isShadowed: boolean;
  shadowReason?: string;
  config: McpServerConfig;
}

export interface CleanGlobalResult {
  success: boolean;
  actions: string[];
}

export interface SubagentInfo {
  name: string;
  description: string;
  scope: 'global' | 'project';
  filePath: string;
  tools: string[];
  disallowedTools: string[];
  hasTokenShield: boolean;
  model?: string;
  color?: string;
  thoughtLevel?: string;
  isActive?: boolean;
  isDormant?: boolean;
}

