import { existsSync } from 'node:fs';

import { classifyAuthPage } from './auth-detector.js';
import { getLaunchOptions } from './browser-options.js';
import {
  buildCompletionContextForm,
  buildCompletionCourseForm,
  buildCompletionCoursesPayload,
  buildCompletionModulesPayload,
  buildCompletionSummaryPayload,
  parseCompletionProgress
} from './completion-parser.js';
import { resolveEhallEntry, sanitizeEhallSourceUrl } from './ehall-entry.js';
import { getProfilePath } from './paths.js';

const EHALL_HOME_URL = 'https://ehall.szu.edu.cn/new/index.html';
const COMPLETION_PATH = '/jwapp/sys/xywccx/';
const COMPLETION_MODULE_URL = 'https://ehall.szu.edu.cn/jwapp/sys/xywccx/modules/xywccx';
const COMPLETION_ENTRY = {
  appPath: '/jwapp/sys/xywccx/*default/index.do',
  hash: '/xywccx',
  gid: 'SnNvKzhYV2tvdEk0SzJwWmRVazFLaGRKTFBBYWMxd3hQcWlKaFRlT29tZEd3SGx6Wm93TXQxbzVrZHNwamwrNkVnMzZIbGg1S1Z6R0xJNEdnYmJCR0E9PQ'
};

export async function getCompletionStatus(options = {}) {
  const loaded = await loadCompletionApi(options, 'status');
  const authState = assertLoadedAccess(loaded);
  ensureSummaryApi(loaded.api);
  const payload = buildCompletionSummaryPayload(loaded.api, { sourceUrl: loaded.sourceUrl });
  return {
    loggedIn: true,
    reason: authState.reason,
    calculation: payload.calculation,
    plan: payload.plan,
    sourceUrl: loaded.sourceUrl
  };
}

export async function getCompletionSummary(options = {}) {
  const loaded = await loadCompletionApi(options, 'summary');
  assertLoadedAccess(loaded);
  ensureSummaryApi(loaded.api);
  return buildCompletionSummaryPayload(loaded.api, { sourceUrl: loaded.sourceUrl });
}

export async function getCompletionModules(options = {}) {
  const loaded = await loadCompletionApi(options, 'modules');
  assertLoadedAccess(loaded);
  ensureModulesApi(loaded.api);
  return buildCompletionModulesPayload(loaded.api, { sourceUrl: loaded.sourceUrl });
}

export async function getCompletionCourses(moduleCode, options = {}) {
  const loaded = await loadCompletionApi(options, 'courses', moduleCode);
  assertLoadedAccess(loaded);
  ensureModulesApi(loaded.api);
  const module = rowsOf(loaded.api.cxscfakz, 'cxscfakz')
    .find((row) => String(row.KZH) === String(moduleCode));
  if (!module) {
    throw moduleNotFound(moduleCode);
  }
  if (!loaded.api.cxscfakzkc?.datas?.cxscfakzkc) {
    throw pageChanged('Missing eHall Academic Completion course API response.');
  }
  return buildCompletionCoursesPayload(loaded.api, {
    moduleCode,
    sourceUrl: loaded.sourceUrl
  });
}

function assertLoadedAccess(loaded) {
  const authState = classifyCompletionPage(loaded.pageState);
  assertCompletionAccess(authState, loaded.pageState);
  return authState;
}

function classifyCompletionPage(pageState) {
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
    title.includes('学业完成查询')
    || text.includes('学业完成查询')
    || url.includes(COMPLETION_PATH)
  ) {
    return { loggedIn: true, reason: 'ehall-completion-page' };
  }
  if (base.loggedIn) {
    return base;
  }
  return { loggedIn: false, reason: 'unknown' };
}

function assertCompletionAccess(authState, pageState) {
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
    const error = new Error('SZU eHall Academic Completion page returned 403.');
    error.code = 'PERMISSION_DENIED';
    error.hint = 'Open Academic Completion Query from eHall once, or retry with `--url <full-entry-url>`.';
    throw error;
  }
  const error = new Error(`Unable to recognize SZU Academic Completion page state: ${pageState.title ?? 'unknown'}.`);
  error.code = 'PAGE_CHANGED';
  error.hint = 'The Academic Completion page structure may have changed; update the completion adapter.';
  throw error;
}

async function loadCompletionApi(options, mode, moduleCode = null) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return loadMockCompletionApi(options, mode, moduleCode);
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
    const entryUrl = await resolveEhallEntry(page, {
      url: options.url,
      names: ['学业完成查询'],
      expectedPath: COMPLETION_PATH,
      known: COMPLETION_ENTRY
    });
    const captured = captureCompletionResponses(page);
    const response = await page.goto(entryUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
    const pageState = await readPageState(page, response);
    const authState = classifyCompletionPage(pageState);
    if (!authState.loggedIn) {
      return {
        pageState,
        api: {},
        sourceUrl: sanitizeEhallSourceUrl(pageState.url)
      };
    }

    await waitForCalculation(page, captured, options.timeoutSeconds ?? 180);
    const contextRow = firstRow(captured.cxscfa, 'cxscfa');
    if (!contextRow) {
      throw pageChanged('Missing Academic Completion plan context.');
    }
    const form = buildCompletionContextForm(contextRow);
    const api = {
      progress: captured.progress,
      cxscfa: await postJson(page, `${COMPLETION_MODULE_URL}/cxscfa.do`, form)
    };
    if (mode === 'modules' || mode === 'courses') {
      api.cxscfakz = await postJson(page, `${COMPLETION_MODULE_URL}/cxscfakz.do`, form);
    }
    if (mode === 'courses') {
      const module = rowsOf(api.cxscfakz, 'cxscfakz')
        .find((row) => String(row.KZH) === String(moduleCode));
      if (!module) {
        throw moduleNotFound(moduleCode);
      }
      api.cxscfakzkc = await postJson(
        page,
        `${COMPLETION_MODULE_URL}/cxscfakzkc.do`,
        buildCompletionCourseForm(contextRow, module)
      );
    }
    return {
      pageState,
      api,
      sourceUrl: sanitizeEhallSourceUrl(pageState.url)
    };
  } finally {
    await context.close();
  }
}

