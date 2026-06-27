import { existsSync } from 'node:fs';

import { classifyAuthPage } from './auth-detector.js';
import { getLaunchOptions } from './browser-options.js';
import { resolveEhallEntry, sanitizeEhallSourceUrl } from './ehall-entry.js';
import {
  buildGrowthListPayload,
  buildGrowthRankForm,
  buildGrowthSummaryPayload,
  parseGrowthTerms
} from './growth-parser.js';
import { getProfilePath } from './paths.js';

const EHALL_HOME_URL = 'https://ehall.szu.edu.cn/new/index.html';
const GROWTH_PATH = '/jwapp/sys/czjl/';
const GROWTH_MODULE_URL = 'https://ehall.szu.edu.cn/jwapp/sys/czjl/modules/czjl';
const GROWTH_ENTRY = {
  appPath: '/jwapp/sys/czjl/*default/index.do',
  hash: '/czjl',
  gid: 'MWZnUWFNWEhTR2xCYm5ibDM4SXZNWTBaRXVoYWNZUDVTNCtNNnVSaWdhWDlUTytST3pGNHZJdHNZanBXUUhGRUhEa2gwaUJ6VVpKWDhWdWZnMkQwU2c9PQ'
};

export async function getGrowthStatus(options = {}) {
  const { pageState, api, sourceUrl } = await loadGrowthApi(options, 'status');
  const authState = classifyGrowthPage(pageState);
  assertGrowthAccess(authState, pageState);
  ensureGrowthTerms(api);
  return {
    loggedIn: true,
    reason: authState.reason,
    periodCount: parseGrowthTerms(api.cxyxkxnxq).length,
    sourceUrl
  };
}

export async function getGrowthSummary(options = {}) {
  const { pageState, api, sourceUrl } = await loadGrowthApi(options, 'summary');
  const authState = classifyGrowthPage(pageState);
  assertGrowthAccess(authState, pageState);
  ensureGrowthSummary(api);
  return buildGrowthSummaryPayload(api, { sourceUrl });
}

export async function getGrowthList(options = {}) {
  const { pageState, api, sourceUrl } = await loadGrowthApi(options, 'list');
  const authState = classifyGrowthPage(pageState);
  assertGrowthAccess(authState, pageState);
  ensureGrowthList(api);
  return buildGrowthListPayload(api, { ...options, sourceUrl });
}

function classifyGrowthPage(pageState) {
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
  if (title.includes('成长记录') || text.includes('成长记录') || url.includes(GROWTH_PATH)) {
    return { loggedIn: true, reason: 'ehall-growth-page' };
  }
  if (base.loggedIn) {
    return base;
  }
  return { loggedIn: false, reason: 'unknown' };
}

function assertGrowthAccess(authState, pageState) {
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
    const error = new Error('SZU eHall Growth Record page returned 403.');
    error.code = 'PERMISSION_DENIED';
    error.hint = 'Open Growth Record from eHall once, or retry with `--url <full-entry-url>`.';
    throw error;
  }
  const error = new Error(`Unable to recognize SZU eHall Growth Record page state: ${pageState.title ?? 'unknown'}.`);
  error.code = 'PAGE_CHANGED';
  error.hint = 'The eHall Growth Record page structure may have changed; update the growth adapter.';
  throw error;
}

