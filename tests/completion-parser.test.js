import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCompletionContextForm,
  buildCompletionCourseForm,
  buildCompletionCoursesPayload,
  buildCompletionModulesPayload,
  buildCompletionSummaryPayload,
  parseCompletionProgress
} from '../src/modules/completion-parser.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/completion-api.json', import.meta.url), 'utf8'));

test('parses completion calculation progress', () => {
  assert.deepEqual(parseCompletionProgress(fixture.progress), {
    state: 'completed',
    completed: 1,
    total: 1,
    percent: 100
  });
});

test('builds completion summary without identity fields', () => {
  const payload = buildCompletionSummaryPayload(fixture, { sourceUrl: 'mock' });

  assert.deepEqual(payload.plan, {
    planCode: 'plan-001',
    planName: '2023级智慧交通主修培养方案',
    requiredCredits: 150,
    completedCredits: 90,
    selectedCredits: 100,
    actualCompletedCredits: 88,
    outsidePlanCredits: 2,
    remainingCredits: 60,
    note: '计算完成'
  });
  assert.equal(payload.calculation.percent, 100);
  assert.equal(JSON.stringify(payload).includes('2023000000'), false);
  assert.equal(JSON.stringify(payload).includes('测试用户'), false);
  assert.equal(JSON.stringify(payload).includes('internal-plan-record'), false);
});

test('builds normalized module completion rows', () => {
  const payload = buildCompletionModulesPayload(fixture, { sourceUrl: 'mock' });

  assert.equal(payload.items.length, 2);
  assert.deepEqual(payload.items[0], {
    moduleCode: 'module-01',
    parentModuleCode: null,
    moduleName: '公共基础课程',
    moduleTypeCode: '01',
    courseCategoryCode: '01',
    requiredCredits: 20,
    completedCredits: 16,
    selectedCredits: 18,
    remainingCredits: 4,
    requiredCourseCount: 10,
    completedCourseCount: 8,
    passed: false
  });
  assert.equal(payload.items[1].remainingCredits, 0);
  assert.equal(payload.items[1].passed, true);
  assert.equal(JSON.stringify(payload).includes('internal-module'), false);
});

test('builds all course states for one module', () => {
  const payload = buildCompletionCoursesPayload({
    ...fixture,
    cxscfakzkc: fixture.coursesByModule['module-01']
  }, {
    moduleCode: 'module-01',
    sourceUrl: 'mock'
  });

  assert.equal(payload.module.moduleCode, 'module-01');
  assert.deepEqual(payload.items.map((item) => item.status), [
    'completed',
    'selected',
    'not-taken'
  ]);
  assert.deepEqual(payload.items[0], {
    courseCode: 'course-001',
    courseName: '已完成课程',
    credit: 2,
    category: '公共选修课',
    nature: '选修',
    examType: '考试',
    status: 'completed',
    passed: true,
    selected: false,
    score: 'A',
    termId: '2025-2026-1',
    termName: '2025-2026学年第一学期',
    substituteCourse: null,
    sameCourseCount: 1,
    note: null
  });
  assert.match(payload.candidateMeaning, /not-taken/);
  assert.equal(JSON.stringify(payload).includes('2023000000'), false);
  assert.equal(JSON.stringify(payload).includes('internal-course'), false);
});

test('builds final detail request forms from authenticated context', () => {
  const context = fixture.cxscfa.datas.cxscfa.rows[0];
  const module = fixture.cxscfakz.datas.cxscfakz.rows[0];

  assert.deepEqual(buildCompletionContextForm(context), {
    XH: '2023000000',
    PYFADM: 'plan-001',
    BYNJDM: '-',
    SCLBDM: '01'
  });
  assert.deepEqual(buildCompletionCourseForm(context, module), {
    '*order': '+KCLBDM,+KCH',
    SCLBDM: '01',
    BYNJDM: '-',
    XH: '2023000000',
    BY1: 'context-01',
    KZH: 'module-01',
    PYFADM: 'plan-001',
    ISHIDE: '0',
    pageSize: '999',
    pageNumber: '1'
  });
});
