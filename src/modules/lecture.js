import { existsSync } from 'node:fs';

import { classifyAuthPage } from './auth-detector.js';
import { getLaunchOptions } from './browser-options.js';
import {
  buildLectureItemPayload,
  buildLectureListPayload,
  buildLectureProgressPayload
} from './lecture-parser.js';
import { getProfilePath } from './paths.js';

const LECTURE_URL = 'https://lecture.szu.edu.cn/';
const LIST_URL = new URL('/tLectureSignUp/list?page=1&limit=100', LECTURE_URL).toString();
const PROGRESS_URL = new URL('/sysUser/getUserInfo', LECTURE_URL).toString();

export async function getLectureStatus(options = {}) {
  const loaded = await loadLectureApi('list', options);
  const authState = classifyLecturePage(loaded.pageState);
  assertLectureAccess(authState, loaded.pageState);
  ensureLectureList(loaded.api);
  const list = buildLectureListPayload(loaded.api, {
    classroomsByLecture: loaded.classroomsByLecture,
    limit: options.limit,
    now: loaded.now,
    sourceUrl: loaded.sourceUrl
  });
  return {
    loggedIn: true,
    reason: authState.reason,
    available: true,
    registerableCount: list.total,
    sourceUrl: loaded.sourceUrl
  };
}

export async function getLectureList(options = {}) {
  const loaded = await loadLectureApi('list', options);
  const authState = classifyLecturePage(loaded.pageState);
  assertLectureAccess(authState, loaded.pageState);
  ensureLectureList(loaded.api);
  return buildLectureListPayload(loaded.api, {
    availability: options.availability,
    classroomsByLecture: loaded.classroomsByLecture,
    limit: options.limit,
    now: loaded.now,
    sourceUrl: loaded.sourceUrl
  });
}

export async function getLectureItem(target, options = {}) {
  const loaded = await loadLectureApi('item', { ...options, target });
  const authState = classifyLecturePage(loaded.pageState);
  assertLectureAccess(authState, loaded.pageState);
  ensureLectureList(loaded.api);
  const row = loaded.api.data.find((item) => String(item.id) === String(target));
  if (!row) {
    const error = new Error(`Lecture not found: ${target}.`);
    error.code = 'LECTURE_NOT_FOUND';
    error.hint = 'Run `szu-cli lecture list --availability all --json` to obtain a lecture id.';
    throw error;
  }
  const classrooms = loaded.classroomsByLecture?.[String(target)];
  if (!Array.isArray(classrooms)) {
    throwPageChanged('classroom detail');
  }
  return buildLectureItemPayload(row, classrooms, {
    now: loaded.now,
    sourceUrl: loaded.sourceUrl
  });
}

export async function getLectureProgress(options = {}) {
  const loaded = await loadLectureApi('progress', options);
  const authState = classifyLecturePage(loaded.pageState);
  assertLectureAccess(authState, loaded.pageState);
  ensureLectureProgress(loaded.api);
  return buildLectureProgressPayload(loaded.api, { sourceUrl: loaded.sourceUrl });
}

function classifyLecturePage(pageState) {
  const base = classifyAuthPage(pageState);
  if (base.reason === 'cas-login-page') {
    return base;
  }
  const title = pageState.title ?? '';
  const text = pageState.text ?? '';
  if (pageState.status === 403 || title === '403' || text.trim().startsWith('403')) {
    return { loggedIn: false, reason: 'lecture-forbidden' };
  }
  if (
    title.includes('创新领航讲座')
    || (text.includes('讲座报名') && text.includes('学习进度'))
  ) {
    return { loggedIn: true, reason: 'lecture-page' };
  }
  return { loggedIn: false, reason: 'unknown' };
}

function assertLectureAccess(authState, pageState) {
  if (authState.loggedIn) {
    return;
  }
  if (authState.reason === 'cas-login-page') {
    const error = new Error('Browser profile is not logged in to SZU Lecture.');
    error.code = 'LOGIN_REQUIRED';
    error.hint = 'Run `szu-cli auth login --url https://lecture.szu.edu.cn/` and complete login.';
    throw error;
  }
  if (authState.reason === 'lecture-forbidden') {
    const error = new Error('SZU Lecture returned 403.');
    error.code = 'PERMISSION_DENIED';
    error.hint = 'Open https://lecture.szu.edu.cn/ once in the persistent browser profile and retry.';
    throw error;
  }
  const error = new Error(`Unable to recognize SZU Lecture page state: ${pageState.title ?? 'unknown'}.`);
  error.code = 'PAGE_CHANGED';
  error.hint = 'The SZU Lecture page may have changed; update the lecture adapter.';
  throw error;
}

