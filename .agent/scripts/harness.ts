#!/usr/bin/env bun
/**
 * Universal Cross-Harness Agentic Environment CLI (harness / agn)
 * 100% Strongly-Typed TypeScript running on Bun.
 * Zero-prefix interactive shell, zero external dependencies.
 */

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { colorize, COLORS } from '../src/config';
import { findWorkspaceRoot, getWorkspacePaths, ensureWorkspaceDirs, initWorkspace } from '../src/workspace';
import { addSkill, removeSkill, createLocalSkill } from '../src/skills';
import { enableMcp, disableMcp, removeMcp, registerMcpInCatalog } from '../src/mcp';
import { enableGlobalMcp, disableGlobalMcp, removeGlobalMcp } from '../src/mcp-global';
import { healWorkspace, cleanGlobal } from '../src/doctor';
import { printStatus, printCatalog, runDoctor, printHelp } from '../src/cli-printers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function launchUi(workspaceRoot: string): void {
  const uiServer = path.join(__dirname, '..', 'ui', 'server.ts');
  const child = spawn('bun', [uiServer], {
    cwd: workspaceRoot,
    stdio: 'inherit'
  });
  child.on('exit', () => {});
}

async function handleCommand(cmd: string, args: string[], workspaceRoot: string): Promise<boolean> {
  const c = cmd.toLowerCase();
  const { name, root } = getWorkspacePaths(workspaceRoot);

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
    const sub = (args[0] || '').toLowerCase();
    const target = args[1];
    if (['add', 'on', 'enable'].includes(sub) && target) {
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
      console.log('Usage: skill add <name> | skill remove <name> | skill create <name> [desc]');
    }
  } else if (['mcp', 'mcps'].includes(c)) {
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
  } else if (c === 'doctor') {
    await runDoctor(root);
  } else if (c === 'heal') {
    await healWorkspace(root);
    console.log(colorize('✅ Reconciled and healed all adapter symlinks.', COLORS.GREEN));
  } else if (['clean-global', 'cleanglobal'].includes(c)) {
    const res = await cleanGlobal();
    res.actions.forEach(a => console.log(colorize(`• ${a}`, COLORS.GREEN)));
  } else if (c === 'ui') {
    launchUi(root);
  } else {
    console.log(`Unknown command: "${cmd}". Type 'help' for available commands.`);
  }

  return true;
}

async function startRepl(workspaceRoot: string): Promise<void> {
  const { name, root } = getWorkspacePaths(workspaceRoot);
  console.log(`\n${COLORS.BOLD}${COLORS.CYAN}============================================================${COLORS.RESET}`);
  console.log(`${COLORS.BOLD}           HARNESS AGENTIC ENVIRONMENT MANAGER${COLORS.RESET}`);
  console.log(`  Workspace: ${COLORS.GREEN}${name}${COLORS.RESET} (${COLORS.DIM}${root}${COLORS.RESET})`);
  console.log(`${COLORS.BOLD}${COLORS.CYAN}============================================================${COLORS.RESET}`);
  console.log(`Type '${COLORS.BOLD}help${COLORS.RESET}' for commands, '${COLORS.BOLD}exit${COLORS.RESET}' to quit.\n`);

  const rl = readline.createInterface({ input, output });

  while (true) {
    try {
      const line = (await rl.question(`${COLORS.BOLD}[harness: ${name}] > ${COLORS.RESET}`)).trim();
      if (!line) continue;
      const [cmd, ...args] = line.split(/\s+/);
      const keepRunning = await handleCommand(cmd, args, root);
      if (!keepRunning) break;
    } catch {
      console.log('\nExiting...');
      break;
    }
  }
  rl.close();
}

async function main(): Promise<void> {
  const workspaceRoot = findWorkspaceRoot();
  await ensureWorkspaceDirs(workspaceRoot);

  const rawArgs = process.argv.slice(2);
  if (rawArgs.length === 0 || ['start', 'shell', 'repl'].includes(rawArgs[0].toLowerCase())) {
    await startRepl(workspaceRoot);
    return;
  }

  const [cmd, ...subArgs] = rawArgs;
  if (['help', '--help', '-h'].includes(cmd.toLowerCase())) {
    printHelp();
    return;
  }

  await handleCommand(cmd, subArgs, workspaceRoot);
}

main().catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
