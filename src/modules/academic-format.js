const SUPPORTED_FORMATS = new Set(['markdown', 'gbt7714', 'bibtex']);

export function normalizeAcademicFormat(value) {
  if (!value) {
    return null;
  }
  const format = String(value).toLowerCase();
  if (!SUPPORTED_FORMATS.has(format)) {
    throw new Error(`Unsupported academic export format: ${value}.`);
  }
  return format;
}

export function formatAcademicSearchExports(items, format, provider) {
  const normalizedFormat = normalizeAcademicFormat(format);
  if (!normalizedFormat) {
    return null;
  }

  return {
    format: normalizedFormat,
    items: items.map((item, index) => formatAcademicItem(item, normalizedFormat, provider, index))
  };
}

function formatAcademicItem(item, format, provider, index) {
  if (format === 'markdown') {
    return `- ${formatGbt7714(item)}${item.url ? ` ${item.url}` : ''}`;
  }
  if (format === 'gbt7714') {
    return formatGbt7714(item);
  }
  return formatBibtex(item, provider, index);
}

function formatGbt7714(item) {
  const authors = formatAuthors(item.authors);
  const title = item.title ?? 'Untitled';
  const source = item.source ?? 'Unknown Source';
  const year = item.year ?? yearFromDate(item.publishedAt);
  const yearSuffix = year ? `, ${year}` : '';
  return `${authors ? `${authors}. ` : ''}${title}[J]. ${source}${yearSuffix}.`;
}

function formatBibtex(item, provider, index) {
  const key = buildBibtexKey(item, provider, index);
  const fields = [
    ['title', item.title],
    ['author', formatBibtexAuthors(item.authors)],
    ['journal', item.source],
    ['year', item.year ?? yearFromDate(item.publishedAt)],
    ['url', item.url]
  ].filter(([, value]) => value);

  const lines = fields.map(([name, value]) => `  ${name} = {${escapeBibtexValue(value)}},`);
  return [`@article{${key},`, ...lines, '}'].join('\n');
}

function buildBibtexKey(item, provider, index) {
  const year = item.year ?? yearFromDate(item.publishedAt) ?? 'unknown';
  const id = item.url?.match(/filename=([^&]+)/i)?.[1]
    ?? item.url?.match(/\/([^/?#]+)(?:[?#].*)?$/)?.[1]
    ?? `${item.index ?? index + 1}`;
  return `${provider}${year}${sanitizeBibtexKey(id)}`.toLowerCase();
}

function formatAuthors(authors) {
  return Array.isArray(authors) ? authors.filter(Boolean).join(', ') : '';
}

function formatBibtexAuthors(authors) {
  return Array.isArray(authors) ? authors.filter(Boolean).join(' and ') : '';
}

function yearFromDate(value) {
  return String(value ?? '').match(/\d{4}/)?.[0] ?? null;
}

function sanitizeBibtexKey(value) {
  return String(value ?? '').replace(/[^A-Za-z0-9]+/g, '');
}

function escapeBibtexValue(value) {
  return String(value).replace(/[{}]/g, '');
}
