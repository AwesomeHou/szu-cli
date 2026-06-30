import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { filterNotices, parseBoardHtml, parseNoticeListHtml, paginateNotices } from '../src/modules/notice-parser.js';

const html = readFileSync(new URL('./fixtures/board.html', import.meta.url), 'utf8');
const listHtml = readFileSync(new URL('./fixtures/notice-list.html', import.meta.url), 'utf8');

test('parses board html into normalized notices', () => {
  const notices = parseBoardHtml(html, {
    baseUrl: 'https://www1.szu.edu.cn/board/',
    now: new Date('2026-06-22T12:00:00+08:00')
  });

  assert.equal(notices.length, 3);
  assert.deepEqual(notices[0], {
    id: '577437',
    category: '教务教学',
    title: '心理学院青年教师孙熔茜“薪火计划”公开课',
    dateText: '6/22',
    date: '2026-06-22',
    time: null,
    url: 'https://www1.szu.edu.cn/board/view.asp?id=577437'
  });
});

test('uses title attribute when visible title is truncated', () => {
  const notices = parseBoardHtml(html, {
    baseUrl: 'https://www1.szu.edu.cn/board/',
    now: new Date('2026-06-22T12:00:00+08:00')
  });

  assert.equal(
    notices[1].title,
    '【行业前沿】医学部领航讲座《Researcher Founder 研究型创业者：从 -1 到 1——深圳长大的未来产业创业者感悟》'
  );
});

test('parses lecture time while keeping visible lecture title', () => {
  const notices = parseBoardHtml(html, {
    baseUrl: 'https://www1.szu.edu.cn/board/',
    now: new Date('2026-06-22T12:00:00+08:00')
  });

  assert.deepEqual(notices[2], {
    id: '577043',
    category: '学术讲座',
    title: '粤海｜校友广场｜深大讲坛第224讲：模形式的算术',
    dateText: '6/23 8:30',
    date: '2026-06-23',
    time: '08:30',
    url: 'https://www1.szu.edu.cn/board/view.asp?id=577043'
  });
});

test('filters notices by keyword and limit', () => {
  const notices = parseBoardHtml(html, {
    baseUrl: 'https://www1.szu.edu.cn/board/',
    now: new Date('2026-06-22T12:00:00+08:00')
  });

  const filtered = filterNotices(notices, { keyword: '讲座', limit: 1 });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, '576900');
});

test('every parsed notice contains the complete public schema', () => {
  const notices = parseBoardHtml(html, {
    baseUrl: 'https://www1.szu.edu.cn/board/',
    now: new Date('2026-06-22T12:00:00+08:00')
  });

  for (const notice of notices) {
    assert.deepEqual(Object.keys(notice), [
      'id',
      'category',
      'title',
      'dateText',
      'date',
      'time',
      'url'
    ]);
    assert.equal(typeof notice.id, 'string');
    assert.equal(typeof notice.category, 'string');
    assert.equal(typeof notice.title, 'string');
    assert.equal(typeof notice.dateText, 'string');
    assert.equal(typeof notice.date, 'string');
    assert.equal(typeof notice.url, 'string');
    assert.equal(Object.hasOwn(notice, 'time'), true);
  }
});

test('parses infolist table notices with publisher and attachment flag', () => {
  const notices = parseNoticeListHtml(listHtml, {
    baseUrl: 'https://www1.szu.edu.cn/board/'
  });

  assert.equal(notices.length, 4);
  assert.deepEqual(notices[2], {
    id: '577444',
    category: '教务',
    publisher: '金融科技学院',
    title: '深圳南特金融科技学院 2026届深圳大学本科毕业证书领取安排',
    dateText: '2026-6-22',
    date: '2026-06-22',
    time: null,
    isPinned: false,
    hasAttachment: true,
    url: 'https://www1.szu.edu.cn/board/view.asp?id=577444'
  });
});

test('paginates notices by page and pages', () => {
  const notices = parseNoticeListHtml(listHtml, {
    baseUrl: 'https://www1.szu.edu.cn/board/'
  });

  assert.deepEqual(paginateNotices(notices, { page: 2, pages: 1, limit: 2 }).map((notice) => notice.id), ['577444', '577085']);
  assert.deepEqual(paginateNotices(notices, { page: 1, pages: 2, limit: 2 }).map((notice) => notice.id), ['577164', '577097', '577444', '577085']);
});
