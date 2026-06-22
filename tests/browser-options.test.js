import test from 'node:test';
import assert from 'node:assert/strict';

import { getLaunchOptions } from '../src/modules/browser-options.js';

test('uses system Chrome channel by default on Windows', () => {
  assert.deepEqual(getLaunchOptions({ platform: 'win32' }), {
    channel: 'chrome',
    headless: false
  });
});

test('honors explicit browser channel environment override', () => {
  assert.deepEqual(getLaunchOptions({
    platform: 'win32',
    env: { SZU_BROWSER_CHANNEL: 'msedge' },
    headless: true
  }), {
    channel: 'msedge',
    headless: true
  });
});

test('uses bundled Chromium on non-Windows unless overridden', () => {
  assert.deepEqual(getLaunchOptions({ platform: 'linux' }), {
    headless: false
  });
});
