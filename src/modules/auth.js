import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';

import { getProfilePath } from './paths.js';
import { getLaunchOptions } from './browser-options.js';
import { classifyAuthPage } from './auth-detector.js';

const DEFAULT_AUTH_CHECK_URL = 'https://www1.szu.edu.cn/board/';
const LOGIN_HINT = 'Run `szu-cli auth login` and complete login in the opened browser.';

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

  const { chromium } = await importPlaywright();
  const context = await chromium.launchPersistentContext(profilePath, getLaunchOptions({
    headless: options.headless ?? false
  }));
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const finalUrl = page.url();
    if (options.waitForClose !== false) {
      await context.waitForEvent('close');
    }

    return {
      opened: true,
      closed: options.waitForClose !== false,
      url: finalUrl,
      profilePath,
      backend: 'playwright',
      message: options.waitForClose === false
        ? 'Complete login in the opened browser window, then close it when finished.'
        : 'Browser was closed. Rerun `szu-cli auth status --json` to verify login.'
    };
  } finally {
    await context.close().catch(() => {});
  }
}

export async function getAuthStatus(options = {}) {
  const profilePath = getProfilePath();
  const profileExists = existsSync(profilePath);

  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    const checked = classifyAuthPage({
      url: process.env.SZU_MOCK_AUTH_URL ?? DEFAULT_AUTH_CHECK_URL,
      title: process.env.SZU_MOCK_AUTH_TITLE ?? '',
      text: process.env.SZU_MOCK_AUTH_TEXT ?? ''
    });

    return withLoginHint({
      ...checked,
      profileExists,
      profilePath,
      checkedUrl: DEFAULT_AUTH_CHECK_URL,
      finalUrl: process.env.SZU_MOCK_AUTH_URL ?? DEFAULT_AUTH_CHECK_URL,
      backend: 'mock'
    });
  }

  if (!profileExists) {
    return withLoginHint({
      loggedIn: false,
      reason: 'profile-missing',
      profileExists,
      profilePath
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
  const { chromium } = await importPlaywright();
  const context = await chromium.launchPersistentContext(
    options.profilePath,
    getLaunchOptions({ headless: options.headless })
  );

  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const pageState = {
      url: page.url(),
      title: await page.title(),
      text: await page.locator('body').innerText({ timeout: 10000 }).catch(() => '')
    };
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
  return status.loggedIn ? status : {
    ...status,
    hint: LOGIN_HINT
  };
}
