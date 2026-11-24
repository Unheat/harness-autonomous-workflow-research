import { describe, test, expect } from 'bun:test';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HOOK = path.resolve(import.meta.dir, '../.agents/skills/swe-workflow/hooks/universal-pre-push.sh');

function makeRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swe-hook-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'commit.gpgsign', 'false');
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'fixture', version: '1.0.0', scripts: { test: 'true' } })
  );
  return dir;
}

function writeAndCommit(dir: string, files: Record<string, string>): void {
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(dir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  execFileSync('git', ['add', '-A'], { cwd: dir, stdio: 'pipe' });
  execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: dir, stdio: 'pipe' });
}

function runHook(dir: string) {
  return spawnSync('bash', [HOOK, 'origin', 'git@example.com:acme/repo.git'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, GIT_SWE_SKIP: '0' },
  });
}

describe('swe-workflow pre-push hook: secret scan', () => {
  test('placeholder keys in template files do not block the push', () => {
    const dir = makeRepo();
    try {
      writeAndCommit(dir, {
        'worker/.dev.vars.example': 'OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key-here\n',
        'config.example.yml': 'token: ghp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n',
        '.env.sample': 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\n',
        'secrets.template': 'key=sk-or-v1-placeholder-value-0123456789\n',
      });

      const result = runHook(dir);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('All pre-push checks passed');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('the hook source itself does not trip its own scan', () => {
    const dir = makeRepo();
    try {
      // The gate scans its own tracked source; a token-shaped example in a comment
      // would block every push from the repo that ships the hook.
      writeAndCommit(dir, {
        '.agents/skills/swe-workflow/hooks/universal-pre-push.sh': fs.readFileSync(HOOK, 'utf8'),
      });

      const result = runHook(dir);
      expect(result.status).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('a real key in tracked source still blocks the push', () => {
    const dir = makeRepo();
    try {
      writeAndCommit(dir, {
        'src/config.ts': 'export const KEY = "sk-or-v1-0123456789abcdef0123456789abcdef";\n',
      });

      const result = runHook(dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('BLOCKED: High-entropy secret');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
