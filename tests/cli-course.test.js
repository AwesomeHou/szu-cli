import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const api = readFileSync(new URL('./fixtures/course-api.json', import.meta.url), 'utf8');

function runCourse(args, options = {}) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      SZU_BROWSER_BACKEND: 'mock',
      SZU_MOCK_COURSE_API_JSON: api,
      SZU_MOCK_COURSE_TEXT: '深圳大学网上办事服务大厅 我的课程表 个人中心 安全退出',
      SZU_MOCK_TODAY: '2026-06-22T12:00:00+08:00',
      ...options.env
    }
  });
  rmSync(home, { recursive: true, force: true });
  return result;
}

test('course status reports ehall course readiness', () => {
  const result = runCourse(['course', 'status', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'course status');
  assert.equal(body.data.loggedIn, true);
  assert.equal(body.data.reason, 'ehall-course-page');
  assert.equal(body.data.term.id, '2025-2026-2');
});

test('course list returns normalized read-only timetable', () => {
  const result = runCourse(['course', 'list', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'course list');
  assert.equal(body.data.term.currentWeek, 16);
  assert.equal(body.data.items.length, 3);
  assert.equal(body.data.items[0].courseName, '交通设计与管控');
  assert.equal(JSON.stringify(body.data).includes('2023000000'), false);
});

test('course today returns only matching weekday courses', () => {
  const result = runCourse(['course', 'today', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'course today');
  assert.equal(body.data.date, '2026-06-22');
  assert.deepEqual(body.data.items.map((item) => item.courseName), ['图像处理']);
});

test('course list can filter by week and weekday', () => {
  const result = runCourse(['course', 'list', '--week', '17', '--weekday', '2', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.deepEqual(body.data.filters, { week: 17, weekday: 2 });
  assert.deepEqual(body.data.items.map((item) => item.courseName), ['交通设计与管控']);
});

test('course today can use an explicit date', () => {
  const result = runCourse(['course', 'today', '--date', '2026-06-23', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.date, '2026-06-23');
  assert.deepEqual(body.data.items.map((item) => item.courseName), ['交通设计与管控']);
});

test('course commands return LOGIN_REQUIRED for CAS page', () => {
  const result = runCourse(['course', 'list', '--json'], {
    env: {
      SZU_MOCK_COURSE_TEXT: '统一身份认证 账号登录 密码',
      SZU_MOCK_COURSE_URL: 'https://authserver.szu.edu.cn/authserver/login',
      SZU_MOCK_COURSE_TITLE: '统一身份认证'
    }
  });

  assert.equal(result.status, 11);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'LOGIN_REQUIRED');
});

test('course commands return PERMISSION_DENIED for 403 page', () => {
  const result = runCourse(['course', 'list', '--json'], {
    env: {
      SZU_MOCK_COURSE_STATUS: '403',
      SZU_MOCK_COURSE_TEXT: '403 版权信息'
    }
  });

  assert.equal(result.status, 13);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'PERMISSION_DENIED');
});
