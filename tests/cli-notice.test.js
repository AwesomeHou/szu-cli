import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const html = readFileSync(new URL('./fixtures/board.html', import.meta.url), 'utf8');
const detailHtml = readFileSync(new URL('./fixtures/notice-view.html', import.meta.url), 'utf8');

function runNotice(args, text = html, detailText = detailHtml) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      SZU_BROWSER_BACKEND: 'mock',
      SZU_MOCK_NOTICE_HTML: text,
      SZU_MOCK_NOTICE_DETAIL_HTML: detailText
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

test('notice view prints JSON detail by id', () => {
  const result = runNotice(['notice', 'view', '577444', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'notice view');
  assert.equal(body.data.id, '577444');
  assert.equal(body.data.publisher, '深圳南特金融科技学院');
  assert.equal(body.data.attachments.length, 1);
});

test('notice view returns LOGIN_REQUIRED when mock detail page is CAS login', () => {
  const result = runNotice(
    ['notice', 'view', '577444', '--json'],
    html,
    '<html><head><title>统一身份认证</title></head><body>账号登录 密码</body></html>'
  );

  assert.equal(result.status, 11);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'LOGIN_REQUIRED');
});

test('notice download saves selected attachment through the backend', async () => {
  const outputDir = mkdtempSync(join(tmpdir(), 'szu-cli-download-'));
  const result = runNotice(['notice', 'download', '577444', '--dir', outputDir, '--json']);

  try {
    assert.equal(result.status, 0, result.stderr);
    const body = JSON.parse(result.stdout);
    assert.equal(body.ok, true);
    assert.equal(body.meta.command, 'notice download');
    assert.equal(body.data.id, '577444');
    assert.equal(body.data.attachment.name, '领取名单.docx');
    assert.equal(await readFile(body.data.savedPath, 'utf8'), 'mock attachment');
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
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
