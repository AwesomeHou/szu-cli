import test from 'node:test';
import assert from 'node:assert/strict';

import { openCourseEntry } from '../src/modules/course-entry.js';

function portalPage(options = {}) {
  const visits = [];
  const page = {
    visits,
    async goto(url) {
      visits.push(url);
      return { status: () => 200 };
    },
    async waitForFunction() {},
    url: () => options.loggedOut ? 'https://authserver.szu.edu.cn/authserver/login' : 'https://ehall.szu.edu.cn/new/index.html',
    title: async () => options.loggedOut ? '统一身份认证' : '深圳大学网上办事服务大厅',
    getByText: (text, settings) => ({ text, exact: settings.exact }),
    locator(selector) {
      if (selector === 'body') {
        return { innerText: async () => options.loggedOut ? '账号登录 密码' : options.unknown ? '加载中' : '个人中心 安全退出' };
      }
      assert.equal(selector, '[amp-appid]');
      return {
        filter({ has }) {
          assert.deepEqual(has, { text: '我的课表', exact: true });
          return {
            first: () => ({
              getAttribute: async (name) => {
                assert.equal(name, 'amp-appid');
                if (options.missing) {
                  const error = new Error('Missing application');
                  error.name = 'TimeoutError';
                  throw error;
                }
                return options.appId ?? '123456';
              }
            })
          };
        }
      };
    }
  };
  return page;
}

test('course entry establishes the portal session and uses its app launcher instead of a bare app URL', async () => {
  const page = portalPage();
  const response = await openCourseEntry(page);
  assert.equal(response.status(), 200);
  assert.equal(page.visits.length, 2);
  const login = new URL(page.visits[0]);
  assert.equal(login.origin, 'https://ehall.szu.edu.cn');
  assert.equal(login.pathname, '/login');
  assert.equal(login.searchParams.get('service'), 'https://ehall.szu.edu.cn/new/index.html');
  assert.equal(page.visits[1], 'https://ehall.szu.edu.cn/appShow?appId=123456');
});

test('course entry returns LOGIN_REQUIRED when SSO needs user login without trying to launch the app', async () => {
  const page = portalPage({ loggedOut: true });
  await assert.rejects(() => openCourseEntry(page), error => {
    assert.equal(error.code, 'LOGIN_REQUIRED');
    assert.match(error.hint, /auth login --url https:\/\/ehall.szu.edu.cn\/login/);
    return true;
  });
  assert.equal(page.visits.length, 1);
});

test('course entry does not treat the public portal title as authenticated', async () => {
  const page = portalPage({ unknown: true });
  await assert.rejects(() => openCourseEntry(page), { code: 'PAGE_CHANGED' });
  assert.equal(page.visits.length, 1);
});

test('course entry reports a missing or invalid launcher without falling back to the 403 app URL', async () => {
  for (const options of [{ missing: true }, { appId: 'not-an-app-id' }]) {
    const page = portalPage(options);
    await assert.rejects(() => openCourseEntry(page), { code: 'PAGE_CHANGED' });
    assert.equal(page.visits.length, 1);
  }
});

test('course entry preserves an explicit application URL after authenticating the portal', async () => {
  const page = portalPage();
  const url = 'https://ehall.szu.edu.cn/jwapp/sys/wdkb/*default/index.do?EMAP_LANG=zh#/xskcb';
  await openCourseEntry(page, { url });
  assert.equal(page.visits[1], url);
});

test('course entry rejects an unrelated explicit URL before opening the browser page', async () => {
  const page = portalPage();
  await assert.rejects(() => openCourseEntry(page, { url: 'https://example.com/' }), /Unexpected eHall/);
  assert.equal(page.visits.length, 0);
});
