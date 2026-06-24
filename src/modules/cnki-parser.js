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
    ...(options.advanced ? { advanced: options.advanced } : {}),
    total: meta.total,
    authorized: meta.authorized,
    institution: meta.institution,
    items: items.slice(0, limit),
    sourceUrl: options.sourceUrl
  };
}

export function buildCnkiItemPayload(options) {
  const detail = options.detail ?? {};
  const text = cleanText(options.text ?? '');
  const sourceInfo = parseSource(detail.source, text);
  return {
    provider: 'cnki',
    title: stringOrNull(detail.title),
    authors: splitAuthors(detail.authors).map(cleanAuthorName).filter(Boolean),
    institutions: splitAuthors(detail.institutions).map(cleanInstitutionName).filter(Boolean),
    source: sourceInfo.source,
    publishedAt: sourceInfo.publishedAt,
    year: sourceInfo.year,
    type: sourceInfo.type,
    abstract: cleanLabeledValue(detail.abstract, '摘要'),
    keywords: splitAuthors(cleanLabeledValue(detail.keywords, '关键词')),
    doi: matchValue(text, /DOI[：:]\s*([^\s]+)/i),
    fund: matchValue(text, /基金[：:]\s*(.*?)(?=\s*(?:分类号|DOI)[：:]|$)/),
    classification: matchValue(text, /分类号[：:]\s*([A-Z0-9.]+)/i),
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
  return unique(cleanText(value).split(/[;；,，]/).map((item) => item.trim()).filter(Boolean));
}

function unique(items) {
  return [...new Set(items)];
}

function parseSource(value, text) {
  const sourceText = cleanText(value).replace(/\s*[.。]\s*查看.*$/, '');
  const year = sourceText.match(/(\d{4})年/)?.[1]
    ?? text.match(/(?:网络首发时间|在线公开时间)[：:]?\s*(\d{4})/)?.[1]
    ?? null;
  const publishedAt = sourceText.match(/(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)/)?.[1] ?? null;
  return {
    source: stringOrNull(sourceText.replace(/\s*\d{4}年.*$/, '').replace(/\s*\d{4}-\d{2}-\d{2}.*$/, '')),
    publishedAt,
    year: publishedAt?.slice(0, 4) ?? year,
    type: '期刊'
  };
}

function cleanLabeledValue(value, label) {
  return stringOrNull(cleanText(value).replace(new RegExp(`^${label}[：:]?\\s*`), ''));
}

function cleanAuthorName(value) {
  const text = cleanText(value).replace(/^\d+$/, '').replace(/\d+$/g, '').trim();
  return text || null;
}

function cleanInstitutionName(value) {
  const text = cleanText(value).replace(/^\d+[.．、]\s*/, '').trim();
  return text || null;
}

function matchValue(text, pattern) {
  return stringOrNull(cleanText(text).match(pattern)?.[1]);
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
