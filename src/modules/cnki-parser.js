const CNKI_BASE_URL = 'https://kns.cnki.net/';

export function parseCnkiSearchMeta(text) {
  const normalized = cleanText(text);
  return {
    total: matchNumber(normalized, /(?:共找到|找到|共)\s*([\d,]+)\s*条/),
    authorized: normalized.includes('深圳大学'),
    institution: normalized.includes('深圳大学') ? '深圳大学' : null
  };
}

export function parseCnkiSearchRows(rows = []) {
  return rows
    .map((row) => {
      const cells = (row.cells ?? []).map(cleanText);
      if (cells.length >= 7 && Number.isInteger(toNumber(cells[0]))) {
        const rawText = stringOrNull(row.rawText ?? cells.join(' '));
        return {
          index: toNumber(cells[0]),
          title: stringOrNull(cells[1]),
          authors: splitAuthors(cells[2]),
          source: stringOrNull(cells[3]),
          publishedAt: stringOrNull(cells[4]),
          year: cells[4]?.match(/\d{4}/)?.[0] ?? null,
          type: stringOrNull(cells[5]),
          downloadCount: toNumber(cells[6]) ?? matchNumber(rawText, /(\d+)\s*下载/),
          url: absoluteCnkiUrl(row.href),
          rawText
        };
      }
      return parseCnkiRawRow(row);
    })
    .filter((item) => item.title);
}

export function buildCnkiSearchPayload(options) {
  const meta = parseCnkiSearchMeta(options.text ?? '');
  const items = parseCnkiSearchRows(options.rows ?? []);
  const limit = options.limit ?? items.length;

  return {
    keyword: options.keyword,
    total: meta.total,
    authorized: meta.authorized,
    institution: meta.institution,
    items: items.slice(0, limit),
    sourceUrl: options.sourceUrl
  };
}

function parseCnkiRawRow(row) {
  const rawText = cleanText(row.rawText);
  const index = matchNumber(rawText, /^(\d+)\s+/);
  const downloadCount = matchNumber(rawText, /(\d+)\s*下载/);
  const publishedAt = rawText.match(/(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)/)?.[1] ?? null;

  return {
    index,
    title: stringOrNull(row.title),
    authors: splitAuthors(row.authors),
    source: stringOrNull(row.source),
    publishedAt,
    year: publishedAt?.slice(0, 4) ?? null,
    type: stringOrNull(row.type),
    downloadCount,
    url: absoluteCnkiUrl(row.href),
    rawText: stringOrNull(rawText)
  };
}

function absoluteCnkiUrl(href) {
  if (!href) {
    return null;
  }
  return new URL(href, CNKI_BASE_URL).toString();
}

function splitAuthors(value) {
  return cleanText(value).split(/[;；,，]/).map((item) => item.trim()).filter(Boolean);
}

function matchNumber(text, pattern) {
  const match = cleanText(text).match(pattern);
  return match ? Number(match[1].replace(/,/g, '')) : null;
}

function stringOrNull(value) {
  const text = cleanText(value);
  return text || null;
}

function toNumber(value) {
  const text = cleanText(value).replace(/,/g, '');
  if (!text) {
    return null;
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function cleanText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
