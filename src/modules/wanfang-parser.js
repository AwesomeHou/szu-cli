const WANFANG_BASE_URL = 'https://s.wanfangdata.com.cn/';

export function parseWanfangSearchMeta(text) {
  const normalized = cleanText(text);
  return {
    total: matchNumber(normalized, /(?:共|找到)?\s*([\d,]+)\s*(?:篇|条文献)/),
    authorized: normalized.includes('深圳大学'),
    institution: normalized.includes('深圳大学') ? '深圳大学' : null
  };
}

export function parseWanfangSearchRows(rows = []) {
  return rows
    .map((row, index) => {
      const rawText = stringOrNull(row.rawText ?? [
        row.title,
        row.authors,
        row.source,
        row.abstract,
        row.stats
      ].filter(Boolean).join(' '));
      const sourceInfo = parseSource(row.source, rawText);
      return {
        index: row.index ?? index + 1,
        title: cleanTitle(row.title),
        authors: splitAuthors(cleanAuthorValue(row.authors) || sourceInfo.authors),
        source: sourceInfo.source,
        publishedAt: null,
        year: sourceInfo.year,
        type: sourceInfo.type,
        downloadCount: matchNumber(row.stats, /(?:下载量|下载)\s*[：:]?\s*([\d,]+)/),
        abstract: stringOrNull(row.abstract),
        url: absoluteWanfangUrl(row.href),
        rawText
      };
    })
    .filter((item) => item.title);
}

export function buildWanfangSearchPayload(options) {
  const meta = parseWanfangSearchMeta(options.text ?? '');
  const items = parseWanfangSearchRows(options.rows ?? []);
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

function parseSource(value, rawValue) {
  const text = cleanText(value);
  const raw = cleanText(rawValue);
  const compact = raw.match(/\[(?<type>[^\]]+)\](?<authors>.*?)-《(?<source>[^》]+)》(?<date>\d{4}年[^ ]*)?/);
  const year = text.match(/(\d{4})年/)?.[1] ?? compact?.groups?.date?.match(/(\d{4})年/)?.[1] ?? null;
  const source = stringOrNull(text.replace(/\s*\d{4}年.*$/, '')) ?? stringOrNull(compact?.groups?.source);
  return {
    authors: compact?.groups?.authors ?? '',
    source,
    year,
    type: compact?.groups?.type?.replace(/论文$/, '') ?? '期刊'
  };
}

function cleanTitle(value) {
  return stringOrNull(cleanText(value).replace(/^\d+\.\s*/, ''));
}

function absoluteWanfangUrl(href) {
  if (!href) {
    return null;
  }
  return new URL(href, WANFANG_BASE_URL).toString();
}

function splitAuthors(value) {
  return cleanText(value).split(/[;；,，]/).map((item) => item.trim()).filter(Boolean);
}

function cleanAuthorValue(value) {
  const text = cleanText(value);
  return text.startsWith('[') ? '' : text;
}

function matchNumber(text, pattern) {
  const match = cleanText(text).match(pattern);
  return match ? Number(match[1].replace(/,/g, '')) : null;
}

function stringOrNull(value) {
  const text = cleanText(value);
  return text || null;
}

function cleanText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
