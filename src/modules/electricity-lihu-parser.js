export function normalizeLihuBuildings(options) {
  return options
    .filter(option => option.value && !/^(楼栋|请选择.*)$/.test(option.text.trim()))
    .map(option => ({ id: option.value, name: option.text.trim().replace(/[#＃]$/, '') }));
}

export function findLihuFloor(options, room) {
  const number = roomNumber(room);
  const floor = /^\d{3,5}$/.test(number) ? Number(number.slice(0, -2)) : null;
  const matches = options.filter(option => floor !== null && Number(option.text.match(/(\d+)\s*层$/)?.[1]) === floor);
  if (matches.length !== 1) {
    throw roomNotFound('Unable to match the room to a Lihu phase II floor.');
  }
  return matches[0];
}

export function findLihuRoom(options, room) {
  const matches = options.filter(option => option.value && roomNumber(option.text) === roomNumber(room));
  if (matches.length !== 1) {
    throw roomNotFound('The room was not found uniquely in the selected Lihu phase II floor.');
  }
  return matches[0];
}

export function parseLihuUsageSnapshot({ text, rows, from, to }) {
  const balance = text.match(/剩余电量\s*[:：]\s*([+-]?[\d,]+(?:\.\d+)?)\s*度/);
  const header = rows.findIndex(row => row.length === 4 && row[0].trim() === '日期' && /用量/.test(row[2]));
  if (!balance || !Number.isFinite(Number(balance[1].replaceAll(',', ''))) || header < 0) {
    const error = new Error('Unable to recognize the Lihu phase II electricity usage page.');
    error.code = 'PAGE_CHANGED';
    throw error;
  }
  const records = rows.slice(header + 1)
    .filter(row => row.length === 4 && /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(row[0].trim()))
    .map((row, index) => ({
      index: index + 1,
      room: roomNumber(row[1]),
      remainingKwh: null,
      totalUsedKwh: null,
      totalPurchasedKwh: null,
      usedKwh: numericCell(row[2]),
      unitPriceCny: numericCell(row[3]),
      recordedAt: row[0].trim().replace(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/, (_, year, month, day) => `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    }))
    .filter(record => (!from || record.recordedAt.slice(0, 10) >= from) && (!to || record.recordedAt.slice(0, 10) <= to));
  const pagination = text.match(/第\s*(\d+)\s*页\s*\/\s*共\s*(\d+)\s*页/);
  if (!pagination) {
    const error = new Error('Unable to recognize Lihu phase II electricity pagination.');
    error.code = 'PAGE_CHANGED';
    throw error;
  }
  return {
    remainingKwh: Number(balance[1].replaceAll(',', '')),
    records,
    page: Number(pagination[1]),
    totalPages: Number(pagination[2])
  };
}

function roomNumber(value) {
  return String(value ?? '').trim().split(/[#＃]/).pop().replace(/^0+(?=\d)/, '');
}

function numericCell(value) {
  const text = String(value ?? '').trim().replaceAll(',', '');
  return text && Number.isFinite(Number(text)) ? Number(text) : null;
}

function roomNotFound(message) {
  const error = new Error(message);
  error.code = 'ELECTRICITY_ROOM_NOT_FOUND';
  error.hint = 'Use the room number shown in the building/floor/room dropdowns of the Lihu phase II electricity page.';
  return error;
}
