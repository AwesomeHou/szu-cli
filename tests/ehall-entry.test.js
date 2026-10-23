import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildKnownEhallEntry,
  findPortalAppEntry,
  resolveEhallEntry,
  sanitizeEhallSourceUrl,
  validateEhallEntryUrl
} from '../src/modules/ehall-entry.js';

test('validates an expected eHall application URL', () => {
  const url = validateEhallEntryUrl(
    'https://ehall.szu.edu.cn/jwapp/sys/czjl/*default/index.do?EMAP_LANG=zh#/czjl',
    '/jwapp/sys/czjl/'
  );

  assert.equal(url.hostname, 'ehall.szu.edu.cn');
  assert.equal(url.pathname.includes('/jwapp/sys/czjl/'), true);
});

test('upgrades portal HTTP entry URLs to HTTPS', () => {
  const url = validateEhallEntryUrl(
    'http://ehall.szu.edu.cn/jwapp/sys/wdkb/entrance.do',
    '/jwapp/sys/wdkb/'
  );

  assert.equal(url.protocol, 'https:');
});

test('rejects an unexpected host or application path', () => {
  assert.throws(
    () => validateEhallEntryUrl('https://example.com/jwapp/sys/czjl/', '/jwapp/sys/czjl/'),
    /Unexpected eHall application URL/
  );
  assert.throws(
    () => validateEhallEntryUrl('https://ehall.szu.edu.cn/jwapp/sys/other/', '/jwapp/sys/czjl/'),
    /Unexpected eHall application URL/
  );
});

test('finds a matching application entry recursively in portal data', () => {
  const payload = {
    categoryList: [
      {
        appList: [
          {
            appName: '成长记录',
            appPc: {
              entranceUrl: 'https://ehall.szu.edu.cn/jwapp/sys/czjl/*default/index.do?gid_=portal#/czjl'
            }
          }
        ]
      }
    ]
  };

  assert.equal(
    findPortalAppEntry(payload, {
      names: ['成长记录'],
      appPath: '/jwapp/sys/czjl/'
    }),
    'https://ehall.szu.edu.cn/jwapp/sys/czjl/*default/index.do?gid_=portal#/czjl'
  );
});

test('builds a known application entry with a fresh timestamp', () => {
  const entry = buildKnownEhallEntry({
    appPath: '/jwapp/sys/czjl/*default/index.do',
    hash: '/czjl',
    gid: 'known-context',
    now: 123456
  });
  const url = new URL(entry);

  assert.equal(url.searchParams.get('t_s'), '123456');
  assert.equal(url.searchParams.get('amp_sec_version_'), '1');
  assert.equal(url.searchParams.get('gid_'), 'known-context');
  assert.equal(url.searchParams.get('EMAP_LANG'), 'zh');
  assert.equal(url.searchParams.get('THEME'), 'cherry');
  assert.equal(url.hash, '#/czjl');
});

test('omits an unavailable context from a known fallback entry', () => {
  const entry = buildKnownEhallEntry({
    appPath: '/jwapp/sys/wdkb/*default/index.do',
    hash: '/xskcb',
    now: 123456
  });
  const url = new URL(entry);

  assert.equal(url.searchParams.has('gid_'), false);
});

test('resolves an application entry from portal data before known fallback', async () => {
  const page = {
    request: {
      async get() {
        return {
          ok: () => true,
          async json() {
            return {
              appList: [
                {
                  appName: '成长记录',
                  pcOpenUrl: 'https://ehall.szu.edu.cn/jwapp/sys/czjl/*default/index.do?gid_=portal#/czjl'
                }
              ]
            };
          }
        };
      }
    }
  };

  const entry = await resolveEhallEntry(page, {
    names: ['成长记录'],
    expectedPath: '/jwapp/sys/czjl/',
    known: {
      appPath: '/jwapp/sys/czjl/*default/index.do',
      hash: '/czjl',
      gid: 'known-context'
    }
  });

  assert.equal(entry.includes('gid_=portal'), true);
});

test('resolves a student app from the student portal catalog and upgrades its entry URL', async () => {
  const requested = [];
  const page = {
    request: {
      async get(url) {
        requested.push(url);
        return {
          ok: () => true,
          async json() {
            return url.includes('serviceRoleApp')
              ? {
                  appList: [
                    {
                      appName: '我的课表',
                      pcOpenUrl: 'http://ehall.szu.edu.cn/jwapp/sys/wdkb/entrance.do?gid_=student-context'
                    }
                  ]
                }
              : {};
          }
        };
      }
    }
  };

  const entry = await resolveEhallEntry(page, {
    names: ['我的课表'],
    expectedPath: '/jwapp/sys/wdkb/',
    known: {
      appPath: '/jwapp/sys/wdkb/*default/index.do',
      hash: '/xskcb'
    }
  });

  assert.equal(new URL(entry).protocol, 'https:');
  assert.equal(new URL(entry).pathname, '/jwapp/sys/wdkb/entrance.do');
  assert.equal(new URL(entry).searchParams.get('gid_'), 'student-context');
  assert.equal(requested.some((url) => url.includes('serviceRoleId=1__0')), true);
});

test('removes dynamic application context from source URLs', () => {
  const sourceUrl = sanitizeEhallSourceUrl(
    'https://ehall.szu.edu.cn/jwapp/sys/czjl/*default/index.do?t_s=123&amp_sec_version_=1&gid_=context&EMAP_LANG=zh&THEME=cherry#/czjl'
  );
  const url = new URL(sourceUrl);

  assert.equal(url.searchParams.has('t_s'), false);
  assert.equal(url.searchParams.has('amp_sec_version_'), false);
  assert.equal(url.searchParams.has('gid_'), false);
  assert.equal(url.searchParams.get('EMAP_LANG'), 'zh');
  assert.equal(url.hash, '#/czjl');
});
