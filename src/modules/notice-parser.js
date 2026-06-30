const FIELDSET_RE = /<fieldset\b[\s\S]*?<\/fieldset>/gi;
const LEGEND_CATEGORY_RE = /<legend\b[\s\S]*?<strong\b[^>]*>([\s\S]*?)<\/strong>[\s\S]*?<\/legend>/i;
const ROW_RE = /<tr\b[\s\S]*?<\/tr>/gi;
const LINK_RE = /<a\b([^>]*)>([\s\S]*?)<\/a>/i;
const HREF_RE = /\bhref=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const TITLE_RE = /\btitle=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const CELL_RE = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;

export function parseBoardHtml(html, options = {}) {
  const baseUrl = options.baseUrl ?? 'https://www1.szu.edu.cn/board/';
  const now = options.now ?? new Date();
  const notices = [];

  for (const fieldset of html.match(FIELDSET_RE) ?? []) {
    const category = extractCategory(fieldset);
    if (!category) {
      continue;
    }

    for (const row of fieldset.match(ROW_RE) ?? []) {
      const cells = Array.from(row.matchAll(CELL_RE), (match) => match[1]);
      if (cells.length < 2) {
        continue;
      }

      const linkMatch = cells[0].match(LINK_RE);
      if (!linkMatch) {
        continue;
      }

      const attrs = linkMatch[1];
      const href = firstMatch(attrs.match(HREF_RE));
      if (!href || !href.includes('view.asp?id=')) {
        continue;
      }

      const visibleTitle = cleanText(linkMatch[2]);
      const titleAttr = decodeHtml(firstMatch(attrs.match(TITLE_RE)) ?? '');
      const title = chooseTitle(visibleTitle, titleAttr);
      const dateText = cleanText(cells[1]);
      const normalizedDate = normalizeDateText(dateText, now);
      const url = new URL(href, baseUrl).toString();

      notices.push({
        id: new URL(url).searchParams.get('id'),
        category,
        title,
        dateText,
        date: normalizedDate.date,
        time: normalizedDate.time,
        url
      });
    }
  }

  return notices;
}

export function parseNoticeListHtml(html, options = {}) {
  const baseUrl = options.baseUrl ?? 'https://www1.szu.edu.cn/board/';
  const notices = [];

  for (const row of html.match(ROW_RE) ?? []) {
    const cells = Array.from(row.matchAll(CELL_RE), (match) => match[1]);
    if (cells.length < 6) {
      continue;
    }

    const sequence = cleanText(cells[0]);
    if (!/^\d+$/.test(sequence)) {
      continue;
    }

    const linkMatch = cells[3].match(LINK_RE);
    if (!linkMatch) {
      continue;
    }

    const href = firstMatch(linkMatch[1].match(HREF_RE));
    if (!href || !href.includes('view.asp?id=')) {
      continue;
    }

    const url = new URL(href, baseUrl).toString();
    const dateText = cleanText(cells[5]);
    const normalizedDate = normalizeListDateText(dateText);
    const isPinned = /\|置顶\|/.test(cleanText(cells[3]));

    notices.push({
      id: new URL(url).searchParams.get('id'),
      category: cleanText(cells[1]),
      publisher: cleanText(cells[2]),
      title: cleanListTitle(linkMatch[2]),
      dateText,
      date: normalizedDate,
      time: null,
      isPinned,
      hasAttachment: /attach\.gif/i.test(cells[4]),
      url
    });
  }

  return notices;
}

export function paginateNotices(notices, options = {}) {
  const limit = options.limit ?? notices.length;
  const page = options.page ?? 1;
  const pages = options.pages ?? 1;
  const start = (page - 1) * limit;
  const end = start + (limit * pages);
  return notices.slice(start, end);
}

export function filterNotices(notices, options = {}) {
  const keyword = options.keyword?.trim().toLocaleLowerCase('zh-CN');
  const limit = options.limit ?? notices.length;

  return notices
    .filter((notice) => {
      if (!keyword) {
        return true;
      }
      return [notice.title, notice.category, notice.dateText]
        .some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword));
    })
    .slice(0, limit);
}

function extractCategory(fieldset) {
  const match = fieldset.match(LEGEND_CATEGORY_RE);
  return match ? cleanText(match[1]) : null;
}

function firstMatch(match) {
  if (!match) {
    return null;
  }
  return match[1] ?? match[2] ?? match[3] ?? null;
}

function chooseTitle(visibleTitle, titleAttr) {
  if (!titleAttr) {
    return visibleTitle;
  }
  if (titleAttr.includes('专题：') || titleAttr.includes('时间：')) {
    return visibleTitle;
  }
  return titleAttr;
}

function cleanText(html) {
  return decodeHtml(html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
}

function cleanListTitle(html) {
  return cleanText(html).replace(/^\|置顶\|\s*/, '').replace(/^·\s*/, '');
}

function decodeHtml(text) {
  return text
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#10;', '\n')
    .replaceAll('&#xA;', '\n')
    .replaceAll('&nbsp;', ' ');
}

function normalizeDateText(dateText, now) {
  const match = dateText.match(/^(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!match) {
    return { date: null, time: null };
  }

  const [, month, day, hour, minute] = match;
  return {
    date: `${now.getFullYear()}-${pad(month)}-${pad(day)}`,
    time: hour ? `${pad(hour)}:${minute}` : null
  };
}

function normalizeListDateText(dateText) {
  const match = dateText.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}
