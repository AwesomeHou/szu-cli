import { existsSync } from 'node:fs';

import { classifyAuthPage } from './auth-detector.js';
import { getLaunchOptions } from './browser-options.js';
import { getProfilePath } from './paths.js';
import {
  buildSportsCampusesPayload,
  buildSportsDatesPayload,
  buildSportsReserveConfirmPayload,
  buildSportsReserveDryRunPayload,
  buildSportsSlotsByDatePayload,
  buildSportsSlotsPayload,
  buildSportsVenuesPayload,
  parseSportsSnapshotFromText
} from './sports-parser.js';

const SPORTS_URL = 'https://ehall.szu.edu.cn/qljfwapp/sys/lwSzuCgyy/index.do#/sportVenue';
const EHALL_HOME_URL = 'https://ehall.szu.edu.cn/new/index.html';

export async function getSportsStatus(options = {}) {
  const loaded = await loadSportsPage(options);
  const authState = classifySportsPage(loaded.pageState);
  assertSportsAccess(authState, loaded.pageState);
  return {
    loggedIn: true,
    reason: authState.reason,
    sourceUrl: loaded.sourceUrl
  };
}

export async function getSportsCampuses(options = {}) {
  const loaded = await loadSportsPage(options);
  assertSportsAccess(classifySportsPage(loaded.pageState), loaded.pageState);
  const payload = buildSportsCampusesPayload(loaded.snapshot, { sourceUrl: loaded.sourceUrl });
  if (!payload.items.length) {
    throwPageChanged('campuses');
  }
  return payload;
}

export async function getSportsVenues(options = {}) {
  requireOption(options.campus, '--campus');
  const loaded = await loadSportsPage(options);
  assertSportsAccess(classifySportsPage(loaded.pageState), loaded.pageState);
  const payload = buildSportsVenuesPayload(loaded.snapshot, {
    campus: options.campus,
    sourceUrl: loaded.sourceUrl
  });
  if (!payload.items.length) {
    throwSportsError('SPORTS_CAMPUS_NOT_FOUND', `Sports campus not found or has no venues: ${options.campus}.`);
  }
  return payload;
}

export async function getSportsDates(options = {}) {
  requireOption(options.campus, '--campus');
  requireOption(options.venue, '--venue');
  const loaded = await loadSportsPage(options);
  assertSportsAccess(classifySportsPage(loaded.pageState), loaded.pageState);
  ensureVenue(loaded.snapshot, options);
  return buildSportsDatesPayload(loaded.snapshot, {
    campus: options.campus,
    venue: options.venue,
    sourceUrl: loaded.sourceUrl
  });
}
export async function getSportsSlots(options = {}) {
  requireOption(options.campus, '--campus');
  requireOption(options.venue, '--venue');
  const loaded = options.date
    ? await loadSportsPage(options)
    : await loadSportsSlotsByDate(options);
  assertSportsAccess(classifySportsPage(loaded.pageState), loaded.pageState);
  ensureVenue(loaded.snapshot, options);
  return options.date
    ? buildSportsSlotsPayload(loaded.snapshot, {
      campus: options.campus,
      venue: options.venue,
      date: options.date,
      sourceUrl: loaded.sourceUrl
    })
    : buildSportsSlotsByDatePayload(loaded.snapshot, {
      campus: options.campus,
      venue: options.venue,
      sourceUrl: loaded.sourceUrl
    });
}

export async function reserveSportsSlot(options = {}) {
  requireOption(options.campus, '--campus');
  requireOption(options.venue, '--venue');
  requireOption(options.date, '--date');
  requireOption(options.slot, '--slot');
  if (!options.dryRun && !options.confirm) {
    throwSportsError('SPORTS_CONFIRM_REQUIRED', 'Use --dry-run to preview or --confirm to submit a sports reservation.');
  }
  const slots = await getSportsSlots(options);
  if (options.dryRun) {
    return buildSportsReserveDryRunPayload(slots, options.slot);
  }
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return buildSportsReserveConfirmPayload(slots, options.slot);
  }
  return submitSportsReservation(options, slots);
}

