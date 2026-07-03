import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { getLaunchOptions } from './browser-options.js';
import { buildWanfangItemPayload, buildWanfangSearchPayload, formatWanfangSearchExports, parseWanfangSearchMeta } from './wanfang-parser.js';
import { getProfilePath } from './paths.js';

const WANFANG_ACCESS_URL = 'https://www.lib.szu.edu.cn/er/access/16075';
const WANFANG_PERIODICAL_SEARCH_URL = 'https://s.wanfangdata.com.cn/periodical';

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
  const advancedQuery = buildWanfangAdvancedQuery(options.advanced);
  const keyword = options.keyword ?? advancedQuery;
  if (!keyword) {
    throw new Error('wanfang search requires a keyword.');
  }
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    const items = filterAcademicItems(mockData().search?.items ?? [], options).slice(0, options.limit);
    return {
      ...mockData().search,
      keyword,
      ...(options.advanced ? { advanced: options.advanced } : {}),
      ...(academicFilters(options) ? { filters: academicFilters(options) } : {}),
      ...(options.format ? { exports: formatWanfangSearchExports(items, options.format) } : {}),
      items
    };
  }
  assertHeaded(options);

  const context = await launchContext(options);
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await gotoPage(page, options.url ?? WANFANG_ACCESS_URL);
    await waitForAcademicPage(page);
    if (advancedQuery) {
      await gotoPage(page, buildWanfangSearchUrl(advancedQuery));
    } else {
      await page.fill('#search-input', keyword);
      await page.locator('.search-button').first().click({ timeout: 10000 });
    }
    await waitForAcademicPage(page);
    await page.waitForSelector('.normal-list.periodical-list, .result-item, .list-item', { timeout: 25000 }).catch(() => {});
    const state = await extractState(page);
    assertAccessible(state, 'Wanfang');
    const rows = await extractWanfangRows(page);

    return filterAcademicPayload(buildWanfangSearchPayload({
      keyword,
      advanced: options.advanced,
      text: state.text,
      rows,
      limit: options.limit,
      format: options.format,
      sourceUrl: page.url()
    }), options);
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
    await openWanfangAccess(page, options);
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

export async function downloadWanfangPdf(target, options = {}) {
  if (!target) {
    throw new Error('wanfang download requires a URL.');
  }
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    const item = mockData().item ?? {};
    const savedPath = resolveDownloadPath(target, {
      ...options,
      suggestedFilename: `${extractWanfangId(target) ?? 'wanfang-paper'}.pdf`
    });
    await mkdir(dirname(savedPath), { recursive: true });
    await writeFile(savedPath, process.env.SZU_MOCK_WANFANG_PDF_TEXT ?? '%PDF-1.4 mock wanfang pdf\n');
    return {
      provider: 'wanfang',
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
    await openWanfangAccess(page, options);
    await gotoPage(page, target);
    await waitForAcademicPage(page);
    const state = await extractState(page);
    assertAccessible(state, 'Wanfang');
    const detail = await extractWanfangDetail(page);
    const downloadButton = await findWanfangDownloadButton(page);

    if (!downloadButton) {
      throwDownloadUnavailable('No visible Wanfang PDF/full-text download button was found.');
    }

    const downloadResult = await clickWanfangDownloadFlow(page, downloadButton);
    if (!downloadResult) {
      throwDownloadUnavailable('The visible Wanfang download button did not start a browser download.');
    }

    const savedPath = resolveDownloadPath(target, {
      ...options,
      suggestedFilename: downloadResult.fileName
    });
    await mkdir(dirname(savedPath), { recursive: true });
    if (downloadResult.download) {
      await downloadResult.download.saveAs(savedPath);
    } else {
      await writeFile(savedPath, downloadResult.body);
    }

    return {
      provider: 'wanfang',
      title: detail.title || null,
      fileName: savedPath.split(/[\\/]/).at(-1),
      savedPath,
      sourceUrl: page.url(),
      downloadedBy: 'visible-button-click'
    };
  } finally {
    await context.close();
  }
}

function buildWanfangAdvancedQuery(advanced) {
  const conditions = advanced?.conditions ?? [];
  if (!conditions.length) {
    return null;
  }

  return conditions
    .map((condition) => `${condition.label}:${condition.value}`)
    .join(' AND ');
}

