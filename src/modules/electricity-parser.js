export function normalizeCampusOptions(campuses) {
  return campuses
    .filter((campus) => campus.value && campus.text)
    .map((campus) => ({
      name: cleanText(campus.text),
      client: cleanText(campus.value),
      buildings: (campus.buildings ?? [])
        .filter((building) => building.value && building.text && cleanText(building.text) !== '请选择')
        .map((building) => ({
          name: cleanText(building.text),
          id: cleanText(building.value)
        }))
    }));
}

export function parseElectricityTableRows(rows, type = 'usage') {
  const normalizedRows = rows
    .map((row) => row.map(cleanText))
    .filter((row) => row.length > 1 && /^\d+$/.test(row[0]));

  if (type === 'purchase') {
    return normalizedRows.map((row) => ({
      index: toNumber(row[0]),
      room: stringOrNull(row[1]),
      purchaser: stringOrNull(row[2]),
      purchaseType: stringOrNull(row[3]),
      purchasedKwh: toNumber(row[4]),
      amountCny: toNumber(row[5]),
      purchasedAt: normalizeDateTime(row[6])
    }));
  }

  return normalizedRows.map((row) => ({
    index: toNumber(row[0]),
    room: stringOrNull(row[1]),
    remainingKwh: toNumber(row[2]),
    totalUsedKwh: toNumber(row[3]),
    totalPurchasedKwh: toNumber(row[4]),
    recordedAt: normalizeDateTime(row[5])
  }));
}

export function buildElectricityQueryPayload(options) {
  const records = options.records ?? [];
  const latestRecord = latestByTime(records);

  return {
    campus: options.campus,
    building: options.building,
    room: options.room,
    from: options.from,
    to: options.to,
    remainingKwh: latestRecord?.remainingKwh ?? null,
    totalUsedKwh: latestRecord?.totalUsedKwh ?? null,
    totalPurchasedKwh: latestRecord?.totalPurchasedKwh ?? null,
    latestRecord,
    records,
    sourceUrl: options.sourceUrl
  };
}

function latestByTime(records) {
  if (records.length === 0) {
    return null;
  }

  return [...records].sort((left, right) => {
    const leftTime = Date.parse(left.recordedAt ?? left.purchasedAt ?? '');
    const rightTime = Date.parse(right.recordedAt ?? right.purchasedAt ?? '');
    return (rightTime || 0) - (leftTime || 0);
  })[0];
}

function normalizeDateTime(value) {
  const text = cleanText(value).replace(/\.0$/, '');
  return text || null;
}

function stringOrNull(value) {
  const text = cleanText(value);
  return text || null;
}

function toNumber(value) {
  const text = cleanText(value);
  if (!text) {
    return null;
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
