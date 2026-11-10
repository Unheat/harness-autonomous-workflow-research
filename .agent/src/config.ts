import os from 'node:os';
import path from 'node:path';

export const HOME_DIR = os.homedir();
export const GLOBAL_AGENTS_DIR = path.join(HOME_DIR, '.agents');
export const GLOBAL_CATALOG_DIR = path.join(GLOBAL_AGENTS_DIR, 'catalog');
export const GLOBAL_CATALOG_SKILLS_DIR = path.join(GLOBAL_CATALOG_DIR, 'skills');
export const GLOBAL_SKILLS_DIR = path.join(GLOBAL_AGENTS_DIR, 'skills');
export const GLOBAL_MCPS_FILE = path.join(GLOBAL_CATALOG_DIR, 'mcps.json');

export const GLOBAL_ZCODE_CONFIG = path.join(HOME_DIR, '.zcode', 'cli', 'config.json');
export const GLOBAL_CLAUDE_CONFIG = path.join(HOME_DIR, '.claude', 'settings.json');

/**
 * Administrator MCP policy for Claude Code. When this file exists, Claude ignores user, project and
 * `--mcp-config` servers entirely, so the hub symlink and every projection are moot there.
 */
export const CLAUDE_MANAGED_MCP_CONFIG = process.platform === 'darwin'
  ? '/Library/Application Support/ClaudeCode/managed-mcp.json'
  : process.platform === 'win32'
    ? 'C:\\Program Files\\ClaudeCode\\managed-mcp.json'
    : '/etc/claude-code/managed-mcp.json';

/** Project-scope config directory read by pi and every pi-derived harness. */
export const PI_PROJECT_CONFIG_DIR = '.pi';

/** Project-scope MCP file basename inside {@link PI_PROJECT_CONFIG_DIR}. */
export const PI_PROJECT_MCP_BASENAME = 'mcp.json';

/** Agent-directory basename holding per-harness trust decisions. */
export const PI_TRUST_BASENAME = 'trust.json';

/** Environment variable with which pi-derived harnesses relocate their agent directory. */
export const PI_AGENT_DIR_ENV = 'PI_CODING_AGENT_DIR';

/** Opt-in registry (`path.delimiter`-separated) for additional relocated agent directories. */
export const PI_LIKE_AGENT_DIRS_ENV = 'PI_LIKE_AGENT_DIRS';

/** Agent directory used by a stock pi install when nothing relocates it. */
export const PI_DEFAULT_AGENT_SUBPATH = [PI_PROJECT_CONFIG_DIR, 'agent'] as const;

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
