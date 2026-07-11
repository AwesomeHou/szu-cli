import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const snapshot = {
  campuses: ['粤海校区', '丽湖校区'],
  venues: [
    { campus: '粤海校区', name: '一楼重量型健身', category: '健身', bookable: true }
  ],
  dates: ['2026-07-07', '2026-07-08'],
  slotsByDate: {
    '2026-07-07': [{ label: '19:00-20:00(已过期)' }],
    '2026-07-08': [{ label: '20:00-21:00(可预约)', remaining: 3 }]
  },
  slots: [
    { label: '19:00-20:00', place: '运动广场西馆一楼健身房', remaining: 0 },
    { label: '20:00-21:00', place: '运动广场西馆一楼健身房', remaining: 3 }
  ],
  fields: [{ name: '一楼健身房', label: '一楼健身房(109/120)', remaining: 109, capacity: 120 }],
  bookings: [
    { orderNo: '202607091405161043', timeRange: '2026-07-09 20:00~2026-07-09 21:00', bookedAt: '2026-07-09 14:05:16', campus: '粤海校区', venue: '运动广场西馆一楼健身房', field: '一楼健身房', project: '一楼重量型健身', status: '取消预约', orderType: '2.0', note: '未支付取消预约，预约作废', actions: ['详情'] },
    { orderNo: '202607090035540373', timeRange: '2026-07-09 09:00~2026-07-09 10:00', bookedAt: '2026-07-09 00:35:54', campus: '粤海校区', venue: '运动广场西馆一楼健身房', field: '一楼健身房', project: '一楼重量型健身', status: '已完成', orderType: '2.0', note: '已入场', actions: ['详情'] },
    { orderNo: '202607081529208688', timeRange: '2026-07-08 15:00~2026-07-08 16:00', bookedAt: '2026-07-08 15:29:20', campus: '粤海校区', venue: '运动广场西馆一楼健身房', field: '一楼健身房', project: '一楼重量型健身', status: '已完成', orderType: '2.0', note: '已入场', actions: ['详情'] },
    { orderNo: '202607070922035740', timeRange: '2026-07-07 09:00~2026-07-07 10:00', bookedAt: '2026-07-07 09:22:03', campus: '粤海校区', venue: '运动广场西馆一楼健身房', field: '一楼健身房', project: '一楼重量型健身', status: '已完成', orderType: '2.0', note: '已入场', actions: ['详情'] }
  ],
  studentId: '2023000000',
  name: '测试用户'
};

function runSports(args, options = {}) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      SZU_BROWSER_BACKEND: 'mock',
      SZU_MOCK_SPORTS_JSON: JSON.stringify(snapshot),
      SZU_MOCK_SPORTS_TITLE: '体育场馆预约',
      SZU_MOCK_SPORTS_TEXT: '体育场馆预约 学生组（场馆预约） 我的预约 粤海校区 丽湖校区',
      ...options.env
    }
  });
  rmSync(home, { recursive: true, force: true });
  return result;
}

