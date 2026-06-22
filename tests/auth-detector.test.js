import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyAuthPage } from '../src/modules/auth-detector.js';

test('classifies SZU board page with user menu as logged in', () => {
  const result = classifyAuthPage({
    url: 'https://www1.szu.edu.cn/board/',
    title: '校园公文通—深圳大学内部网',
    text: '侯燊 个人中心｜注销 ｜说明 首 页 ｜ 公文通'
  });

  assert.deepEqual(result, {
    loggedIn: true,
    reason: 'szu-user-menu'
  });
});

test('classifies CAS page as login required', () => {
  const result = classifyAuthPage({
    url: 'https://authserver.szu.edu.cn/authserver/login',
    title: '统一身份认证',
    text: '账号登录 密码'
  });

  assert.deepEqual(result, {
    loggedIn: false,
    reason: 'cas-login-page'
  });
});

test('classifies unknown page as not logged in with unknown reason', () => {
  const result = classifyAuthPage({
    url: 'https://www1.szu.edu.cn/board/',
    title: 'Unknown',
    text: '加载中'
  });

  assert.deepEqual(result, {
    loggedIn: false,
    reason: 'unknown'
  });
});
