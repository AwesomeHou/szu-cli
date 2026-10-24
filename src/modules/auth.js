import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';

import { getProfilePath } from './paths.js';
import { getLaunchOptions } from './browser-options.js';
import { assertBrowserAvailable } from './browser.js';
import { classifyAuthPage } from './auth-detector.js';

const DEFAULT_AUTH_CHECK_URL = 'https://www1.szu.edu.cn/board/';

export async function loginWithBrowserProfile(options = {}) {
  const profilePath = getProfilePath();
  const url = options.url ?? 'https://www1.szu.edu.cn/board/';

  await mkdir(profilePath, { recursive: true });

  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return {
      opened: true,
      closed: options.waitForClose !== false,
      url,
      profilePath,
      backend: 'mock'
    };
  }

  const browser = assertBrowserAvailable();
  const { chromium } = await importPlaywright();
  const context = await chromium.launchPersistentContext(profilePath, getLaunchOptions({
    headless: options.headless ?? false
  }));
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const finalUrl = page.url();
    if (options.waitForClose !== false) {
      await waitForContextClose(context);
    }

    return {
      opened: true,
      closed: true,
      url: finalUrl,
      profilePath,
      browser: browser.id,
      backend: 'playwright',
      message: options.waitForClose === false
        ? 'Complete login in the opened browser window, then close it when finished.'
        : 'Browser was closed. Rerun `szu-cli auth status` to verify login.'
    };
  } finally {
    await context.close().catch(() => {});
  }
}

export function waitForContextClose(context) {
  return context.waitForEvent('close', { timeout: 0 });
}

async function readAuthPage(page) {
  return {
    url: page.url(),
    title: await page.title().catch(() => ''),
    text: await page.locator('body').innerText({ timeout: 10000 }).catch(() => '')
  };
}

export async function logoutBrowserProfile() {
  const profilePath = getProfilePath();
  const profileExists = existsSync(profilePath);

  try {
    await rm(profilePath, { recursive: true, force: true });
  } catch (cause) {
    const error = new Error('Unable to clear the SZU browser login profile.');
    error.code = 'AUTH_LOGOUT_FAILED';
    error.hint = 'Close any szu-cli browser window and retry `szu-cli auth logout`.';
    error.cause = cause;
    throw error;
  }

  return {
    loggedOut: true,
    profileExisted: profileExists,
    profilePath
  };
}

export async function getAuthStatus(options = {}) {
  const profilePath = getProfilePath({ persist: false });
  const profileExists = existsSync(profilePath);

  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    const mockStatus = getMockAuthStatus(profileExists);
    return withLoginHint({
      ...mockStatus,
      profilePath,
      checkedUrl: options.url ?? DEFAULT_AUTH_CHECK_URL,
      finalUrl: process.env.SZU_MOCK_AUTH_URL ?? options.url ?? DEFAULT_AUTH_CHECK_URL,
      backend: 'mock'
    });
  }

  if (!profileExists) {
    return withLoginHint({
      loggedIn: false,
      reason: 'profile-missing',
      profileExists,
      profilePath,
      checkedUrl: options.url ?? DEFAULT_AUTH_CHECK_URL
    });
  }

  const checked = await checkAuthWithBrowser({
    url: options.url ?? DEFAULT_AUTH_CHECK_URL,
    headless: options.headless ?? true,
    profilePath
  });

  return withLoginHint({
    ...checked,
    profileExists,
    profilePath,
    checkedUrl: options.url ?? DEFAULT_AUTH_CHECK_URL,
    backend: 'playwright'
  });
}

async function checkAuthWithBrowser(options) {
  assertBrowserAvailable({ persist: false });
  const { chromium } = await importPlaywright();
  const context = await chromium.launchPersistentContext(
    options.profilePath,
    getLaunchOptions({ headless: options.headless, persist: false })
  );

  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    let pageState = await readAuthPage(page);
    const deadline = Date.now() + 5000;
    while (classifyAuthPage(pageState).reason === 'unknown' && Date.now() < deadline) {
      await page.waitForTimeout(250);
      pageState = await readAuthPage(page);
    }
    return {
      ...classifyAuthPage(pageState),
      finalUrl: pageState.url
    };
  } finally {
    await context.close();
  }
}

async function importPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const error = new Error('Playwright is not installed. Run `npm install` after dependencies are added.');
    error.code = 'BACKEND_UNAVAILABLE';
    throw error;
  }
}

function withLoginHint(status) {
  return {
    ...status,
    scope: 'checked-url',
    status: status.loggedIn ? 'authenticated' : status.reason === 'unknown' ? 'unknown' : 'unauthenticated',
    ...(!status.loggedIn ? {
      hint: status.reason === 'unknown'
        ? 'Login could not be confirmed for the checked URL. Check the page in a browser.'
        : `Run \`szu-cli auth login --url ${status.checkedUrl}\` and complete login in the opened browser.`
    } : {})
  };
}

function getMockAuthStatus(profileExists) {
  const configuredProfileExists = readMockBoolean('SZU_MOCK_AUTH_PROFILE_EXISTS');
  const configuredLoggedIn = readMockBoolean('SZU_MOCK_AUTH_LOGGED_IN');
  const effectiveProfileExists = configuredProfileExists ?? profileExists;

  if (configuredLoggedIn === true && effectiveProfileExists === false) {
    const error = new Error('Mock auth state cannot be logged in when profileExists is false.');
    error.code = 'MOCK_AUTH_STATE_INVALID';
    throw error;
  }

  if (!effectiveProfileExists) {
    return {
      loggedIn: false,
      reason: 'profile-missing',
      profileExists: effectiveProfileExists
    };
  }

  if (configuredLoggedIn !== null) {
    return {
      loggedIn: configuredLoggedIn,
      reason: configuredLoggedIn ? 'mock-configured' : 'mock-configured-logged-out',
      profileExists: effectiveProfileExists,
      authSource: 'fixture'
    };
  }

  return {
    ...classifyAuthPage({
      url: process.env.SZU_MOCK_AUTH_URL ?? DEFAULT_AUTH_CHECK_URL,
      title: process.env.SZU_MOCK_AUTH_TITLE ?? '',
      text: process.env.SZU_MOCK_AUTH_TEXT ?? ''
    }),
    profileExists: effectiveProfileExists
  };
}

function readMockBoolean(name) {
  const value = process.env[name];
  if (value === undefined) {
    return null;
  }

  if (/^(?:1|true|yes)$/i.test(value)) {
    return true;
  }

  if (/^(?:0|false|no)$/i.test(value)) {
    return false;
  }

  const error = new Error(`${name} must be true or false.`);
  error.code = 'MOCK_AUTH_CONFIG_INVALID';
  throw error;
}
