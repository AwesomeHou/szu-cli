import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCoursePayload,
  filterCoursePayload,
  filterTodayCourses,
  parseCourseItems,
  parseCurrentTerm,
  parseCurrentWeek
} from '../src/modules/course-parser.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/course-api.json', import.meta.url), 'utf8'));

test('parses current term from dqxnxq response', () => {
  assert.deepEqual(parseCurrentTerm(fixture.dqxnxq), {
    id: '2025-2026-2',
    name: '2025-2026学年第二学期',
    year: '2025-2026',
    semester: '2',
    currentWeek: null
  });
});

test('filters course payload by week and weekday', () => {
  const payload = buildCoursePayload(fixture, { sourceUrl: 'mock' });
  const filtered = filterCoursePayload(payload, { week: 17, weekday: 2 });

  assert.deepEqual(filtered.filters, { week: 17, weekday: 2 });
  assert.deepEqual(filtered.items.map((item) => item.courseName), ['交通设计与管控']);
});

test('parses current week from dqzc response', () => {
  assert.equal(parseCurrentWeek(fixture.dqzc), 16);
});

test('parses course rows without leaking identity fields', () => {
  const items = parseCourseItems(fixture.xskcb);

  assert.deepEqual(items[0], {
    courseCode: '0901970032',
    courseName: '交通设计与管控',
    section: '01',
    teachers: ['王京元', '刘明辉'],
    weeksText: '1-17周',
    weekday: 2,
    startSection: 3,
    endSection: 4,
    location: '致理楼L3-416',
    campus: '01',
    rawId: '202520262090197003201'
  });
  assert.equal(JSON.stringify(items).includes('XH'), false);
  assert.equal(JSON.stringify(items).includes('测试用户'), false);
});

test('builds normalized course payload with extra items', () => {
  const payload = buildCoursePayload(fixture, {
    sourceUrl: 'https://ehall.szu.edu.cn/jwapp/sys/wdkb/*default/index.do?EMAP_LANG=zh&THEME=cherry#/xskcb'
  });

  assert.equal(payload.term.currentWeek, 16);
  assert.equal(payload.items.length, 3);
  assert.equal(payload.extraItems.adjusted.length, 1);
  assert.deepEqual(payload.extraItems.adjusted[0], {
    courseCode: '0901970083',
    courseName: '图像处理',
    section: '01',
    weeksText: '6周',
    weekday: 1,
    startSection: 3,
    endSection: 5,
    newWeeksText: '6周',
    newWeekday: 5,
    newStartSection: 3,
    newEndSection: 5,
    rawId: '202520262090197008301'
  });
  assert.equal(payload.extraItems.unlisted.length, 0);
  assert.equal(payload.extraItems.practice.length, 0);
  assert.equal(JSON.stringify(payload.extraItems).includes('2023000154'), false);
});

test('filters today courses by weekday and current week', () => {
  const payload = buildCoursePayload(fixture, { sourceUrl: 'mock' });
  const today = filterTodayCourses(payload, new Date('2026-06-22T12:00:00+08:00'));

  assert.equal(today.date, '2026-06-22');
  assert.equal(today.weekday, 1);
  assert.equal(today.currentWeek, 16);
  assert.deepEqual(today.items.map((item) => item.courseName), ['图像处理']);
});
