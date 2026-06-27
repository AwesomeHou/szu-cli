export function parseCompletionProgress(response) {
  const row = firstRow(response, 'byscjd');
  const total = toNumber(row?.ZS) ?? 0;
  const completed = toNumber(row?.YWCS) ?? 0;
  const done = total > 0 && completed >= total;
  return {
    state: done ? 'completed' : 'calculating',
    completed,
    total,
    percent: total > 0 ? roundNumber(Math.min(100, completed / total * 100)) : 0
  };
}

export function buildCompletionSummaryPayload(api, options = {}) {
  const row = firstRow(api.cxscfa, 'cxscfa');
  return {
    plan: normalizePlan(row),
    calculation: parseCompletionProgress(api.progress),
    sourceUrl: options.sourceUrl
  };
}

export function buildCompletionModulesPayload(api, options = {}) {
  const summary = buildCompletionSummaryPayload(api, options);
  return {
    ...summary,
    items: rowsOf(api.cxscfakz, 'cxscfakz').map(normalizeModule)
  };
}

export function buildCompletionCoursesPayload(api, options = {}) {
  const modules = rowsOf(api.cxscfakz, 'cxscfakz').map(normalizeModule);
  return {
    plan: normalizePlan(firstRow(api.cxscfa, 'cxscfa')),
    calculation: parseCompletionProgress(api.progress),
    module: modules.find((item) => item.moduleCode === options.moduleCode) ?? null,
    items: rowsOf(api.cxscfakzkc, 'cxscfakzkc').map(normalizeCourse),
    candidateMeaning: 'not-taken curriculum course; current offering and enrollment eligibility are not guaranteed',
    sourceUrl: options.sourceUrl
  };
}

export function buildCompletionContextForm(row) {
  return {
    XH: row.XH,
    PYFADM: row.PYFADM,
    BYNJDM: row.BYNJDM,
    SCLBDM: row.SCLBDM
  };
}

export function buildCompletionCourseForm(context, module) {
  return {
    '*order': '+KCLBDM,+KCH',
    SCLBDM: context.SCLBDM,
    BYNJDM: context.BYNJDM,
    XH: context.XH,
    BY1: module.BY1,
    KZH: module.KZH,
    PYFADM: context.PYFADM,
    ISHIDE: '0',
    pageSize: '999',
    pageNumber: '1'
  };
}

function normalizePlan(row) {
  const requiredCredits = toNumber(row?.YQXF);
  const completedCredits = toNumber(row?.WCXF);
  return {
    planCode: stringOrNull(row?.PYFADM),
    planName: stringOrNull(row?.PYFAMC),
    requiredCredits,
    completedCredits,
    selectedCredits: toNumber(row?.XKXF),
    actualCompletedCredits: toNumber(row?.SJWCXF),
    outsidePlanCredits: toNumber(row?.FAWXF),
    remainingCredits: subtractCredits(requiredCredits, completedCredits),
    note: stringOrNull(row?.SCQKSM)
  };
}

function normalizeModule(row) {
  const requiredCredits = toNumber(row.YQXF);
  const completedCredits = toNumber(row.WCXF);
  return {
    moduleCode: stringOrNull(row.KZH),
    parentModuleCode: stringOrNull(row.FKZH),
    moduleName: stringOrNull(row.KZM),
    moduleTypeCode: stringOrNull(row.KZLXDM),
    courseCategoryCode: stringOrNull(row.KCLBDM),
    requiredCredits,
    completedCredits,
    selectedCredits: toNumber(row.XKXF),
    remainingCredits: subtractCredits(requiredCredits, completedCredits),
    requiredCourseCount: toNumber(row.YQMS),
    completedCourseCount: toNumber(row.WCMS),
    passed: parseBoolean(row.SFTG)
  };
}

function normalizeCourse(row) {
  const passed = String(row.SFTG ?? '') === '1';
  const selected = String(row.SFXK ?? '') === '1';
  return {
    courseCode: stringOrNull(row.KCH),
    courseName: stringOrNull(row.KCM),
    credit: toNumber(row.XF),
    category: stringOrNull(row.KCLBDM_DISPLAY),
    nature: stringOrNull(row.KCXZDM_DISPLAY),
    examType: stringOrNull(row.KSLXDM_DISPLAY),
    status: passed
      ? 'completed'
      : selected
        ? 'selected'
        : String(row.SFTG ?? '') === '2'
          ? 'not-taken'
          : 'unknown',
    passed,
    selected,
    score: stringOrNull(row.CJ ?? row.ZSCJ),
    termId: stringOrNull(row.XNXQDM),
    termName: stringOrNull(row.XNXQDM_DISPLAY),
    substituteCourse: stringOrNull(row.TDKC),
    sameCourseCount: toNumber(row.TYKCBS),
    note: stringOrNull(row.BZ)
  };
}

function rowsOf(response, key) {
  return response?.datas?.[key]?.rows ?? [];
}

function firstRow(response, key) {
  return rowsOf(response, key)[0] ?? null;
}

function subtractCredits(required, completed) {
  if (required === null || completed === null) {
    return null;
  }
  return roundNumber(Math.max(0, required - completed));
}

function parseBoolean(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return value === true || value === 1 || value === '1' || value === '是';
}

function stringOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return String(value);
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundNumber(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
