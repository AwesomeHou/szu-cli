const OPAC_BASE_URL = 'https://www.lib.szu.edu.cn/opac/';
const SEARCH_RESULT_URL = `${OPAC_BASE_URL}searchresult.aspx`;

export function parseLibrarySearchMeta(text) {
  const normalized = cleanText(text);
  const total = matchNumber(normalized, /结果数[:：]\s*(\d+)/);
  const pageMatch = normalized.match(/第\s*(\d+)\s*\/\s*(\d+)\s*页/);
  const loggedIn = normalized.includes('退出') || normalized.includes('退出登录') || normalized.includes('登录成功');

  return {
    total,
    page: pageMatch ? Number(pageMatch[1]) : null,
    pageCount: pageMatch ? Number(pageMatch[2]) : null,
    loggedIn,
    historyRecorded: loggedIn
  };
}

export function parseLibrarySearchRows(rows) {
  return rows
    .filter((row) => row.cells?.length >= 8 && /^\d+$/.test(cleanText(row.cells[0])))
    .map((row) => {
      const cells = row.cells.map(cleanText);
      return {
        index: toNumber(cells[0]),
        id: stringOrNull(row.id ?? ctrlNoFromUrl(row.href)),
        title: stringOrNull(cells[1]),
        authors: stringOrNull(cells[2]),
        publisher: stringOrNull(cells[3]),
        publishYear: stringOrNull(cells[4]),
        callNumber: stringOrNull(cells[5]),
        holdings: toNumber(cells[6]),
        available: toNumber(cells[7]),
        detailUrl: absoluteOpacUrl(row.href)
      };
    });
}

export function buildLibrarySearchPayload(options) {
  const meta = parseLibrarySearchMeta(options.text ?? '');
  const items = parseLibrarySearchRows(options.rows ?? []);
  const limit = options.limit ?? items.length;

  return {
    keyword: options.keyword,
    ...(options.advanced ? { advanced: options.advanced } : {}),
    total: meta.total,
    page: meta.page ?? options.page ?? null,
    pageCount: meta.pageCount,
    loggedIn: meta.loggedIn,
    historyRecorded: meta.historyRecorded,
    items: items.slice(0, limit),
    sourceUrl: options.sourceUrl
  };
}

export function buildLibrarySearchUrl(options) {
  const advanced = hasAdvancedFields(options);
  const params = new URLSearchParams({
    dt: options.docType ?? 'ALL',
    cl: options.language ?? 'ALL',
    dp: String(options.limitPerPage ?? 20),
    sf: options.sort ?? 'M_PUB_YEAR',
    ob: options.order ?? 'DESC',
    sm: 'table',
    dept: options.location ?? 'ALL'
  });
  if (options.page) {
    params.set('page', String(options.page));
  }

  if (advanced) {
    appendIfPresent(params, 'title_f', options.title);
    appendIfPresent(params, 'author_f', options.author);
    appendIfPresent(params, 'keyword_f', options.subject);
    appendIfPresent(params, 'publisher_f', options.publisher);
    appendIfPresent(params, 'isbn_f', options.isbn);
    appendIfPresent(params, 'issn_f', options.issn);
    appendIfPresent(params, 'callno_f', options.callNumber);
    appendIfPresent(params, 'clc_f', options.classification);
    params.set('st', '2');
    params.set('ecx', '0');
  } else {
    params.set('anywords', options.keyword);
    params.set('ecx', '1');
    params.set('efz', '1');
  }

  return new URL(`${SEARCH_RESULT_URL}?${params.toString()}`);
}

export function hasAdvancedFields(options = {}) {
  return Boolean(
    options.title
    || options.author
    || options.subject
    || options.publisher
    || options.isbn
    || options.issn
    || options.callNumber
    || options.classification
  );
}

export function parseLibraryItemMeta(text) {
  const normalized = cleanText(text);
  const bookLine = normalized.match(/([^。；\n]*?)／(.+?)．—([^：]+)：([^，]+)，(\d{4})/);
  const isbnLine = normalized.match(/ISBN\s+([0-9Xx-]+)[：:]\s*([A-Z]+[A-Z0-9.]+)/);

  return {
    id: normalized.match(/系统控制号[：:]\s*(\d+)/)?.[1] ?? null,
    title: stringOrNull(bookLine?.[1]?.replace(/^.*?([^\s　]+)$/, '$1')),
    authors: stringOrNull(bookLine?.[2]),
    publisher: stringOrNull(bookLine?.[4]),
    publishYear: stringOrNull(bookLine?.[5]),
    isbn: stringOrNull(isbnLine?.[1]),
    price: stringOrNull(isbnLine?.[2]),
    loggedIn: normalized.includes('退出') || normalized.includes('登录成功')
  };
}

export function parseLibraryCopies(rows) {
  return rows
    .filter((row) => row.cells?.length >= 9 && cleanText(row.cells[0]) !== '馆藏地(排/架参考)')
    .map((row) => {
      const cells = row.cells.map(cleanText);
      return {
        location: stringOrNull(cells[0]),
        callNumber: stringOrNull(cells[1]),
        barcode: stringOrNull(cells[2]),
        volume: stringOrNull(cells[3]),
        year: stringOrNull(cells[4]),
        status: stringOrNull(cells[5]),
        loanType: stringOrNull(cells[6]),
        reservationQueue: toNumber(cells[7]),
        readerQueue: toNumber(cells[8])
      };
    });
}

export function buildLibraryItemPayload(options) {
  const meta = parseLibraryItemMeta(options.text ?? '');
  const copies = parseLibraryCopies(options.rows ?? []);

  return {
    ...meta,
    holdings: copies.length,
    available: copies.filter((copy) => copy.status === '可供出借').length,
    copies,
    sourceUrl: options.sourceUrl
  };
}

function absoluteOpacUrl(href) {
  if (!href) {
    return null;
  }
  return new URL(href, OPAC_BASE_URL).toString();
}

function appendIfPresent(params, key, value) {
  if (value) {
    params.set(key, value);
  }
}

function ctrlNoFromUrl(href) {
  if (!href) {
    return null;
  }
  try {
    return new URL(href, OPAC_BASE_URL).searchParams.get('ctrlno');
  } catch {
    return null;
  }
}

function matchNumber(text, pattern) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : null;
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
