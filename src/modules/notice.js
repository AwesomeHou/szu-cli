import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { classifyAuthPage } from './auth-detector.js';
import { getLaunchOptions } from './browser-options.js';
import { getProfilePath } from './paths.js';
import { filterNotices, paginateNotices, parseBoardHtml, parseNoticeListHtml } from './notice-parser.js';
import { parseNoticeDetailHtml, resolveNoticeViewUrl } from './notice-detail-parser.js';

const BOARD_URL = 'https://www1.szu.edu.cn/board/';
const LIST_URL = 'https://www1.szu.edu.cn/board/infolist.asp';

export async function getNoticeItems(options = {}) {
  const useListPage = options.keyword || options.page > 1 || options.pages > 1;
  const html = options.keyword
    ? await loadNoticeSearchHtml(options)
    : useListPage
      ? await loadPageHtml(LIST_URL, options)
      : await loadBoardHtml(options);
  const authState = classifyAuthPage({
    url: options.finalUrl ?? (useListPage ? LIST_URL : BOARD_URL),
    title: extractTitle(html),
    text: stripTags(html)
  });

  if (!authState.loggedIn) {
    const error = new Error('Browser profile is not logged in to SZU board.');
    error.code = 'LOGIN_REQUIRED';
    error.hint = 'Run `szu auth login --url https://www1.szu.edu.cn/board/` and complete login.';
    throw error;
  }

  const notices = useListPage
    ? parseNoticeListHtml(html, { baseUrl: BOARD_URL })
    : parseBoardHtml(html, {
      baseUrl: BOARD_URL,
      now: options.now ?? new Date()
    });
  assertCompleteNoticeSchema(notices);
  const filtered = useListPage
    ? notices
    : filterNotices(notices, { keyword: options.keyword });
  const page = options.page ?? 1;
  const pages = options.pages ?? 1;
  const limit = options.limit ?? 10;

  return {
    items: paginateNotices(filtered, { page, pages, limit }),
    page,
    pages,
    limit,
    total: filtered.length,
    ...(options.keyword ? {
      search: {
        keyword: options.keyword,
        range: options.range,
        type: options.type
      }
    } : {}),
    sourceUrl: options.finalUrl ?? (useListPage ? LIST_URL : BOARD_URL)
  };
}

export async function getNoticeDetail(target, options = {}) {
  const url = resolveNoticeViewUrl(target);
  const html = await loadPageHtml(url, options);
  const authState = classifyAuthPage({
    url: options.finalUrl ?? url,
    title: extractTitle(html),
    text: stripTags(html)
  });

  if (!authState.loggedIn) {
    const error = new Error('Browser profile is not logged in to SZU board.');
    error.code = 'LOGIN_REQUIRED';
    error.hint = 'Run `szu auth login --url https://www1.szu.edu.cn/board/` and complete login.';
    throw error;
  }

  return parseNoticeDetailHtml(html, {
    url: options.finalUrl ?? url
  });
}

export async function downloadNoticeAttachment(target, options = {}) {
  const url = resolveNoticeViewUrl(target);

  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    const html = await loadPageHtml(url, options);
    assertLoggedIn(html, url);
    const detail = parseNoticeDetailHtml(html, { url });
    const attachment = selectAttachment(detail.attachments, options.index);
    const savedPath = resolveOutputPath(attachment, options);
    await mkdir(dirname(savedPath), { recursive: true });
    await writeFile(savedPath, process.env.SZU_MOCK_NOTICE_ATTACHMENT_TEXT ?? 'mock attachment');
    return {
      id: detail.id,
      attachment,
      savedPath,
      url: detail.url
    };
  }

  const profilePath = getProfilePath();
  if (!existsSync(profilePath)) {
    throwLoginRequired('Browser profile does not exist.', 'Run `szu auth login --url https://www1.szu.edu.cn/board/` first.');
  }

  const { chromium } = await importPlaywright();
  const context = await chromium.launchPersistentContext(
    profilePath,
    {
      ...getLaunchOptions({ headless: options.headless ?? true }),
      acceptDownloads: true
    }
  );

  let blockedMessage = null;
  try {
    const page = context.pages()[0] ?? await context.newPage();
    page.on('dialog', async (dialog) => {
      blockedMessage = dialog.message();
      await dialog.accept();
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    options.finalUrl = page.url();
    const html = await page.content();
    assertLoggedIn(html, options.finalUrl);

    const detail = parseNoticeDetailHtml(html, { url: options.finalUrl });
    const attachment = selectAttachment(detail.attachments, options.index);
    const locator = page.locator('a').filter({ hasText: attachment.name }).first();
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
      locator.click()
    ]);

    if (!download) {
      const error = new Error(blockedMessage ?? 'The attachment did not start downloading.');
      error.code = 'PERMISSION_DENIED';
      error.hint = 'Try again after confirming the account can download this attachment in the browser.';
      throw error;
    }

    const savedPath = resolveOutputPath({
      ...attachment,
      name: download.suggestedFilename() || attachment.name
    }, options);
    await mkdir(dirname(savedPath), { recursive: true });
    await download.saveAs(savedPath);
    return {
      id: detail.id,
      attachment,
      savedPath,
      url: detail.url
    };
  } finally {
    await context.close();
  }
}