function loadMockCompletionApi(options, mode, moduleCode) {
  const status = Number(process.env.SZU_MOCK_COMPLETION_STATUS ?? 200);
  const url = process.env.SZU_MOCK_COMPLETION_URL ?? (
    options.url ?? 'https://ehall.szu.edu.cn/jwapp/sys/xywccx/*default/index.do#/xywccx'
  );
  const api = JSON.parse(process.env.SZU_MOCK_COMPLETION_API_JSON ?? '{}');
  if (process.env.SZU_MOCK_COMPLETION_TIMEOUT === '1') {
    throw calculationTimeout({
      state: 'calculating',
      completed: 0,
      total: 1,
      percent: 0
    }, options.timeoutSeconds ?? 180);
  }
  if (mode === 'courses') {
    const module = rowsOf(api.cxscfakz, 'cxscfakz')
      .find((row) => String(row.KZH) === String(moduleCode));
    if (!module) {
      throw moduleNotFound(moduleCode);
    }
    api.cxscfakzkc = api.coursesByModule?.[moduleCode];
  }
  return {
    pageState: {
      url,
      title: process.env.SZU_MOCK_COMPLETION_TITLE ?? (status === 403 ? '403' : '学业完成查询'),
      text: process.env.SZU_MOCK_COMPLETION_TEXT ?? '学业完成查询',
      status
    },
    api,
    sourceUrl: url
  };
}

function captureCompletionResponses(page) {
  const captured = {};
  page.on('response', async (response) => {
    const endpoint = response.url().split('/').pop()?.replace(/\?.*/, '');
    const key = {
      'cxscfa.do': 'cxscfa',
      'byscjd.do': 'progress'
    }[endpoint];
    if (!key) {
      return;
    }
    try {
      captured[key] = await response.json();
    } catch {
      // Required responses are validated by condition-based waiting.
    }
  });
  return captured;
}

async function waitForCalculation(page, captured, timeoutSeconds) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    const progress = parseCompletionProgress(captured.progress);
    if (progress.state === 'completed') {
      return;
    }
    await page.waitForTimeout(250);
  }
  throw calculationTimeout(parseCompletionProgress(captured.progress), timeoutSeconds);
}

async function postJson(page, url, form) {
  const response = await page.request.post(url, { form });
  try {
    return await response.json();
  } catch (cause) {
    const error = pageChanged(`eHall Academic Completion API did not return JSON: ${url.split('/').pop()}.`);
    error.cause = cause;
    throw error;
  }
}

async function readPageState(page, response) {
  return {
    url: page.url(),
    title: await page.title(),
    text: await page.locator('body').innerText({ timeout: 10000 }).catch(() => ''),
    status: response?.status() ?? null
  };
}

function ensureSummaryApi(api) {
  if (!api.progress?.datas?.byscjd || !api.cxscfa?.datas?.cxscfa) {
    throw pageChanged('Missing eHall Academic Completion summary API response.');
  }
}

function ensureModulesApi(api) {
  ensureSummaryApi(api);
  if (!api.cxscfakz?.datas?.cxscfakz) {
    throw pageChanged('Missing eHall Academic Completion module API response.');
  }
}

function calculationTimeout(progress, timeoutSeconds) {
  const error = new Error(`Academic Completion calculation did not finish within ${timeoutSeconds} seconds.`);
  error.code = 'CALCULATION_TIMEOUT';
  error.hint = 'Retry later or increase `--timeout <seconds>`; do not loop the command aggressively.';
  error.details = {
    completed: progress.completed,
    total: progress.total,
    percent: progress.percent,
    timeoutSeconds
  };
  return error;
}

function moduleNotFound(moduleCode) {
  const error = new Error(`Academic Completion module was not found: ${moduleCode}.`);
  error.code = 'MODULE_NOT_FOUND';
  error.hint = 'Run `szu-cli completion modules --json` to get a valid moduleCode.';
  return error;
}

function pageChanged(message) {
  const error = new Error(message);
  error.code = 'PAGE_CHANGED';
  error.hint = 'The Academic Completion page or API sequence may have changed; update the completion adapter.';
  return error;
}

function rowsOf(response, key) {
  return response?.datas?.[key]?.rows ?? [];
}

function firstRow(response, key) {
  return rowsOf(response, key)[0] ?? null;
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
