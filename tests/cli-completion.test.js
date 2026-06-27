import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const api = readFileSync(new URL('./fixtures/completion-api.json', import.meta.url), 'utf8');

function runCompletion(args, options = {}) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      SZU_BROWSER_BACKEND: 'mock',
      SZU_MOCK_COMPLETION_API_JSON: api,
      SZU_MOCK_COMPLETION_TEXT: '深圳大学网上办事服务大厅 学业完成查询 个人中心 安全退出',
      ...options.env
    }
  });
  rmSync(home, { recursive: true, force: true });
  return result;
}

test('completion status reports calculated eHall readiness', () => {
  const result = runCompletion(['completion', 'status', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.loggedIn, true);
  assert.equal(body.data.reason, 'ehall-completion-page');
  assert.equal(body.data.calculation.state, 'completed');
  assert.equal(body.meta.command, 'completion status');
});

test('completion summary returns plan credit totals', () => {
  const result = runCompletion(['completion', 'summary', '--json', '--timeout', '30']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.plan.requiredCredits, 150);
  assert.equal(body.data.plan.remainingCredits, 60);
  assert.equal(JSON.stringify(body.data).includes('2023000000'), false);
  assert.equal(JSON.stringify(body.data).includes('测试用户'), false);
});

test('completion modules returns module credit completion', () => {
  const result = runCompletion(['completion', 'modules', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.items.length, 2);
  assert.equal(body.data.items[0].moduleCode, 'module-01');
  assert.equal(body.data.items[0].remainingCredits, 4);
});

test('completion courses returns all states for one module', () => {
  const result = runCompletion([
    'completion',
    'courses',
    '--module',
    'module-01',
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.module.moduleCode, 'module-01');
  assert.deepEqual(body.data.items.map((item) => item.status), [
    'completed',
    'selected',
    'not-taken'
  ]);
});

test('completion courses requires a module code', () => {
  const result = runCompletion(['completion', 'courses', '--json']);

  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stdout).error.message, /--module is required/);
});

test('completion courses returns MODULE_NOT_FOUND for an unknown module', () => {
  const result = runCompletion([
    'completion',
    'courses',
    '--module',
    'missing-module',
    '--json'
  ]);

  assert.equal(result.status, 25);
  assert.equal(JSON.parse(result.stdout).error.code, 'MODULE_NOT_FOUND');
});

test('completion commands return CALCULATION_TIMEOUT with progress details', () => {
  const result = runCompletion(['completion', 'summary', '--timeout', '1', '--json'], {
    env: {
      SZU_MOCK_COMPLETION_TIMEOUT: '1'
    }
  });

  assert.equal(result.status, 24);
  const body = JSON.parse(result.stdout);
  assert.equal(body.error.code, 'CALCULATION_TIMEOUT');
  assert.deepEqual(body.error.details, {
    completed: 0,
    total: 1,
    percent: 0,
    timeoutSeconds: 1
  });
});

test('completion commands return LOGIN_REQUIRED for CAS page', () => {
  const result = runCompletion(['completion', 'summary', '--json'], {
    env: {
      SZU_MOCK_COMPLETION_TEXT: '统一身份认证 账号登录 密码',
      SZU_MOCK_COMPLETION_URL: 'https://authserver.szu.edu.cn/authserver/login',
      SZU_MOCK_COMPLETION_TITLE: '统一身份认证'
    }
  });

  assert.equal(result.status, 11);
  assert.equal(JSON.parse(result.stdout).error.code, 'LOGIN_REQUIRED');
});

test('completion commands return PERMISSION_DENIED for 403 page', () => {
  const result = runCompletion(['completion', 'summary', '--json'], {
    env: {
      SZU_MOCK_COMPLETION_STATUS: '403',
      SZU_MOCK_COMPLETION_TEXT: '403 版权信息'
    }
  });

  assert.equal(result.status, 13);
  assert.equal(JSON.parse(result.stdout).error.code, 'PERMISSION_DENIED');
});

test('completion commands return PAGE_CHANGED for missing final data', () => {
  const result = runCompletion(['completion', 'summary', '--json'], {
    env: {
      SZU_MOCK_COMPLETION_API_JSON: '{}'
    }
  });

  assert.equal(result.status, 20);
  assert.equal(JSON.parse(result.stdout).error.code, 'PAGE_CHANGED');
});

test('completion commands reject unknown options', () => {
  const result = runCompletion(['completion', 'modules', '--bad', '--json']);

  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stdout).error.message, /Unknown option/);
});