function assertCompleteNoticeSchema(notices) {
  for (const notice of notices) {
    const missing = ['id', 'category', 'title', 'dateText', 'date', 'time', 'url']
      .filter((key) => !Object.hasOwn(notice, key));
    if (missing.length > 0) {
      const error = new Error(`Notice parser returned incomplete item fields: ${missing.join(', ')}`);
      error.code = 'PAGE_CHANGED';
      error.hint = 'The SZU board page structure may have changed; update the notice parser.';
      throw error;
    }
  }
}

function assertLoggedIn(html, url) {
  const authState = classifyAuthPage({
    url,
    title: extractTitle(html),
    text: stripTags(html)
  });

  if (!authState.loggedIn) {
    throwLoginRequired();
  }
}

function selectAttachment(attachments, index = 1) {
  const attachment = attachments[index - 1];
  if (!attachment) {
    const error = new Error(`Attachment #${index} was not found.`);
    error.code = 'PAGE_CHANGED';
    error.hint = 'Run `szu notice view <id> --json` to inspect available attachments.';
    throw error;
  }
  return attachment;
}

function resolveOutputPath(attachment, options = {}) {
  if (options.output) {
    return options.output;
  }
  return join(options.dir ?? process.cwd(), sanitizeFileName(attachment.name));
}

function sanitizeFileName(name) {
  return name.replace(/^[·\s]+/, '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

function throwLoginRequired(message = 'Browser profile is not logged in to SZU board.', hint = 'Run `szu auth login --url https://www1.szu.edu.cn/board/` and complete login.') {
  const error = new Error(message);
  error.code = 'LOGIN_REQUIRED';
  error.hint = hint;
  throw error;
}

async function loadBoardHtml(options) {
  return loadPageHtml(BOARD_URL, options);
}

async function loadNoticeSearchHtml(options) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return process.env.SZU_MOCK_NOTICE_SEARCH_HTML ?? process.env.SZU_MOCK_NOTICE_LIST_HTML ?? '';
  }

  const profilePath = getProfilePath();
  if (!existsSync(profilePath)) {
    throwLoginRequired('Browser profile does not exist.', 'Run `szu auth login --url https://www1.szu.edu.cn/board/` first.');
  }

  const { chromium } = await importPlaywright();
  const context = await chromium.launchPersistentContext(
    profilePath,
    getLaunchOptions({ headless: options.headless ?? true })
  );

  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(BOARD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.selectOption('select[name="dayy"]', rangeToSiteValue(options.range));
    await page.selectOption('select[name="search_type"]', typeToSiteValue(options.type));
    await page.fill('input[name="keyword"]', options.keyword);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null),
      page.locator('input[name="searchb1"]').click()
    ]);
    options.finalUrl = page.url();
    return await page.content();
  } finally {
    await context.close();
  }
}

async function loadPageHtml(url, options) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    if (url.includes('infolist.asp')) {
      return process.env.SZU_MOCK_NOTICE_LIST_HTML ?? '';
    }
    return url.includes('view.asp')
      ? process.env.SZU_MOCK_NOTICE_DETAIL_HTML ?? ''
      : process.env.SZU_MOCK_NOTICE_HTML ?? '';
  }

  const profilePath = getProfilePath();
  if (!existsSync(profilePath)) {
    const error = new Error('Browser profile does not exist.');
    error.code = 'LOGIN_REQUIRED';
    error.hint = 'Run `szu auth login --url https://www1.szu.edu.cn/board/` first.';
    throw error;
  }

  const { chromium } = await importPlaywright();
  const context = await chromium.launchPersistentContext(
    profilePath,
    getLaunchOptions({ headless: options.headless ?? true })
  );

  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    options.finalUrl = page.url();
    return await page.content();
  } finally {
    await context.close();
  }
}

function rangeToSiteValue(range = '6m') {
  const values = {
    '24h': '1#24小时内',
    '7d': '7#1周内',
    '30d': '30#1个月内',
    '6m': '183#6个月内'
  };
  return values[range] ?? range;
}

function typeToSiteValue(type = 'full') {
  const values = {
    title: '标题',
    body: '正文',
    full: '全文'
  };
  return values[type] ?? type;
}

function extractTitle(html) {
  return stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function importPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const error = new Error('Playwright is not installed. Run `npm install`.');
    error.code = 'BACKEND_UNAVAILABLE';
    throw error;
  }
}
