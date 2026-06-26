import { existsSync } from 'node:fs';

import { classifyAuthPage } from './auth-detector.js';
import { getLaunchOptions } from './browser-options.js';
import { getProfilePath } from './paths.js';
import {
  buildClassLookupForm,
  buildClassListForm,
  buildTimetableClassesPayload,
  buildTimetableViewForm,
  buildTimetableViewPayload,
  parseClassItems,
  parseTimetableTerm
} from './timetable-parser.js';

const EHALL_HOME_URL = 'https://ehall.szu.edu.cn/new/index.html';
const TIMETABLE_ENTRY_URL = 'https://ehall.szu.edu.cn/jwapp/sys/kcbcx/*default/index.do?EMAP_LANG=zh&THEME=cherry#/bjkcb';
const TIMETABLE_MODULE_URL = 'https://ehall.szu.edu.cn/jwapp/sys/kcbcx/modules/bjkcb';

export async function getTimetableStatus(options = {}) {
  const { pageState, api, sourceUrl } = await loadTimetableClassApi(options);
  const authState = classifyTimetablePage(pageState);
  assertTimetableAccess(authState, pageState);
  const payload = buildTimetableClassesPayload(api, { sourceUrl, filters: filtersOf(options) });

  return {
    loggedIn: true,
    reason: authState.reason,
    term: payload.term,
    total: payload.total,
    sourceUrl
  };
}

export async function getTimetableClasses(options = {}) {
  const { pageState, api, sourceUrl } = await loadTimetableClassApi(options);
  const authState = classifyTimetablePage(pageState);
  assertTimetableAccess(authState, pageState);
  return buildTimetableClassesPayload(api, { sourceUrl, filters: filtersOf(options) });
}

export async function getTimetableView(classCode, options = {}) {
  if (!classCode) {
    throw new Error('timetable view requires a classCode.');
  }

  const { pageState, api, sourceUrl } = await loadTimetableViewApi(classCode, options);
  const authState = classifyTimetablePage(pageState);
  assertTimetableAccess(authState, pageState);
  const classInfo = parseClassItems(api.bjcx).find((item) => item.classCode === classCode) ?? null;
  if (!classInfo) {
    const error = new Error(`Class was not found: ${classCode}.`);
    error.code = 'CLASS_NOT_FOUND';
    error.hint = 'Run `szu-cli timetable classes --json` to get a valid classCode.';
    throw error;
  }
  return buildTimetableViewPayload(api, { classInfo, classCode, sourceUrl });
}

function classifyTimetablePage(pageState) {
  const base = classifyAuthPage(pageState);
  if (base.reason === 'cas-login-page') {
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
    text.includes('全校课表查询')
    || text.includes('班级课程表')
    || text.includes('班级课表')
    || url.includes('/jwapp/sys/kcbcx/')
  ) {
    return {
      loggedIn: true,
      reason: 'ehall-timetable-page'
    };
  }

  if (base.loggedIn) {
    return base;
  }

  return {
    loggedIn: false,
    reason: 'unknown'
  };
}

function assertTimetableAccess(authState, pageState) {
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
    const error = new Error('SZU eHall timetable page returned 403.');
    error.code = 'PERMISSION_DENIED';
    error.hint = 'Try visiting eHall home first, or confirm this account can access timetable query.';
    throw error;
  }

  const error = new Error(`Unable to recognize SZU eHall timetable page state: ${pageState.title ?? 'unknown'}.`);
  error.code = 'PAGE_CHANGED';
  error.hint = 'The eHall timetable page structure may have changed; update the timetable adapter.';
  throw error;
}

async function loadTimetableClassApi(options = {}) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    const status = Number(process.env.SZU_MOCK_TIMETABLE_STATUS ?? 200);
    const url = process.env.SZU_MOCK_TIMETABLE_URL ?? (options.url ?? TIMETABLE_ENTRY_URL);
    const title = process.env.SZU_MOCK_TIMETABLE_TITLE ?? (status === 403 ? '403' : '班级课程表');
    const text = process.env.SZU_MOCK_TIMETABLE_TEXT ?? '全校课表查询 班级课程表';
    return {
      pageState: { url, title, text, status },
      api: JSON.parse(process.env.SZU_MOCK_TIMETABLE_API_JSON ?? '{}'),
      sourceUrl: url
    };
  }

  return withTimetablePage(options, async (page, pageState, sourceUrl) => {
    const api = await requestClassApi(page, options);
    ensureClassApi(api);
    return { pageState, api, sourceUrl };
  });
}

