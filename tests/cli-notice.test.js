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
const listHtml = readFileSync(new URL('./fixtures/notice-list.html', import.meta.url), 'utf8');
const detailHtml = readFileSync(new URL('./fixtures/notice-view.html', import.meta.url), 'utf8');
const publisherListHtml = `<!doctype html>
<html>
<head><title>校园公文通</title></head>
<body>
  <div>匿名用户 个人中心｜注销 ｜说明</div>
  <div>2026年｜指定单位｜关键字“无”｜共2条</div>
  <table>
    <tr><td>序号</td><td>类别</td><td>发文单位</td><td>标题</td><td></td><td>日期</td></tr>
    <tr>
      <td>1</td><td>讲座</td><td>土木与交通工程学院</td>
      <td><b>·</b>&nbsp;<a href="view.asp?id=577567">【2026南山讲坛】第24场：新型钢-混组合结构设计理论与智能建造</a></td>
      <td></td><td>2026-6-23</td>
    </tr>
    <tr>
      <td>2</td><td>讲座</td><td>土木与交通工程学院</td>
      <td><b>·</b>&nbsp;<a href="view.asp?id=577300">【2026南山讲坛】第23场：废弃物基工程生物炭</a></td>
      <td></td><td>2026-6-23</td>
    </tr>
  </table>
</body>
</html>`;
const keywordSearchHtml = `<!doctype html>
<html>
<head><title>校园公文通</title></head>
<body>
  <div>匿名用户 个人中心｜注销 ｜说明</div>
  <div>标题关键字“奖学金”｜共1条</div>
  <table>
    <tr><td>序号</td><td>类别</td><td>发文单位</td><td>标题</td><td></td><td>日期</td></tr>
    <tr>
      <td>1</td><td>学工</td><td>学生部</td>
      <td><b>·</b>&nbsp;<a href="view.asp?id=577085">【资助工作】关于启动深圳大学2026年应届本科毕业生奖学金评定工作的通知</a></td>
      <td></td><td>2026-6-17</td>
    </tr>
  </table>
</body>
</html>`;

function runNotice(args, text = html, detailText = detailHtml, listText = listHtml) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      SZU_BROWSER_BACKEND: 'mock',
      SZU_MOCK_NOTICE_HTML: text,
      SZU_MOCK_NOTICE_DETAIL_HTML: detailText,
      SZU_MOCK_NOTICE_LIST_HTML: listText,
      SZU_MOCK_NOTICE_SEARCH_HTML: listText
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
  assert.equal(body.data.items[0].id, '577164');
  assert.equal(body.data.items[0].isPinned, true);
});

test('notice view prints JSON detail by id', () => {
  const result = runNotice(['notice', 'view', '577444', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'notice view');
  assert.equal(body.data.id, '577444');
  assert.equal(body.data.publisher, '深圳南特金融科技学院');
  assert.equal(body.data.attachments.length, 2);
  assert.equal(body.data.attachments[0].index, 1);
  assert.equal(body.data.attachments[1].index, 2);
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

test('notice search uses site search source by default', () => {
  const result = runNotice(['notice', 'search', '奖学金', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'notice search');
  assert.equal(body.data.search.keyword, '奖学金');
  assert.equal(body.data.search.range, '6m');
  assert.equal(body.data.search.type, 'full');
  assert.equal(body.data.items.length, 4);
  assert.equal(body.data.items[3].id, '577085');
});

test('notice list supports page and pages over infolist results', () => {
  const result = runNotice(['notice', 'list', '--json', '--page', '2', '--pages', '1', '--limit', '2']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.data.items.length, 2);
  assert.deepEqual(body.data.items.map((item) => item.id), ['577444', '577085']);
  assert.equal(body.data.page, 2);
  assert.equal(body.data.pages, 1);
  assert.equal(body.data.total, 4);
});

test('notice list filters by category and keyword', () => {
  const category = runNotice(['notice', 'list', '--category', '教务', '--json']);
  const keyword = runNotice(['notice', 'list', '--keyword', '奖学金', '--json'], html, detailHtml, keywordSearchHtml);

  assert.equal(category.status, 0, category.stderr);
  assert.equal(keyword.status, 0, keyword.stderr);
  assert.deepEqual(JSON.parse(category.stdout).data.items.map((item) => item.category), ['教务', '教务']);
  assert.deepEqual(JSON.parse(keyword.stdout).data.items.map((item) => item.id), ['577085']);
});

test('notice list filters pinned notices', () => {
  const result = runNotice(['notice', 'list', '--category', '置顶', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.deepEqual(body.data.items.map((item) => item.id), ['577164', '577097']);
  assert.equal(body.data.search.category, '置顶');
});

test('notice search uses site search result source and then paginates', () => {
  const result = runNotice(['notice', 'search', '奖学金', '--json', '--limit', '1', '--page', '2', '--range', '6m', '--type', 'full']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'notice search');
  assert.equal(body.data.search.keyword, '奖学金');
  assert.equal(body.data.search.range, '6m');
  assert.equal(body.data.search.type, 'full');
  assert.deepEqual(body.data.items.map((item) => item.id), ['577097']);
});

test('notice list supports publisher search source without a keyword', () => {
  const result = runNotice(
    ['notice', 'list', '--publisher', '土木与交通工程学院', '--year', '2026', '--json', '--limit', '2'],
    html,
    detailHtml,
    publisherListHtml
  );

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'notice list');
  assert.equal(body.data.search.keyword, null);
  assert.equal(body.data.search.publisher, '土木与交通工程学院');
  assert.equal(body.data.search.year, '2026');
  assert.deepEqual(body.data.items.map((item) => item.id), ['577567', '577300']);
});

test('notice search supports publisher without a keyword', () => {
  const result = runNotice(
    ['notice', 'search', '--publisher', '土木与交通工程学院', '--json', '--limit', '1'],
    html,
    detailHtml,
    publisherListHtml
  );

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'notice search');
  assert.equal(body.data.search.keyword, null);
  assert.equal(body.data.search.publisher, '土木与交通工程学院');
  assert.equal(body.data.items.length, 1);
  assert.equal(body.data.items[0].title.includes('土木与交通工程学院'), false);
});

test('notice list returns LOGIN_REQUIRED when mock page is CAS login', () => {
  const cas = '<html><head><title>统一身份认证</title></head><body>账号登录 密码</body></html>';
  const result = runNotice(['notice', 'list', '--json'], html, detailHtml, cas);

  assert.equal(result.status, 11);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'LOGIN_REQUIRED');
});
