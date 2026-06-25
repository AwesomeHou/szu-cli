import { getLaunchOptions } from './browser-options.js';
import { buildCnkiItemPayload, buildCnkiSearchPayload, formatCnkiSearchExports, parseCnkiSearchMeta } from './cnki-parser.js';
import { getProfilePath } from './paths.js';

const CNKI_ACCESS_URL = 'https://www.lib.szu.edu.cn/er/access/16084';
const CNKI_ADVANCED_URL = 'https://kns.cnki.net/kns8s/AdvSearch';

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
  if (!options.keyword && !hasAdvancedConditions(options)) {
    throw new Error('cnki search requires a keyword.');
  }
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return {
      ...mockData().search,
      keyword: options.keyword,
      ...(options.advanced ? { advanced: options.advanced } : {}),
      ...(options.format ? { exports: formatCnkiSearchExports((mockData().search?.items ?? []).slice(0, options.limit), options.format) } : {}),
      items: (mockData().search?.items ?? []).slice(0, options.limit)
    };
  }
  assertHeaded(options);

  const context = await launchContext(options);
  try {
    const page = context.pages()[0] ?? await context.newPage();
    if (hasAdvancedConditions(options)) {
      await runAdvancedSearch(page, options);
    } else {
      await runQuickSearch(page, options);
    }
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
      advanced: options.advanced,
      format: options.format,
      sourceUrl: page.url()
    });
  } finally {
    await context.close();
  }
}

export async function getCnkiItem(target, options = {}) {
  if (!target) {
    throw new Error('cnki item requires a URL.');
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
    assertAccessible(state, 'CNKI');
    const detail = await extractCnkiDetail(page);

    return buildCnkiItemPayload({
      text: state.text,
      detail,
      sourceUrl: page.url()
    });
  } finally {
    await context.close();
  }
}

async function runQuickSearch(page, options) {
  await gotoPage(page, options.url ?? CNKI_ACCESS_URL);
  await waitForAcademicPage(page);
  await page.fill('#txt_search', options.keyword);
  await page.locator('input.search-btn').click({ timeout: 10000 });
}

async function runAdvancedSearch(page, options) {
  await gotoPage(page, options.url ?? CNKI_ADVANCED_URL);
  await waitForAcademicPage(page);
  const state = await extractState(page);
  assertAccessible(state, 'CNKI');

  await page.evaluate((conditions) => {
    const checkedDb = document.querySelector('#CheckedDB');
    if (checkedDb) {
      checkedDb.value = 'YSTT4HG0';
      checkedDb.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const classId = document.querySelector('#classid');
    if (classId) {
      classId.value = 'YSTT4HG0';
      classId.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const resource = document.querySelector('#resource');
    if (resource) {
      resource.value = 'JOURNAL';
      resource.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const rows = [...document.querySelectorAll('#gradetxt > dd')]
      .filter((row) => row.querySelector('input[type="text"]'));
    if (conditions.length > rows.length) {
      throw new Error(`CNKI advanced page only exposed ${rows.length} condition rows.`);
    }

    conditions.forEach((condition, index) => {
      const row = rows[index];
      const fieldSpan = row.querySelector('.sort.reopt .sort-default span');
      const input = row.querySelector('input[type="text"]');
      if (!fieldSpan || !input) {
        throw new Error('CNKI advanced search fields changed.');
      }

      const fieldOption = row.querySelector(`.sort.reopt .sort-list a[title="${condition.label}"]`);
      if (fieldOption) {
        fieldOption.click();
      } else {
        fieldSpan.textContent = condition.label;
        fieldSpan.setAttribute('value', condition.code);
        fieldSpan.dataset.value = condition.code;
        fieldSpan.dataset.opter = 'DEFAULT';
      }

      const exactSpan = row.querySelector('.sort.special .sort-default span');
      if (exactSpan) {
        exactSpan.textContent = '精确';
        exactSpan.setAttribute('value', '=');
      }

      const logicalSpan = [...row.querySelectorAll('.sort-default span')]
        .find((span) => /^(AND|OR|NOT)$/.test(span.textContent.trim()));
      if (logicalSpan && index < conditions.length - 1) {
        logicalSpan.textContent = condition.operator ?? 'AND';
        logicalSpan.setAttribute('value', condition.operator ?? 'AND');
      }

      input.value = condition.value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }, options.advanced.conditions);

  await page.locator('input.btn-search[value="检索"], .btn-search').first().click({ timeout: 10000 });
}

function hasAdvancedConditions(options) {
  return Boolean(options.advanced?.conditions?.length);
}

async function extractCnkiDetail(page) {
  return page.evaluate(() => {
    const authorRows = [...document.querySelectorAll('.doc .wx-tit h3.author, .wx-tit h3.author')];
    return {
      title: pickFirstText(['.doc .wx-tit h1', '.wx-tit h1', '.doc h1', 'h1']),
      authors: pickJoinedFrom(authorRows[0], 'a') || authorRows[0]?.innerText?.trim() || '',
      institutions: pickJoinedFrom(authorRows[1], 'a') || authorRows[1]?.innerText?.trim() || '',
      source: pickText('.doc .top-tip, .top-tip, .sourinfo, .source, [class*="journal"]'),
      abstract: pickText('#ChDivSummary, .doc .abstract-text, .abstract, [class*="abstract"]') ?? pickByLabel(['摘要', '摘 要', 'Abstract']),
      keywords: pickJoined('.doc p.keywords a, p.keywords a, .keywords a, [class*="keyword"] a') || pickText('.doc p.keywords, p.keywords, .keywords, [class*="keyword"]')
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

    function pickJoinedFrom(root, selector) {
      if (!root) {
        return '';
      }
      return [...root.querySelectorAll(selector)]
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
