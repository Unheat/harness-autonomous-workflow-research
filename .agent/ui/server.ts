#!/usr/bin/env bun
/**
 * Lightweight Web Dashboard Server for Harness Environment Manager
 * 100% Strongly-Typed TypeScript running on Bun (< 100 lines).
 */

import http from 'node:http';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { findWorkspaceRoot, getWorkspacePaths } from '../src/workspace';
import { COLORS } from '../src/config';
import { checkPortAvailable, findAvailablePort } from './server-helpers';
import { handleApiRoute } from './routes';

export { checkPortAvailable, findAvailablePort };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createDashboardServer(workspaceRoot: string = process.cwd()): Promise<{
  server: http.Server; root: string; name: string;
}> {
  const root = findWorkspaceRoot(workspaceRoot);
  const { name } = getWorkspacePaths(root);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (req.method === 'GET' && url.pathname === '/') {
      try {
        const html = await fsp.readFile(path.join(__dirname, 'index.html'), 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch {
        res.writeHead(500); res.end('<h1>Failed to load index.html</h1>');
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/minisearch.js') {
      try {
        const js = await fsp.readFile(path.join(__dirname, 'minisearch.js'), 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(js);
      } catch {
        res.writeHead(404); res.end('Not Found');
      }
      return;
    }

    try {
      const handled = await handleApiRoute(req, res, url.pathname, root, name);
      if (!handled) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Endpoint Not Found' }));
      }
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  return { server, root, name };
}

async function startServer(): Promise<void> {
  const root = findWorkspaceRoot();
  const { server, name } = await createDashboardServer(root);
  const preferredPort = parseInt(process.env.PORT || '20894', 10);
  const port = (await checkPortAvailable(preferredPort)) ? preferredPort : await findAvailablePort(20888);

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`;
    console.log(`\n${COLORS.BOLD}🚀 HARNESS DASHBOARD: ${COLORS.GREEN}${name}${COLORS.RESET} -> ${COLORS.CYAN}${url}${COLORS.RESET}\n`);
    if (!process.argv.includes('--no-browser')) {
      const openCmd = process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
      exec(openCmd);
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  startServer().catch(err => { console.error('Failed to start server:', err); process.exit(1); });
}
