import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const api = readFileSync(new URL('./fixtures/program-api.json', import.meta.url), 'utf8');

function runProgram(args, options = {}) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      SZU_BROWSER_BACKEND: 'mock',
      SZU_MOCK_PROGRAM_API_JSON: api,
      SZU_MOCK_PROGRAM_TEXT: '深圳大学网上办事服务大厅 全校方案查询 培养方案 个人中心 安全退出',
      ...options.env
    }
  });
  rmSync(home, { recursive: true, force: true });
  return result;
}

test('program status reports eHall program readiness', () => {
  const result = runProgram(['program', 'status', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'program status');
  assert.equal(body.data.loggedIn, true);
  assert.equal(body.data.reason, 'ehall-program-page');
  assert.equal(body.data.total, 2);
});

test('program list returns normalized read-only programs', () => {
  const result = runProgram(['program', 'list', '--json', '--keyword', '计算机', '--grade', '2024']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'program list');
  assert.equal(body.data.items[0].title, '2025级汉语言文学（卓越班）主修培养方案');
  assert.deepEqual(body.data.filters, { keyword: '计算机', grade: '2024' });
  assert.equal(JSON.stringify(body.data).includes('2023000000'), false);
});

test('program item returns detail modules and courses', () => {
  const result = runProgram(['program', 'item', '2025-050101-01', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'program item');
  assert.equal(body.data.summary.planCode, '2025-050101-01');
  assert.equal(body.data.detail.trainingObjectives, '培养具备扎实中文基础和创新能力的人才。');
  assert.equal(body.data.modules[0].name, '通识模块');
  assert.equal(body.data.courses[0].courseName, '现代汉语');
  assert.equal(JSON.stringify(body.data).includes('2023000000'), false);
});

test('program item returns PROGRAM_NOT_FOUND for missing target', () => {
  const result = runProgram(['program', 'item', 'missing-plan', '--json'], {
    env: {
      SZU_MOCK_PROGRAM_API_JSON: JSON.stringify({
        programItem: {
          qxpyfacx: { datas: { qxpyfacx: { totalSize: 0, rows: [] } } },
          kzcx: { datas: { kzcx: { totalSize: 0, rows: [] } } },
          kzkccx: { datas: { kzkccx: { totalSize: 0, rows: [] } } }
        }
      })
    }
  });

  assert.equal(result.status, 23);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'PROGRAM_NOT_FOUND');
});

test('program commands return LOGIN_REQUIRED for CAS page', () => {
  const result = runProgram(['program', 'list', '--json'], {
    env: {
      SZU_MOCK_PROGRAM_TEXT: '统一身份认证 账号登录 密码',
      SZU_MOCK_PROGRAM_URL: 'https://authserver.szu.edu.cn/authserver/login',
      SZU_MOCK_PROGRAM_TITLE: '统一身份认证'
    }
  });

  assert.equal(result.status, 11);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'LOGIN_REQUIRED');
});

test('program commands return PERMISSION_DENIED for 403 page', () => {
  const result = runProgram(['program', 'list', '--json'], {
    env: {
      SZU_MOCK_PROGRAM_STATUS: '403',
      SZU_MOCK_PROGRAM_TEXT: '403 版权信息'
    }
  });

  assert.equal(result.status, 13);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'PERMISSION_DENIED');
});

test('program list rejects unknown options', () => {
  const result = runProgram(['program', 'list', '--json', '--bad']);

  assert.equal(result.status, 1);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'UNKNOWN_ERROR');
});

test('program item requires a plan id or planCode', () => {
  const result = runProgram(['program', 'item', '--json']);

  assert.equal(result.status, 1);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'UNKNOWN_ERROR');
});
