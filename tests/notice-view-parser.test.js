import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { parseNoticeDetailHtml, resolveNoticeViewUrl } from '../src/modules/notice-detail-parser.js';

const html = readFileSync(new URL('./fixtures/notice-view.html', import.meta.url), 'utf8');

test('resolves notice view id to canonical board URL', () => {
  assert.equal(
    resolveNoticeViewUrl('577444'),
    'https://www1.szu.edu.cn/board/view.asp?id=577444'
  );
});

test('accepts an absolute notice view URL', () => {
  assert.equal(
    resolveNoticeViewUrl('https://www1.szu.edu.cn/board/view.asp?id=577444'),
    'https://www1.szu.edu.cn/board/view.asp?id=577444'
  );
});

test('parses notice detail page into normalized detail data', () => {
  const detail = parseNoticeDetailHtml(html, {
    url: 'https://www1.szu.edu.cn/board/view.asp?id=577444'
  });

  assert.deepEqual(detail, {
    id: '577444',
    title: '深圳南特金融科技学院 2026届深圳大学本科毕业（学位）证书（第一批）领取安排',
    publisher: '深圳南特金融科技学院',
    publishedAt: '2026-06-22 10:30:00',
    contentText: '各位同学：\n请符合条件的毕业生按时领取毕业证书和学位证书。\n领取地点：汇元楼。\n附件：领取名单.docx\n附件：办理说明.pdf',
    attachments: [
      {
        index: 1,
        name: '领取名单.docx',
        url: 'https://www1.szu.edu.cn/board/uploadfiles/file.docx'
      },
      {
        index: 2,
        name: '办理说明.pdf',
        url: 'https://www1.szu.edu.cn/board/uploadfiles/guide.pdf'
      }
    ],
    url: 'https://www1.szu.edu.cn/board/view.asp?id=577444'
  });
});

test('parses legacy full-page notice detail without leaking chrome text', () => {
  const legacyHtml = `
    <html>
      <head><title>深圳南特金融科技学院 2026届深圳大学本科毕业（学位）证书（第一批）领取安排—深圳大学内部网</title></head>
      <body>
        <script>function getstr(str) { return str; }</script>
        <div>深大主页 English</div>
        <div>测试用户 2023000000 个人中心｜注销 ｜说明</div>
        <div>首页＞校园公文通</div>
        <div>关闭窗口｜打印张贴版</div>
        <table>
          <tr><td>深圳南特金融科技学院 2026届深圳大学本科毕业（学位）证书（第一批）领取安排</td></tr>
          <tr><td>金融科技学院 2026/6/22 19:21:00</td></tr>
          <tr><td>（测试用户 2023000000）</td></tr>
          <tr><td>根据学校规定及学院工作安排，证书领取安排如下：</td></tr>
          <tr><td>地点：汇星楼564办公室</td></tr>
          <tr><td>附件：</td></tr>
          <tr><td><a href="down1oad.asp?fn=file.doc">·深圳南特金融科技学院代领本科毕业证学位证委托书.doc</a></td></tr>
          <tr><td>撰稿：刘航 审核：祁涵</td></tr>
        </table>
        <div>版权所有©深圳大学信息中心</div>
        <script>var csdnScrollTop = function() {};</script>
      </body>
    </html>
  `;

  const detail = parseNoticeDetailHtml(legacyHtml, {
    url: 'https://www1.szu.edu.cn/board/view.asp?id=577444'
  });

  assert.equal(detail.title, '深圳南特金融科技学院 2026届深圳大学本科毕业（学位）证书（第一批）领取安排');
  assert.equal(detail.publisher, '金融科技学院');
  assert.equal(detail.publishedAt, '2026-06-22 19:21:00');
  assert.equal(
    detail.contentText,
    '根据学校规定及学院工作安排，证书领取安排如下：\n地点：汇星楼564办公室\n附件：\n·深圳南特金融科技学院代领本科毕业证学位证委托书.doc'
  );
  assert.equal(detail.attachments[0].index, 1);
  assert.equal(detail.attachments[0].url, 'https://www1.szu.edu.cn/board/down1oad.asp?fn=file.doc');
  assert.equal(detail.contentText.includes('2023000000'), false);
  assert.equal(detail.contentText.includes('function getstr'), false);
  assert.equal(detail.contentText.includes('深大主页'), false);
});
