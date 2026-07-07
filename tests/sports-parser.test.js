import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSportsCampusesPayload,
  buildSportsDatesPayload,
  buildSportsReserveDryRunPayload,
  buildSportsSlotsPayload,
  buildSportsVenuesPayload
} from '../src/modules/sports-parser.js';

const snapshot = {
  campuses: ['粤海校区', '丽湖校区'],
  venues: [
    { campus: '粤海校区', name: '一楼重量型健身', category: '健身', bookable: true },
    { campus: '粤海校区', name: '二楼有氧健身', category: '健身', bookable: true }
  ],
  dates: ['2026-07-07', '2026-07-08'],
  slotsByDate: {
    '2026-07-07': [{ label: '19:00-20:00(已过期)' }],
    '2026-07-08': [{ label: '20:00-21:00(可预约)', remaining: 3 }]
  },
  slots: [
    { label: '08:00-09:00(已过期)', place: '运动广场西馆一楼健身房' },
    { label: '19:00-20:00', place: '运动广场西馆一楼健身房', remaining: 0 },
    { label: '20:00-21:00', place: '运动广场西馆一楼健身房', remaining: 3 }
  ],
  studentId: '2023000000',
  name: '测试用户',
  department: '土木与交通工程学院'
};

test('sports parser returns campuses without identity fields', () => {
  const payload = buildSportsCampusesPayload(snapshot, { sourceUrl: 'https://example.test/' });

  assert.deepEqual(payload.items, [{ name: '粤海校区' }, { name: '丽湖校区' }]);
  assert.equal(JSON.stringify(payload).includes('2023000000'), false);
  assert.equal(JSON.stringify(payload).includes('测试用户'), false);
});

test('sports parser returns venues for a campus', () => {
  const payload = buildSportsVenuesPayload(snapshot, {
    campus: '粤海校区',
    sourceUrl: 'https://example.test/'
  });

  assert.equal(payload.items.length, 2);
  assert.equal(payload.items[0].name, '一楼重量型健身');
  assert.equal(payload.items[0].bookable, true);
});

test('sports parser marks expired and full slots unavailable', () => {
  const payload = buildSportsSlotsPayload(snapshot, {
    campus: '粤海校区',
    venue: '一楼重量型健身',
    date: '2026-07-08',
    sourceUrl: 'https://example.test/'
  });

  assert.equal(payload.items[0].expired, true);
  assert.equal(payload.items[0].selectable, false);
  assert.equal(payload.items[1].remaining, 0);
  assert.equal(payload.items[1].selectable, false);
  assert.equal(payload.items[2].selectable, true);
});

test('sports reserve dry-run does not submit and requires confirmation', () => {
  const slots = buildSportsSlotsPayload(snapshot, {
    campus: '粤海校区',
    venue: '一楼重量型健身',
    date: '2026-07-08',
    sourceUrl: 'https://example.test/'
  });
  const payload = buildSportsReserveDryRunPayload(slots, '20:00-21:00');

  assert.equal(payload.wouldSubmit, true);
  assert.equal(payload.requiresConfirmation, true);
  assert.equal(payload.submitted, false);
  assert.equal(payload.selected.label, '20:00-21:00');
});

test('sports reserve dry-run accepts a slot time without status suffix', () => {
  const slots = buildSportsSlotsPayload({
    dates: ['2026-07-07', '2026-07-08'],
  slotsByDate: {
    '2026-07-07': [{ label: '19:00-20:00(已过期)' }],
    '2026-07-08': [{ label: '20:00-21:00(可预约)', remaining: 3 }]
  },
  slots: [{ label: '20:00-21:00(可预约)' }]
  }, {
    campus: '粤海校区',
    venue: '一楼重量型健身',
    date: '2026-07-08'
  });
  const payload = buildSportsReserveDryRunPayload(slots, '20:00-21:00');

  assert.equal(payload.selected.label, '20:00-21:00(可预约)');
});
test('sports parser returns open dates', () => {
  const payload = buildSportsDatesPayload(snapshot, {
    campus: '粤海校区',
    venue: '一楼重量型健身',
    sourceUrl: 'https://example.test/'
  });

  assert.deepEqual(payload.items, [{ date: '2026-07-07' }, { date: '2026-07-08' }]);
});