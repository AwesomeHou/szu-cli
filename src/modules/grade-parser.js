export function parseGradeItems(response) {
  return rowsOf(response, 'xscjcxtjgl').map(normalizeGradeRow);
}

export function summarizeGradeTerms(items) {
  const terms = new Map();

  for (const item of items) {
    const key = item.termId ?? 'unknown';
    if (!terms.has(key)) {
      terms.set(key, {
        termId: item.termId,
        termName: item.termName,
        selectedCredits: 0,
        earnedCredits: 0,
        creditGradePoints: 0,
        itemCount: 0
      });
    }

    const term = terms.get(key);
    term.selectedCredits += item.credit ?? 0;
    term.earnedCredits += item.earnedCredit ?? 0;
    term.creditGradePoints += item.creditGradePoint ?? 0;
    term.itemCount += 1;
  }

  return [...terms.values()].map((term) => ({
    termId: term.termId,
    termName: term.termName,
    selectedCredits: roundNumber(term.selectedCredits),
    earnedCredits: roundNumber(term.earnedCredits),
    averageGradePoint: term.selectedCredits > 0
      ? roundNumber(term.creditGradePoints / term.selectedCredits)
      : null,
    percent: term.selectedCredits > 0
      ? roundNumber((term.earnedCredits / term.selectedCredits) * 100)
      : null,
    itemCount: term.itemCount
  }));
}

export function buildGradePayload(api, options = {}) {
  const items = parseGradeItems(api.xscjcxtjgl);
  return {
    items,
    terms: summarizeGradeTerms(items),
    sourceUrl: options.sourceUrl
  };
}

export function filterGradePayloadByTerm(payload, termId) {
  if (!termId) {
    return payload;
  }

  const items = payload.items.filter((item) => item.termId === termId);
  return {
    ...payload,
    items,
    terms: summarizeGradeTerms(items)
  };
}

function normalizeGradeRow(row) {
  return {
    termId: stringOrNull(row.XNXQDM),
    termName: stringOrNull(row.XNXQDM_DISPLAY),
    courseCode: stringOrNull(row.KCH),
    courseName: stringOrNull(row.KCM),
    courseNatureCode: stringOrNull(row.KCXZDM),
    courseNature: stringOrNull(row.KCXZDM_DISPLAY),
    credit: toNumber(row.XF),
    earnedCredit: toNumber(row.QDXF),
    score: stringOrNull(row.DJCJMC ?? row.CJ),
    gradePoint: toNumber(row.XFJD),
    creditGradePoint: toNumber(row.JDF),
    section: stringOrNull(row.KXH),
    examDate: stringOrNull(row.KSSJ),
    valid: row.SFYX === undefined ? null : String(row.SFYX) === '1',
    rawId: stringOrNull(row.JXBID)
  };
}

function rowsOf(response, key) {
  return response?.datas?.[key]?.rows ?? [];
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
