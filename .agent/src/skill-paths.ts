import os from 'node:os';
import path from 'node:path';

/** Resource names must identify one child, never its containing directory. */
export function isValidSkillName(name: string): boolean {
  return typeof name === 'string' && !!name.trim() && name === name.trim()
    && name !== '.' && !name.includes('..') && !/[\\/\0]/.test(name);
}

/** Native user roots; OpenCode follows XDG_CONFIG_HOME. */
export function globalSkillRoots(): string[] {
  const home = os.homedir();
  return [
    ...['.zcode', '.claude', '.cursor', '.codex', '.dsh', '.agents'].map(dir => path.join(home, dir, 'skills')),
    path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'opencode', 'skills')
  ];
}
