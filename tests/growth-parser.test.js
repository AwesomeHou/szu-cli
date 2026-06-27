import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGrowthListPayload,
  buildGrowthPeriodForm,
  buildGrowthRankForm,
  buildGrowthSummaryForm,
  buildGrowthSummaryPayload,
  parseGrowthTerms
} from '../src/modules/growth-parser.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/growth-api.json', import.meta.url), 'utf8'));

test('parses available growth terms without identity fields', () => {
  const terms = parseGrowthTerms(fixture.cxyxkxnxq);

  assert.deepEqual(terms[0], {
    id: '2025-2026-1',
    name: '2025-2026学年第一学期',
    academicYear: '2025-2026',
    semester: '1'
  });
  assert.equal(JSON.stringify(terms).includes('2023000000'), false);
});

test('builds growth request forms for summary periods and ranks', () => {
  assert.deepEqual(buildGrowthSummaryForm('2023000000'), {
    XH: '2023000000',
    XNXQDM: '*',
    TJLX: '01'
  });
  assert.deepEqual(buildGrowthPeriodForm('2023000000', {
    periodId: '2025-2026-2',
    periodType: 'term'
  }), {
    XH: '2023000000',
    XNXQDM: '2025-2026-2',
    TJLX: '01'
  });
  assert.deepEqual(buildGrowthRankForm('2023000000', {
    termId: '2025-2026-2',
    periodType: 'academic-year'
  }), {
    TJXNXQDM: '2025-2026-2',
    XH: '2023000000',
    pageSize: '1',
    pageNumber: '1',
    TJLXDM: '02',
    '*order': '-TJSJ'
  });
});

test('builds cumulative growth summary without leaking identity', () => {
  const payload = buildGrowthSummaryPayload(fixture, { sourceUrl: 'mock' });

  assert.deepEqual(payload.cumulative, {
    gpa: 3.75,
    majorRank: 8,
    rankedStudentCount: 80,
    rankPercent: 10,
    rankBand: '前10%',
    earnedCredits: 120,
    selectedCredits: 124
  });
  assert.equal(payload.latestTerm.id, '2025-2026-2');
  assert.equal(payload.sourceUrl, 'mock');
  assert.equal(JSON.stringify(payload).includes('2023000000'), false);
  assert.equal(JSON.stringify(payload).includes('测试用户'), false);
});

test('builds term and academic-year growth items', () => {
  const payload = buildGrowthListPayload(fixture, { sourceUrl: 'mock' });

  assert.equal(payload.items.length, 2);
  assert.deepEqual(payload.items[0], {
    periodType: 'term',
    periodId: '2025-2026-2',
    periodName: '2025-2026学年第二学期',
    gpa: 3.8,
    majorRank: 6,
    rankedStudentCount: 80,
    rankPercent: 7.5,
    rankBand: '前10%',
    earnedCredits: 24,
    selectedCredits: 26
  });
  assert.equal(payload.items[1].periodType, 'academic-year');
  assert.equal(JSON.stringify(payload).includes('XH'), false);
  assert.equal(JSON.stringify(payload).includes('XM'), false);
});

test('filters growth items by term or academic year', () => {
  const term = buildGrowthListPayload(fixture, {
    sourceUrl: 'mock',
    term: '2025-2026-2'
  });
  const year = buildGrowthListPayload(fixture, {
    sourceUrl: 'mock',
    year: '2025-2026'
  });

  assert.deepEqual(term.items.map((item) => item.periodId), ['2025-2026-2']);
  assert.deepEqual(year.items.map((item) => item.periodId), ['2025-2026']);
});
