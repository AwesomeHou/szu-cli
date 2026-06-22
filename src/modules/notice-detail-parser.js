const BASE_URL = 'https://www1.szu.edu.cn/board/';
const LINK_RE = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const HREF_RE = /\bhref=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

export function resolveNoticeViewUrl(value) {
  if (/^https?:\/\//i.test(value)) {
    return new URL(value).toString();
  }

  if (/^\d+$/.test(value)) {
    return new URL(`view.asp?id=${value}`, BASE_URL).toString();
  }

  const error = new Error('notice view requires a numeric id or absolute URL.');
  error.code = 'UNSUPPORTED_ACTION';
  throw error;
}

export function parseNoticeDetailHtml(html, options = {}) {
  const url = options.url;
  const cleanHtml = removeInvisibleBlocks(html);
  const contentHtml = extractContentHtml(cleanHtml);
  const contentLines = htmlToLineArray(contentHtml);
  const legacyLines = extractLegacyDetailLines(contentLines);
  const title = extractTitle(cleanHtml, legacyLines);
  const meta = extractMeta(htmlToText(cleanHtml), legacyLines);

  return {
    id: new URL(url).searchParams.get('id'),
    title,
    publisher: meta.publisher,
    publishedAt: meta.publishedAt,
    contentText: extractContentText(contentLines, legacyLines),
    attachments: extractAttachments(contentHtml, url),
    url
  };
}

function extractTitle(html, legacyLines) {
  const titleCell = html.match(/<td\b[^>]*(?:class|id)=["'][^"']*(?:info_title|title)[^"']*["'][^>]*>([\s\S]*?)<\/td>/i);
  if (titleCell) {
    return htmlToText(titleCell[1]);
  }

  if (legacyLines?.[0]) {
    return legacyLines[0];
  }

  return stripSiteSuffix(htmlToText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''));
}

function extractMeta(text, legacyLines) {
  const legacyMeta = legacyLines ? parseLegacyMetaLine(legacyLines[1]) : {};
  return {
    publisher: text.match(/发布单位[:：]\s*([^\s　]+(?:[^\s　]*))/)?.[1] ?? legacyMeta.publisher ?? null,
    publishedAt: normalizeDateTime(text.match(/发布时间[:：]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/)?.[1])
      ?? legacyMeta.publishedAt
      ?? null
  };
}

function extractContentHtml(html) {
  return html.match(/<td\b[^>]*(?:id|class)=["'][^"']*(?:content|neirong|zw)[^"']*["'][^>]*>([\s\S]*?)<\/td>/i)?.[1]
    ?? html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]
    ?? html;
}

function extractAttachments(html, pageUrl) {
  const attachments = [];
  for (const match of html.matchAll(LINK_RE)) {
    const href = firstMatch(match[1].match(HREF_RE));
    const name = htmlToText(match[2]);
    if (!href || !name || !isAttachment(href, name)) {
      continue;
    }
    attachments.push({
      name,
      url: new URL(href, pageUrl).toString()
    });
  }
  return attachments;
}

function extractLegacyDetailLines(lines) {
  const startIndex = lines.findIndex((line) => line.includes('关闭窗口') && line.includes('打印'));
  if (startIndex === -1) {
    return null;
  }

  const detailLines = lines.slice(startIndex + 1);
  const endIndex = detailLines.findIndex((line) => line.startsWith('撰稿：') || line.includes('深大新闻网'));
  return (endIndex === -1 ? detailLines : detailLines.slice(0, endIndex)).filter(Boolean);
}

function extractContentText(contentLines, legacyLines) {
  if (!legacyLines) {
    return contentLines.join('\n');
  }

  const metaIndex = legacyLines.findIndex((line, index) => index > 0 && parseLegacyMetaLine(line).publishedAt);
  const startIndex = metaIndex === -1 ? 1 : metaIndex + 1;
  return legacyLines
    .slice(startIndex)
    .filter((line) => !isIdentityLine(line))
    .join('\n');
}

function parseLegacyMetaLine(line = '') {
  const match = line.match(/^(.+?)\s+(\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)$/);
  if (!match) {
    return {};
  }

  return {
    publisher: match[1].trim(),
    publishedAt: normalizeDateTime(match[2])
  };
}

function normalizeDateTime(value) {
  if (!value) {
    return null;
  }
  const match = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) {
    return value;
  }

  const [, year, month, day, hour, minute, second] = match;
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  if (!hour) {
    return date;
  }
  return `${date} ${hour.padStart(2, '0')}:${minute}:${second ?? '00'}`;
}

function isIdentityLine(line) {
  return /^（.*\d{6,}.*）$/.test(line);
}

function stripSiteSuffix(text) {
  return text.replace(/[—-]深圳大学内部网$/, '').trim();
}

function isAttachment(href, name) {
  return /\.(docx?|xlsx?|pptx?|pdf|zip|rar|7z)(?:$|\?)/i.test(href) || /\.(docx?|xlsx?|pptx?|pdf|zip|rar|7z)$/i.test(name);
}

function htmlToLines(html) {
  return htmlToLineArray(html).join('\n');
}

function htmlToLineArray(html) {
  return decodeHtml(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|tr|td|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function htmlToText(html) {
  return htmlToLines(html).replace(/\n+/g, ' ').trim();
}

function removeInvisibleBlocks(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');
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

function firstMatch(match) {
  if (!match) {
    return null;
  }
  return match[1] ?? match[2] ?? match[3] ?? null;
}
