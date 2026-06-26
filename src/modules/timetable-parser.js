export function parseTimetableTerm(response, currentWeek = null) {
  const row = firstRow(response, 'xtcscx');
  const id = row?.CSZA ?? row?.CSZB ?? row?.CSZC ?? null;
  const [year, semester] = splitTermId(id);
  return {
    id: stringOrNull(id),
    name: year && semester ? `${year}学年第${semesterText(semester)}学期` : null,
    year,
    semester,
    currentWeek
  };
}

export function parseTimetableCurrentWeek(response) {
  const row = firstRow(response, 'dqzc');
  return toNumber(row?.ZC);
}

export function parseClassItems(response) {
  return rowsOf(response, 'bjcx').map(normalizeClassRow);
}

export function parseTimetableCourseItems(api) {
  return rowsOf(api.bjkcb, 'bjkcb').map(normalizeCourseRow);
}

export function buildTimetableClassesPayload(api, options = {}) {
  const data = api.bjcx?.datas?.bjcx ?? {};
  return {
    term: parseTimetableTerm(api.xtcscx),
    total: toNumber(data.totalSize) ?? parseClassItems(api.bjcx).length,
    page: toNumber(data.pageNumber) ?? null,
    pageSize: toNumber(data.pageSize) ?? null,
    filters: options.filters ?? {},
    items: parseClassItems(api.bjcx),
    sourceUrl: options.sourceUrl
  };
}

export function buildTimetableViewPayload(api, options = {}) {
  const currentWeek = parseTimetableCurrentWeek(api.dqzc);
  return {
    term: parseTimetableTerm(api.xtcscx, currentWeek),
    class: options.classInfo ?? {
      classCode: options.classCode,
      className: null,
      grade: null,
      department: null,
      major: null,
      studentCount: null,
      scheduled: null
    },
    items: parseTimetableCourseItems(api),
    extraItems: {
      adjusted: rowsOf(api.bjdkkc, 'bjdkkc').map(normalizeCourseRow),
      practice: rowsOf(api.bjsjkcb, 'bjsjkcb').map(normalizeCourseRow),
      unlisted: rowsOf(api.bjwpkc, 'bjwpkc').map(normalizeUnlistedCourseRow)
    },
    sourceUrl: options.sourceUrl
  };
}

export function buildClassListForm(options = {}) {
  const conditions = [];
  if (options.keyword) {
    conditions.push(condition('BJMC', 'include', options.keyword));
  }
  if (options.grade) {
    conditions.push(condition('NJ', 'equal', normalizeGrade(options.grade)));
  }
  if (options.department) {
    conditions.push(condition('YXDM_DISPLAY', 'include', options.department));
  }
  if (options.major) {
    conditions.push(condition('ZYDM_DISPLAY', 'include', options.major));
  }

  return {
    XNXQDM: options.term,
    SFSY: '1',
    SFYPK: '1',
    '*order': '-NJ,+YXPX,+ZYPX,+PX',
    ...(conditions.length ? { querySetting: JSON.stringify(conditions) } : {}),
    pageSize: String(options.limit ?? 10),
    pageNumber: String(options.page ?? 1)
  };
}

export function buildClassLookupForm(options = {}) {
  return {
    XNXQDM: options.term,
    SFSY: '1',
    SFYPK: '1',
    '*order': '-NJ,+YXPX,+ZYPX,+PX',
    querySetting: JSON.stringify([condition('BJDM', 'equal', options.classCode)]),
    pageSize: '1',
    pageNumber: '1'
  };
}

export function buildTimetableViewForm(options = {}) {
  return {
    XNXQDM: options.term,
    ...(options.currentWeek ? { SKZC: String(options.currentWeek) } : {}),
    BJDM: options.classCode
  };
}

function normalizeClassRow(row) {
  return {
    classCode: stringOrNull(row.BJDM),
    className: stringOrNull(row.BJMC),
    grade: stringOrNull(row.NJ ?? stripSuffix(row.NJ_DISPLAY, '级')),
    department: stringOrNull(row.YXMC ?? row.YXDM_DISPLAY),
    major: stringOrNull(row.ZYDM_DISPLAY),
    studentCount: toNumber(row.SJRS ?? row.CSRS),
    scheduled: parseBoolean(row.SFYPK ?? row.SFYPK_DISPLAY)
  };
}

function normalizeCourseRow(row) {
  return {
    courseCode: stringOrNull(row.KCH),
    courseName: stringOrNull(row.KCM),
    section: stringOrNull(row.KXH),
    teachers: splitTeachers(row.SKJS),
    weeksText: stringOrNull(row.ZCMC),
    weekday: toNumber(row.SKXQ),
    startSection: toNumber(row.KSJC),
    endSection: toNumber(row.JSJC),
    location: stringOrNull(row.JASMC),
    campus: stringOrNull(row.XXXQDM),
    rawId: stringOrNull(row.JXBID)
  };
}

function normalizeUnlistedCourseRow(row) {
  return {
    courseCode: stringOrNull(row.KCH),
    courseName: stringOrNull(row.KCM),
    section: stringOrNull(row.KXH),
    teachers: splitTeachers(row.SKJS),
    weeksText: stringOrNull(row.ZCMC),
    rawId: stringOrNull(row.JXBID)
  };
}

function rowsOf(response, key) {
  return response?.datas?.[key]?.rows ?? [];
}

function firstRow(response, key) {
  return rowsOf(response, key)[0] ?? null;
}

function condition(name, builder, value) {
  return {
    name,
    caption: '',
    builder,
    linkOpt: 'AND',
    value: String(value)
  };
}

function splitTeachers(value) {
  return String(value ?? '')
    .split(/[,，]/)
    .map((teacher) => teacher.trim())
    .filter(Boolean);
}

function splitTermId(value) {
  const match = String(value ?? '').match(/^(\d{4}-\d{4})-(\d+)$/);
  return match ? [match[1], match[2]] : [null, null];
}

function semesterText(value) {
  const map = {
    1: '一',
    2: '二',
    3: '三'
  };
  return map[value] ?? value;
}

function parseBoolean(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return value === true || value === 1 || value === '1' || value === '是';
}

function normalizeGrade(value) {
  return String(value).replace(/级$/, '');
}

function stripSuffix(value, suffix) {
  if (value === null || value === undefined) {
    return value;
  }
  return String(value).endsWith(suffix) ? String(value).slice(0, -suffix.length) : String(value);
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
