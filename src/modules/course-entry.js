import { classifyAuthPage } from './auth-detector.js';
import { validateEhallEntryUrl } from './ehall-entry.js';

const EHALL_HOME_URL = 'https://ehall.szu.edu.cn/new/index.html';

export async function openCourseEntry(page, options = {}) {
  const override = options.url ? validateEhallEntryUrl(options.url, '/jwapp/sys/wdkb/').href : null;
  const loginUrl = new URL('/login', EHALL_HOME_URL);
  loginUrl.searchParams.set('service', EHALL_HOME_URL);
  await page.goto(loginUrl.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  try {
    await page.waitForFunction(() => (
      document.body?.innerText.includes('安全退出')
      || (location.hostname === 'authserver.szu.edu.cn' && document.querySelector('input[type="password"]'))
    ), null, { timeout: 10000 });
  } catch (error) {
    if (error.name !== 'TimeoutError') {
      throw error;
    }
  }
  const state = {
    url: page.url(),
    title: await page.title(),
    text: await page.locator('body').innerText({ timeout: 10000 })
  };
  const auth = classifyAuthPage(state);
  if (!auth.loggedIn) {
    const error = new Error('Unable to establish the SZU eHall portal session.');
    error.code = ['cas-login-page', 'ehall-login-prompt'].includes(auth.reason) ? 'LOGIN_REQUIRED' : 'PAGE_CHANGED';
    error.hint = error.code === 'LOGIN_REQUIRED'
      ? `Run \`szu-cli auth login --url ${loginUrl.href}\` and complete login.`
      : 'The eHall portal could not be recognized; update the course adapter.';
    throw error;
  }

  if (override) {
    return page.goto(override, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  const app = page.locator('[amp-appid]').filter({ has: page.getByText('我的课表', { exact: true }) }).first();
  let appId;
  try {
    appId = await app.getAttribute('amp-appid', { timeout: 10000 });
  } catch (error) {
    if (error.name !== 'TimeoutError') {
      throw error;
    }
  }
  if (!/^\d+$/.test(appId ?? '')) {
    const error = new Error('The eHall portal did not provide a valid timetable application entry.');
    error.code = 'PAGE_CHANGED';
    error.hint = 'Confirm that 我的课表 is available in the eHall portal, or update the course adapter.';
    throw error;
  }
  const entry = new URL('/appShow', EHALL_HOME_URL);
  entry.searchParams.set('appId', appId);
  return page.goto(entry.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
}