async function submitSportsReservation(options, slots) {
  const dryRun = buildSportsReserveDryRunPayload(slots, options.slot);
  const profilePath = getProfilePath();
  const { chromium } = await importPlaywright();
  const context = await chromium.launchPersistentContext(
    profilePath,
    getLaunchOptions({ headless: options.headless ?? true })
  );
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(options.url ?? SPORTS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settleSportsPage(page, options);
    await clickText(page, dryRun.selected.label);
    await page.waitForTimeout(1000);
    const afterSlotText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
    const field = parseSportsSnapshotFromText(afterSlotText).fields[0];
    if (!field) {
      throwSportsError('SPORTS_SLOT_UNAVAILABLE', 'No selectable sports field appeared after selecting this slot.');
    }
    await clickText(page, field.label);
    await page.waitForTimeout(500);
    const submit = page.getByText('提交预约', { exact: true }).first();
    if (!(await submit.count().catch(() => 0))) {
      throwPageChanged('submit button');
    }
    await submit.click({ timeout: 3000 });
    await page.waitForTimeout(2000);
    const resultText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
    if (!isSubmitConfirmed(resultText, page.url())) {
      const error = new Error('Sports reservation submit was not confirmed by the page.');
      error.code = 'SPORTS_SUBMIT_UNVERIFIED';
      error.details = { text: resultText.slice(0, 300), url: page.url() };
      throw error;
    }
    return buildSportsReserveConfirmPayload(slots, options.slot, {
      status: 'pending-payment',
      payment: {
        required: true,
        url: paymentUrlOrNull(page.url()),
        message: '预约已提交；请在浏览器或学校页面中手动完成付款。'
      }
    });
  } finally {
    await context.close();
  }
}
function classifySportsPage(pageState) {
  const base = classifyAuthPage(pageState);
  if (base.reason === 'cas-login-page') {
    return base;
  }
  const title = pageState.title ?? '';
  const text = pageState.text ?? '';
  if (pageState.status === 403 || title === '403' || text.trim().startsWith('403')) {
    return { loggedIn: false, reason: 'sports-forbidden' };
  }
  if (
    title.includes('体育场馆预约')
    || (text.includes('体育场馆预约') && text.includes('我的预约'))
    || text.includes('学生组（场馆预约）')
  ) {
    return { loggedIn: true, reason: 'sports-page' };
  }
  return { loggedIn: false, reason: 'unknown' };
}

function assertSportsAccess(authState, pageState) {
  if (authState.loggedIn) {
    return;
  }
  if (authState.reason === 'cas-login-page') {
    const error = new Error('Browser profile is not logged in to SZU Sports.');
    error.code = 'LOGIN_REQUIRED';
    error.hint = `Run \`szu-cli auth login --url ${SPORTS_URL}\` and complete login.`;
    throw error;
  }
  if (authState.reason === 'sports-forbidden') {
    const error = new Error('SZU Sports returned 403.');
    error.code = 'PERMISSION_DENIED';
    throw error;
  }
  throwPageChanged(pageState.title ?? 'page state');
}

async function loadSportsPage(options) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return loadMockSports(options);
  }

  const profilePath = getProfilePath();
  if (!existsSync(profilePath)) {
    const error = new Error('Browser profile does not exist.');
    error.code = 'LOGIN_REQUIRED';
    error.hint = `Run \`szu-cli auth login --url ${SPORTS_URL}\` first.`;
    throw error;
  }

  const { chromium } = await importPlaywright();
  const context = await chromium.launchPersistentContext(
    profilePath,
    getLaunchOptions({ headless: options.headless ?? true })
  );
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(EHALL_HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    const response = await page.goto(options.url ?? SPORTS_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await settleSportsPage(page, options);
    const text = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
    const pageState = {
      url: page.url(),
      title: await page.title(),
      text,
      status: response?.status() ?? null
    };
    return {
      pageState,
      snapshot: parseSportsSnapshotFromText(text),
      sourceUrl: sanitizeSportsSourceUrl(page.url())
    };
  } finally {
    await context.close();
  }
}

