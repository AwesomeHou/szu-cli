import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildClassLookupForm,
  buildClassListForm,
  buildTimetableClassesPayload,
  buildTimetableViewPayload,
  parseClassItems,
  parseTimetableTerm
} from '../src/modules/timetable-parser.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/timetable-api.json', import.meta.url), 'utf8'));

test('parses timetable current term from xtcscx response', () => {
  assert.deepEqual(parseTimetableTerm(fixture.xtcscx), {
    id: '2025-2026-2',
    name: '2025-2026学年第二学期',
    year: '2025-2026',
    semester: '2',
    currentWeek: null
  });
});

test('parses class rows without leaking identity fields', () => {
  const items = parseClassItems(fixture.bjcx);

  assert.deepEqual(items[0], {
    classCode: '20250101100101',
    className: '2025汉语言文学（卓越班）01',
    grade: '2025',
    department: '人文学院',
    major: '汉语言文学（卓越班）',
    studentCount: 30,
    scheduled: true
  });
  assert.equal(JSON.stringify(items).includes('2023000000'), false);
  assert.equal(JSON.stringify(items).includes('测试用户'), false);
});

test('builds timetable class list form with filters', () => {
  const form = buildClassListForm({
    term: '2025-2026-2',
    keyword: '汉语言',
    grade: '2025',
    department: '人文',
    major: '汉语言文学',
    page: 2,
    limit: 5
  });
  const conditions = JSON.parse(form.querySetting);

  assert.equal(form.XNXQDM, '2025-2026-2');
  assert.equal(form.pageNumber, '2');
  assert.equal(form.pageSize, '5');
  assert.deepEqual(conditions.map((item) => item.name), ['BJMC', 'NJ', 'YXDM_DISPLAY', 'ZYDM_DISPLAY']);
});

test('builds exact class lookup form for timetable view', () => {
  const form = buildClassLookupForm({
    term: '2025-2026-2',
    classCode: '20250101100101'
  });
  const conditions = JSON.parse(form.querySetting);

  assert.equal(form.XNXQDM, '2025-2026-2');
  assert.equal(form.pageNumber, '1');
  assert.equal(form.pageSize, '1');
  assert.deepEqual(conditions[0], {
    name: 'BJDM',
    caption: '',
    builder: 'equal',
    linkOpt: 'AND',
    value: '20250101100101'
  });
});

test('builds timetable classes payload', () => {
  const payload = buildTimetableClassesPayload({ xtcscx: fixture.xtcscx, bjcx: fixture.bjcx }, { sourceUrl: 'mock' });

  assert.equal(payload.term.id, '2025-2026-2');
  assert.equal(payload.total, 2);
  assert.equal(payload.items.length, 2);
});

test('builds timetable view payload with normalized course items', () => {
  const payload = buildTimetableViewPayload(fixture, {
    classInfo: parseClassItems(fixture.bjcx)[0],
    classCode: '20250101100101',
    sourceUrl: 'mock'
  });

  assert.equal(payload.class.classCode, '20250101100101');
  assert.equal(payload.term.currentWeek, 16);
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].courseName, '新编英语报刊选读');
  assert.equal(payload.extraItems.adjusted.length, 1);
  assert.equal(payload.extraItems.adjusted[0].courseName, '大学英语（2）');
  assert.equal(payload.extraItems.unlisted.length, 1);
  assert.equal(JSON.stringify(payload).includes('2023000000'), false);
});
