import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

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
    const items = filterAcademicItems(mockData().search?.items ?? [], options).slice(0, options.limit);
    return {
      ...mockData().search,
      keyword: options.keyword,
      ...(options.advanced ? { advanced: options.advanced } : {}),
      ...(academicFilters(options) ? { filters: academicFilters(options) } : {}),
      ...(options.format ? { exports: formatCnkiSearchExports(items, options.format) } : {}),
      items
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

    return filterAcademicPayload(buildCnkiSearchPayload({
      keyword: options.keyword,
      text: state.text,
      rows,
      limit: options.limit,
      advanced: options.advanced,
      format: options.format,
      sourceUrl: page.url()
    }), options);
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

export async function downloadCnkiPdf(target, options = {}) {
  if (!target) {
    throw new Error('cnki download requires a URL.');
  }
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    const item = mockData().item ?? {};
    const savedPath = resolveDownloadPath(target, {
      ...options,
      suggestedFilename: `${extractCnkiId(target) ?? 'cnki-paper'}.pdf`
    });
    await mkdir(dirname(savedPath), { recursive: true });
    await writeFile(savedPath, process.env.SZU_MOCK_CNKI_PDF_TEXT ?? '%PDF-1.4 mock cnki pdf\n');
    return {
      provider: 'cnki',
      title: item.title ?? null,
      fileName: savedPath.split(/[\\/]/).at(-1),
      savedPath,
      sourceUrl: item.sourceUrl ?? target,
      downloadedBy: 'visible-button-click'
    };
  }
  assertHeaded(options);

  const context = await launchContext(options, { acceptDownloads: true });
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await openCnkiAccess(page, options);
    await gotoPage(page, target);
    await waitForAcademicPage(page);
    const state = await extractState(page);
    assertAccessible(state, 'CNKI');
    const detail = await extractCnkiDetail(page);
    const pdfButton = await findCnkiPdfDownloadButton(page);
    if (!pdfButton) {
      throwDownloadUnavailable('No visible CNKI PDF download button was found.');
    }

    const download = await clickCnkiPdfDownload(pdfButton, context);
    if (!download) {
      throwDownloadUnavailable('The visible CNKI PDF download button did not start a browser download.');
    }

    const failure = await download.failure().catch(() => null);
    if (failure) {
      throwDownloadUnavailable(`CNKI download failed: ${failure}`);
    }

    const savedPath = resolveDownloadPath(target, {
      ...options,
      suggestedFilename: download.suggestedFilename()
    });
    await mkdir(dirname(savedPath), { recursive: true });
    await download.saveAs(savedPath);

    return {
      provider: 'cnki',
      title: detail.title || null,
      fileName: download.suggestedFilename(),
      savedPath,
      sourceUrl: page.url(),
      downloadedBy: 'visible-button-click'
    };
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

function filterAcademicPayload(payload, options) {
  const filters = academicFilters(options);
  if (!filters) {
    return payload;
  }
  const items = filterAcademicItems(payload.items, options);
  return {
    ...payload,
    filters,
    items,
    ...(payload.exports ? { exports: formatCnkiSearchExports(items, payload.exports.format) } : {})
  };
}

function filterAcademicItems(items = [], options = {}) {
  return items.filter((item) => (
    (!options.year || item.year === options.year)
    && (!options.type || item.type === options.type)
  ));
}

function academicFilters(options = {}) {
  if (!options.year && !options.type) {
    return null;
  }
  return {
    ...(options.year ? { year: options.year } : {}),
    ...(options.type ? { type: options.type } : {})
  };
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

async function findCnkiPdfDownloadButton(page) {
  const candidates = [
    page.locator('a').filter({ hasText: /^PDF下载$/ }),
    page.locator('li.btn-dlpdf a').filter({ hasText: /PDF下载/ }),
    page.locator('a, button, [role="button"]').filter({ hasText: /^PDF下载$/ })
  ];

  for (const locator of candidates) {
    const count = await locator.count().catch(() => 0);
    for (let index = 0; index < count; index += 1) {
      const item = locator.nth(index);
      if (await item.isVisible().catch(() => false)) {
        return item;
      }
    }
  }
  return null;
}

async function clickCnkiPdfDownload(pdfButton, context) {
  const downloadPromise = waitForDownloadInContext(context, 45000);
  await pdfButton.click({ timeout: 10000 });
  return downloadPromise;
}

async function waitForDownloadInContext(context, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => done(null), timeoutMs);
    const pageListeners = new Map();

    function done(download) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      context.off('page', onPage);
      for (const [page, listener] of pageListeners) {
        page.off('download', listener);
      }
      resolve(download);
    }

    function watchPage(page) {
      if (pageListeners.has(page)) {
        return;
      }
      const listener = (download) => done(download);
      pageListeners.set(page, listener);
      page.on('download', listener);
    }

    function onPage(page) {
      watchPage(page);
    }

    for (const page of context.pages()) {
      watchPage(page);
    }
    context.on('page', onPage);
  });
}

async function openCnkiAccess(page, options = {}) {
  await gotoPage(page, options.url ?? CNKI_ACCESS_URL);
  await waitForAcademicPage(page);
  const state = await extractState(page);
  assertAccessible(state, 'CNKI');
}

function mockData() {
  return JSON.parse(process.env.SZU_MOCK_CNKI_JSON ?? '{}');
}

async function launchContext(options, launchOverrides = {}) {
  const { chromium } = await importPlaywright();
  return chromium.launchPersistentContext(
    getProfilePath(),
    {
      ...getLaunchOptions({ headless: options.headless ?? true }),
      ...launchOverrides
    }
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

function resolveDownloadPath(target, options = {}) {
  if (options.output) {
    return options.output;
  }
  const name = sanitizeFileName(options.suggestedFilename || `${extractCnkiId(target) ?? 'cnki-paper'}.pdf`);
  return join(options.dir ?? process.cwd(), name);
}

function extractCnkiId(target) {
  const url = String(target ?? '');
  const filename = url.match(/[?&]filename=([^&#]+)/i)?.[1];
  if (filename) {
    return filename;
  }
  return url.match(/\/([^/?#]+)(?:[?#].*)?$/)?.[1] ?? null;
}

function sanitizeFileName(name) {
  return String(name).replace(/^[·\s]+/, '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

function throwDownloadUnavailable(message) {
  const error = new Error(message);
  error.code = 'DOWNLOAD_UNAVAILABLE';
  error.hint = 'Open the CNKI item page manually, confirm PDF access, and retry one item at a time.';
  throw error;
}
