import { colorize, COLORS, TOKENS_PER_SKILL_PREVIEW, TOKENS_PER_MCP_SCHEMA } from './config';
import { getWorkspacePaths } from './workspace';
import { getCatalogSkills, getCatalogMcps } from './catalog';
import { getEffectiveSkillsList } from './skills-global';
import { getEffectiveMcpList } from './mcp-global';
import { listAllSubagents } from './subagents';
import { auditWorkspace } from './doctor';
import { inspectPiProjection } from './services/pi-mcp-projection';
import { listLocalMcps } from './mcp';

export async function printStatus(workspaceRoot: string): Promise<void> {
  const { name, root } = getWorkspacePaths(workspaceRoot);
  const effectiveSkills = await getEffectiveSkillsList(root);
  const activeSkills = effectiveSkills.filter(s => s.effectiveActive);
  const effectiveMcps = await getEffectiveMcpList(root);
  const catalogSkills = await getCatalogSkills();

  console.log(`\n${COLORS.BOLD}${COLORS.CYAN}=== HARNESS WORKSPACE STATUS ===${COLORS.RESET}`);
  console.log(`Workspace: ${COLORS.BOLD}${name}${COLORS.RESET} (${COLORS.DIM}${root}${COLORS.RESET})\n`);

  console.log(`${COLORS.BOLD}📦 Skills (${activeSkills.length} active):${COLORS.RESET}`);
  if (effectiveSkills.length > 0) {
    for (const s of effectiveSkills) {
      if (!s.effectiveActive && !s.isDormant) continue;
      let tag = colorize('[Project]', COLORS.CYAN);
      if (s.isDormant) tag = colorize('[Project: dormant]', COLORS.DIM);
      else if (s.scope === 'global') tag = colorize('[Global: active]', COLORS.MAGENTA);
      else if (s.isLink) tag = colorize('[Project: linked]', COLORS.GREEN);
      console.log(`  • ${COLORS.BOLD}${s.name.padEnd(25)}${COLORS.RESET} ${tag}`);
    }
  } else {
    console.log(`  ${COLORS.DIM}No skills in this workspace.${COLORS.RESET}`);
  }

  console.log(`\n${COLORS.BOLD}🔌 MCP Servers (Effective Runtime Status):${COLORS.RESET}`);
  let activeMcpCount = 0;
  if (effectiveMcps.length > 0) {
    for (const item of effectiveMcps) {
      if (item.globalState === 'not_configured' && item.workspaceState === 'not_configured') continue;

      let statusTag = '';
      if (item.isShadowed) {
        if (item.effectiveActive) {
          activeMcpCount++;
          statusTag = `${colorize('ON ⚠️', COLORS.YELLOW)} ${COLORS.DIM}[Forced by Global User Scope]${COLORS.RESET}`;
        } else {
          statusTag = colorize('BLOCKED ⚠️  (Blocked by Global User Scope)', COLORS.RED);
        }
      } else if (item.effectiveActive) {
        activeMcpCount++;
        const scope = item.globalState === 'active' ? '[Global: User Scope]' : '[Workspace .mcp.json]';
        statusTag = `${colorize('ON', COLORS.GREEN)} ${COLORS.DIM}${scope}${COLORS.RESET}`;
      } else {
        const scope = item.globalState === 'dormant' ? '[Global: OFF]' : '[Workspace: OFF]';
        statusTag = `${colorize('OFF', COLORS.YELLOW)} ${COLORS.DIM}${scope}${COLORS.RESET}`;
      }

      console.log(`  • ${COLORS.BOLD}${item.name.padEnd(18)}${COLORS.RESET} ${statusTag}`);
    }
  } else {
    console.log(`  ${COLORS.DIM}No MCP servers configured.${COLORS.RESET}`);
  }

  // pi-like harnesses read a generated projection, not the hub, so surface its drift here.
  const piProjection = inspectPiProjection(root, await listLocalMcps(root));
  const projectionTag = piProjection.state === 'current'
    ? colorize('synced', COLORS.GREEN)
    : colorize(piProjection.state, piProjection.state === 'blocked' ? COLORS.RED : COLORS.YELLOW);
  console.log(`  ${COLORS.DIM}↳ pi-like projection (.pi/mcp.json): ${piProjection.servers} server(s), ${projectionTag}${COLORS.RESET}`);

  const estTokens = (activeSkills.length * TOKENS_PER_SKILL_PREVIEW) + (activeMcpCount * TOKENS_PER_MCP_SCHEMA);
  const blockedSkills = Math.max(0, catalogSkills.length - activeSkills.length);
  const savedTokens = blockedSkills * TOKENS_PER_SKILL_PREVIEW;

  const subagents = await listAllSubagents(root);
  console.log(`\n${COLORS.BOLD}🤖 Subagents (${subagents.length} available across harnesses):${COLORS.RESET}`);
  for (const a of subagents) {
    const scopeTag = a.scope === 'global' ? colorize('[Global]', COLORS.MAGENTA) : colorize('[Project]', COLORS.CYAN);
    const shieldTag = a.hasTokenShield ? colorize('[Shield: Protected ✅]', COLORS.GREEN) : colorize('[Shield: None ⚠️]', COLORS.YELLOW);
    console.log(`  • ${COLORS.BOLD}${a.name.padEnd(20)}${COLORS.RESET} ${scopeTag} ${shieldTag}`);
  }

  console.log(`\n${COLORS.BOLD}🛡️  Context Shield & Token Footprint:${COLORS.RESET}`);
  console.log(`  • Injected Token Footprint: ${colorize(`~${estTokens.toLocaleString()} tokens`, estTokens < 3000 ? COLORS.GREEN : COLORS.YELLOW)}`);
  console.log(`  • Prevented Bloat:          ${colorize(`+${savedTokens.toLocaleString()} tokens saved`, COLORS.GREEN)} (${blockedSkills} catalog skills isolated)\n`);
}

