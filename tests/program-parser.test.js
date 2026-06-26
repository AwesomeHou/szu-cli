import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProgramItemLookupForm,
  buildProgramItemPayload,
  buildProgramListForm,
  buildProgramPayload,
  parseProgramItems
} from '../src/modules/program-parser.js';

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

test('builds program item lookup form by plan code', () => {
  const form = buildProgramItemLookupForm('2025-050101-01');

  assert.equal(form.PYFADM, '2025-050101-01');
  assert.equal(form.pageSize, '999');
});

test('builds program item payload with modules and courses', () => {
  const payload = buildProgramItemPayload(fixture.programItem, { sourceUrl: 'mock' });

  assert.equal(payload.summary.id, 'program-001');
  assert.equal(payload.summary.planCode, '2025-050101-01');
  assert.equal(payload.detail.trainingObjectives, '培养具备扎实中文基础和创新能力的人才。');
  assert.deepEqual(payload.detail.mainSubjects, ['中国语言文学']);
  assert.deepEqual(payload.detail.coreCourses, ['现代汉语', '中国古代文学']);
  assert.equal(payload.modules.length, 2);
  assert.deepEqual(payload.modules[1], {
    id: 'module-002',
    groupCode: 'group-basic',
    parentGroupCode: 'module-general',
    name: '基本通识课',
    type: '课组',
    category: '基本通识课',
    courseNature: '必修',
    requiredCredits: 20,
    totalCredits: 20,
    totalHours: 360,
    courseCount: 6,
    order: 1
  });
  assert.equal(payload.courses.length, 2);
  assert.deepEqual(payload.courses[0], {
    id: 'course-001',
    groupCode: 'group-basic',
    courseCode: '0501010001',
    courseName: '现代汉语',
    credits: 3,
    hours: 54,
    termId: '2025-2026-1',
    termName: '2025-2026学年第一学期',
    recommendedSemester: 1,
    courseNature: '必修',
    examType: '考试',
    required: true,
    order: 1
  });
  assert.equal(JSON.stringify(payload).includes('2023000000'), false);
  assert.equal(JSON.stringify(payload).includes('测试用户'), false);
});
