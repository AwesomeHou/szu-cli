import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const api = readFileSync(new URL('./fixtures/ideology-api.json', import.meta.url), 'utf8');

function runIdeology(args, options = {}) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      SZU_BROWSER_BACKEND: 'mock',
      SZU_MOCK_IDEOLOGY_API_JSON: api,
      SZU_MOCK_IDEOLOGY_TEXT: '深圳大学网上办事服务大厅 思政与社会实践 个人中心 安全退出',
      ...options.env
    }
  });
  rmSync(home, { recursive: true, force: true });
  return result;
}

test('ideology status reports eHall ideology readiness', () => {
  const result = runIdeology(['ideology', 'status', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.loggedIn, true);
  assert.equal(body.data.reason, 'ehall-ideology-page');
  assert.equal(body.data.available, true);
  assert.equal(body.meta.command, 'ideology status');
});

test('ideology summary returns normalized earned credits', () => {
  const result = runIdeology(['ideology', 'summary', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.earnedCredits, 2);
  assert.equal(body.data.qualified, true);
  assert.equal(body.data.major, '交通工程');
  assert.equal(JSON.stringify(body.data).includes('2023000000'), false);
  assert.equal(JSON.stringify(body.data).includes('测试用户'), false);
});

test('ideology summary returns available false for an empty summary', () => {
  const result = runIdeology(['ideology', 'summary', '--json'], {
    env: {
      SZU_MOCK_IDEOLOGY_API_JSON: JSON.stringify({
        cxxshdtjlb: {
          datas: {
            cxxshdtjlb: {
              rows: []
            }
          }
        }
      })
    }
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).data.available, false);
});

test('ideology commands return LOGIN_REQUIRED for CAS page', () => {
  const result = runIdeology(['ideology', 'summary', '--json'], {
    env: {
      SZU_MOCK_IDEOLOGY_TEXT: '统一身份认证 账号登录 密码',
      SZU_MOCK_IDEOLOGY_URL: 'https://authserver.szu.edu.cn/authserver/login',
      SZU_MOCK_IDEOLOGY_TITLE: '统一身份认证'
    }
  });

  assert.equal(result.status, 11);
  assert.equal(JSON.parse(result.stdout).error.code, 'LOGIN_REQUIRED');
});

test('ideology commands return PERMISSION_DENIED for 403 page', () => {
  const result = runIdeology(['ideology', 'summary', '--json'], {
    env: {
      SZU_MOCK_IDEOLOGY_STATUS: '403',
      SZU_MOCK_IDEOLOGY_TEXT: '403 版权信息'
    }
  });

  assert.equal(result.status, 13);
  assert.equal(JSON.parse(result.stdout).error.code, 'PERMISSION_DENIED');
});

test('ideology commands return PAGE_CHANGED when the API response is missing', () => {
  const result = runIdeology(['ideology', 'summary', '--json'], {
    env: {
      SZU_MOCK_IDEOLOGY_API_JSON: '{}'
    }
  });

  assert.equal(result.status, 20);
  assert.equal(JSON.parse(result.stdout).error.code, 'PAGE_CHANGED');
});

test('ideology commands reject unknown options', () => {
  const result = runIdeology(['ideology', 'summary', '--bad', '--json']);

  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stdout).error.message, /Unknown option/);
});
