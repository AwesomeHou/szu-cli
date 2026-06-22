import { existsSync } from 'node:fs';

import { classifyAuthPage } from './auth-detector.js';
import { getLaunchOptions } from './browser-options.js';
import { getProfilePath } from './paths.js';
import { filterNotices, parseBoardHtml } from './notice-parser.js';

const BOARD_URL = 'https://www1.szu.edu.cn/board/';

export async function getNoticeItems(options = {}) {
  const html = await loadBoardHtml(options);
  const authState = classifyAuthPage({
    url: options.finalUrl ?? BOARD_URL,
    title: extractTitle(html),
    text: stripTags(html)
  });

  if (!authState.loggedIn) {
    const error = new Error('Browser profile is not logged in to SZU board.');
    error.code = 'LOGIN_REQUIRED';
    error.hint = 'Run `szu auth login --url https://www1.szu.edu.cn/board/` and complete login.';
    throw error;
  }

  const notices = parseBoardHtml(html, {
    baseUrl: BOARD_URL,
    now: options.now ?? new Date()
  });
  assertCompleteNoticeSchema(notices);

  return {
    items: filterNotices(notices, {
      keyword: options.keyword,
      limit: options.limit
    }),
    sourceUrl: options.finalUrl ?? BOARD_URL
  };
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

async function loadBoardHtml(options) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return process.env.SZU_MOCK_NOTICE_HTML ?? '';
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
    await page.goto(BOARD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    options.finalUrl = page.url();
    return await page.content();
  } finally {
    await context.close();
  }
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