async function loadLectureApi(kind, options) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return loadMockLecture(kind, options);
  }

  const profilePath = getProfilePath();
  if (!existsSync(profilePath)) {
    const error = new Error('Browser profile does not exist.');
    error.code = 'LOGIN_REQUIRED';
    error.hint = 'Run `szu-cli auth login --url https://lecture.szu.edu.cn/` first.';
    throw error;
  }

  const { chromium } = await importPlaywright();
  const context = await chromium.launchPersistentContext(
    profilePath,
    getLaunchOptions({ headless: options.headless ?? true })
  );
  try {
    const page = context.pages()[0] ?? await context.newPage();
    let response;
    try {
      response = await page.goto(options.url ?? LECTURE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
    } catch (cause) {
      throwNetworkError(cause);
    }
    const pageState = {
      url: page.url(),
      title: await page.title(),
      text: await page.locator('body').innerText({ timeout: 10000 }).catch(() => ''),
      status: response?.status() ?? null
    };
    const authState = classifyLecturePage(pageState);
    assertLectureAccess(authState, pageState);

    const apiResponse = kind === 'progress'
      ? await page.request.post(PROGRESS_URL)
      : await page.request.get(LIST_URL);
    assertApiResponse(apiResponse);
    const api = await apiResponse.json().catch(() => null);
    const classroomsByLecture = kind === 'progress'
      ? {}
      : await loadClassrooms(page, api, kind === 'item' ? options.target : null);
    return {
      pageState,
      api,
      classroomsByLecture,
      now: new Date(),
      sourceUrl: sanitizeLectureSourceUrl(page.url())
    };
  } finally {
    await context.close();
  }
}

function loadMockLecture(kind, options) {
  const status = Number(process.env.SZU_MOCK_LECTURE_STATUS ?? 200);
  const url = process.env.SZU_MOCK_LECTURE_URL ?? options.url ?? LECTURE_URL;
  const classroomResponses = JSON.parse(process.env.SZU_MOCK_LECTURE_CLASSROOMS_JSON ?? '{}');
  return {
    pageState: {
      url,
      title: process.env.SZU_MOCK_LECTURE_TITLE ?? (status === 403 ? '403' : '创新领航讲座'),
      text: process.env.SZU_MOCK_LECTURE_TEXT ?? '讲座报名 学习进度',
      status
    },
    api: JSON.parse(
      kind === 'progress'
        ? process.env.SZU_MOCK_LECTURE_PROGRESS_JSON ?? '{}'
        : process.env.SZU_MOCK_LECTURE_LIST_JSON ?? '{}'
    ),
    classroomsByLecture: Object.fromEntries(
      Object.entries(classroomResponses).map(([id, response]) => [
        id,
        Array.isArray(response?.data) ? response.data : undefined
      ])
    ),
    now: process.env.SZU_MOCK_NOW ? new Date(process.env.SZU_MOCK_NOW) : new Date(),
    sourceUrl: sanitizeLectureSourceUrl(url)
  };
}

async function loadClassrooms(page, list, target) {
  const rows = Array.isArray(list?.data) ? list.data : [];
  const candidates = target
    ? rows.filter((row) => String(row.id) === String(target))
    : rows.filter((row) => row.status === '正在报名中');
  const result = {};
  for (const row of candidates) {
    const params = new URLSearchParams({
      lectureId: String(row.id),
      page: '1',
      limit: '100'
    });
    const response = await page.request.get(
      new URL(`/lectureClassroomSignUp/list?${params}`, LECTURE_URL).toString()
    );
    if (response.status() === 401 || response.status() === 403) {
      assertApiResponse(response);
    }
    if (!response.ok()) {
      continue;
    }
    const body = await response.json().catch(() => null);
    if (Array.isArray(body?.data)) {
      result[String(row.id)] = body.data;
    }
  }
  return result;
}

function assertApiResponse(response) {
  if (response.status() === 401) {
    const error = new Error('SZU Lecture session is not authenticated.');
    error.code = 'LOGIN_REQUIRED';
    error.hint = 'Run `szu-cli auth login --url https://lecture.szu.edu.cn/` and complete login.';
    throw error;
  }
  if (response.status() === 403) {
    const error = new Error('SZU Lecture API returned 403.');
    error.code = 'PERMISSION_DENIED';
    throw error;
  }
  if (!response.ok()) {
    const error = new Error(`SZU Lecture API returned HTTP ${response.status()}.`);
    error.code = 'PAGE_CHANGED';
    throw error;
  }
}

function ensureLectureList(api) {
  if (!Array.isArray(api?.data)) {
    throwPageChanged('lecture list');
  }
}

function ensureLectureProgress(api) {
  const fields = ['offlineTimes', 'onlineTimes', 'sumOfflineTimes', 'sumOnlineTimes'];
  if (!api || fields.some((field) => api[field] === undefined || api[field] === null)) {
    throwPageChanged('learning progress');
  }
}

function throwPageChanged(subject) {
  const error = new Error(`Missing SZU Lecture ${subject} API data.`);
  error.code = 'PAGE_CHANGED';
  error.hint = 'The SZU Lecture API may have changed; update the lecture adapter.';
  throw error;
}

function sanitizeLectureSourceUrl(value) {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/;jsessionid=[^/?#]+/i, '');
  url.search = '';
  url.hash = '';
  return url.toString();
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

function throwNetworkError(cause) {
  const error = new Error('SZU Lecture is not reachable.');
  error.code = 'NETWORK_REQUIRED';
  error.hint = 'Check your network connection and try again.';
  error.cause = cause;
  throw error;
}