async function settleSportsPage(page, options) {
  await page.waitForTimeout(1500);
  if (options.campus) {
    await clickText(page, options.campus);
    await page.waitForTimeout(1000);
  }
  if (options.venue) {
    await clickText(page, options.venue);
    await page.waitForTimeout(1000);
  }
  if (options.date) {
    await clickText(page, options.date);
    await page.waitForTimeout(1000);
  }
}

async function clickText(page, text) {
  const locator = page.getByText(text, { exact: true }).first();
  if (await locator.count().catch(() => 0)) {
    await locator.click({ timeout: 3000 }).catch(() => {});
  }
}

async function loadSportsSlotsByDate(options) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return loadMockSports(options);
  }

  const profilePath = getProfilePath();
  if (!existsSync(profilePath)) {
    const error = new Error('Browser profile does not exist.');
    error.code = 'LOGIN_REQUIRED';
    error.hint = `Run \`szu-cli auth login --url ${SPORTS_URL}\` first.`;
    throw error;
  }

  const { chromium } = await importPlaywright();
  const context = await chromium.launchPersistentContext(
    profilePath,
    getLaunchOptions({ headless: options.headless ?? true })
  );
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(EHALL_HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    const response = await page.goto(options.url ?? SPORTS_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await settleSportsPage(page, options);
    const firstText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
    const baseSnapshot = parseSportsSnapshotFromText(firstText);
    const slotsByDate = {};
    for (const date of baseSnapshot.dates) {
      await clickText(page, date);
      await page.waitForTimeout(1000);
      const dateText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
      slotsByDate[date] = parseSportsSnapshotFromText(dateText).slots;
    }
    const text = await page.locator('body').innerText({ timeout: 10000 }).catch(() => firstText);
    const pageState = {
      url: page.url(),
      title: await page.title(),
      text,
      status: response?.status() ?? null
    };
    return {
      pageState,
      snapshot: {
        ...baseSnapshot,
        slotsByDate
      },
      sourceUrl: sanitizeSportsSourceUrl(page.url())
    };
  } finally {
    await context.close();
  }
}
function loadMockSports(options) {
  const status = Number(process.env.SZU_MOCK_SPORTS_STATUS ?? 200);
  const url = process.env.SZU_MOCK_SPORTS_URL ?? options.url ?? SPORTS_URL;
  return {
    pageState: {
      url,
      title: process.env.SZU_MOCK_SPORTS_TITLE ?? (status === 403 ? '403' : '体育场馆预约'),
      text: process.env.SZU_MOCK_SPORTS_TEXT ?? '体育场馆预约 学生组（场馆预约） 我的预约',
      status
    },
    snapshot: JSON.parse(process.env.SZU_MOCK_SPORTS_JSON ?? '{}'),
    sourceUrl: sanitizeSportsSourceUrl(url)
  };
}

function ensureVenue(snapshot, options) {
  const venues = buildSportsVenuesPayload(snapshot, { campus: options.campus }).items;
  if (venues.length && !venues.some((venue) => venue.name === options.venue)) {
    throwSportsError('SPORTS_VENUE_NOT_FOUND', `Sports venue not found: ${options.venue}.`);
  }
}

function requireOption(value, name) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }
}

function throwPageChanged(subject) {
  const error = new Error(`Unable to recognize SZU Sports ${subject}.`);
  error.code = 'PAGE_CHANGED';
  error.hint = 'The SZU Sports page may have changed; update the sports adapter.';
  throw error;
}

function throwSportsError(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function isSubmitConfirmed(text, url) {
  const value = `${text ?? ''} ${url ?? ''}`;
  return /预约成功|提交成功|待支付|支付|订单|pay/i.test(value);
}
function paymentUrlOrNull(value) {
  return String(value).includes('/qljfwapp/sys/lwSzuCgyy/') ? null : value;
}
function sanitizeSportsSourceUrl(value) {
  const url = new URL(value);
  url.search = '';
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
