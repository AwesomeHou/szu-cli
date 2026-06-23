import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGradePayload,
  filterGradePayloadByTerm,
  parseGradeItems,
  summarizeGradeTerms
} from '../src/modules/grade-parser.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/grade-api.json', import.meta.url), 'utf8'));

test('parses grade rows without leaking identity fields', () => {
  const items = parseGradeItems(fixture.xscjcxtjgl);

  assert.deepEqual(items[0], {
    termId: '2025-2026-1',
    termName: '2025-2026学年第一学期',
    courseCode: '0902260001',
    courseName: '应用统计学',
    courseNatureCode: '02',
    courseNature: '选修',
    credit: 2,
    earnedCredit: 2,
    score: 'A+',
    gradePoint: 4.5,
    creditGradePoint: 9,
    section: '02',
    examDate: '2026-01-18',
    valid: true,
    rawId: '202520261090226000102'
  });
  assert.equal(JSON.stringify(items).includes('2023000000'), false);
  assert.equal(JSON.stringify(items).includes('测试用户'), false);
});

test('summarizes grade rows by term', () => {
  const terms = summarizeGradeTerms(parseGradeItems(fixture.xscjcxtjgl));

  assert.deepEqual(terms[0], {
    termId: '2025-2026-1',
    termName: '2025-2026学年第一学期',
    selectedCredits: 4,
    earnedCredits: 4,
    averageGradePoint: 3.75,
    percent: 100,
    itemCount: 2
  });
});

test('builds normalized grade payload', () => {
  const payload = buildGradePayload(fixture, {
    sourceUrl: 'https://ehall.szu.edu.cn/jwapp/sys/cjcx/*default/index.do?EMAP_LANG=zh&THEME=cherry#/cjcx'
  });

  assert.equal(payload.items.length, 3);
  assert.equal(payload.terms.length, 2);
  assert.equal(payload.sourceUrl.includes('/jwapp/sys/cjcx/'), true);
  assert.equal(JSON.stringify(payload).includes('XH'), false);
  assert.equal(JSON.stringify(payload).includes('XM'), false);
});

test('filters grade payload by term', () => {
  const payload = buildGradePayload(fixture, { sourceUrl: 'mock' });
  const filtered = filterGradePayloadByTerm(payload, '2025-2026-1');

  assert.deepEqual(filtered.items.map((item) => item.courseName), ['应用统计学', '线性代数']);
  assert.deepEqual(filtered.terms.map((term) => term.termId), ['2025-2026-1']);
});
