export function buildIdeologySummaryPayload(api, options = {}) {
  const row = api.cxxshdtjlb?.datas?.cxxshdtjlb?.rows?.[0] ?? null;
  return {
    available: Boolean(row),
    earnedCredits: toNumber(row?.HDXF),
    qualified: parseBoolean(row?.SFJG ?? row?.SFJG_DISPLAY),
    registered: parseBoolean(row?.SFZC ?? row?.SFZC_DISPLAY),
    activeStudent: parseBoolean(row?.SFZX ?? row?.SFZX_DISPLAY),
    grade: stringOrNull(row?.XZNJ ?? stripSuffix(row?.XZNJ_DISPLAY, '级')),
    major: stringOrNull(row?.ZYDM_DISPLAY),
    department: stringOrNull(row?.YXDM_DISPLAY),
    sourceUrl: options.sourceUrl
  };
}

function parseBoolean(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return value === true
    || value === 1
    || value === '1'
    || value === '是'
    || value === '合格';
}

function stripSuffix(value, suffix) {
  if (value === null || value === undefined) {
    return value;
  }
  const text = String(value);
  return text.endsWith(suffix) ? text.slice(0, -suffix.length) : text;
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
