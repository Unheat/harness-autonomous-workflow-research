import type http from 'node:http';
import { parseJsonBody } from './server-helpers';
import { addSkill, removeSkill, enableGlobalSkill, disableGlobalSkill, deleteSkillPermanent, getEffectiveSkillsList, isSkillActiveGlobally } from '../src/services/skill-service';
import { listLocalMcps, enableMcp, disableMcp, removeMcp } from '../src/mcp';
import { listGlobalMcps, enableGlobalMcp, disableGlobalMcp, removeGlobalMcp, getEffectiveMcpList } from '../src/mcp-global';
import { getCatalogSkills, getCatalogMcps } from '../src/catalog';
import { listAllSubagents } from '../src/subagents';
import { toggleSubagentTokenShield, deleteSubagentFile, findSubagentPath, toggleSubagentActive } from '../src/services/subagent-service';
import { readConfigFile, writeConfigFile, type ConfigTarget } from '../src/services/config-service';
import { auditWorkspace, healWorkspace } from '../src/doctor';
import { TOKENS_PER_SKILL_PREVIEW, TOKENS_PER_MCP_SCHEMA } from '../src/config';

function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

export async function handleApiRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  root: string,
  name: string
): Promise<boolean> {
  if (req.method === 'GET' && pathname === '/api/status') {
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

    sendJson(res, 200, {
      workspace: { name, path: root },
      metrics: {
        injected_tokens: estTokens,
        saved_tokens: savedTokens,
        active_skills_count: activeSkillsCount,
        active_mcps_count: activeMcpCount,
        total_catalog_skills: catalogSkills.length,
        total_catalog_mcps: Object.keys(catalogMcps).length
      },
      skills: { effective: effectiveSkills },
      mcps: { effective: effectiveMcps, local: localMcps, global: globalMcps, catalog: catalogMcps },
      subagents
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/skill/toggle') {
    const body = await parseJsonBody(req);
    let result: any;
    if (body.scope === 'global') {
      result = body.enable ? await enableGlobalSkill(body.name, root) : await disableGlobalSkill(body.name);
    } else if (!body.enable && isSkillActiveGlobally(body.name)) {
      result = await disableGlobalSkill(body.name);
      await removeSkill(root, body.name);
    } else {
      result = body.enable ? await addSkill(root, body.name) : await removeSkill(root, body.name);
    }
    sendJson(res, 200, result);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/skill/global-toggle') {
    const body = await parseJsonBody(req);
    const result = body.enable ? await enableGlobalSkill(body.name, root) : await disableGlobalSkill(body.name);
    sendJson(res, 200, result);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/skill/delete') {
    const body = await parseJsonBody(req);
    const result = await deleteSkillPermanent(root, body.name, {
      fromWorkspace: true,
      fromCatalog: !!body.fromCatalog
    });
    sendJson(res, 200, result);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/mcp/toggle') {
    const body = await parseJsonBody(req);
    if (!body.name) return sendJson(res, 400, { success: false, message: 'Missing server name' }), true;

    if (body.scope === 'global') {
      const result = body.enable ? await enableGlobalMcp(body.name) : await disableGlobalMcp(body.name);
      sendJson(res, 200, result);
      return true;
    }

    if (body.scope === 'unshadow' || body.scope === 'unblock') {
      const result = await removeGlobalMcp(body.name);
      sendJson(res, 200, result);
      return true;
    }

    if (body.enable) {
      const globals = await listGlobalMcps();
      if (globals[body.name] && globals[body.name].enabled === false) {
        await removeGlobalMcp(body.name);
      }
      const result = await enableMcp(root, body.name);
      sendJson(res, 200, result);
    } else {
      const result = await disableMcp(root, body.name);
      sendJson(res, 200, result);
    }
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/mcp/global-toggle') {
    const body = await parseJsonBody(req);
    if (!body.name) return sendJson(res, 400, { success: false, message: 'Missing server name' }), true;
    const result = body.enable ? await enableGlobalMcp(body.name) : await disableGlobalMcp(body.name);
    sendJson(res, 200, result);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/mcp/delete') {
    const body = await parseJsonBody(req);
    if (!body.name) return sendJson(res, 400, { success: false, message: 'Missing server name' }), true;
    const result = body.scope === 'global' ? await removeGlobalMcp(body.name) : await removeMcp(root, body.name);
    sendJson(res, 200, result);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/subagent/toggle') {
    const body = await parseJsonBody(req);
    if (!body.name) return sendJson(res, 400, { success: false, message: 'Missing subagent name' }), true;
    const result = await toggleSubagentActive(body.name, root, body.scope || 'project', body.enable);
    sendJson(res, 200, result);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/subagent/toggle-shield') {
    const body = await parseJsonBody(req);
    const match = await findSubagentPath(body.name, root, body.scope);
    if (!match) return sendJson(res, 404, { success: false, message: `Subagent "${body.name}" not found.` }), true;
    const result = await toggleSubagentTokenShield(match.filePath, body.enable);
    sendJson(res, 200, result);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/subagent/delete') {
    const body = await parseJsonBody(req);
    const match = await findSubagentPath(body.name, root, body.scope);
    if (!match) return sendJson(res, 404, { success: false, message: `Subagent "${body.name}" not found.` }), true;
    const result = await deleteSubagentFile(match.filePath);
    sendJson(res, 200, result);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/config/read') {
    const body = await parseJsonBody(req);
    const result = await readConfigFile(body.target as ConfigTarget, root, body.subagentName);
    sendJson(res, 200, result);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/config/write') {
    const body = await parseJsonBody(req);
    const result = await writeConfigFile(body.target as ConfigTarget, body.content, root, body.subagentName);
    sendJson(res, 200, result);
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/doctor') {
    const report = await auditWorkspace(root);
    sendJson(res, 200, report);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/heal') {
    const actions = await healWorkspace(root);
    const report = await auditWorkspace(root);
    const message = report.passed ? 'Auto-heal complete: no audit issues remain.'
      : `Auto-heal finished: ${report.issues.length} issue(s) remain; review results below.`;
    sendJson(res, 200, { success: true, message, actions, report });
    return true;
  }

  return false;
}
