import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildElectricityQueryPayload,
  normalizeCampusOptions,
  parseElectricityTableRows
} from '../src/modules/electricity-parser.js';

const usageHtml = readFileSync(new URL('./fixtures/electricity-usage.html', import.meta.url), 'utf8');

test('normalizes campus and building options', () => {
  const campuses = normalizeCampusOptions([
    {
      value: '192.168.84.87',
      text: '深大新斋区',
      buildings: [
        { value: '', text: '请选择' },
        { value: '18120', text: '红豆斋' }
      ]
    }
  ]);

  assert.deepEqual(campuses, [
    {
      name: '深大新斋区',
      client: '192.168.84.87',
      buildings: [
        {
          name: '红豆斋',
          id: '18120'
        }
      ]
    }
  ]);
});

test('parses electricity usage rows', () => {
  const records = parseElectricityTableRows(extractRows(usageHtml), 'usage');

  assert.deepEqual(records[0], {
    index: 1,
    room: '838',
    remainingKwh: 342.48,
    totalUsedKwh: 21421,
    totalPurchasedKwh: 21763.49,
    recordedAt: '2026-01-01 23:59:00'
  });
  assert.equal(records.length, 2);
});

test('builds query payload with latest usage record', () => {
  const payload = buildElectricityQueryPayload({
    campus: '深大新斋区',
    building: '红豆斋',
    room: '838',
    from: '2026-01-01',
    to: '2026-01-02',
    records: parseElectricityTableRows(extractRows(usageHtml), 'usage'),
    sourceUrl: 'http://192.168.84.3:9090/cgcSims/login.do'
  });

  assert.equal(payload.remainingKwh, 338.88);
  assert.equal(payload.latestRecord.recordedAt, '2026-01-02 23:59:01');
  assert.equal(payload.records.length, 2);
});

function extractRows(html) {
  return [...html.matchAll(/<tr>(.*?)<\/tr>/gs)].map((row) => (
    [...row[1].matchAll(/<td>(.*?)<\/td>/gs)].map((cell) => cell[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
  ));
}
