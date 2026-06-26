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

function rowsOf(response, key) {
  return response?.datas?.[key]?.rows ?? [];
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
