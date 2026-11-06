import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Import before application modules: config.ts captures HOME at module evaluation.
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-isolated-home-'));
// Bun 1.1 caches os.homedir(); keep the API consistent with the isolated HOME.
os.homedir = () => home;
process.env.HOME = home;
process.env.XDG_CONFIG_HOME = path.join(home, '.config');
process.env.XDG_DATA_HOME = path.join(home, '.local', 'share');
process.env.XDG_CACHE_HOME = path.join(home, '.cache');
process.env.XDG_STATE_HOME = path.join(home, '.local', 'state');
for (const dir of [home, ...Object.entries(process.env).filter(([key]) => key.startsWith('XDG_')).map(([, value]) => value!)]) {
  fs.mkdirSync(dir, { recursive: true });
}
const catalog = path.join(home, '.agents', 'catalog');
const skill = path.join(catalog, 'skills', 'harness-protocol');
fs.mkdirSync(skill, { recursive: true });
fs.writeFileSync(path.join(skill, 'SKILL.md'), '---\nname: harness-protocol\ndescription: Isolated test fixture\n---\n');
fs.writeFileSync(path.join(catalog, 'mcps.json'), JSON.stringify({ mcpServers: {
  'codebase-memory': { command: 'test-memory-server' }
} }));
fs.mkdirSync(path.join(home, '.zcode', 'cli'), { recursive: true });
fs.writeFileSync(path.join(home, '.zcode', 'cli', 'config.json'), JSON.stringify({ mcp: { servers: {} } }));
fs.mkdirSync(path.join(home, '.zcode', 'skills'), { recursive: true });
fs.symlinkSync(skill, path.join(home, '.zcode', 'skills', 'harness-protocol'));
process.on('exit', () => fs.rmSync(home, { recursive: true, force: true }));
