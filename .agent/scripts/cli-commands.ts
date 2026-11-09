import path from 'node:path';
import { spawn } from 'node:child_process';
import { colorize, COLORS } from '../src/config';
import { getWorkspacePaths, initWorkspace } from '../src/workspace';
import { addSkill, removeSkill, createLocalSkill } from '../src/skills';
import { enableGlobalSkill, disableGlobalSkill, deleteSkillPermanent } from '../src/services/skill-service';
import { enableMcp, disableMcp, removeMcp, registerMcpInCatalog } from '../src/mcp';
import { enableGlobalMcp, disableGlobalMcp, removeGlobalMcp } from '../src/mcp-global';
import { toggleSubagentTokenShield, deleteSubagentFile, findSubagentPath } from '../src/services/subagent-service';
import { readConfigFile, resolveConfigPath, type ConfigTarget } from '../src/services/config-service';
import { healWorkspace, cleanGlobal } from '../src/doctor';
import { printStatus, printCatalog, runDoctor, printHelp, printSubagents } from '../src/cli-printers';

export function launchUi(workspaceRoot: string): void {
  const uiServer = path.join(__dirname, '..', 'ui', 'server.ts');
  const child = spawn('bun', [uiServer], { cwd: workspaceRoot, stdio: 'inherit' });
  child.on('exit', () => {});
}

export async function executeCliCommand(cmd: string, args: string[], workspaceRoot: string): Promise<boolean> {
  const c = cmd.toLowerCase();
  const { root } = getWorkspacePaths(workspaceRoot);

  if (['exit', 'quit', 'q'].includes(c)) {
    console.log('Goodbye!');
    return false;
  }
  if (c === 'help') {
    printHelp();
  } else if (c === 'status') {
    await printStatus(root);
  } else if (c === 'init') {
    const target = args[0] ? path.resolve(root, args[0]) : root;
    const res = await initWorkspace(target);
    console.log(colorize(`✅ Initialized clean 3-layer architecture for "${res.name}".`, COLORS.GREEN));
  } else if (['catalog', 'cat'].includes(c)) {
    await printCatalog(root);
  } else if (['skill', 'skills'].includes(c)) {
    await handleSkillCommand(args, root);
  } else if (['mcp', 'mcps'].includes(c)) {
    await handleMcpCommand(args, root);
  } else if (['agent', 'agents', 'subagent', 'subagents'].includes(c)) {
    await handleAgentCommand(args, root);
  } else if (['config', 'cfg'].includes(c)) {
    await handleConfigCommand(args, root);
  } else if (c === 'doctor') {
    await runDoctor(root);
  } else if (c === 'heal') {
    const actions = await healWorkspace(root);
    actions.forEach(a => console.log(colorize(`• ${a}`, COLORS.GREEN)));
    console.log(colorize('✅ Workspace healed and reconciled across all harnesses.', COLORS.GREEN));
  } else if (['clean-global', 'cleanglobal'].includes(c)) {
    const res = await cleanGlobal({
      skills: args.includes('--skills') || args.includes('skills'),
      mcp: args.includes('--mcp') || args.includes('mcp'),
      all: args.includes('--all') || args.includes('all')
    });
    res.actions.forEach(a => console.log(colorize(`• ${a}`, COLORS.GREEN)));
  } else if (c === 'ui') {
    launchUi(root);
  } else {
    console.log(`Unknown command: "${cmd}". Type 'help' for available commands.`);
  }

  return true;
}

async function handleSkillCommand(args: string[], root: string): Promise<void> {
  const sub = (args[0] || '').toLowerCase();
  const target = args[1];

  if (sub === 'global') {
    const gAct = (args[1] || '').toLowerCase();
    const gTarget = args[2];
    if (['on', 'enable'].includes(gAct) && gTarget) {
      const res = await enableGlobalSkill(gTarget, root);
      console.log(colorize(res.message, res.success ? COLORS.GREEN : COLORS.YELLOW));
    } else if (['off', 'disable'].includes(gAct) && gTarget) {
      const res = await disableGlobalSkill(gTarget);
      console.log(colorize(res.message, res.success ? COLORS.GREEN : COLORS.YELLOW));
    } else {
      console.log('Usage: skill global on <name> | skill global off <name>');
    }
  } else if (['delete', 'del', 'purge'].includes(sub) && target) {
    const fromCatalog = args.includes('--catalog');
    const res = await deleteSkillPermanent(root, target, { fromWorkspace: true, fromCatalog });
    console.log(colorize(res.message, res.success ? COLORS.GREEN : COLORS.YELLOW));
  } else if (['add', 'on', 'enable'].includes(sub) && target) {
    const res = await addSkill(root, target);
    console.log(colorize(res.message, res.success ? COLORS.GREEN : COLORS.YELLOW));
  } else if (['remove', 'rm', 'off', 'disable'].includes(sub) && target) {
    const res = await removeSkill(root, target);
    console.log(colorize(res.message, res.success ? COLORS.GREEN : COLORS.YELLOW));
  } else if (['create', 'new'].includes(sub) && target) {
    const desc = args.slice(2).join(' ');
    const res = await createLocalSkill(root, target, desc);
    console.log(colorize(res.message, res.success ? COLORS.GREEN : COLORS.YELLOW));
  } else {
    console.log('Usage: skill add <name> | skill remove <name> | skill delete <name> [--catalog] | skill global on/off <name>');
  }
}