export async function printSubagents(workspaceRoot: string): Promise<void> {
  const { root } = getWorkspacePaths(workspaceRoot);
  const subagents = await listAllSubagents(root);

  console.log(`\n${COLORS.BOLD}${COLORS.CYAN}=== SUBAGENTS (Cross-Harness Parity) ===${COLORS.RESET}\n`);
  if (subagents.length === 0) {
    console.log(`  ${COLORS.DIM}No subagents found in this workspace or global scope.${COLORS.RESET}\n`);
    return;
  }

  for (const a of subagents) {
    const scopeTag = a.scope === 'global' ? colorize('[Global]', COLORS.MAGENTA) : colorize('[Project]', COLORS.CYAN);
    const shieldTag = a.hasTokenShield ? colorize('[Token Shield: Protected ✅]', COLORS.GREEN) : colorize('[Token Shield: None ⚠️]', COLORS.YELLOW);
    const toolsStr = a.tools.length > 0 ? a.tools.join(', ') : 'default (all tools)';
    const disallowedStr = a.disallowedTools.length > 0 ? ` (stripped: ${a.disallowedTools.join(', ')})` : '';

    console.log(`  • ${COLORS.BOLD}${a.name.padEnd(20)}${COLORS.RESET} ${scopeTag} ${shieldTag}`);
    if (a.description) {
      console.log(`    ${COLORS.DIM}${a.description}${COLORS.RESET}`);
    }
    console.log(`    ${COLORS.DIM}Tools: ${toolsStr}${disallowedStr}${COLORS.RESET}`);
  }
  console.log();
}

export async function printCatalog(workspaceRoot: string): Promise<void> {
  const { root } = getWorkspacePaths(workspaceRoot);
  const catSkills = await getCatalogSkills();
  const catMcps = await getCatalogMcps();
  const effectiveSkills = new Map((await getEffectiveSkillsList(root)).map(s => [s.name, s]));
  const effectiveMcps = new Map((await getEffectiveMcpList(root)).map(m => [m.name, m]));

  console.log(`\n${COLORS.BOLD}${COLORS.CYAN}=== MACHINE CENTRAL CATALOG (~/.agents/) ===${COLORS.RESET}\n`);

  console.log(`${COLORS.BOLD}📦 Skills in Catalog (${catSkills.length}):${COLORS.RESET}`);
  for (const s of catSkills) {
    const eff = effectiveSkills.get(s);
    let statusTag = colorize('[inactive]', COLORS.DIM);
    if (eff) {
      if (eff.scope === 'global') statusTag = colorize('[GLOBAL: active]', COLORS.MAGENTA);
      else if (eff.isDormant) statusTag = colorize('[PROJECT: dormant]', COLORS.YELLOW);
      else if (eff.effectiveActive) statusTag = colorize('[PROJECT: active]', COLORS.GREEN);
    }
    console.log(`  • ${s.padEnd(30)} ${statusTag}`);
  }

  const mcpEntries = Object.entries(catMcps);
  console.log(`\n${COLORS.BOLD}🔌 MCP Servers in Catalog (${mcpEntries.length}):${COLORS.RESET}`);
  for (const [m, cfg] of mcpEntries) {
    const eff = effectiveMcps.get(m);
    let statusTag = colorize('[available to add]', COLORS.DIM);
    if (eff) {
      if (eff.isShadowed) statusTag = colorize('[BLOCKED by Global]', COLORS.RED);
      else if (eff.effectiveActive) statusTag = colorize('[ACTIVE: ON]', COLORS.GREEN);
      else if (eff.workspaceState === 'dormant' || eff.globalState === 'dormant') statusTag = colorize('[DORMANT: OFF]', COLORS.YELLOW);
    }
    const desc = cfg.description || '';
    console.log(`  • ${COLORS.BOLD}${m.padEnd(20)}${COLORS.RESET} ${statusTag} ${COLORS.DIM}- ${desc}${COLORS.RESET}`);
  }
  console.log(`\n${COLORS.DIM}Use 'skill add <name>' or 'mcp on <name>' to activate in this project.${COLORS.RESET}\n`);
}

