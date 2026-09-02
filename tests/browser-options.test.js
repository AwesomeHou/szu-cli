import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getSelectedBrowser, selectBrowser } from '../src/modules/browser.js';
import { getLaunchOptions } from '../src/modules/browser-options.js';

test('uses the Chrome channel when Chrome is selected', () => {
  assert.deepEqual(getLaunchOptions({
    platform: 'win32',
    env: { SZU_BROWSER: 'chrome' }
  }), {
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

test('uses managed Chromium when Chromium is selected', () => {
  assert.deepEqual(getLaunchOptions({
    platform: 'linux',
    env: { SZU_BROWSER: 'chromium' }
  }), {
    headless: false
  });
});

test('persists an explicit browser selection and keeps its profile isolated', () => {
  const home = mkdtempSync(join(tmpdir(), 'szu-browser-test-'));
  const localAppData = join(home, 'local-app-data');
  const chromePath = join(localAppData, 'Google', 'Chrome', 'Application');
  mkdirSync(chromePath, { recursive: true });
  writeFileSync(join(chromePath, 'chrome.exe'), 'test');
  const env = {
    SZU_CLI_HOME: home,
    LOCALAPPDATA: localAppData,
    PROGRAMFILES: join(home, 'program-files'),
    'PROGRAMFILES(X86)': join(home, 'program-files-x86')
  };

  try {
    const selected = selectBrowser('chrome', { platform: 'win32', env });
    const restored = getSelectedBrowser({ platform: 'win32', env });
    const edge = getSelectedBrowser({
      platform: 'win32',
      env: { ...env, SZU_BROWSER: 'edge' }
    });

    assert.equal(selected.id, 'chrome');
    assert.equal(restored.id, 'chrome');
    assert.notEqual(restored.profilePath, edge.profilePath);
    assert.match(restored.profilePath, /browser-profiles[\\/]chrome$/);
    assert.match(edge.profilePath, /browser-profiles[\\/]edge$/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