async function handleMcpCommand(args: string[], root: string): Promise<void> {
  const sub = (args[0] || '').toLowerCase();
  const target = args[1];

  if (sub === 'global') {
    const gAct = (args[1] || '').toLowerCase();
    const gTarget = args[2];
    if (['on', 'enable'].includes(gAct) && gTarget) {
      const res = await enableGlobalMcp(gTarget);
      console.log(colorize(res.message, res.success ? COLORS.GREEN : COLORS.YELLOW));
    } else if (['off', 'disable'].includes(gAct) && gTarget) {
      const res = await disableGlobalMcp(gTarget);
      console.log(colorize(res.message, res.success ? COLORS.GREEN : COLORS.YELLOW));
    } else if (['rm', 'remove', 'delete'].includes(gAct) && gTarget) {
      const res = await removeGlobalMcp(gTarget);
      console.log(colorize(res.message, res.success ? COLORS.GREEN : COLORS.YELLOW));
    } else {
      console.log('Usage: mcp global on <srv> | mcp global off <srv> | mcp global rm <srv>');
    }
  } else if (['on', 'enable'].includes(sub) && target) {
    const res = await enableMcp(root, target);
    console.log(colorize(res.message, res.success ? COLORS.GREEN : COLORS.YELLOW));
  } else if (['off', 'disable'].includes(sub) && target) {
    const res = await disableMcp(root, target);
    console.log(colorize(res.message, res.success ? COLORS.GREEN : COLORS.YELLOW));
  } else if (['rm', 'remove', 'delete'].includes(sub) && target) {
    const res = await removeMcp(root, target);
    console.log(colorize(res.message, res.success ? COLORS.GREEN : COLORS.YELLOW));
  } else if (['add', 'register'].includes(sub) && target && args[2]) {
    await registerMcpInCatalog(target, { command: args[2], args: args.slice(3) });
    await enableMcp(root, target);
    console.log(colorize(`✅ Registered in catalog and enabled in workspace: ${target}`, COLORS.GREEN));
  } else {
    console.log('Usage: mcp on <srv> | mcp off <srv> | mcp rm <srv> | mcp global on/off/rm <srv>');
  }
}

async function handleAgentCommand(args: string[], root: string): Promise<void> {
  const sub = (args[0] || '').toLowerCase();
  const target = args[1];

  if (['list', 'status', ''].includes(sub)) {
    await printSubagents(root);
  } else if (sub === 'shield' && target && args[2]) {
    const enable = ['on', 'enable', 'true'].includes(args[2].toLowerCase());
    const match = await findSubagentPath(target, root);
    if (!match) {
      console.log(colorize(`Subagent "${target}" not found.`, COLORS.RED));
      return;
    }
    const res = await toggleSubagentTokenShield(match.filePath, enable);
    console.log(colorize(res.message, res.success ? COLORS.GREEN : COLORS.YELLOW));
  } else if (['delete', 'rm'].includes(sub) && target) {
    const match = await findSubagentPath(target, root);
    if (!match) {
      console.log(colorize(`Subagent "${target}" not found.`, COLORS.RED));
      return;
    }
    const res = await deleteSubagentFile(match.filePath);
    console.log(colorize(res.message, res.success ? COLORS.GREEN : COLORS.YELLOW));
  } else {
    console.log('Usage: agent list | agent shield <name> <on|off> | agent delete <name>');
  }
}

async function handleConfigCommand(args: string[], root: string): Promise<void> {
  const sub = (args[0] || '').toLowerCase();
  const target = (args[1] || 'workspace-mcp') as ConfigTarget;

  if (sub === 'read') {
    const res = await readConfigFile(target, root, args[2]);
    if (res.success) {
      console.log(`\n${COLORS.BOLD}--- ${res.filePath} (${res.format}) ---${COLORS.RESET}\n${res.content}\n`);
    } else {
      console.log(colorize(res.message || 'Failed to read config.', COLORS.RED));
    }
  } else if (sub === 'edit') {
    try {
      const { filePath } = resolveConfigPath(target, root, args[2]);
      const editor = process.env.EDITOR || 'nano';
      const child = spawn(editor, [filePath], { stdio: 'inherit' });
      child.on('exit', code => {
        console.log(`Editor exited with code ${code}.`);
      });
    } catch (err: any) {
      console.log(colorize(`Error: ${err.message}`, COLORS.RED));
    }
  } else {
    console.log('Usage: config read <workspace-mcp|global-mcp-catalog|zcode-global|claude-settings|global-skill-lock|subagent|skill> [name]');
    console.log('       config edit <workspace-mcp|global-mcp-catalog|zcode-global|claude-settings|global-skill-lock|subagent|skill> [name]');
  }
}
