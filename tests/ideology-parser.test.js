import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildIdeologySummaryPayload } from '../src/modules/ideology-parser.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/ideology-api.json', import.meta.url), 'utf8'));

test('builds ideology credit summary without leaking identity fields', () => {
  const payload = buildIdeologySummaryPayload(fixture, { sourceUrl: 'mock' });

  assert.deepEqual(payload, {
    available: true,
    earnedCredits: 2,
    qualified: true,
    registered: true,
    activeStudent: true,
    grade: '2023',
    major: '交通工程',
    department: '交通运输学院',
    sourceUrl: 'mock'
  });
  assert.equal(JSON.stringify(payload).includes('2023000000'), false);
  assert.equal(JSON.stringify(payload).includes('测试用户'), false);
  assert.equal(JSON.stringify(payload).includes('internal-record'), false);
});

test('returns an unavailable ideology summary for empty rows', () => {
  const payload = buildIdeologySummaryPayload({
    cxxshdtjlb: {
      datas: {
        cxxshdtjlb: {
          rows: []
        }
      }
    }
  }, { sourceUrl: 'mock' });

  assert.deepEqual(payload, {
    available: false,
    earnedCredits: null,
    qualified: null,
    registered: null,
    activeStudent: null,
    grade: null,
    major: null,
    department: null,
    sourceUrl: 'mock'
  });
});
