import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSportsBookingsPayload,
  buildSportsCampusesPayload,
  buildSportsDatesPayload,
  buildSportsReserveDryRunPayload,
  buildSportsSlotsPayload,
  buildSportsVenuesPayload,
  parseSportsSnapshotFromText
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
  const payload = buildSportsReserveDryRunPayload(slots, '20:00-21:00', '一楼健身房');

  assert.equal(payload.wouldSubmit, true);
  assert.equal(payload.requiresConfirmation, true);
  assert.equal(payload.submitted, false);
  assert.equal(payload.selected.label, '20:00-21:00');
  assert.equal(payload.field.name, '一楼健身房');
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
  const payload = buildSportsReserveDryRunPayload(slots, '20:00-21:00', '一楼健身房');

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
test('sports parser extracts field choices from selected slot text', () => {
  const snapshot = parseSportsSnapshotFromText('选择场地\n一楼健身房(109/120)\n取消\n提交预约');

  assert.deepEqual(snapshot.fields, [{ name: '一楼健身房', label: '一楼健身房(109/120)', remaining: 109, capacity: 120 }]);
});

test('sports parser returns latest bookings with default limit shape', () => {
  const text = [
    '取消预约 | 未支付 | 详情\t202607091405161043\t2026-07-09 20:00~2026-07-09 21:00\t2026-07-09 14:05:16\t粤海校区\t运动广场西馆一楼健身房\t一楼健身房\t一楼重量型健身\t已预约\t2.0\t未支付\t预约人',
    '详情\t202606262325017026\t2026-06-27 09:00~2026-06-27 10:00\t2026-06-26 23:25:01\t粤海校区\t运动广场西馆一楼健身房\t一楼健身房\t一楼重量型健身\t取消预约\t2.0\t未支付取消预约，预约作废\t预约人',
    '2023096055',
    '测试用户'
  ].join('\n');
  const payload = buildSportsBookingsPayload({ text }, { sourceUrl: 'https://example.test/', limit: 1 });

  assert.equal(payload.items.length, 1);
  assert.deepEqual(payload.items[0], {
    actions: ['取消预约', '未支付', '详情'],
    orderNo: '202607091405161043',
    timeRange: '2026-07-09 20:00~2026-07-09 21:00',
    bookedAt: '2026-07-09 14:05:16',
    campus: '粤海校区',
    venue: '运动广场西馆一楼健身房',
    field: '一楼健身房',
    project: '一楼重量型健身',
    status: '已预约',
    orderType: '2.0',
    note: '未支付'
  });
  assert.equal(JSON.stringify(payload).includes('2023096055'), false);
  assert.equal(JSON.stringify(payload).includes('测试用户'), false);
});