test('sports status reports readiness', () => {
  const result = runSports(['sports', 'status', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.loggedIn, true);
  assert.equal(body.data.reason, 'sports-page');
  assert.equal(body.meta.command, 'sports status');
});

test('sports campuses and venues return normalized data', () => {
  const campuses = runSports(['sports', 'campuses', '--json']);
  const venues = runSports(['sports', 'venues', '--campus', '粤海校区', '--json']);

  assert.equal(campuses.status, 0, campuses.stderr);
  assert.equal(venues.status, 0, venues.stderr);
  assert.equal(JSON.parse(campuses.stdout).data.items[0].name, '粤海校区');
  assert.equal(JSON.parse(venues.stdout).data.items[0].name, '一楼重量型健身');
});

test('sports dates lists open booking dates', () => {
  const result = runSports([
    'sports',
    'dates',
    '--campus',
    '粤海校区',
    '--venue',
    '一楼重量型健身',
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.deepEqual(body.data.items.map((item) => item.date), ['2026-07-07', '2026-07-08']);
  assert.equal(body.meta.command, 'sports dates');
});

test('sports slots without date returns slots grouped by open dates', () => {
  const result = runSports([
    'sports',
    'slots',
    '--campus',
    '粤海校区',
    '--venue',
    '一楼重量型健身',
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.items.length, 2);
  assert.equal(body.data.items[1].date, '2026-07-08');
  assert.equal(body.data.items[1].slots[0].selectable, true);
});
test('sports slots returns availability without identity fields', () => {
  const result = runSports([
    'sports',
    'slots',
    '--campus',
    '粤海校区',
    '--venue',
    '一楼重量型健身',
    '--date',
    '2026-07-08',
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.items[0].selectable, false);
  assert.equal(body.data.items[1].selectable, true);
  assert.equal(JSON.stringify(body.data).includes('2023000000'), false);
  assert.equal(JSON.stringify(body.data).includes('测试用户'), false);
});

test('sports slots works after venue page hides venue list', () => {
  const result = runSports([
    'sports',
    'slots',
    '--campus',
    '粤海校区',
    '--venue',
    '一楼重量型健身',
    '--date',
    '2026-07-08',
    '--json'
  ], {
    env: {
      SZU_MOCK_SPORTS_JSON: JSON.stringify({
        campuses: ['粤海校区'],
        dates: ['2026-07-07', '2026-07-08'],
  slotsByDate: {
    '2026-07-07': [{ label: '19:00-20:00(已过期)' }],
    '2026-07-08': [{ label: '20:00-21:00(可预约)', remaining: 3 }]
  },
  slots: [{ label: '20:00-21:00', remaining: 3 }]
      })
    }
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).data.items[0].label, '20:00-21:00');
});

test('sports bookings returns latest three records by default', () => {
  const result = runSports(['sports', 'bookings', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.items.length, 3);
  assert.equal(body.data.items[0].orderNo, '202607091405161043');
  assert.equal(body.data.items[0].status, '取消预约');
  assert.equal(JSON.stringify(body).includes('2023000000'), false);
  assert.equal(JSON.stringify(body).includes('测试用户'), false);
  assert.equal(body.meta.command, 'sports bookings');
});

test('sports reserve dry-run does not submit', () => {
  const result = runSports([
    'sports',
    'reserve',
    '--campus',
    '粤海校区',
    '--venue',
    '一楼重量型健身',
    '--date',
    '2026-07-08',
    '--slot',
    '20:00-21:00',
    '--field',
    '一楼健身房',
    '--dry-run',
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.submitted, false);
  assert.equal(body.data.requiresConfirmation, true);
  assert.equal(body.data.selected.label, '20:00-21:00');
  assert.equal(body.data.field.name, '一楼健身房');
});

test('sports reserve confirm validates the explicit field in mock backend', () => {
  const result = runSports([
    'sports',
    'reserve',
    '--campus',
    '粤海校区',
    '--venue',
    '一楼重量型健身',
    '--date',
    '2026-07-08',
    '--slot',
    '20:00-21:00',
    '--field',
    '一楼健身房',
    '--confirm',
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.submitted, true);
  assert.equal(body.data.payment.required, true);
  assert.equal(body.data.field.name, '一楼健身房');
});

test('sports cancel confirm is covered only by mock backend', () => {
  const result = runSports([
    'sports',
    'cancel',
    '--order',
    '202607091405161043',
    '--confirm',
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.cancelled, true);
  assert.equal(body.data.orderNo, '202607091405161043');
});

test('sports cancel dry-run rejects an unknown order', () => {
  const result = runSports([
    'sports',
    'cancel',
    '--order',
    'missing-order',
    '--dry-run',
    '--json'
  ]);

  assert.equal(result.status, 35);
  assert.equal(JSON.parse(result.stdout).error.code, 'SPORTS_BOOKING_NOT_FOUND');
});

test('sports cancel requires dry-run or confirm', () => {
  const result = runSports([
    'sports',
    'cancel',
    '--order',
    '202607091405161043',
    '--json'
  ]);

  assert.notEqual(result.status, 0);
  assert.equal(JSON.parse(result.stdout).error.code, 'SPORTS_CONFIRM_REQUIRED');
});

test('sports reserve requires dry-run or confirm', () => {
  const result = runSports([
    'sports',
    'reserve',
    '--campus',
    '粤海校区',
    '--venue',
    '一楼重量型健身',
    '--date',
    '2026-07-08',
    '--slot',
    '20:00-21:00',
    '--json'
  ]);

  assert.equal(result.status, 27);
  assert.equal(JSON.parse(result.stdout).error.code, 'SPORTS_CONFIRM_REQUIRED');
});

test('sports commands return LOGIN_REQUIRED for CAS and PERMISSION_DENIED for 403', () => {
  const login = runSports(['sports', 'campuses', '--json'], {
    env: {
      SZU_MOCK_SPORTS_URL: 'https://authserver.szu.edu.cn/authserver/login',
      SZU_MOCK_SPORTS_TITLE: '统一身份认证',
      SZU_MOCK_SPORTS_TEXT: '账号登录 密码'
    }
  });
  const denied = runSports(['sports', 'campuses', '--json'], {
    env: {
      SZU_MOCK_SPORTS_STATUS: '403',
      SZU_MOCK_SPORTS_TITLE: '403',
      SZU_MOCK_SPORTS_TEXT: '403'
    }
  });

  assert.equal(login.status, 11);
  assert.equal(JSON.parse(login.stdout).error.code, 'LOGIN_REQUIRED');
  assert.equal(denied.status, 13);
  assert.equal(JSON.parse(denied.stdout).error.code, 'PERMISSION_DENIED');
});