async function loadGrowthApi(options, mode) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    const status = Number(process.env.SZU_MOCK_GROWTH_STATUS ?? 200);
    const url = process.env.SZU_MOCK_GROWTH_URL ?? (
      options.url ?? 'https://ehall.szu.edu.cn/jwapp/sys/czjl/*default/index.do#/czjl'
    );
    return {
      pageState: {
        url,
        title: process.env.SZU_MOCK_GROWTH_TITLE ?? (status === 403 ? '403' : '成长记录'),
        text: process.env.SZU_MOCK_GROWTH_TEXT ?? '成长记录',
        status
      },
      api: JSON.parse(process.env.SZU_MOCK_GROWTH_API_JSON ?? '{}'),
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
      names: ['成长记录'],
      expectedPath: GROWTH_PATH,
      known: GROWTH_ENTRY
    });
    const captured = captureGrowthResponses(page);
    const response = await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForInitialGrowthApis(page, captured);
    const pageState = await readPageState(page, response);
    const authState = classifyGrowthPage(pageState);
    if (!authState.loggedIn) {
      return { pageState, api: {}, sourceUrl: sanitizeEhallSourceUrl(pageState.url) };
    }

    ensureGrowthTerms(captured);
    if (mode === 'status') {
      return {
        pageState,
        api: captured,
        sourceUrl: sanitizeEhallSourceUrl(pageState.url)
      };
    }

    const studentId = findStudentId(captured);
    if (!studentId) {
      throw pageChanged('Missing authenticated Growth Record student context.');
    }
    const terms = parseGrowthTerms(captured.cxyxkxnxq);
    const latestTerm = terms.at(-1)?.id;
    if (!latestTerm || !captured.cxxscjtj) {
      throw pageChanged('Missing Growth Record summary data.');
    }

    const cumulativeRank = await postJson(
      page,
      `${GROWTH_MODULE_URL}/cxxsjdpm.do`,
      buildGrowthRankForm(studentId, { termId: latestTerm, periodType: 'cumulative' })
    );
    const api = {
      cxyxkxnxq: captured.cxyxkxnxq,
      cumulativeStats: captured.cxxscjtj,
      cumulativeRank
    };
    if (mode === 'list') {
      api.periods = await loadGrowthPeriods(page, studentId, terms, options);
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

async function loadGrowthPeriods(page, studentId, terms, options) {
  const selectedTerms = options.term
    ? terms.filter((term) => term.id === options.term)
    : terms;
  const periods = [];

  if (!options.year) {
    for (const term of selectedTerms) {
      const rank = await postJson(
        page,
        `${GROWTH_MODULE_URL}/cxxsjdpm.do`,
        buildGrowthRankForm(studentId, { termId: term.id, periodType: 'term' })
      );
      periods.push({
        periodType: 'term',
        periodId: term.id,
        periodName: term.name,
        stats: rank,
        rank
      });
    }
  }

  if (!options.term) {
    const years = new Map();
    for (const term of terms) {
      if (!options.year || term.academicYear === options.year) {
        years.set(term.academicYear, term);
      }
    }
    for (const [year, representativeTerm] of years) {
      const rank = await postJson(
        page,
        `${GROWTH_MODULE_URL}/cxxsjdpm.do`,
        buildGrowthRankForm(studentId, {
          termId: representativeTerm.id,
          periodType: 'academic-year'
        })
      );
      periods.push({
        periodType: 'academic-year',
        periodId: year,
        periodName: `${year}学年`,
        stats: rank,
        rank
      });
    }
  }
  return periods;
}

function captureGrowthResponses(page) {
  const api = {};
  page.on('response', async (response) => {
    const endpoint = response.url().split('/').pop()?.replace(/\?.*/, '');
    const key = {
      'cxyxkxnxq.do': 'cxyxkxnxq',
      'cxxscjtj.do': 'cxxscjtj'
    }[endpoint];
    if (!key || api[key]) {
      return;
    }
    try {
      api[key] = await response.json();
    } catch {
      // Required responses are validated after the page settles.
    }
  });
  return api;
}

async function waitForInitialGrowthApis(page, api) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    if (api.cxyxkxnxq && api.cxxscjtj) {
      return;
    }
    await page.waitForTimeout(250);
  }
}

function findStudentId(api) {
  return api.cxyxkxnxq?.datas?.cxyxkxnxq?.rows?.[0]?.XH
    ?? api.cxxscjtj?.datas?.cxxscjtj?.rows?.[0]?.XH
    ?? null;
}

async function postJson(page, url, form) {
  const response = await page.request.post(url, { form });
  try {
    return await response.json();
  } catch (cause) {
    const error = pageChanged(`eHall Growth Record API did not return JSON: ${url.split('/').pop()}.`);
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

function ensureGrowthTerms(api) {
  if (!api.cxyxkxnxq?.datas?.cxyxkxnxq) {
    throw pageChanged('Missing eHall Growth Record API response: cxyxkxnxq.');
  }
}

function ensureGrowthSummary(api) {
  ensureGrowthTerms(api);
  if (!api.cumulativeStats?.datas?.cxxscjtj || !api.cumulativeRank?.datas?.cxxsjdpm) {
    throw pageChanged('Missing eHall Growth Record summary API response.');
  }
}

function ensureGrowthList(api) {
  ensureGrowthTerms(api);
  if (!Array.isArray(api.periods)) {
    throw pageChanged('Missing eHall Growth Record period API responses.');
  }
}

function pageChanged(message) {
  const error = new Error(message);
  error.code = 'PAGE_CHANGED';
  error.hint = 'The eHall Growth Record page or API sequence may have changed; update the growth adapter.';
  return error;
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
