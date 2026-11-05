#!/usr/bin/env bun
/**
 * Lightweight Web Dashboard Server for Harness Environment Manager
 * 100% Strongly-Typed TypeScript running on Bun (< 200 lines).
 */

import http from 'node:http';
import fsp from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { findWorkspaceRoot, getWorkspacePaths } from '../src/workspace';
import { getCatalogSkills, getCatalogMcps } from '../src/catalog';
import { addSkill, removeSkill } from '../src/skills';
import { getEffectiveSkillsList } from '../src/skills-global';
import { listLocalMcps, enableMcp, disableMcp } from '../src/mcp';
import { getEffectiveMcpList, listGlobalMcps, enableGlobalMcp, disableGlobalMcp, removeGlobalMcp } from '../src/mcp-global';
import { listAllSubagents } from '../src/subagents';
import { healWorkspace } from '../src/doctor';
import { TOKENS_PER_SKILL_PREVIEW, TOKENS_PER_MCP_SCHEMA, COLORS } from '../src/config';
import { checkPortAvailable, findAvailablePort, parseJsonBody } from './server-helpers';

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

    if (req.method === 'GET' && url.pathname === '/api/status') {
      const effectiveSkills = await getEffectiveSkillsList(root);
      const effectiveMcps = await getEffectiveMcpList(root);
      const localMcps = await listLocalMcps(root);
      const globalMcps = await listGlobalMcps();
      const catalogSkills = await getCatalogSkills();
      const catalogMcps = await getCatalogMcps();
      const subagents = await listAllSubagents(root);

      const activeSkillsCount = effectiveSkills.filter(s => s.effectiveActive).length;
      const activeMcpCount = effectiveMcps.filter(m => m.effectiveActive).length;
      const estTokens = (activeSkillsCount * TOKENS_PER_SKILL_PREVIEW) + (activeMcpCount * TOKENS_PER_MCP_SCHEMA);
      const blockedSkills = Math.max(0, catalogSkills.length - activeSkillsCount);
      const savedTokens = blockedSkills * TOKENS_PER_SKILL_PREVIEW;

      const payload = {
        workspace: { name, path: root },
        metrics: {
          injected_tokens: estTokens,
          saved_tokens: savedTokens,
          active_skills_count: activeSkillsCount,
          active_mcps_count: activeMcpCount,
          total_catalog_skills: catalogSkills.length,
          total_catalog_mcps: Object.keys(catalogMcps).length
        },
        skills: {
          effective: effectiveSkills
        },
        mcps: {
          effective: effectiveMcps,
          local: localMcps,
          global: globalMcps,
          catalog: catalogMcps
        },
        subagents
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload, null, 2));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/skill/toggle') {
      try {
        const body = await parseJsonBody(req);
        if (!body.name) { res.writeHead(400); res.end(JSON.stringify({ error: 'Missing name' })); return; }
        let result: any;
        if (body.scope === 'global' && !body.enable) {
          result = await removeSkill(root, body.name);
          if (!result.success) {
            result = { success: false, message: `"${body.name}" is active globally in user config.` };
          }
        } else {
          result = body.enable ? await addSkill(root, body.name) : await removeSkill(root, body.name);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/mcp/toggle') {
      try {
        const body = await parseJsonBody(req);
        if (!body.name) { res.writeHead(400); res.end(JSON.stringify({ error: 'Missing name' })); return; }

        if (body.scope === 'global') {
          const result = body.enable ? await enableGlobalMcp(body.name) : await disableGlobalMcp(body.name);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
          return;
        }

        if (body.scope === 'unshadow') {
          const result = await removeGlobalMcp(body.name);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
          return;
        }

        // Workspace scope toggle
        if (body.enable) {
          // If shadowed by global (enabled: false), remove from global so workspace toggle takes effect!
          const globals = await listGlobalMcps();
          if (globals[body.name] && globals[body.name].enabled === false) {
            await removeGlobalMcp(body.name);
          }
          const result = await enableMcp(root, body.name);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          const result = await disableMcp(root, body.name);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        }
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/heal') {
      await healWorkspace(root);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Reconciled and healed all adapter symlinks' }));
      return;
    }

    res.writeHead(404); res.end('Not Found');
  });

  return { server, root, name };
}

async function startServer(): Promise<void> {
  const root = findWorkspaceRoot();
  const { server, name } = await createDashboardServer(root);
  const port = await findAvailablePort(20888);

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
