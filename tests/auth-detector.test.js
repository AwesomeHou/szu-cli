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

test('classifies eHall home as logged in', () => {
  assert.deepEqual(classifyAuthPage({
    url: 'https://ehall.szu.edu.cn/new/index.html',
    title: '深圳大学网上办事服务大厅',
    text: '深圳大学网上办事服务大厅 我的课表 个人中心 安全退出'
  }), {
    loggedIn: true,
    reason: 'ehall-home-page'
  });
});

test('classifies eHall course page as logged in', () => {
  assert.deepEqual(classifyAuthPage({
    url: 'https://ehall.szu.edu.cn/jwapp/sys/wdkb/*default/index.do#/xskcb',
    title: '我的课程表',
    text: '我的课程表 课表查看2025-2026学年第二学期'
  }), {
    loggedIn: true,
    reason: 'ehall-course-page'
  });
});

test('classifies eHall grade page as logged in', () => {
  assert.deepEqual(classifyAuthPage({
    url: 'https://ehall.szu.edu.cn/jwapp/sys/cjcx/*default/index.do#/cjcx',
    title: '成绩查询',
    text: '成绩查询 2025-2026学年第一学期'
  }), {
    loggedIn: true,
    reason: 'ehall-grade-page'
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
