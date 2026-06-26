import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const api = readFileSync(new URL('./fixtures/timetable-api.json', import.meta.url), 'utf8');

function runTimetable(args, options = {}) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      SZU_BROWSER_BACKEND: 'mock',
      SZU_MOCK_TIMETABLE_API_JSON: api,
      SZU_MOCK_TIMETABLE_TEXT: '深圳大学网上办事服务大厅 全校课表查询 班级课程表 个人中心 安全退出',
      ...options.env
    }
  });
  rmSync(home, { recursive: true, force: true });
  return result;
}

test('timetable status reports class timetable readiness', () => {
  const result = runTimetable(['timetable', 'status', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'timetable status');
  assert.equal(body.data.loggedIn, true);
  assert.equal(body.data.reason, 'ehall-timetable-page');
  assert.equal(body.data.term.id, '2025-2026-2');
});

test('timetable classes returns normalized class rows', () => {
  const result = runTimetable(['timetable', 'classes', '--json', '--keyword', '汉语言', '--grade', '2025']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'timetable classes');
  assert.equal(body.data.items[0].classCode, '20250101100101');
  assert.deepEqual(body.data.filters, { keyword: '汉语言', grade: '2025' });
  assert.equal(JSON.stringify(body.data).includes('2023000000'), false);
});

test('timetable view returns class timetable items', () => {
  const result = runTimetable(['timetable', 'view', '20250101100101', '--json', '--term', '2025-2026-2']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'timetable view');
  assert.equal(body.data.class.className, '2025汉语言文学（卓越班）01');
  assert.deepEqual(body.data.items.map((item) => item.courseName), ['新编英语报刊选读']);
  assert.deepEqual(body.data.extraItems.adjusted.map((item) => item.courseName), ['大学英语（2）']);
});

test('timetable view returns CLASS_NOT_FOUND for unknown classCode', () => {
  const result = runTimetable(['timetable', 'view', 'missing-class', '--json']);

  assert.equal(result.status, 22);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'CLASS_NOT_FOUND');
});

test('timetable commands return LOGIN_REQUIRED for CAS page', () => {
  const result = runTimetable(['timetable', 'classes', '--json'], {
    env: {
      SZU_MOCK_TIMETABLE_TEXT: '统一身份认证 账号登录 密码',
      SZU_MOCK_TIMETABLE_URL: 'https://authserver.szu.edu.cn/authserver/login',
      SZU_MOCK_TIMETABLE_TITLE: '统一身份认证'
    }
  });

  assert.equal(result.status, 11);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'LOGIN_REQUIRED');
});

test('timetable commands return PERMISSION_DENIED for 403 page', () => {
  const result = runTimetable(['timetable', 'classes', '--json'], {
    env: {
      SZU_MOCK_TIMETABLE_STATUS: '403',
      SZU_MOCK_TIMETABLE_TEXT: '403 版权信息'
    }
  });

  assert.equal(result.status, 13);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'PERMISSION_DENIED');
});
