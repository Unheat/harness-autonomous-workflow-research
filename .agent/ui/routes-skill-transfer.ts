import type http from 'node:http';
import { parseJsonBody, sendJson } from './server-helpers';
import { promoteSkillToCatalog } from '../src/skill-promote';
import { importSkillFromWorkspace, listImportableSkills } from '../src/skill-import';
import { chooseDirectory } from '../src/services/directory-picker';

/**
 * Catalog promotion and cross-workspace import endpoints.
 * Kept separate from the core resource routes so each file stays single-purpose.
 */
export async function handleSkillTransferRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  root: string
): Promise<boolean> {
  if (req.method === 'POST' && pathname === '/api/skill/to-catalog') {
    const body = await parseJsonBody(req);
    sendJson(res, 200, await promoteSkillToCatalog(root, body.name));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/skill/import/list') {
    const body = await parseJsonBody(req);
    sendJson(res, 200, await listImportableSkills(root, body.sourceRoot));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/skill/import') {
    const body = await parseJsonBody(req);
    sendJson(res, 200, await importSkillFromWorkspace(root, body.sourceRoot, body.name));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/dialog/choose-directory') {
    sendJson(res, 200, await chooseDirectory());
    return true;
  }

  return false;
}
