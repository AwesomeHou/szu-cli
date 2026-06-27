import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const api = readFileSync(new URL('./fixtures/growth-api.json', import.meta.url), 'utf8');

function runGrowth(args, options = {}) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      SZU_BROWSER_BACKEND: 'mock',
      SZU_MOCK_GROWTH_API_JSON: api,
      SZU_MOCK_GROWTH_TEXT: '深圳大学网上办事服务大厅 成长记录 个人中心 安全退出',
      ...options.env
    }
  });
  rmSync(home, { recursive: true, force: true });
  return result;
}

test('growth status reports eHall growth readiness', () => {
  const result = runGrowth(['growth', 'status', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'growth status');
  assert.equal(body.data.loggedIn, true);
  assert.equal(body.data.reason, 'ehall-growth-page');
  assert.equal(body.data.periodCount, 2);
});

test('growth summary returns cumulative GPA and major rank', () => {
  const result = runGrowth(['growth', 'summary', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.cumulative.gpa, 3.75);
  assert.equal(body.data.cumulative.majorRank, 8);
  assert.equal(JSON.stringify(body.data).includes('2023000000'), false);
  assert.equal(JSON.stringify(body.data).includes('测试用户'), false);
});

test('growth list returns term and academic-year items', () => {
  const result = runGrowth(['growth', 'list', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.deepEqual(body.data.items.map((item) => item.periodType), ['term', 'academic-year']);
});

test('growth list filters by term or academic year', () => {
  const term = runGrowth(['growth', 'list', '--term', '2025-2026-2', '--json']);
  const year = runGrowth(['growth', 'list', '--year', '2025-2026', '--json']);

  assert.equal(term.status, 0, term.stderr);
  assert.equal(year.status, 0, year.stderr);
  assert.deepEqual(JSON.parse(term.stdout).data.items.map((item) => item.periodId), ['2025-2026-2']);
  assert.deepEqual(JSON.parse(year.stdout).data.items.map((item) => item.periodId), ['2025-2026']);
});

test('growth list rejects term and year together', () => {
  const result = runGrowth([
    'growth',
    'list',
    '--term',
    '2025-2026-2',
    '--year',
    '2025-2026',
    '--json'
  ]);

  assert.equal(result.status, 1);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.match(body.error.message, /cannot be used together/);
});

test('growth commands return LOGIN_REQUIRED for CAS page', () => {
  const result = runGrowth(['growth', 'summary', '--json'], {
    env: {
      SZU_MOCK_GROWTH_TEXT: '统一身份认证 账号登录 密码',
      SZU_MOCK_GROWTH_URL: 'https://authserver.szu.edu.cn/authserver/login',
      SZU_MOCK_GROWTH_TITLE: '统一身份认证'
    }
  });

  assert.equal(result.status, 11);
  assert.equal(JSON.parse(result.stdout).error.code, 'LOGIN_REQUIRED');
});

test('growth commands return PERMISSION_DENIED for 403 page', () => {
  const result = runGrowth(['growth', 'summary', '--json'], {
    env: {
      SZU_MOCK_GROWTH_STATUS: '403',
      SZU_MOCK_GROWTH_TEXT: '403 版权信息'
    }
  });

  assert.equal(result.status, 13);
  assert.equal(JSON.parse(result.stdout).error.code, 'PERMISSION_DENIED');
});

test('growth commands return PAGE_CHANGED when required API data is missing', () => {
  const result = runGrowth(['growth', 'summary', '--json'], {
    env: {
      SZU_MOCK_GROWTH_API_JSON: '{}'
    }
  });

  assert.equal(result.status, 20);
  assert.equal(JSON.parse(result.stdout).error.code, 'PAGE_CHANGED');
});

test('growth commands reject unknown options', () => {
  const result = runGrowth(['growth', 'list', '--bad', '--json']);

  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stdout).error.message, /Unknown option/);
});
