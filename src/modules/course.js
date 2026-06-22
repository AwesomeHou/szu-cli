import { existsSync } from 'node:fs';

import { classifyAuthPage } from './auth-detector.js';
import { getLaunchOptions } from './browser-options.js';
import { getProfilePath } from './paths.js';
import { buildCoursePayload, filterTodayCourses } from './course-parser.js';

const EHALL_HOME_URL = 'https://ehall.szu.edu.cn/new/index.html';
const COURSE_ENTRY_URL = 'https://ehall.szu.edu.cn/jwapp/sys/wdkb/*default/index.do?EMAP_LANG=zh&THEME=cherry#/xskcb';
const COURSE_ENDPOINTS = new Set([
  'dqxnxq.do',
  'dqzc.do',
  'xskcb.do',
  'xsdkkc.do',
  'xswpkc.do',
  'xssjkkc.do',
  'cxjcs.do',
  'cxjcgx.do'
]);

export async function getCourseStatus(options = {}) {
  const { pageState, api, sourceUrl } = await loadCourseApi(options);
  const authState = classifyCoursePage(pageState);
  assertCourseAccess(authState, pageState);
  const payload = buildCoursePayload(api, { sourceUrl });

  return {
    loggedIn: true,
    reason: authState.reason,
    term: payload.term,
    sourceUrl
  };
}

export async function getCourseList(options = {}) {
  const { pageState, api, sourceUrl } = await loadCourseApi(options);
  const authState = classifyCoursePage(pageState);
  assertCourseAccess(authState, pageState);
  return buildCoursePayload(api, { sourceUrl });
}

export async function getTodayCourses(options = {}) {
  const payload = await getCourseList(options);
  return filterTodayCourses(payload, options.today ?? new Date());
}

function classifyCoursePage(pageState) {
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
    text.includes('深圳大学网上办事服务大厅')
    || text.includes('我的课程表')
    || (text.includes('个人中心') && text.includes('安全退出'))
    || url.includes('/jwapp/sys/wdkb/')
  ) {
    return {
      loggedIn: true,
      reason: 'ehall-course-page'
    };
  }

  return {
    loggedIn: false,
    reason: 'unknown'
  };
}

function assertCourseAccess(authState, pageState) {
  if (authState.loggedIn) {
    return;
  }

  if (authState.reason === 'cas-login-page') {
    const error = new Error('Browser profile is not logged in to SZU eHall.');
    error.code = 'LOGIN_REQUIRED';
    error.hint = 'Run `szu auth login --url https://ehall.szu.edu.cn/new/index.html` and complete login.';
    throw error;
  }

  if (authState.reason === 'ehall-forbidden') {
    const error = new Error('SZU eHall course page returned 403.');
    error.code = 'PERMISSION_DENIED';
    error.hint = 'Try visiting eHall home first, or confirm this account can access the course timetable.';
    throw error;
  }

  const error = new Error(`Unable to recognize SZU eHall course page state: ${pageState.title ?? 'unknown'}.`);
  error.code = 'PAGE_CHANGED';
  error.hint = 'The eHall course page structure may have changed; update the course adapter.';
  throw error;
}

async function loadCourseApi(options = {}) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    const status = Number(process.env.SZU_MOCK_COURSE_STATUS ?? 200);
    const url = process.env.SZU_MOCK_COURSE_URL ?? (options.url ?? COURSE_ENTRY_URL);
    const title = process.env.SZU_MOCK_COURSE_TITLE ?? (status === 403 ? '403' : '我的课程表');
    const text = process.env.SZU_MOCK_COURSE_TEXT ?? '我的课程表';
    return {
      pageState: { url, title, text, status },
      api: JSON.parse(process.env.SZU_MOCK_COURSE_API_JSON ?? '{}'),
      sourceUrl: url
    };
  }

  const profilePath = getProfilePath();
  if (!existsSync(profilePath)) {
    const error = new Error('Browser profile does not exist.');
    error.code = 'LOGIN_REQUIRED';
    error.hint = 'Run `szu auth login --url https://ehall.szu.edu.cn/new/index.html` first.';
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
    const sourceUrl = options.url ?? COURSE_ENTRY_URL;
    const response = await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForCourseApis(page, api);

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

async function waitForCourseApis(page, api) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    if (api.dqxnxq && api.dqzc && api.xskcb) {
      return;
    }
    await page.waitForTimeout(250);
  }
}

function ensureRequiredApis(api) {
  for (const key of ['dqxnxq', 'dqzc', 'xskcb']) {
    if (!api[key]) {
      const error = new Error(`Missing eHall course API response: ${key}.`);
      error.code = 'PAGE_CHANGED';
      error.hint = 'The eHall course page or API sequence may have changed; update the course adapter.';
      throw error;
    }
  }
  api.xsdkkc ??= emptyApi('xsdkkc');
  api.xswpkc ??= emptyApi('xswpkc');
  api.xssjkkc ??= emptyApi('xssjkkc');
}

function emptyApi(key) {
  return {
    datas: {
      [key]: {
        rows: []
      }
    },
    code: '0'
  };
}

function endpointName(url) {
  const name = url.split('/').pop()?.replace(/\?.*/, '');
  return COURSE_ENDPOINTS.has(name) ? name : null;
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