function buildWanfangSearchUrl(query) {
  const url = new URL(WANFANG_PERIODICAL_SEARCH_URL);
  url.searchParams.set('q', query);
  return url.toString();
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
    ...(payload.exports ? { exports: formatWanfangSearchExports(items, payload.exports.format) } : {})
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

async function findWanfangDownloadButton(page) {
  const candidates = [
    page.locator('a.download.buttonItem').filter({ hasText: /^下载$/ }),
    page.locator('a[href*="/file/download/"]').filter({ hasText: /下载|PDF|全文/ }),
    page.locator('a, button, [role="button"]').filter({ hasText: /PDF下载|下载全文|全文下载|^下载$/ })
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

async function clickWanfangDownloadFlow(page, downloadButton) {
  const firstDownloadPromise = page.waitForEvent('download', { timeout: 25000 })
    .then((download) => ({ type: 'download', download }))
    .catch(() => null);
  const popupPromise = page.waitForEvent('popup', { timeout: 15000 })
    .then((popup) => ({ type: 'popup', popup }))
    .catch(() => null);
  await downloadButton.click({ timeout: 10000 });

  const firstResult = await firstNonNull([firstDownloadPromise, popupPromise]);
  if (firstResult?.type === 'download') {
    return await downloadResultFromDownload(firstResult.download);
  }

  const popup = firstResult?.popup;
  if (!popup) {
    return null;
  }

  let popupDownloadResult = null;
  let pdfResponseResult = null;
  const popupDownloadPromise = popup.waitForEvent('download', { timeout: 30000 })
    .then((download) => {
      popupDownloadResult = { type: 'download', download };
      return popupDownloadResult;
    })
    .catch(() => null);
  const pdfResponsePromise = popup.waitForResponse((response) => isDownloadResponse(response), { timeout: 30000 })
    .then((response) => {
      pdfResponseResult = { type: 'response', response };
      return pdfResponseResult;
    })
    .catch(() => null);

  await popup.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  await waitForAcademicPage(popup);
  if (popupDownloadResult) {
    return await downloadResultFromDownload(popupDownloadResult.download);
  }
  if (pdfResponseResult) {
    return await downloadResultFromResponse(pdfResponseResult.response, page.url());
  }

  const manualLink = await findWanfangManualDownloadLink(popup);
  if (!manualLink) {
    const earlyResult = await firstNonNull([popupDownloadPromise, pdfResponsePromise]);
    return await normalizeDownloadResult(earlyResult, page.url());
  }

  await manualLink.click({ timeout: 10000 });

  const secondResult = await firstNonNull([popupDownloadPromise, pdfResponsePromise]);
  return await normalizeDownloadResult(secondResult, page.url());
}

async function firstNonNull(promises) {
  const pending = new Map(promises.map((promise, index) => [
    index,
    promise.then((value) => ({ index, value }))
  ]));
  while (pending.size) {
    const { index, value } = await Promise.race(pending.values());
    pending.delete(index);
    if (value) {
      return value;
    }
  }
  return null;
}

async function normalizeDownloadResult(result, sourceUrl) {
  if (result?.type === 'download') {
    return await downloadResultFromDownload(result.download);
  }
  if (result?.type === 'response') {
    return await downloadResultFromResponse(result.response, sourceUrl);
  }
  return null;
}

async function downloadResultFromDownload(download) {
  const failure = await download.failure().catch(() => null);
  if (failure) {
    throwDownloadUnavailable(`Wanfang download failed: ${failure}`);
  }
  return {
    download,
    fileName: download.suggestedFilename()
  };
}

async function downloadResultFromResponse(response, sourceUrl) {
  return {
    body: await response.body(),
    fileName: filenameFromHeaders(response.headers()) ?? `${extractWanfangId(sourceUrl) ?? 'wanfang-paper'}.pdf`
  };
}

async function findWanfangManualDownloadLink(page) {
  const candidates = [
    page.getByText(/点击此处/, { exact: false }),
    page.locator('a, button, [role="button"]').filter({ hasText: /点击此处|直接下载|下载/ })
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

function isDownloadResponse(response) {
  const headers = response.headers();
  return /application\/pdf/i.test(headers['content-type'] ?? '')
    || /attachment/i.test(headers['content-disposition'] ?? '');
}

async function openWanfangAccess(page, options = {}) {
  await gotoPage(page, options.url ?? WANFANG_ACCESS_URL);
  await waitForAcademicPage(page);
  const state = await extractState(page);
  assertAccessible(state, 'Wanfang');
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

function resolveDownloadPath(target, options = {}) {
  if (options.output) {
    return options.output;
  }
  const name = sanitizeFileName(options.suggestedFilename || `${extractWanfangId(target) ?? 'wanfang-paper'}.pdf`);
  return join(options.dir ?? process.cwd(), name);
}

function extractWanfangId(target) {
  return String(target ?? '').match(/\/([^/?#]+)(?:[?#].*)?$/)?.[1] ?? null;
}

function sanitizeFileName(name) {
  return String(name).replace(/^[·\s]+/, '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

function filenameFromHeaders(headers) {
  const disposition = headers['content-disposition'] ?? '';
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const rawName = utf8Match?.[1] ?? disposition.match(/filename="?([^";]+)"?/i)?.[1];
  if (!rawName) {
    return null;
  }
  try {
    return sanitizeFileName(decodeURIComponent(rawName));
  } catch {
    return sanitizeFileName(rawName);
  }
}

function throwDownloadUnavailable(message) {
  const error = new Error(message);
  error.code = 'DOWNLOAD_UNAVAILABLE';
  error.hint = 'Open the item page manually, confirm full-text access, and retry one item at a time.';
  throw error;
}
