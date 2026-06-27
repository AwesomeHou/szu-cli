import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const list = {
  code: 0,
  count: 3,
  data: [
    {
      id: 'open',
      name: '开放讲座',
      status: '正在报名中',
      startRegistration: '2026-06-26 08:00:00',
      deadlineRegistration: '2026-06-28 18:00:00'
    },
    {
      id: 'full',
      name: '已满讲座',
      status: '正在报名中',
      startRegistration: '2026-06-26 08:00:00',
      deadlineRegistration: '2026-06-28 18:00:00'
    },
    {
      id: 'closed',
      name: '结束讲座',
      status: '报名已结束',
      startRegistration: '2026-06-20 08:00:00',
      deadlineRegistration: '2026-06-21 18:00:00'
    }
  ]
};
const classrooms = {
  open: {
    code: 0,
    count: 1,
    data: [{
      campus: '粤海校区',
      building: '致理楼（L3）',
      roomNumber: '1201',
      isSpeaker: '是',
      seatNum: 100,
      reservedSeats: 98,
      remainSeats: 2,
      chooseStatus: '可报名'
    }]
  },
  full: {
    code: 0,
    count: 1,
    data: [{
      campus: '粤海校区',
      building: '致理楼（L3）',
      roomNumber: '1202',
      isSpeaker: '否',
      seatNum: 100,
      reservedSeats: 100,
      remainSeats: 0,
      chooseStatus: '已报满'
    }]
  }
};
const progress = {
  offlineTimes: '1',
  onlineTimes: '3',
  sumOfflineTimes: 2,
  sumOnlineTimes: 5,
  studentId: '2023000000',
  name: '测试用户'
};

function runLecture(args, options = {}) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      SZU_BROWSER_BACKEND: 'mock',
      SZU_MOCK_NOW: '2026-06-27T12:00:00+08:00',
      SZU_MOCK_LECTURE_LIST_JSON: JSON.stringify(list),
      SZU_MOCK_LECTURE_CLASSROOMS_JSON: JSON.stringify(classrooms),
      SZU_MOCK_LECTURE_PROGRESS_JSON: JSON.stringify(progress),
      SZU_MOCK_LECTURE_TITLE: '创新领航讲座',
      SZU_MOCK_LECTURE_TEXT: '公告 讲座报名 学习进度 查看报名信息',
      ...options.env
    }
  });
  rmSync(home, { recursive: true, force: true });
  return result;
}

test('lecture status reports login and registerable count', () => {
  const result = runLecture(['lecture', 'status', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.loggedIn, true);
  assert.equal(body.data.reason, 'lecture-page');
  assert.equal(body.data.registerableCount, 1);
  assert.equal(body.meta.command, 'lecture status');
});

test('lecture list returns only currently registerable lectures', () => {
  const result = runLecture(['lecture', 'list', '--limit', '1', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.total, 1);
  assert.equal(body.data.items.length, 1);
  assert.equal(body.data.items[0].id, 'open');
  assert.equal(body.data.items[0].registerable, true);
  assert.equal(body.data.items[0].totalRemainingSeats, 2);
  assert.equal(body.data.summary.fullCount, 1);
});

test('lecture list supports open and all availability filters', () => {
  const open = runLecture(['lecture', 'list', '--availability', 'open', '--json']);
  const all = runLecture(['lecture', 'list', '--availability', 'all', '--json']);

  assert.equal(open.status, 0, open.stderr);
  assert.equal(all.status, 0, all.stderr);
  assert.deepEqual(
    JSON.parse(open.stdout).data.items.map((item) => item.availabilityState),
    ['available', 'full']
  );
  assert.equal(JSON.parse(all.stdout).data.total, 3);
});

test('lecture item returns classroom details', () => {
  const result = runLecture(['lecture', 'item', 'open', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.id, 'open');
  assert.equal(body.data.availabilityState, 'available');
  assert.equal(body.data.classrooms[0].remainingSeats, 2);
  assert.equal(body.meta.command, 'lecture item');
});

test('lecture item returns LECTURE_NOT_FOUND for an unknown id', () => {
  const result = runLecture(['lecture', 'item', 'missing', '--json']);

  assert.equal(result.status, 26);
  assert.equal(JSON.parse(result.stdout).error.code, 'LECTURE_NOT_FOUND');
});

test('lecture progress returns normalized counts without identity fields', () => {
  const result = runLecture(['lecture', 'progress', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.offline.completed, 1);
  assert.equal(body.data.offline.required, 2);
  assert.equal(body.data.online.completed, 3);
  assert.equal(body.data.percentage, 57);
  assert.equal(JSON.stringify(body.data).includes('2023000000'), false);
  assert.equal(JSON.stringify(body.data).includes('测试用户'), false);
});

test('lecture commands return LOGIN_REQUIRED for CAS', () => {
  const result = runLecture(['lecture', 'list', '--json'], {
    env: {
      SZU_MOCK_LECTURE_URL: 'https://authserver.szu.edu.cn/authserver/login',
      SZU_MOCK_LECTURE_TITLE: '统一身份认证',
      SZU_MOCK_LECTURE_TEXT: '账号登录 密码'
    }
  });

  assert.equal(result.status, 11);
  assert.equal(JSON.parse(result.stdout).error.code, 'LOGIN_REQUIRED');
});

test('lecture commands return PERMISSION_DENIED for 403', () => {
  const result = runLecture(['lecture', 'progress', '--json'], {
    env: {
      SZU_MOCK_LECTURE_STATUS: '403',
      SZU_MOCK_LECTURE_TITLE: '403',
      SZU_MOCK_LECTURE_TEXT: '403'
    }
  });

  assert.equal(result.status, 13);
  assert.equal(JSON.parse(result.stdout).error.code, 'PERMISSION_DENIED');
});

test('lecture commands return PAGE_CHANGED when required API data is absent', () => {
  const result = runLecture(['lecture', 'progress', '--json'], {
    env: {
      SZU_MOCK_LECTURE_PROGRESS_JSON: '{}'
    }
  });

  assert.equal(result.status, 20);
  assert.equal(JSON.parse(result.stdout).error.code, 'PAGE_CHANGED');
});

test('lecture commands reject unknown options', () => {
  const result = runLecture(['lecture', 'list', '--bad', '--json']);

  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stdout).error.message, /Unknown option/);
});

test('lecture list rejects an invalid availability filter', () => {
  const result = runLecture(['lecture', 'list', '--availability', 'maybe', '--json']);

  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stdout).error.message, /--availability/);
});
