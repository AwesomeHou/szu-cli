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

test('skill install copies bundled skill to explicit codex directory', () => {
  const targetRoot = mkdtempSync(join(tmpdir(), 'szu-skill-install-'));
  const result = runCli([
    'skill',
    'install',
    '--target',
    'codex',
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

test('setup codex installs skill and returns next steps', () => {
  const targetRoot = mkdtempSync(join(tmpdir(), 'szu-setup-codex-'));
  const result = runCli([
    'setup',
    'codex',
    '--skill-dir',
    targetRoot,
    '--json'
  ], { cleanup: false });

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'setup codex');
  assert.equal(body.data.cli.available, true);
  assert.equal(body.data.skill.installed, true);
  assert.equal(body.data.skill.installedPath, join(targetRoot, 'szu-campus'));
  assert.equal(existsSync(join(targetRoot, 'szu-campus', 'SKILL.md')), true);
  assert.deepEqual(body.data.nextSteps, [
    'Run `szu auth login` and complete login in the browser.',
    'Run `szu auth status --json`.'
  ]);
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
