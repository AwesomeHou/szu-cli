export function buildSportsDatesPayload(snapshot, options = {}) {
  return {
    campus: options.campus,
    venue: options.venue,
    items: uniqueStrings(snapshot?.dates).map((date) => ({ date })),
    sourceUrl: options.sourceUrl
  };
}

export function buildSportsSlotsByDatePayload(snapshot, options = {}) {
  const dates = uniqueStrings(snapshot?.dates);
  return {
    campus: options.campus,
    venue: options.venue,
    items: dates.map((date) => {
      const payload = buildSportsSlotsPayload({
        ...snapshot,
        slots: snapshot?.slotsByDate?.[date] ?? snapshot?.slots ?? []
      }, {
        ...options,
        date
      });
      return {
        date,
        bookingMode: payload.bookingMode,
        place: payload.place,
        slots: payload.items
      };
    }),
    sourceUrl: options.sourceUrl
  };
}
export function buildSportsCampusesPayload(snapshot, options = {}) {
  return {
    items: uniqueStrings(snapshot?.campuses).map((name) => ({ name })),
    sourceUrl: options.sourceUrl
  };
}

export function buildSportsVenuesPayload(snapshot, options = {}) {
  const campus = options.campus;
  return {
    campus,
    items: rows(snapshot?.venues)
      .filter((venue) => !campus || venue.campus === campus)
      .map((venue) => ({
        campus: stringOrNull(venue.campus ?? campus),
        name: stringOrNull(venue.name),
        category: stringOrNull(venue.category),
        bookable: venue.bookable !== false
      }))
      .filter((venue) => venue.name),
    sourceUrl: options.sourceUrl
  };
}

export function buildSportsSlotsPayload(snapshot, options = {}) {
  return {
    campus: options.campus,
    venue: options.venue,
    date: options.date,
    bookingMode: stringOrNull(snapshot?.bookingMode) ?? '散场',
    place: stringOrNull(snapshot?.place ?? rows(snapshot?.slots)[0]?.place),
    items: rows(snapshot?.slots).map(normalizeSlot),
    sourceUrl: options.sourceUrl
  };
}

export function buildSportsReserveDryRunPayload(slotsPayload, slotLabel) {
  const selected = slotsPayload.items.find((slot) => slot.label === slotLabel || slot.label.startsWith(`${slotLabel}(`));
  if (!selected) {
    throwSportsError('SPORTS_SLOT_NOT_FOUND', `Sports slot not found: ${slotLabel}.`);
  }
  if (!selected.selectable) {
    throwSportsError('SPORTS_SLOT_UNAVAILABLE', `Sports slot is unavailable: ${slotLabel}.`);
  }
  return {
    submitted: false,
    wouldSubmit: true,
    requiresConfirmation: true,
    selected,
    campus: slotsPayload.campus,
    venue: slotsPayload.venue,
    date: slotsPayload.date,
    sourceUrl: slotsPayload.sourceUrl
  };
}

export function buildSportsReserveConfirmPayload(slotsPayload, slotLabel, result = {}) {
  const dryRun = buildSportsReserveDryRunPayload(slotsPayload, slotLabel);
  return {
    ...dryRun,
    submitted: true,
    requiresConfirmation: false,
    status: result.status ?? 'pending-payment',
    payment: result.payment ?? {
      required: true,
      url: null,
      message: '请在浏览器中手动完成付款。'
    }
  };
}

export function parseSportsSnapshotFromText(text) {
  const value = String(text ?? '');
  const campuses = ['粤海校区', '丽湖校区'].filter((name) => value.includes(name));
  const venueNames = [
    '一楼重量型健身',
    '二楼有氧健身',
    '羽毛球',
    '足球',
    '排球',
    '网球',
    '篮球',
    '壁球',
    '游泳'
  ];
  return {
    campuses,
    dates: parseDates(value),
    venues: venueNames
      .filter((name) => value.includes(name))
      .map((name) => ({
        campus: campuses[0] ?? null,
        name,
        category: name.includes('健身') ? '健身' : null,
        bookable: true
      })),
    slots: parseSlots(value)
  };
}

function normalizeSlot(row) {
  const label = cleanLabel(row.label ?? row.time ?? row.name);
  const time = label.match(/(\d{2}:\d{2})\s*[-~]\s*(\d{2}:\d{2})/);
  const remaining = integerOrNull(row.remaining ?? row.remain ?? row.left);
  const expired = row.expired === true || label.includes('已过期') || String(row.state ?? '').includes('已过期');
  const full = remaining === 0 || label.includes('已满') || String(row.state ?? '').includes('已满');
  return {
    id: stringOrNull(row.id) ?? label,
    label,
    startTime: time?.[1] ?? null,
    endTime: time?.[2] ?? null,
    state: stringOrNull(row.state) ?? (expired ? '已过期' : full ? '已满' : '可预约'),
    expired,
    selectable: !expired && !full && row.selectable !== false,
    remaining,
    place: stringOrNull(row.place)
  };
}

function parseDates(text) {
  const matches = String(text ?? '').match(/20\d{2}-\d{2}-\d{2}/g) ?? [];
  return [...new Set(matches)];
}
function parseSlots(text) {
  const matches = String(text ?? '').match(/\d{2}:\d{2}\s*[-~]\s*\d{2}:\d{2}(?:（[^）]+）|\([^)]*\))?/g) ?? [];
  return matches.map((label) => ({ label }));
}

function cleanLabel(value) {
  return String(value ?? '').replace(/[（）]/g, (char) => (char === '（' ? '(' : ')')).trim();
}

function rows(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(value) {
  return [...new Set(rows(value).map((item) => stringOrNull(item)).filter(Boolean))];
}

function stringOrNull(value) {
  return value === null || value === undefined || value === '' ? null : String(value);
}

function integerOrNull(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function throwSportsError(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}
