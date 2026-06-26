import { existsSync } from 'node:fs';

import { classifyAuthPage } from './auth-detector.js';
import { getLaunchOptions } from './browser-options.js';
import { getProfilePath } from './paths.js';
import { buildProgramListForm, buildProgramPayload } from './program-parser.js';

const EHALL_HOME_URL = 'https://ehall.szu.edu.cn/new/index.html';
const PROGRAM_ENTRY_URL = 'https://ehall.szu.edu.cn/jwapp/sys/qxfacx/*default/index.do?EMAP_LANG=zh&THEME=cherry#/pyfacx';
const PROGRAM_LIST_API_URL = 'https://ehall.szu.edu.cn/jwapp/sys/qxfacx/modules/pyfacxepg/qxpyfacx.do';

export async function getProgramStatus(options = {}) {
  const { pageState, api, sourceUrl } = await loadProgramApi(options);
  const authState = classifyProgramPage(pageState);
  assertProgramAccess(authState, pageState);
  const payload = buildProgramPayload(api.qxpyfacx, { sourceUrl, filters: filtersOf(options) });

  return {
    loggedIn: true,
    reason: authState.reason,
    total: payload.total,
    sourceUrl
  };
}

export async function getProgramList(options = {}) {
  const { pageState, api, sourceUrl } = await loadProgramApi(options);
  const authState = classifyProgramPage(pageState);
  assertProgramAccess(authState, pageState);
  return buildProgramPayload(api.qxpyfacx, { sourceUrl, filters: filtersOf(options) });
}

function classifyProgramPage(pageState) {
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
    text.includes('全校方案查询')
    || text.includes('培养方案')
    || url.includes('/jwapp/sys/qxfacx/')
  ) {
    return {
      loggedIn: true,
      reason: 'ehall-program-page'
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

function assertProgramAccess(authState, pageState) {
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
    const error = new Error('SZU eHall program page returned 403.');
    error.code = 'PERMISSION_DENIED';
    error.hint = 'Try visiting eHall home first, or confirm this account can access program query.';
    throw error;
  }

  const error = new Error(`Unable to recognize SZU eHall program page state: ${pageState.title ?? 'unknown'}.`);
  error.code = 'PAGE_CHANGED';
  error.hint = 'The eHall program page structure may have changed; update the program adapter.';
  throw error;
}

async function loadProgramApi(options = {}) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    const status = Number(process.env.SZU_MOCK_PROGRAM_STATUS ?? 200);
    const url = process.env.SZU_MOCK_PROGRAM_URL ?? (options.url ?? PROGRAM_ENTRY_URL);
    const title = process.env.SZU_MOCK_PROGRAM_TITLE ?? (status === 403 ? '403' : '全校方案查询');
    const text = process.env.SZU_MOCK_PROGRAM_TEXT ?? '全校方案查询 培养方案';
    return {
      pageState: { url, title, text, status },
      api: JSON.parse(process.env.SZU_MOCK_PROGRAM_API_JSON ?? '{}'),
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
    const response = await page.goto(options.url ?? PROGRAM_ENTRY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    const apiResponse = await page.request.post(PROGRAM_LIST_API_URL, {
      form: buildProgramListForm(options)
    });
    const api = {
      qxpyfacx: await apiResponse.json()
    };

    const pageState = {
      url: page.url(),
      title: await page.title(),
      text: await page.locator('body').innerText({ timeout: 10000 }).catch(() => ''),
      status: response?.status() ?? null
    };

    ensureProgramApi(api);
    return {
      pageState,
      api,
      sourceUrl: pageState.url
    };
  } finally {
    await context.close();
  }
}

function ensureProgramApi(api) {
  if (!api.qxpyfacx?.datas?.qxpyfacx) {
    const error = new Error('Missing eHall program API response: qxpyfacx.');
    error.code = 'PAGE_CHANGED';
    error.hint = 'The eHall program page or API sequence may have changed; update the program adapter.';
    throw error;
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
