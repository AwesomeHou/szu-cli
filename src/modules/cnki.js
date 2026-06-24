import { getLaunchOptions } from './browser-options.js';
import { buildCnkiSearchPayload, parseCnkiSearchMeta } from './cnki-parser.js';
import { getProfilePath } from './paths.js';

const CNKI_ACCESS_URL = 'https://www.lib.szu.edu.cn/er/access/16084';

export async function getCnkiStatus(options = {}) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return mockData().status;
  }
  assertHeaded(options);

  const context = await launchContext(options);
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await gotoPage(page, options.url ?? CNKI_ACCESS_URL);
    await waitForAcademicPage(page);
    const state = await extractState(page);
    assertAccessible(state, 'CNKI');
    const meta = parseCnkiSearchMeta(state.text);

    return {
      available: true,
      authorized: meta.authorized,
      institution: meta.institution,
      requiresHeaded: true,
      sourceUrl: page.url()
    };
  } finally {
    await context.close();
  }
}

export async function searchCnki(options = {}) {
  if (!options.keyword) {
    throw new Error('cnki search requires a keyword.');
  }
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return {
      ...mockData().search,
      keyword: options.keyword,
      items: (mockData().search?.items ?? []).slice(0, options.limit)
    };
  }
  assertHeaded(options);

  const context = await launchContext(options);
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await gotoPage(page, options.url ?? CNKI_ACCESS_URL);
    await waitForAcademicPage(page);
    await page.fill('#txt_search', options.keyword);
    await page.locator('input.search-btn').click({ timeout: 10000 });
    await waitForAcademicPage(page);
    await page.waitForSelector('.result-table-list tr, table tbody tr', { timeout: 25000 }).catch(() => {});
    const state = await extractState(page);
    assertAccessible(state, 'CNKI');
    const rows = await extractCnkiRows(page);

    return buildCnkiSearchPayload({
      keyword: options.keyword,
      text: state.text,
      rows,
      limit: options.limit,
      sourceUrl: page.url()
    });
  } finally {
    await context.close();
  }
}

async function extractCnkiRows(page) {
  return page.evaluate(() => {
    const tableRows = [...document.querySelectorAll('table tbody tr')].map((row) => {
      const anchor = row.querySelector('a[href*="detail"], a[href*="kcms"]');
      const cells = [...row.cells].map((cell) => cell.innerText.trim());
      return {
        cells,
        href: anchor?.href ?? null,
        rawText: row.innerText.trim()
      };
    }).filter((row) => row.cells.length >= 5);

    if (tableRows.length) {
      return tableRows;
    }

    return [...document.querySelectorAll('a[href*="detail"], a[href*="kcms"]')]
      .map((anchor, index) => {
        const block = nearestTextBlock(anchor);
        return {
          index: index + 1,
          title: anchor.innerText.trim(),
          href: anchor.href,
          rawText: block
        };
      })
      .filter((row) => row.title);

    function nearestTextBlock(anchor) {
      let node = anchor;
      for (let i = 0; i < 5 && node?.parentElement; i += 1) {
        node = node.parentElement;
        const text = node.innerText?.trim();
        if (text && text.length > anchor.innerText.length + 20) {
          return text;
        }
      }
      return anchor.innerText.trim();
    }
  });
}

function mockData() {
  return JSON.parse(process.env.SZU_MOCK_CNKI_JSON ?? '{}');
}

async function launchContext(options) {
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

async function gotoPage(page, url) {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (!response || response.status() >= 500) {
      throw new Error(`HTTP ${response?.status() ?? 'unknown'}`);
    }
  } catch (cause) {
    const error = new Error('CNKI is not reachable.');
    error.code = 'NETWORK_REQUIRED';
    error.hint = 'Use campus network and headed mode, then try again.';
    error.cause = cause;
    throw error;
  }
}

async function waitForAcademicPage(page) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4000);
}

async function extractState(page) {
  const text = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  return { text, url: page.url(), title: await page.title().catch(() => '') };
}

function assertHeaded(options) {
  if (options.headless !== false) {
    const error = new Error('CNKI MVP requires --headed.');
    error.code = 'HEADED_REQUIRED';
    error.hint = 'Run with `--headed`; headless mode is not reliable for this provider.';
    throw error;
  }
}

function assertAccessible(state, provider) {
  if (/统一身份认证|多因子认证|企业微信验证码|短信验证码/.test(state.text)) {
    const error = new Error(`${provider} requires SZU re-authentication.`);
    error.code = 'LOGIN_REQUIRED';
    error.hint = 'Complete authentication in the opened browser and retry.';
    throw error;
  }
  if (/请完成安全验证|向右滑动完成验证|captcha/i.test(state.text) || /\/verify\//i.test(state.url) || state.title === '安全验证') {
    const error = new Error(`${provider} security verification is required.`);
    error.code = 'RATE_LIMITED';
    error.hint = 'Complete verification manually; the CLI will not bypass CAPTCHA or sliders.';
    throw error;
  }
}
