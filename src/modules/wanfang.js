import { getLaunchOptions } from './browser-options.js';
import { buildWanfangItemPayload, buildWanfangSearchPayload, parseWanfangSearchMeta } from './wanfang-parser.js';
import { getProfilePath } from './paths.js';

const WANFANG_ACCESS_URL = 'https://www.lib.szu.edu.cn/er/access/16075';

export async function getWanfangStatus(options = {}) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return mockData().status;
  }
  assertHeaded(options);

  const context = await launchContext(options);
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await gotoPage(page, options.url ?? WANFANG_ACCESS_URL);
    await waitForAcademicPage(page);
    const state = await extractState(page);
    assertAccessible(state, 'Wanfang');
    const meta = parseWanfangSearchMeta(state.text);

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

export async function searchWanfang(options = {}) {
  if (!options.keyword) {
    throw new Error('wanfang search requires a keyword.');
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
    await gotoPage(page, options.url ?? WANFANG_ACCESS_URL);
    await waitForAcademicPage(page);
    await page.fill('#search-input', options.keyword);
    await page.locator('.search-button').first().click({ timeout: 10000 });
    await waitForAcademicPage(page);
    await page.waitForSelector('.normal-list.periodical-list, .result-item, .list-item', { timeout: 25000 }).catch(() => {});
    const state = await extractState(page);
    assertAccessible(state, 'Wanfang');
    const rows = await extractWanfangRows(page);

    return buildWanfangSearchPayload({
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

export async function getWanfangItem(target, options = {}) {
  if (!target) {
    throw new Error('wanfang item requires a URL.');
  }
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return mockData().item;
  }
  assertHeaded(options);

  const context = await launchContext(options);
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await gotoPage(page, target);
    await waitForAcademicPage(page);
    const state = await extractState(page);
    assertAccessible(state, 'Wanfang');
    const detail = await extractWanfangDetail(page);

    return buildWanfangItemPayload({
      text: state.text,
      detail,
      sourceUrl: page.url()
    });
  } finally {
    await context.close();
  }
}

async function extractWanfangDetail(page) {
  return page.evaluate(() => {
    return {
      title: pickFirstText(['.detailTitleCN', '.detailTitle .title', 'h1, .title']),
      authors: pickJoined('.author.detailTitle .test-detail-author, .author.detailTitle a, .author.detailTitle span.author-margin'),
      institutions: pickText('.organization.detailOrganization .test-detail-org, .organization.detailOrganization'),
      source: pickText('.periodicalName, .periodicalInformation a, .source, [class*="journal"]'),
      abstract: pickText('.summary .text-overflow, .summary, .abstract, [class*="abstract"]') ?? pickByLabel(['摘要', 'Abstract']),
      keywords: pickText('.keyword .itemKeyword, .keyword, .keywords, [class*="keyword"]')
    };

    function pickText(selector) {
      return document.querySelector(selector)?.innerText?.trim() ?? '';
    }

    function pickFirstText(selectors) {
      for (const selector of selectors) {
        const text = pickText(selector);
        if (text) {
          return text;
        }
      }
      return '';
    }

    function pickJoined(selector) {
      return [...document.querySelectorAll(selector)]
        .map((node) => node.innerText?.trim())
        .filter(Boolean)
        .join('; ');
    }

    function pickByLabel(labels) {
      const bodyText = document.body.innerText ?? '';
      for (const label of labels) {
        const match = bodyText.match(new RegExp(`${label}[：:]\\s*([^\\n]+)`));
        if (match?.[1]) {
          return `${label}：${match[1].trim()}`;
        }
      }
      return null;
    }
  });
}

async function extractWanfangRows(page) {
  return page.evaluate(() => {
    const cards = [
      ...document.querySelectorAll('.normal-list.periodical-list, .result-item, .list-item')
    ];
    const rows = cards.map((card, index) => {
      const anchor = card.querySelector('.title-area a, a[href*="wanfangdata"], a[href*="/periodical"], a');
      const titleNode = card.querySelector('.title-area, .ajust, [class*="title"]');
      const hiddenId = card.querySelector('.title-id-hidden')?.innerText?.trim();
      return {
        index: index + 1,
        title: cleanTitle(anchor?.innerText ?? titleNode?.innerText ?? firstLine(card.innerText)),
        href: anchor?.href ?? hrefFromHiddenId(hiddenId),
        authors: textOf(card, '[class*="author"]'),
        source: textOf(card, '[class*="source"], [class*="journal"]'),
        abstract: textOf(card, '.abstract-area, [class*="abstract"], [class*="summary"]'),
        stats: card.innerText,
        rawText: card.innerText.trim()
      };
    }).filter((row) => row.title && row.rawText.length > 10);

    if (rows.length) {
      return rows;
    }

    return [...document.querySelectorAll('a[href*="wanfangdata"], a[href*="/periodical"]')]
      .map((anchor, index) => ({
        index: index + 1,
        title: anchor.innerText.trim(),
        href: anchor.href,
        authors: '',
        source: '',
        abstract: '',
        stats: nearestTextBlock(anchor),
        rawText: nearestTextBlock(anchor)
      }))
      .filter((row) => row.title);

    function textOf(root, selector) {
      return root.querySelector(selector)?.innerText.trim() ?? '';
    }

    function firstLine(text) {
      return String(text ?? '').split('\n').map((line) => line.trim()).find(Boolean) ?? '';
    }

    function cleanTitle(text) {
      return String(text ?? '').replace(/^\s*\d+\.\s*/, '').trim();
    }

    function hrefFromHiddenId(value) {
      const id = String(value ?? '').replace(/^periodical_/, '').trim();
      return id ? `https://d.wanfangdata.com.cn/periodical/${id}` : null;
    }

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
  return JSON.parse(process.env.SZU_MOCK_WANFANG_JSON ?? '{}');
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
    const error = new Error('Wanfang is not reachable.');
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
    const error = new Error('Wanfang MVP requires --headed.');
    error.code = 'HEADED_REQUIRED';
    error.hint = 'Run with `--headed`; headless mode is not reliable for this provider.';
    throw error;
  }
}

function assertAccessible(state, provider) {
  if (/fault filter abort/i.test(state.text)) {
    const error = new Error(`${provider} blocked the headless request.`);
    error.code = 'HEADED_REQUIRED';
    error.hint = 'Run with `--headed`; this provider filters headless navigation.';
    throw error;
  }
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
