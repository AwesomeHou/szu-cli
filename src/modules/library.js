import { getLaunchOptions } from './browser-options.js';
import {
  buildLibraryItemPayload,
  buildLibrarySearchPayload,
  buildLibrarySearchUrl,
  hasAdvancedFields,
  parseLibrarySearchMeta
} from './library-parser.js';
import { getProfilePath } from './paths.js';

const LIBRARY_SEARCH_URL = 'https://www.lib.szu.edu.cn/opac/search.aspx';
const LIBRARY_USER_URL = 'https://www.lib.szu.edu.cn/opac/user/userinfo.aspx';
const LIBRARY_SEARCH_RESULT_URL = 'https://www.lib.szu.edu.cn/opac/searchresult.aspx';

export async function getLibraryStatus(options = {}) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return mockStatus();
  }

  const context = await launchLibraryContext(options);
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await warmLibraryLogin(page);
    await gotoLibrary(page, options.url ?? LIBRARY_SEARCH_URL);
    const text = await bodyText(page);
    const meta = parseLibrarySearchMeta(text);

    return {
      available: true,
      loggedIn: meta.loggedIn,
      historyRecorded: meta.historyRecorded,
      sourceUrl: page.url()
    };
  } finally {
    await context.close();
  }
}

export async function searchLibrary(options = {}) {
  if (!options.keyword && !hasAdvancedFields(options.advanced)) {
    throw new Error('library search requires a keyword or advanced search field.');
  }

  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return mockSearch(options);
  }

  const context = await launchLibraryContext(options);
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await warmLibraryLogin(page);
    await gotoLibrary(page, buildLibrarySearchUrl({
      keyword: options.keyword,
      ...options.advanced
    }).toString());
    await page.waitForTimeout(800);
    const snapshot = await extractSearchSnapshot(page);

    return buildLibrarySearchPayload({
      keyword: options.keyword,
      advanced: hasAdvancedFields(options.advanced) ? options.advanced : null,
      text: snapshot.text,
      rows: snapshot.rows,
      limit: options.limit,
      sourceUrl: page.url()
    });
  } finally {
    await context.close();
  }
}

export async function getLibraryItem(target, options = {}) {
  if (!target) {
    throw new Error('library item requires an id or URL.');
  }

  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return mockItem();
  }

  const context = await launchLibraryContext(options);
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await warmLibraryLogin(page);
    await gotoLibrary(page, buildItemUrl(target));
    await page.waitForTimeout(800);
    const snapshot = await extractItemSnapshot(page);

    return buildLibraryItemPayload({
      text: snapshot.text,
      rows: snapshot.rows,
      sourceUrl: page.url()
    });
  } finally {
    await context.close();
  }
}

function mockStatus() {
  if (process.env.SZU_MOCK_LIBRARY_NETWORK === 'down') {
    throwNetworkError();
  }
  const data = readMockData();
  return data.status;
}

function mockSearch(options) {
  if (process.env.SZU_MOCK_LIBRARY_NETWORK === 'down') {
    throwNetworkError();
  }
  const data = readMockData();
  return {
    ...data.search,
    keyword: options.keyword ?? options.advanced?.title ?? options.advanced?.author ?? null,
    ...(hasAdvancedFields(options.advanced) ? { advanced: options.advanced } : {}),
    items: (data.search?.items ?? []).slice(0, options.limit)
  };
}

function mockItem() {
  if (process.env.SZU_MOCK_LIBRARY_NETWORK === 'down') {
    throwNetworkError();
  }
  const data = readMockData();
  return data.item;
}

async function warmLibraryLogin(page) {
  await gotoLibrary(page, LIBRARY_USER_URL);
  await page.waitForTimeout(500);
}

async function gotoLibrary(page, url) {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!response || response.status() >= 500) {
      throw new Error(`HTTP ${response?.status() ?? 'unknown'}`);
    }
  } catch (cause) {
    throwNetworkError(cause);
  }
}

async function extractSearchSnapshot(page) {
  return page.evaluate(() => ({
    text: document.body.innerText,
    rows: [...document.querySelectorAll('table.tb tr')].map((row) => {
      const anchor = row.querySelector('a[href*="bookinfo.aspx"]');
      return {
        cells: [...row.cells].map((cell) => cell.innerText.trim()),
        id: row.querySelector('input[name="searchresult_cb"]')?.value ?? null,
        href: anchor?.href ?? null
      };
    })
  }));
}

async function extractItemSnapshot(page) {
  return page.evaluate(() => ({
    text: document.body.innerText,
    rows: [...document.querySelectorAll('table.tb tr')].map((row) => ({
      cells: [...row.cells].map((cell) => cell.innerText.trim())
    }))
  }));
}

async function bodyText(page) {
  return page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
}

function buildItemUrl(target) {
  if (/^https?:\/\//i.test(target)) {
    return target;
  }
  const params = new URLSearchParams({ ctrlno: target });
  return `https://www.lib.szu.edu.cn/opac/bookinfo.aspx?${params.toString()}`;
}

async function launchLibraryContext(options) {
  const { chromium } = await importPlaywright();
  return chromium.launchPersistentContext(
    getProfilePath(),
    getLaunchOptions({ headless: options.headless ?? true })
  );
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

function throwNetworkError(cause) {
  const error = new Error('SZU library OPAC is not reachable.');
  error.code = 'NETWORK_REQUIRED';
  error.hint = 'Check your network connection and try again.';
  error.cause = cause;
  throw error;
}

function readMockData() {
  return JSON.parse(process.env.SZU_MOCK_LIBRARY_JSON ?? '{}');
}
