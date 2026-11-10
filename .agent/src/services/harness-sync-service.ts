import { listLocalMcps } from '../mcp';
import { listGlobalMcps } from '../mcp-global';
import { syncDshProfileMcps } from '../mcp-dsh';
import { syncPiProjectMcps, syncPiUserScopeMcps } from './pi-mcp-projection';

/**
 * Harness projection sync.
 *
 * The manager's stores are the ground truth: `~/.zcode/cli/config.json` for user scope and the
 * workspace `.mcp.json` for project scope. Harnesses that cannot read those files get generated
 * projections instead of symlinks, and this service is the single place that refreshes them:
 *
 * - DeepSeek Harness -> `cordis.patch.yml` (user scope)
 * - pi-like harnesses -> `<agentDir>/mcp.json` (user scope) and `<workspace>/.pi/mcp.json` (project
 *   scope)
 *
 * `harness mcp sync` runs exactly this, so "what the manager shows" and "what a harness loads"
 * cannot diverge without a visible report.
 */

export interface HarnessSyncReport {
  /** Human-readable actions for projections that were written or refused. */
  actions: string[];
  /** Warnings that explain why a projection will not take effect. */
  warnings: string[];
}

/**
 * Refreshes every generated harness projection from the manager's stores.
 *
 * Non-destructive: it never migrates or deletes harness declarations (that is `clean-global`'s job)
 * and never grants harness trust.
 *
 * @param workspaceRoot Absolute workspace path.
 * @returns Actions performed and warnings collected.
 */
export async function syncHarnessProjections(workspaceRoot: string): Promise<HarnessSyncReport> {
  const actions: string[] = [];
  const warnings: string[] = [];

  const localServers = await listLocalMcps(workspaceRoot);
  const globalServers = await listGlobalMcps();

  const dshSynced = await syncDshProfileMcps(globalServers).catch(() => false);
  if (dshSynced) actions.push('Refreshed DeepSeek Harness profile from user scope');

  const project = await syncPiProjectMcps(workspaceRoot, localServers);
  if (project.state === 'blocked') {
    warnings.push(`${project.path} is a symlink into the hub; run \`harness heal\` to prune it`);
  } else if (project.changed && project.servers > 0) {
    actions.push(`Projected ${project.servers} workspace server(s) into ${project.path}`);
  }
  for (const issue of project.issues) {
    warnings.push(`pi-like harness would reject MCP server "${issue.server}": ${issue.reason}`);
  }

  for (const userScope of await syncPiUserScopeMcps(globalServers)) {
    if (userScope.state === 'blocked') {
      warnings.push(`${userScope.path} is a symlink; run \`harness heal\` to prune it`);
      continue;
    }
    if (userScope.changed && userScope.servers > 0) {
      actions.push(`Projected ${userScope.servers} user-scope server(s) into ${userScope.path}`);
    }
  }

  return { actions, warnings };
}