async function loadTimetableViewApi(classCode, options = {}) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    const status = Number(process.env.SZU_MOCK_TIMETABLE_STATUS ?? 200);
    const url = process.env.SZU_MOCK_TIMETABLE_URL ?? (options.url ?? TIMETABLE_ENTRY_URL);
    const title = process.env.SZU_MOCK_TIMETABLE_TITLE ?? (status === 403 ? '403' : '班级课程表');
    const text = process.env.SZU_MOCK_TIMETABLE_TEXT ?? '全校课表查询 班级课程表';
    return {
      pageState: { url, title, text, status },
      api: JSON.parse(process.env.SZU_MOCK_TIMETABLE_API_JSON ?? '{}'),
      sourceUrl: url
    };
  }

  return withTimetablePage(options, async (page, pageState, sourceUrl) => {
    const xtcscx = await requestTermApi(page);
    const term = options.term ?? parseTimetableTerm(xtcscx).id;
    const bjcx = await postJson(page, `${TIMETABLE_MODULE_URL}/bjcx.do`, buildClassLookupForm({ term, classCode }));
    const dqzc = await postJson(page, `${TIMETABLE_MODULE_URL}/dqzc.do`, buildCurrentWeekForm(term));
    const currentWeek = dqzc?.datas?.dqzc?.rows?.[0]?.ZC;
    const form = buildTimetableViewForm({ term, classCode, currentWeek });
    const api = {
      xtcscx,
      bjcx,
      dqzc,
      bjkcb: await postJson(page, `${TIMETABLE_MODULE_URL}/bjkcb.do`, form),
      bjdkkc: await postJson(page, `${TIMETABLE_MODULE_URL}/bjdkkc.do`, form),
      bjsjkcb: await postJson(page, `${TIMETABLE_MODULE_URL}/bjsjkcb.do`, form),
      bjwpkc: await postJson(page, `${TIMETABLE_MODULE_URL}/bjwpkc.do`, form)
    };
    ensureViewApi(api);
    return { pageState, api, sourceUrl };
  });
}

async function withTimetablePage(options, callback) {
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
    const response = await page.goto(options.url ?? TIMETABLE_ENTRY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    const pageState = {
      url: page.url(),
      title: await page.title(),
      text: await page.locator('body').innerText({ timeout: 10000 }).catch(() => ''),
      status: response?.status() ?? null
    };
    return await callback(page, pageState, pageState.url);
  } finally {
    await context.close();
  }
}

async function requestClassApi(page, options) {
  const xtcscx = await requestTermApi(page);
  const term = options.term ?? parseTimetableTerm(xtcscx).id;
  const bjcx = await postJson(page, `${TIMETABLE_MODULE_URL}/bjcx.do`, buildClassListForm({ ...options, term }));
  return { xtcscx, bjcx };
}

async function requestTermApi(page) {
  return await postJson(page, `${TIMETABLE_MODULE_URL}/xtcscx.do`, { ZCSDM: 'KBXNXQ' });
}

async function postJson(page, url, form) {
  const response = await page.request.post(url, { form });
  try {
    return await response.json();
  } catch (cause) {
    const error = new Error(`eHall timetable API did not return JSON: ${url.split('/').pop()}.`);
    error.code = 'PAGE_CHANGED';
    error.hint = 'The eHall timetable endpoint path or request parameters may have changed; update the timetable adapter.';
    error.cause = cause;
    throw error;
  }
}

function buildCurrentWeekForm(term) {
  const match = String(term ?? '').match(/^(\d{4}-\d{4})-(\d+)$/);
  return {
    XN: match?.[1] ?? '',
    XQ: match?.[2] ?? '',
    RQ: formatLocalDate(new Date())
  };
}

function formatLocalDate(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function ensureClassApi(api) {
  if (!api.xtcscx?.datas?.xtcscx || !api.bjcx?.datas?.bjcx) {
    const error = new Error('Missing eHall timetable API response.');
    error.code = 'PAGE_CHANGED';
    error.hint = 'The eHall timetable page or API sequence may have changed; update the timetable adapter.';
    throw error;
  }
}

function ensureViewApi(api) {
  ensureClassApi(api);
  for (const key of ['bjkcb', 'bjdkkc', 'bjsjkcb', 'bjwpkc']) {
    if (!api[key]?.datas) {
      const error = new Error(`Missing eHall timetable API response: ${key}.`);
      error.code = 'PAGE_CHANGED';
      error.hint = 'The eHall timetable page or API sequence may have changed; update the timetable adapter.';
      throw error;
    }
  }
}

function filtersOf(options = {}) {
  return {
    ...(options.keyword ? { keyword: options.keyword } : {}),
    ...(options.grade ? { grade: options.grade } : {}),
    ...(options.department ? { department: options.department } : {}),
    ...(options.major ? { major: options.major } : {})
  };
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
