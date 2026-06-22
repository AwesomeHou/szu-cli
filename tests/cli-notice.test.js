import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const html = readFileSync(new URL('./fixtures/board.html', import.meta.url), 'utf8');

function runNotice(args, text = html) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      SZU_BROWSER_BACKEND: 'mock',
      SZU_MOCK_NOTICE_HTML: text
    }
  });
  rmSync(home, { recursive: true, force: true });
  return result;
}

test('notice list prints JSON items from mock board page', () => {
  const result = runNotice(['notice', 'list', '--json', '--limit', '2']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'notice list');
  assert.equal(body.data.items.length, 2);
  assert.equal(body.data.items[0].id, '577437');
});

test('notice search filters JSON items by keyword', () => {
  const result = runNotice(['notice', 'search', 'Researcher', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'notice search');
  assert.equal(body.data.items.length, 1);
  assert.equal(body.data.items[0].id, '576900');
});

test('notice list returns LOGIN_REQUIRED when mock page is CAS login', () => {
  const result = runNotice(['notice', 'list', '--json'], '<html><head><title>统一身份认证</title></head><body>账号登录 密码</body></html>');

  assert.equal(result.status, 11);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'LOGIN_REQUIRED');
});
