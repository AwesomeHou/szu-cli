import { existsSync } from 'node:fs';

import { classifyAuthPage } from './auth-detector.js';
import { getLaunchOptions } from './browser-options.js';
import { resolveEhallEntry, sanitizeEhallSourceUrl } from './ehall-entry.js';
import { buildIdeologySummaryPayload } from './ideology-parser.js';
import { getProfilePath } from './paths.js';

const EHALL_HOME_URL = 'https://ehall.szu.edu.cn/new/index.html';
const IDEOLOGY_PATH = '/jwapp/sys/szshsjgl/';
const IDEOLOGY_ENTRY = {
  appPath: '/jwapp/sys/szshsjgl/*default/index.do',
  hash: '/cxtj',
  gid: 'RkhXNFYyS0RFSnF0TkVLQm9kK3Ayd2loN2ZDWGlPQUhoZ0pXU1NlUjZqSnlicXA2OVlNRkVmUEM0ZVNxbEdEYW5VVDhCWldIdHo1aGdrU1lZQTRjcGc9PQ'
};

export async function getIdeologyStatus(options = {}) {
  const { pageState, api, sourceUrl } = await loadIdeologyApi(options);
  const authState = classifyIdeologyPage(pageState);
  assertIdeologyAccess(authState, pageState);
  ensureIdeologyApi(api);
  const summary = buildIdeologySummaryPayload(api, { sourceUrl });
  return {
    loggedIn: true,
    reason: authState.reason,
    available: summary.available,
    earnedCredits: summary.earnedCredits,
    sourceUrl
  };
}

export async function getIdeologySummary(options = {}) {
  const { pageState, api, sourceUrl } = await loadIdeologyApi(options);
  const authState = classifyIdeologyPage(pageState);
  assertIdeologyAccess(authState, pageState);
  ensureIdeologyApi(api);
  return buildIdeologySummaryPayload(api, { sourceUrl });
}

function classifyIdeologyPage(pageState) {
  const base = classifyAuthPage(pageState);
  if (base.reason === 'cas-login-page') {
    return base;
  }
  const title = pageState.title ?? '';
  const text = pageState.text ?? '';
  const url = pageState.url ?? '';
  if (pageState.status === 403 || title === '403' || text.trim().startsWith('403')) {
    return { loggedIn: false, reason: 'ehall-forbidden' };
  }
  if (
    title.includes('思政与社会实践')
    || text.includes('思政与社会实践')
    || url.includes(IDEOLOGY_PATH)
  ) {
    return { loggedIn: true, reason: 'ehall-ideology-page' };
  }
  if (base.loggedIn) {
    return base;
  }
  return { loggedIn: false, reason: 'unknown' };
}

function assertIdeologyAccess(authState, pageState) {
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
    const error = new Error('SZU eHall Ideology and Social Practice page returned 403.');
    error.code = 'PERMISSION_DENIED';
    error.hint = 'Open Ideology and Social Practice from eHall once, or retry with `--url <full-entry-url>`.';
    throw error;
  }
  const error = new Error(`Unable to recognize SZU eHall Ideology page state: ${pageState.title ?? 'unknown'}.`);
  error.code = 'PAGE_CHANGED';
  error.hint = 'The eHall Ideology page structure may have changed; update the ideology adapter.';
  throw error;
}

async function loadIdeologyApi(options) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    const status = Number(process.env.SZU_MOCK_IDEOLOGY_STATUS ?? 200);
    const url = process.env.SZU_MOCK_IDEOLOGY_URL ?? (
      options.url ?? 'https://ehall.szu.edu.cn/jwapp/sys/szshsjgl/*default/index.do#/cxtj'
    );
    return {
      pageState: {
        url,
        title: process.env.SZU_MOCK_IDEOLOGY_TITLE ?? (status === 403 ? '403' : '思政与社会实践'),
        text: process.env.SZU_MOCK_IDEOLOGY_TEXT ?? '思政与社会实践',
        status
      },
      api: JSON.parse(process.env.SZU_MOCK_IDEOLOGY_API_JSON ?? '{}'),
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
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(EHALL_HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
    const sourceUrl = await resolveEhallEntry(page, {
      url: options.url,
      names: ['思政与社会实践', '思政与社会实践管理'],
      expectedPath: IDEOLOGY_PATH,
      known: IDEOLOGY_ENTRY
    });
    const api = captureIdeologyResponse(page);
    const response = await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForIdeologyApi(page, api);
    const pageState = {
      url: page.url(),
      title: await page.title(),
      text: await page.locator('body').innerText({ timeout: 10000 }).catch(() => ''),
      status: response?.status() ?? null
    };
    return {
      pageState,
      api,
      sourceUrl: sanitizeEhallSourceUrl(pageState.url)
    };
  } finally {
    await context.close();
  }
}

function captureIdeologyResponse(page) {
  const api = {};
  page.on('response', async (response) => {
    const endpoint = response.url().split('/').pop()?.replace(/\?.*/, '');
    if (
      endpoint !== 'cxxshdtjlb.do'
      || !isIdeologySummaryRequest(response.request().postData())
    ) {
      return;
    }
    try {
      const body = await response.json();
      if (body?.datas?.cxxshdtjlb) {
        api.cxxshdtjlb = body;
        api.complete = true;
      }
    } catch {
      // Required response is validated after the page settles.
    }
  });
  return api;
}

async function waitForIdeologyApi(page, api) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    if (api.complete) {
      return;
    }
    await page.waitForTimeout(250);
  }
}

export function isIdeologySummaryRequest(postData) {
  return new URLSearchParams(postData ?? '').has('querySetting');
}

function ensureIdeologyApi(api) {
  if (!api.cxxshdtjlb?.datas?.cxxshdtjlb) {
    const error = new Error('Missing eHall Ideology API response: cxxshdtjlb.');
    error.code = 'PAGE_CHANGED';
    error.hint = 'The eHall Ideology page or API sequence may have changed; update the ideology adapter.';
    throw error;
  }
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
