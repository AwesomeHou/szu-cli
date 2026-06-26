export function parseProgramItems(response) {
  return rowsOf(response, 'qxpyfacx').map(normalizeProgramRow);
}

export function buildProgramPayload(response, options = {}) {
  const data = response?.datas?.qxpyfacx ?? {};
  return {
    total: toNumber(data.totalSize) ?? parseProgramItems(response).length,
    page: toNumber(data.pageNumber) ?? null,
    pageSize: toNumber(data.pageSize) ?? null,
    filters: options.filters ?? {},
    items: parseProgramItems(response),
    sourceUrl: options.sourceUrl
  };
}

export function buildProgramItemPayload(api, options = {}) {
  const summary = parseProgramItems(api.qxpyfacx)[0] ?? null;
  return {
    summary,
    detail: normalizeProgramDetail(firstRow(api.qxpyfacx, 'qxpyfacx')),
    modules: rowsOf(api.kzcx, 'kzcx').map(normalizeProgramModuleRow),
    courses: rowsOf(api.kzkccx, 'kzkccx').map(normalizeProgramCourseRow),
    sourceUrl: options.sourceUrl
  };
}

export function buildProgramListForm(options = {}) {
  const conditions = [
    condition('FAZTDM', 'equal', '99')
  ];

  if (options.keyword) {
    conditions.push(condition('PYFAMC', 'include', options.keyword));
  }
  if (options.grade) {
    conditions.push(condition('NJDM', 'equal', normalizeGrade(options.grade)));
  }
  if (options.department) {
    conditions.push(condition('DWDM_DISPLAY', 'include', options.department));
  }
  if (options.major) {
    conditions.push(condition('ZYDM_DISPLAY', 'include', options.major));
  }

  return {
    querySetting: JSON.stringify(conditions),
    '*order': '-NJDM,+DWDM,+ZYDM',
    pageSize: String(options.limit ?? 10),
    pageNumber: String(options.page ?? 1)
  };
}

export function buildProgramItemLookupForm(target, options = {}) {
  const field = options.field ?? 'PYFADM';
  return {
    [field]: target,
    pageSize: '999'
  };
}

export function buildProgramDetailForm(planCode) {
  return {
    PYFADM: planCode
  };
}

function normalizeProgramRow(row) {
  return {
    id: stringOrNull(row.WID),
    planCode: stringOrNull(row.PYFADM),
    title: stringOrNull(row.PYFAMC),
    grade: stringOrNull(row.NJDM ?? stripSuffix(row.NJDM_DISPLAY, '级')),
    department: stringOrNull(row.DWDM_DISPLAY),
    major: stringOrNull(row.ZYDM_DISPLAY),
    direction: stringOrNull(row.ZYFXDM_DISPLAY),
    minimumCredits: toNumber(row.ZSYQXF),
    durationYears: toNumber(row.XZNX),
    degree: stringOrNull(row.XWDM_DISPLAY),
    startYear: stringOrNull(row.KSXNDM_DISPLAY),
    startSemester: stringOrNull(row.KSXQDM_DISPLAY),
    status: stringOrNull(row.FAZTDM ?? row.FAZTDM_DISPLAY),
    published: parsePublished(row.SFFB)
  };
}

function normalizeProgramDetail(row) {
  return {
    trainingObjectives: stringOrNull(row?.PYMB),
    graduationRequirements: stringOrNull(row?.XDYQ),
    mainSubjects: splitList(row?.ZGXK),
    coreCourses: splitList(row?.ZGKC),
    notes: [
      row?.KZZD1,
      row?.KZZD2,
      row?.KZZD3,
      row?.KZZD4,
      row?.KZZD5
    ].map(stringOrNull).filter(Boolean),
    features: stringOrNull(row?.FATS)
  };
}

function normalizeProgramModuleRow(row) {
  return {
    id: stringOrNull(row.WID),
    groupCode: stringOrNull(row.KZH),
    parentGroupCode: stringOrNull(row.FKZH),
    name: stringOrNull(row.KZM),
    type: stringOrNull(row.KZLXDM_DISPLAY),
    category: stringOrNull(row.KCLBDM_DISPLAY),
    courseNature: stringOrNull(row.KCXZDM_DISPLAY),
    requiredCredits: toNumber(row.ZSXDXF),
    totalCredits: toNumber(row.KCZXF),
    totalHours: toNumber(row.KCZXS),
    courseCount: toNumber(row.KCZMS),
    order: toNumber(row.PX)
  };
}

function normalizeProgramCourseRow(row) {
  return {
    id: stringOrNull(row.WID),
    groupCode: stringOrNull(row.KZH),
    courseCode: stringOrNull(row.KCH),
    courseName: stringOrNull(row.KCM),
    credits: toNumber(row.XF),
    hours: toNumber(row.XS),
    termId: stringOrNull(row.XNXQ),
    termName: stringOrNull(row.XNXQ_DISPLAY),
    recommendedSemester: toNumber(row.XDXQ),
    courseNature: stringOrNull(row.KCXZDM_DISPLAY),
    examType: stringOrNull(row.KSLXDM_DISPLAY),
    required: parsePublished(row.SFZGKC),
    order: toNumber(row.PX)
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

function parsePublished(value) {
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

function splitList(value) {
  return String(value ?? '')
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
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
