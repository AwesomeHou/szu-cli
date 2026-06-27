export function parseGrowthTerms(response) {
  return rowsOf(response, 'cxyxkxnxq').map((row) => {
    const id = stringOrNull(row.XNXQDM);
    const match = id?.match(/^(\d{4}-\d{4})-(\d+)$/);
    return {
      id,
      name: stringOrNull(row.XNXQMC),
      academicYear: match?.[1] ?? null,
      semester: match?.[2] ?? null
    };
  });
}

export function buildGrowthSummaryForm(studentId) {
  return {
    XH: studentId,
    XNXQDM: '*',
    TJLX: '01'
  };
}

export function buildGrowthPeriodForm(studentId, options = {}) {
  return {
    XH: studentId,
    XNXQDM: options.periodId,
    TJLX: periodTypeCode(options.periodType)
  };
}

export function buildGrowthRankForm(studentId, options = {}) {
  return {
    TJXNXQDM: options.termId,
    XH: studentId,
    pageSize: '1',
    pageNumber: '1',
    TJLXDM: periodTypeCode(options.periodType),
    '*order': '-TJSJ'
  };
}

export function buildGrowthSummaryPayload(api, options = {}) {
  const stats = firstRow(api.cumulativeStats, 'cxxscjtj');
  const rank = firstRow(api.cumulativeRank, 'cxxsjdpm');
  const terms = parseGrowthTerms(api.cxyxkxnxq);
  return {
    cumulative: normalizeMetrics(stats, rank),
    latestTerm: terms.at(-1) ?? null,
    sourceUrl: options.sourceUrl
  };
}

export function buildGrowthListPayload(api, options = {}) {
  const items = (api.periods ?? [])
    .map((period) => ({
      periodType: period.periodType,
      periodId: period.periodId,
      periodName: period.periodName,
      ...normalizeMetrics(
        firstRow(period.stats, 'cxxscjtj'),
        firstRow(period.rank, 'cxxsjdpm')
      )
    }))
    .filter((item) => !options.term || item.periodType === 'term' && item.periodId === options.term)
    .filter((item) => !options.year || item.periodType === 'academic-year' && item.periodId === options.year);

  return {
    terms: parseGrowthTerms(api.cxyxkxnxq),
    filters: {
      ...(options.term ? { term: options.term } : {}),
      ...(options.year ? { year: options.year } : {})
    },
    items,
    sourceUrl: options.sourceUrl
  };
}

function normalizeMetrics(stats, rank) {
  return {
    gpa: toNumber(rank?.GPA ?? stats?.GPA),
    majorRank: toNumber(rank?.PM ?? stats?.PM),
    rankedStudentCount: toNumber(rank?.CYPMRS ?? stats?.BJGMS),
    rankPercent: toNumber(rank?.PMBFB),
    rankBand: stringOrNull(rank?.PMQ),
    earnedCredits: toNumber(stats?.HDXF ?? rank?.HDXF),
    selectedCredits: toNumber(stats?.XKXF ?? rank?.XKXF)
  };
}

function periodTypeCode(periodType) {
  if (periodType === 'academic-year') {
    return '02';
  }
  if (periodType === 'cumulative') {
    return '03';
  }
  return '01';
}

function rowsOf(response, key) {
  return response?.datas?.[key]?.rows ?? [];
}

function firstRow(response, key) {
  return rowsOf(response, key)[0] ?? null;
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
