import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const api = readFileSync(new URL('./fixtures/grade-api.json', import.meta.url), 'utf8');

function runGrade(args, options = {}) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      SZU_BROWSER_BACKEND: 'mock',
      SZU_MOCK_GRADE_API_JSON: api,
      SZU_MOCK_GRADE_TEXT: '深圳大学网上办事服务大厅 成绩查询 个人中心 安全退出',
      ...options.env
    }
  });
  rmSync(home, { recursive: true, force: true });
  return result;
}

test('grade status reports eHall grade readiness', () => {
  const result = runGrade(['grade', 'status', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'grade status');
  assert.equal(body.data.loggedIn, true);
  assert.equal(body.data.reason, 'ehall-grade-page');
  assert.equal(body.data.total, 3);
});

test('grade list returns normalized read-only grades', () => {
  const result = runGrade(['grade', 'list', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'grade list');
  assert.equal(body.data.items.length, 3);
  assert.equal(body.data.items[0].courseName, '应用统计学');
  assert.equal(JSON.stringify(body.data).includes('2023000000'), false);
  assert.equal(JSON.stringify(body.data).includes('测试用户'), false);
});

test('grade list can filter by term', () => {
  const result = runGrade(['grade', 'list', '--json', '--term', '2025-2026-1']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.deepEqual(body.data.items.map((item) => item.courseName), ['应用统计学', '线性代数']);
  assert.deepEqual(body.data.terms.map((term) => term.termId), ['2025-2026-1']);
});

test('grade commands return LOGIN_REQUIRED for CAS page', () => {
  const result = runGrade(['grade', 'list', '--json'], {
    env: {
      SZU_MOCK_GRADE_TEXT: '统一身份认证 账号登录 密码',
      SZU_MOCK_GRADE_URL: 'https://authserver.szu.edu.cn/authserver/login',
      SZU_MOCK_GRADE_TITLE: '统一身份认证'
    }
  });

  assert.equal(result.status, 11);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'LOGIN_REQUIRED');
});

test('grade commands return PERMISSION_DENIED for 403 page', () => {
  const result = runGrade(['grade', 'list', '--json'], {
    env: {
      SZU_MOCK_GRADE_STATUS: '403',
      SZU_MOCK_GRADE_TEXT: '403 版权信息'
    }
  });

  assert.equal(result.status, 13);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'PERMISSION_DENIED');
});
