import { existsSync } from 'node:fs';

import { classifyAuthPage } from './auth-detector.js';
import { getLaunchOptions } from './browser-options.js';
import { buildGradePayload, filterGradePayloadByTerm } from './grade-parser.js';
import { getProfilePath } from './paths.js';

const EHALL_HOME_URL = 'https://ehall.szu.edu.cn/new/index.html';
const GRADE_ENTRY_URL = 'https://ehall.szu.edu.cn/jwapp/sys/cjcx/*default/index.do?EMAP_LANG=zh&THEME=cherry#/cjcx';
const GRADE_ENDPOINTS = new Set([
  'cxxsxjxx.do',
  'xscjcxtjgl.do'
]);

export async function getGradeStatus(options = {}) {
  const { pageState, api, sourceUrl } = await loadGradeApi(options);
  const authState = classifyGradePage(pageState);
  assertGradeAccess(authState, pageState);
  const payload = buildGradePayload(api, { sourceUrl });

  return {
    loggedIn: true,
    reason: authState.reason,
    total: payload.items.length,
    terms: payload.terms,
    sourceUrl
  };
}

export async function getGradeList(options = {}) {
  const { pageState, api, sourceUrl } = await loadGradeApi(options);
  const authState = classifyGradePage(pageState);
  assertGradeAccess(authState, pageState);
  const payload = buildGradePayload(api, { sourceUrl });
  return filterGradePayloadByTerm(payload, options.term);
}

function classifyGradePage(pageState) {
  const base = classifyAuthPage(pageState);
  if (base.loggedIn || base.reason === 'cas-login-page') {
    return base;
  }

  const title = pageState.title ?? '';
  const text = pageState.text ?? '';
  const url = pageState.url ?? '';

  if (title === '403' || text.trim().startsWith('403')) {
    return {
      loggedIn: false,
      reason: 'ehall-forbidden'
    };
  }

  if (
    title.includes('成绩查询')
    || text.includes('成绩查询')
    || url.includes('/jwapp/sys/cjcx/')
  ) {
    return {
      loggedIn: true,
      reason: 'ehall-grade-page'
    };
  }

  return {
    loggedIn: false,
    reason: 'unknown'
  };
}

function assertGradeAccess(authState, pageState) {
  if (authState.loggedIn) {
    return;
  }

  if (authState.reason === 'cas-login-page') {
    const error = new Error('Browser profile is not logged in to SZU eHall.');
    error.code = 'LOGIN_REQUIRED';
    error.hint = 'Run `szu-cli auth login --url https://ehall.szu.edu.cn/new/index.html` and complete login.';
    throw error;
  }

  if (authState.reason === 'ehall-forbidden') {
    const error = new Error('SZU eHall grade page returned 403.');
    error.code = 'PERMISSION_DENIED';
    error.hint = 'Try visiting eHall home first, or confirm this account can access grade query.';
    throw error;
  }

  const error = new Error(`Unable to recognize SZU eHall grade page state: ${pageState.title ?? 'unknown'}.`);
  error.code = 'PAGE_CHANGED';
  error.hint = 'The eHall grade page structure may have changed; update the grade adapter.';
  throw error;
}

async function loadGradeApi(options = {}) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    const status = Number(process.env.SZU_MOCK_GRADE_STATUS ?? 200);
    const url = process.env.SZU_MOCK_GRADE_URL ?? (options.url ?? GRADE_ENTRY_URL);
    const title = process.env.SZU_MOCK_GRADE_TITLE ?? (status === 403 ? '403' : '成绩查询');
    const text = process.env.SZU_MOCK_GRADE_TEXT ?? '成绩查询';
    return {
      pageState: { url, title, text, status },
      api: JSON.parse(process.env.SZU_MOCK_GRADE_API_JSON ?? '{}'),
      sourceUrl: url
    };
  }

  const profilePath = getProfilePath();
  if (!existsSync(profilePath)) {
    const error = new Error('Browser profile does not exist.');
    error.code = 'LOGIN_REQUIRED';
    error.hint = 'Run `szu-cli auth login --url https://ehall.szu.edu.cn/new/index.html` first.';
    throw error;
  }

  const { chromium } = await importPlaywright();
  const context = await chromium.launchPersistentContext(
    profilePath,
    getLaunchOptions({ headless: options.headless ?? true })
  );

  const api = {};
  try {
    const page = context.pages()[0] ?? await context.newPage();
    page.on('response', async (response) => {
      const name = endpointName(response.url());
      if (!name || api[name.replace('.do', '')]) {
        return;
      }
      try {
        api[name.replace('.do', '')] = await response.json();
      } catch {
        // Ignore non-JSON responses; required endpoints are validated later.
      }
    });

    await page.goto(EHALL_HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    const sourceUrl = options.url ?? GRADE_ENTRY_URL;
    const response = await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForGradeApis(page, api);

    const pageState = {
      url: page.url(),
      title: await page.title(),
      text: await page.locator('body').innerText({ timeout: 10000 }).catch(() => ''),
      status: response?.status() ?? null
    };

    ensureRequiredApis(api);
    return {
      pageState,
      api,
      sourceUrl: pageState.url
    };
  } finally {
    await context.close();
  }
}

async function waitForGradeApis(page, api) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    if (api.cxxsxjxx && api.xscjcxtjgl) {
      return;
    }
    await page.waitForTimeout(250);
  }
}

function ensureRequiredApis(api) {
  for (const key of ['cxxsxjxx', 'xscjcxtjgl']) {
    if (!api[key]) {
      const error = new Error(`Missing eHall grade API response: ${key}.`);
      error.code = 'PAGE_CHANGED';
      error.hint = 'The eHall grade page or API sequence may have changed; update the grade adapter.';
      throw error;
    }
  }
}

function endpointName(url) {
  const name = url.split('/').pop()?.replace(/\?.*/, '');
  return GRADE_ENDPOINTS.has(name) ? name : null;
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