export async function runDoctor(workspaceRoot: string): Promise<void> {
  const { root } = getWorkspacePaths(workspaceRoot);
  console.log(`\n${COLORS.BOLD}${COLORS.CYAN}=== HARNESS CROSS-PLATFORM DOCTOR ===${COLORS.RESET}\n`);

  const { passed, issues } = await auditWorkspace(root);

  if (passed) {
    console.log(`  ${colorize('✅ All adapter symlinks healthy and verified.', COLORS.GREEN)}`);
    console.log(`  ${colorize('✅ Subagent token shields active (Skill stripped).', COLORS.GREEN)}`);
    console.log(`  ${colorize('✅ Global config is clean with zero tool leakage or shadowing.', COLORS.GREEN)}`);
    console.log(`\nDoctor Verdict: ${colorize('PASSED (0 issues)', COLORS.GREEN)}\n`);
  } else {
    for (const issue of issues) {
      const tag = issue.severity === 'error' ? colorize('❌ ERROR:', COLORS.RED) : colorize('⚠️  WARNING:', COLORS.YELLOW);
      console.log(`  ${tag} ${issue.message}`);
    }
    console.log(`\nDoctor Verdict: ${colorize(`FOUND ${issues.length} ISSUE(S) (Run \`harness heal\` or \`harness clean-global\`)`, COLORS.YELLOW)}\n`);
  }
}

export function printHelp(): void {
  console.log(`\n${COLORS.BOLD}Available Commands (Zero-Prefix in Shell):${COLORS.RESET}`);
  console.log(`  ${COLORS.BOLD}init [dir]${COLORS.RESET}             Connect Claude, Cursor, ZCode via symlinks (3-layer zero-bloat setup)`);
  console.log(`  ${COLORS.BOLD}status${COLORS.RESET}                 Show active skills, MCPs, and context token estimate`);
  console.log(`  ${COLORS.BOLD}catalog${COLORS.RESET}                Browse skills & MCPs in machine catalog (~/.agents/)`);
  console.log(`  ${COLORS.BOLD}skill add <name>${COLORS.RESET}       Enable skill in current workspace (creates symlink)`);
  console.log(`  ${COLORS.BOLD}skill remove <name>${COLORS.RESET}    Disable skill in workspace (moves to dormant or unlinks)`);
  console.log(`  ${COLORS.BOLD}skill delete <name>${COLORS.RESET}    Permanently delete skill (--catalog to purge central store)`);
  console.log(`  ${COLORS.BOLD}skill global on/off <n>${COLORS.RESET}Toggle skill globally (ZCode, Claude, DSH)`);
  console.log(`  ${COLORS.BOLD}mcp on/off/rm <srv>${COLORS.RESET}    Manage local workspace MCP server`);
  console.log(`  ${COLORS.BOLD}mcp global on/off/rm${COLORS.RESET}   Manage global MCP server in ~/.zcode/cli/config.json`);
  console.log(`  ${COLORS.BOLD}mcp sync${COLORS.RESET}                Re-project manager truth into DSH + pi-like harnesses`);
  console.log(`  ${COLORS.BOLD}agent list${COLORS.RESET}             List subagents with Token Shield status`);
  console.log(`  ${COLORS.BOLD}agent shield <name> <m>${COLORS.RESET}Toggle subagent Token Shield (on | off)`);
  console.log(`  ${COLORS.BOLD}agent delete <name>${COLORS.RESET}    Permanently delete a subagent file`);
  console.log(`  ${COLORS.BOLD}config read/edit <tgt>${COLORS.RESET} Inspect/edit JSON/MD configs (workspace-mcp, zcode-global, claude-settings, subagent)`);
  console.log(`  ${COLORS.BOLD}doctor / heal${COLORS.RESET}          Audit and auto-repair cross-harness symlinks`);
  console.log(`  ${COLORS.BOLD}clean-global${COLORS.RESET}           Sweep global skills/MCPs to stop global token bloat`);
  console.log(`  ${COLORS.BOLD}ui${COLORS.RESET}                     Open local Vibe Coder Web Dashboard`);
  console.log(`  ${COLORS.BOLD}help / exit${COLORS.RESET}            Show menu / Exit shell\n`);
}
