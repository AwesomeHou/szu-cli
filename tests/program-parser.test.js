import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildProgramListForm, buildProgramPayload, parseProgramItems } from '../src/modules/program-parser.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/program-api.json', import.meta.url), 'utf8'));

test('parses program rows without leaking identity fields', () => {
  const items = parseProgramItems(fixture.qxpyfacx);

  assert.deepEqual(items[0], {
    id: 'program-001',
    planCode: '2025-050101-01',
    title: '2025级汉语言文学（卓越班）主修培养方案',
    grade: '2025',
    department: '人文学院',
    major: '汉语言文学（卓越班）',
    direction: '卓越班',
    minimumCredits: 160,
    durationYears: 4,
    degree: '文学学士',
    startYear: '2025-2026学年',
    startSemester: '第一学期',
    status: '99',
    published: true
  });
  assert.equal(JSON.stringify(items).includes('2023000000'), false);
  assert.equal(JSON.stringify(items).includes('测试用户'), false);
});

test('builds program payload with pagination metadata', () => {
  const payload = buildProgramPayload(fixture.qxpyfacx, {
    sourceUrl: 'mock',
    filters: { grade: '2025' }
  });

  assert.equal(payload.total, 2);
  assert.equal(payload.page, 1);
  assert.equal(payload.pageSize, 12);
  assert.equal(payload.items.length, 2);
  assert.deepEqual(payload.filters, { grade: '2025' });
});

test('builds program list form with default published filter and search fields', () => {
  const form = buildProgramListForm({
    keyword: '计算机',
    grade: '2024',
    department: '计算机与软件学院',
    major: '计算机科学与技术',
    page: 2,
    limit: 5
  });
  const conditions = JSON.parse(form.querySetting);

  assert.equal(form.pageNumber, '2');
  assert.equal(form.pageSize, '5');
  assert.deepEqual(conditions.map((item) => item.name), ['FAZTDM', 'PYFAMC', 'NJDM', 'DWDM_DISPLAY', 'ZYDM_DISPLAY']);
  assert.equal(conditions[0].value, '99');
});
