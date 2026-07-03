import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));

test('skill path prints bundled skill location', () => {
  const result = runCli(['skill', 'path', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'skill path');
  assert.equal(body.data.name, 'szu-campus');
  assert.match(body.data.sourcePath, /skills[\\/]szu-campus$/);
  assert.equal(existsSync(join(body.data.sourcePath, 'SKILL.md')), true);
});

test('skill install copies bundled skill to explicit directory', () => {
  const targetRoot = mkdtempSync(join(tmpdir(), 'szu-skill-install-'));
  const result = runCli([
    'skill',
    'install',
    '--dir',
    targetRoot,
    '--json'
  ], { cleanup: false });

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'skill install');
  assert.equal(body.data.target, 'codex');
  assert.equal(body.data.name, 'szu-campus');
  assert.equal(body.data.installed, true);
  assert.equal(body.data.installedPath, join(targetRoot, 'szu-campus'));
  assert.match(readFileSync(join(targetRoot, 'szu-campus', 'SKILL.md'), 'utf8'), /SZU Campus CLI Skill/);
  rmSync(targetRoot, { recursive: true, force: true });
});

test('skill install creates portable AI IDE bundle', () => {
  const targetRoot = mkdtempSync(join(tmpdir(), 'szu-ai-ide-'));
  const targetDir = join(targetRoot, 'SZU-Campus.skill');
  const result = runCli([
    'skill',
    'install',
    '--target',
    'ai-ide',
    '--dest',
    targetDir,
    '--json'
  ], { cleanup: false });

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.data.target, 'ai-ide');
  assert.equal(body.data.installedPath, targetDir);
  assert.match(readFileSync(join(targetDir, 'SKILL.md'), 'utf8'), /SZU Campus CLI Skill/);
  assert.match(readFileSync(join(targetDir, 'AGENTS.md'), 'utf8'), /SZU Campus CLI Skill/);
  rmSync(targetRoot, { recursive: true, force: true });
});

function runCli(args, options = {}) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home
    }
  });
  if (options.cleanup !== false) {
    rmSync(home, { recursive: true, force: true });
  }
  return result;
}
