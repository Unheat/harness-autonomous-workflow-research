#!/usr/bin/env bun
/**
 * Universal Cross-Harness Agentic Environment CLI (harness / agn)
 * 100% Strongly-Typed TypeScript running on Bun (< 90 lines).
 */

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { colorize, COLORS } from '../src/config';
import { findWorkspaceRoot, getWorkspacePaths, ensureWorkspaceDirs } from '../src/workspace';
import { printHelp } from '../src/cli-printers';
import { executeCliCommand } from './cli-commands';

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
      const keepRunning = await executeCliCommand(cmd, args, root);
      if (!keepRunning) {
        rl.close();
        process.exit(0);
      }
    } catch {
      console.log('\nExiting...');
      rl.close();
      process.exit(0);
    }
  }
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

  await executeCliCommand(cmd, subArgs, workspaceRoot);
}

main().catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
