import os from 'node:os';
import path from 'node:path';

export const HOME_DIR = os.homedir();
export const GLOBAL_AGENTS_DIR = path.join(HOME_DIR, '.agents');
export const GLOBAL_CATALOG_DIR = path.join(GLOBAL_AGENTS_DIR, 'catalog');
export const GLOBAL_SKILLS_DIR = path.join(GLOBAL_AGENTS_DIR, 'skills');
export const GLOBAL_MCPS_FILE = path.join(GLOBAL_CATALOG_DIR, 'mcps.json');

export const GLOBAL_ZCODE_CONFIG = path.join(HOME_DIR, '.zcode', 'cli', 'config.json');
export const GLOBAL_CLAUDE_CONFIG = path.join(HOME_DIR, '.claude', 'settings.json');

export const TOKENS_PER_SKILL_PREVIEW = 350;
export const TOKENS_PER_MCP_SCHEMA = 300;

export const COLORS = {
  CYAN: '\x1b[96m',
  GREEN: '\x1b[92m',
  YELLOW: '\x1b[93m',
  RED: '\x1b[91m',
  MAGENTA: '\x1b[95m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  RESET: '\x1b[0m'
} as const;

export type ColorCode = typeof COLORS[keyof typeof COLORS];

/**
 * Returns colorized text if stdout is a TTY, else raw text.
 */
export function colorize(text: string, color: ColorCode | string): string {
  if (process.stdout.isTTY) {
    return `${color}${text}${COLORS.RESET}`;
  }
  return text;
}
