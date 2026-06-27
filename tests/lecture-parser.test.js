import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLectureItemPayload,
  buildLectureListPayload,
  buildLectureProgressPayload
} from '../src/modules/lecture-parser.js';

const rows = [
  {
    id: 'lecture-open',
    name: '开放讲座',
    status: '正在报名中',
    startRegistration: '2026-06-26 08:00:00',
    deadlineRegistration: '2026-06-28 18:00:00',
    lectureStartTime: '2026-06-29 14:00:00',
    lectureEndTime: '2026-06-29 16:00:00',
    lectureType: '线下',
    teacherName: '测试教师',
    deptName: '测试学院',
    nameOfSponsor: '测试单位',
    introduceOfLecture: '<p>讲座&nbsp;简介</p>',
    introduceOfTeacher: '<div>教师<br>简介</div>',
    studentId: '2023000000'
  },
  {
    id: 'lecture-full',
    name: '已满讲座',
    status: '正在报名中',
    startRegistration: '2026-06-26 08:00:00',
    deadlineRegistration: '2026-06-28 18:00:00'
  },
  {
    id: 'lecture-closed',
    name: '已结束讲座',
    status: '报名已结束',
    startRegistration: '2026-06-20 08:00:00',
    deadlineRegistration: '2026-06-21 18:00:00'
  }
];

const classroomsByLecture = {
  'lecture-open': [
    {
      campus: '粤海校区',
      building: '致理楼（L3）',
      roomNumber: '1201',
      isSpeaker: '是',
      seatNum: 100,
      reservedSeats: 98,
      remainSeats: 2,
      chooseStatus: '可报名',
      createUser: 'internal-user'
    }
  ],
  'lecture-full': [
    {
      campus: '粤海校区',
      building: '致理楼（L3）',
      roomNumber: '1202',
      isSpeaker: '否',
      seatNum: 100,
      reservedSeats: 100,
      remainSeats: 0,
      chooseStatus: '已报满'
    }
  ]
};

test('defaults to lectures that are open and have remaining seats', () => {
  const payload = buildLectureListPayload(
    { code: 0, count: rows.length, data: rows, msg: 'ok' },
    {
      classroomsByLecture,
      now: new Date('2026-06-27T12:00:00+08:00'),
      limit: 10,
      sourceUrl: 'https://lecture.szu.edu.cn/'
    }
  );

  assert.equal(payload.total, 1);
  assert.deepEqual(payload.items[0], {
    id: 'lecture-open',
    title: '开放讲座',
    type: '线下',
    teacher: '测试教师',
    department: '测试学院',
    sponsor: '测试单位',
    registrationStart: '2026-06-26 08:00:00',
    registrationDeadline: '2026-06-28 18:00:00',
    lectureStart: '2026-06-29 14:00:00',
    lectureEnd: '2026-06-29 16:00:00',
    status: '正在报名中',
    registrationOpen: true,
    registerable: true,
    availabilityState: 'available',
    availableRooms: 1,
    totalRemainingSeats: 2,
    introduction: '讲座简介',
    teacherIntroduction: '教师简介'
  });
  assert.deepEqual(payload.summary, {
    openCount: 2,
    availableCount: 1,
    fullCount: 1,
    unknownCount: 0,
    closedCount: 1
  });
  assert.equal(JSON.stringify(payload).includes('2023000000'), false);
  assert.equal(JSON.stringify(payload).includes('internal-user'), false);
});

test('supports open and all availability filters', () => {
  const open = buildLectureListPayload(
    { data: rows },
    {
      availability: 'open',
      classroomsByLecture,
      now: new Date('2026-06-27T12:00:00+08:00')
    }
  );
  const all = buildLectureListPayload(
    { data: rows },
    {
      availability: 'all',
      classroomsByLecture,
      now: new Date('2026-06-27T12:00:00+08:00')
    }
  );

  assert.deepEqual(open.items.map((item) => item.availabilityState), ['available', 'full']);
  assert.equal(all.items.length, 3);
  assert.equal(all.items[2].availabilityState, 'closed');
});

test('marks open lectures with missing classroom data as unknown', () => {
  const payload = buildLectureListPayload(
    { data: [rows[0]] },
    {
      availability: 'open',
      classroomsByLecture: {},
      now: new Date('2026-06-27T12:00:00+08:00'),
      sourceUrl: 'mock'
    }
  );

  assert.equal(payload.items[0].availabilityState, 'unknown');
  assert.equal(payload.items[0].registerable, false);
  assert.equal(payload.summary.unknownCount, 1);
});

test('applies the lecture list limit after availability filtering', () => {
  const payload = buildLectureListPayload(
    { data: [rows[0], { ...rows[0], id: 'lecture-2' }] },
    {
      classroomsByLecture: {
        ...classroomsByLecture,
        'lecture-2': classroomsByLecture['lecture-open']
      },
      now: new Date('2026-06-27T12:00:00+08:00'),
      limit: 1,
      sourceUrl: 'mock'
    }
  );

  assert.equal(payload.total, 2);
  assert.equal(payload.items.length, 1);
});

test('builds lecture item classroom details without internal fields', () => {
  const payload = buildLectureItemPayload(rows[0], classroomsByLecture['lecture-open'], {
    now: new Date('2026-06-27T12:00:00+08:00'),
    sourceUrl: 'mock'
  });

  assert.equal(payload.id, 'lecture-open');
  assert.equal(payload.availabilityState, 'available');
  assert.deepEqual(payload.classrooms[0], {
    campus: '粤海校区',
    building: '致理楼（L3）',
    roomNumber: '1201',
    isSpeaker: true,
    capacity: 100,
    reservedSeats: 98,
    remainingSeats: 2,
    status: '可报名'
  });
  assert.equal(JSON.stringify(payload).includes('internal-user'), false);
});

test('normalizes completed and required learning counts without leaking user data', () => {
  const payload = buildLectureProgressPayload({
    offlineTimes: '1',
    onlineTimes: '5',
    sumOfflineTimes: 2,
    sumOnlineTimes: 5,
    studentId: '2023000000',
    name: '测试用户',
    password: 'secret',
    salt: 'salt'
  }, { sourceUrl: 'https://lecture.szu.edu.cn/' });

  assert.deepEqual(payload, {
    offline: {
      completed: 1,
      required: 2,
      remaining: 1,
      passed: false
    },
    online: {
      completed: 5,
      required: 5,
      remaining: 0,
      passed: true
    },
    percentage: 85,
    sourceUrl: 'https://lecture.szu.edu.cn/'
  });
  assert.equal(JSON.stringify(payload).includes('2023000000'), false);
  assert.equal(JSON.stringify(payload).includes('测试用户'), false);
  assert.equal(JSON.stringify(payload).includes('secret'), false);
});
