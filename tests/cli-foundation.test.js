import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));

function runCli(args, options = {}) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      ...options.env
    }
  });
  rmSync(home, { recursive: true, force: true });
  return result;
}

test('prints package version', () => {
  const result = runCli(['--version']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test('doctor prints JSON readiness envelope', () => {
  const result = runCli(['doctor', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'doctor');
  assert.equal(body.data.node.ok, true);
  assert.equal(body.data.profile.path.includes('szu-cli-test-'), true);
  assert.equal(typeof body.data.playwright.installed, 'boolean');
  assert.equal(body.data.browser.channel, 'chrome');
});

test('auth status reports missing profile as logged out', () => {
  const result = runCli(['auth', 'status', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'auth status');
  assert.deepEqual(body.data, {
    loggedIn: false,
    reason: 'profile-missing',
    profileExists: false,
    profilePath: body.data.profilePath
  });
  assert.equal(body.data.profilePath.includes('szu-cli-test-'), true);
});

test('auth status can report checked page through mock backend', () => {
  const result = runCli(['auth', 'status', '--json'], {
    env: {
      SZU_BROWSER_BACKEND: 'mock',
      SZU_MOCK_AUTH_URL: 'https://www1.szu.edu.cn/board/',
      SZU_MOCK_AUTH_TITLE: '校园公文通—深圳大学内部网',
      SZU_MOCK_AUTH_TEXT: '侯燊 个人中心｜注销 ｜说明 首 页 ｜ 公文通'
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.data.loggedIn, true);
  assert.equal(body.data.reason, 'szu-user-menu');
  assert.equal(body.data.finalUrl, 'https://www1.szu.edu.cn/board/');
});

test('auth login opens configured target with browser profile', () => {
  const result = runCli([
    'auth',
    'login',
    '--json',
    '--url',
    'https://www1.szu.edu.cn/board/'
  ], {
    env: {
      SZU_BROWSER_BACKEND: 'mock'
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'auth login');
  assert.equal(body.data.opened, true);
  assert.equal(body.data.url, 'https://www1.szu.edu.cn/board/');
  assert.equal(body.data.profilePath.includes('szu-cli-test-'), true);
});

test('unknown command returns structured JSON error', () => {
  const result = runCli(['unknown', '--json']);

  assert.equal(result.status, 2);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'UNSUPPORTED_ACTION');
});
