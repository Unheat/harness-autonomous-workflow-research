import { colorize, COLORS, TOKENS_PER_SKILL_PREVIEW, TOKENS_PER_MCP_SCHEMA } from './config';
import { getWorkspacePaths } from './workspace';
import { getCatalogSkills, getCatalogMcps } from './catalog';
import { listLocalSkills } from './skills';
import { getEffectiveMcpList } from './mcp-global';
import { auditWorkspace } from './doctor';

export async function printStatus(workspaceRoot: string): Promise<void> {
  const { name, root } = getWorkspacePaths(workspaceRoot);
  const localSkills = await listLocalSkills(root);
  const activeSkills = localSkills.filter(s => !s.isDormant);
  const effectiveMcps = await getEffectiveMcpList(root);
  const catalogSkills = await getCatalogSkills();

  console.log(`\n${COLORS.BOLD}${COLORS.CYAN}=== HARNESS WORKSPACE STATUS ===${COLORS.RESET}`);
  console.log(`Workspace: ${COLORS.BOLD}${name}${COLORS.RESET} (${COLORS.DIM}${root}${COLORS.RESET})\n`);

  console.log(`${COLORS.BOLD}📦 Skills (${activeSkills.length} active, ${localSkills.length - activeSkills.length} dormant):${COLORS.RESET}`);
  if (localSkills.length > 0) {
    for (const s of localSkills) {
      let tag = colorize('[local-only]', COLORS.CYAN);
      if (s.isDormant) tag = colorize('[local: dormant]', COLORS.DIM);
      else if (s.isLink) tag = colorize('[linked from catalog]', COLORS.GREEN);
      console.log(`  • ${COLORS.BOLD}${s.name}${COLORS.RESET} ${tag}`);
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

  const estTokens = (activeSkills.length * TOKENS_PER_SKILL_PREVIEW) + (activeMcpCount * TOKENS_PER_MCP_SCHEMA);
  const blockedSkills = Math.max(0, catalogSkills.length - activeSkills.length);
  const savedTokens = blockedSkills * TOKENS_PER_SKILL_PREVIEW;

  console.log(`\n${COLORS.BOLD}🛡️  Context Shield & Token Footprint:${COLORS.RESET}`);
  console.log(`  • Injected Token Footprint: ${colorize(`~${estTokens.toLocaleString()} tokens`, estTokens < 3000 ? COLORS.GREEN : COLORS.YELLOW)}`);
  console.log(`  • Prevented Bloat:          ${colorize(`+${savedTokens.toLocaleString()} tokens saved`, COLORS.GREEN)} (${blockedSkills} catalog skills isolated)\n`);
}

export async function printCatalog(workspaceRoot: string): Promise<void> {
  const { root } = getWorkspacePaths(workspaceRoot);
  const catSkills = await getCatalogSkills();
  const catMcps = await getCatalogMcps();
  const localSkills = new Map((await listLocalSkills(root)).map(s => [s.name, s]));
  const effectiveMcps = new Map((await getEffectiveMcpList(root)).map(m => [m.name, m]));

  console.log(`\n${COLORS.BOLD}${COLORS.CYAN}=== MACHINE CENTRAL CATALOG (~/.agents/) ===${COLORS.RESET}\n`);

  console.log(`${COLORS.BOLD}📦 Skills in Catalog (${catSkills.length}):${COLORS.RESET}`);
  for (const s of catSkills) {
    const local = localSkills.get(s);
    let statusTag = colorize('[inactive]', COLORS.DIM);
    if (local) {
      statusTag = local.isDormant ? colorize('[DORMANT]', COLORS.YELLOW) : colorize('[ACTIVE in workspace]', COLORS.GREEN);
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
  console.log(`  ${COLORS.BOLD}init [dir]${COLORS.RESET}             Scaffold 3-layer architecture for a brand new project`);
  console.log(`  ${COLORS.BOLD}status${COLORS.RESET}                 Show active skills, MCPs, and context token estimate`);
  console.log(`  ${COLORS.BOLD}catalog${COLORS.RESET}                Browse skills & MCPs in machine catalog (~/.agents/)`);
  console.log(`  ${COLORS.BOLD}skill add <name>${COLORS.RESET}       Enable skill in current workspace (creates symlink)`);
  console.log(`  ${COLORS.BOLD}skill remove <name>${COLORS.RESET}    Disable skill in workspace (moves to dormant or unlinks)`);
  console.log(`  ${COLORS.BOLD}skill create <name>${COLORS.RESET}    Scaffold project-private skill (.agents/skills/<name>)`);
  console.log(`  ${COLORS.BOLD}mcp on <server>${COLORS.RESET}        Activate MCP server in local .mcp.json (unshadows global if needed)`);
  console.log(`  ${COLORS.BOLD}mcp off <server>${COLORS.RESET}       Deactivate MCP server in local .mcp.json (dormant)`);
  console.log(`  ${COLORS.BOLD}mcp rm <server>${COLORS.RESET}        Remove MCP server completely from local .mcp.json`);
  console.log(`  ${COLORS.BOLD}mcp global on <srv>${COLORS.RESET}    Enable server globally in ZCode (~/.zcode/cli/config.json)`);
  console.log(`  ${COLORS.BOLD}mcp global off <srv>${COLORS.RESET}   Disable server globally in ZCode (User Scope)`);
  console.log(`  ${COLORS.BOLD}mcp global rm <srv>${COLORS.RESET}    Remove server from Global ZCode config (unshadows workspaces)`);
  console.log(`  ${COLORS.BOLD}doctor${COLORS.RESET}                 Audit cross-harness symlink, token, and shadowing health`);
  console.log(`  ${COLORS.BOLD}heal${COLORS.RESET}                   Auto-repair and reconcile all adapter symlinks`);
  console.log(`  ${COLORS.BOLD}clean-global${COLORS.RESET}           Purge heavy servers from Global config to unshadow all repos`);
  console.log(`  ${COLORS.BOLD}ui${COLORS.RESET}                     Open local Vibe Coder Web Dashboard`);
  console.log(`  ${COLORS.BOLD}help${COLORS.RESET}                   Show this menu`);
  console.log(`  ${COLORS.BOLD}exit${COLORS.RESET}                   Exit shell\n`);
}
