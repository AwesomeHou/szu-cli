export function parseCurrentTerm(response) {
  const row = firstRow(response, 'dqxnxq');
  return {
    id: row?.DM ?? null,
    name: row?.MC ?? null,
    year: row?.XNDM ?? null,
    semester: row?.XQDM ?? null,
    currentWeek: null
  };
}

export function parseCurrentWeek(response) {
  const row = firstRow(response, 'dqzc');
  return toNumber(row?.ZC);
}

export function parseCourseItems(response) {
  return rowsOf(response, 'xskcb').map(normalizeCourseRow);
}

export function buildCoursePayload(api, options = {}) {
  const term = parseCurrentTerm(api.dqxnxq);
  term.currentWeek = parseCurrentWeek(api.dqzc);

  return {
    term,
    items: parseCourseItems(api.xskcb),
    extraItems: {
      adjusted: rowsOf(api.xsdkkc, 'xsdkkc').map(normalizeAdjustedCourseRow),
      unlisted: rowsOf(api.xswpkc, 'xswpkc').map(normalizeCourseRow),
      practice: rowsOf(api.xssjkkc, 'xssjkkc').map(normalizeCourseRow)
    },
    sourceUrl: options.sourceUrl
  };
}

function normalizeAdjustedCourseRow(row) {
  return {
    courseCode: stringOrNull(row.KCH),
    courseName: stringOrNull(row.KCM),
    section: stringOrNull(row.KXH),
    weeksText: stringOrNull(row.ZCMC),
    weekday: toNumber(row.SKXQ),
    startSection: toNumber(row.KSJC),
    endSection: toNumber(row.JSJC),
    newWeeksText: stringOrNull(row.XZCMC ?? row.ZCMC),
    newWeekday: toNumber(row.XSKXQ),
    newStartSection: toNumber(row.XKSJC),
    newEndSection: toNumber(row.XJSJC),
    rawId: stringOrNull(row.JXBID)
  };
}

export function filterTodayCourses(payload, date = new Date()) {
  const weekday = toCourseWeekday(date);
  const dateText = formatDate(date);
  const currentWeek = payload.term?.currentWeek ?? null;

  return {
    term: payload.term,
    date: dateText,
    weekday,
    currentWeek,
    items: payload.items.filter((item) => item.weekday === weekday && isActiveInWeek(item.weeksText, currentWeek)),
    sourceUrl: payload.sourceUrl
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

function rowsOf(response, key) {
  return response?.datas?.[key]?.rows ?? [];
}

function firstRow(response, key) {
  return rowsOf(response, key)[0] ?? null;
}

function splitTeachers(value) {
  return String(value ?? '')
    .split(/[,，]/)
    .map((teacher) => teacher.trim())
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

function toCourseWeekday(date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isActiveInWeek(weeksText, currentWeek) {
  if (!currentWeek || !weeksText) {
    return true;
  }

  for (const part of String(weeksText).split(',')) {
    const range = part.match(/(\d+)\s*-\s*(\d+)周/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (currentWeek >= start && currentWeek <= end) {
        return true;
      }
      continue;
    }

    const single = part.match(/(\d+)周/);
    if (single && Number(single[1]) === currentWeek) {
      return true;
    }
  }

  return false;
}
