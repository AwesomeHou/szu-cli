import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import readline from 'node:readline/promises';

const require = createRequire(import.meta.url);
const CONFIG_FILE = 'browser.json';
const LEGACY_PROFILE_DIR = 'browser-profile';
const PROFILE_DIR = 'browser-profiles';
const BROWSER_IDS = ['chrome', 'edge', 'chromium'];

export function getSzuHome(options = {}) {
  const env = options.env ?? process.env;
  return env.SZU_CLI_HOME || join(homedir(), '.szu-cli');
}

export function getLegacyProfilePath(options = {}) {
  return join(getSzuHome(options), LEGACY_PROFILE_DIR);
}

export function getBrowserProfilePath(browser, options = {}) {
  const id = browser ?? getSelectedBrowser(options).id;
  return join(getSzuHome(options), PROFILE_DIR, id);
}

export function getSelectedBrowser(options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const persist = options.persist ?? true;
  const explicit = normalizeBrowserId(env.SZU_BROWSER ?? env.SZU_BROWSER_CHANNEL);

  if (explicit) {
    return buildSelection(explicit, 'environment', false, { env });
  }

  const saved = readBrowserConfig({ env });
  if (saved?.browser && BROWSER_IDS.includes(saved.browser)) {
    return buildSelection(saved.browser, 'saved', saved.profileMode === 'legacy', { env });
  }

  const defaultBrowser = detectDefaultBrowser(platform);
  const selected = defaultBrowser && isSystemBrowser(defaultBrowser) && isBrowserInstalled(defaultBrowser, { platform, env })
    ? defaultBrowser
    : ['chrome', 'edge'].find((browser) => isBrowserInstalled(browser, { platform, env })) ?? 'chromium';
  const selection = buildSelection(selected, defaultBrowser === selected ? 'os-default' : 'fallback', true, { env });
  if (persist) {
    saveBrowserConfig(selection.id, selection.profileMode, { env });
  }
  return selection;
}

export function getBrowserStatus(options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const selected = getSelectedBrowser({ platform, env, persist: false });

  return {
    selected: {
      id: selected.id,
      label: selected.label,
      channel: selected.channel,
      source: selected.source,
      profilePath: selected.profilePath,
      profileMode: selected.profileMode
    },
    browsers: Object.fromEntries(BROWSER_IDS.map((id) => {
      const browser = buildSelection(id, 'available', false, { env });
      return [id, {
        id,
        label: browser.label,
        installed: isBrowserInstalled(id, { platform, env }),
        channel: browser.channel,
        profilePath: browser.profilePath
      }];
    }))
  };
}

export function selectBrowser(browser, options = {}) {
  const id = normalizeBrowserId(browser);
  if (!id) {
    const error = new Error('Browser must be one of chrome, edge, or chromium.');
    error.code = 'BROWSER_SELECTION_INVALID';
    throw error;
  }

  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  if (!isBrowserInstalled(id, { platform, env })) {
    throwBrowserUnavailable(id, platform, env);
  }

  const selection = buildSelection(id, 'explicit', false, { env });
  saveBrowserConfig(selection.id, selection.profileMode, { env });
  return selection;
}

export function assertBrowserAvailable(options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const selection = getSelectedBrowser({
    platform,
    env,
    persist: options.persist ?? true
  });
  if (!isBrowserInstalled(selection.id, { platform, env })) {
    throwBrowserUnavailable(selection.id, platform, env);
  }
  return selection;
}

export async function installManagedChromium(options = {}) {
  if (!options.yes) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      const error = new Error('Installing Playwright Chromium requires explicit confirmation. Rerun with `browser install chromium --yes`.');
      error.code = 'BROWSER_INSTALL_CONFIRM_REQUIRED';
      error.hint = 'Review the download and run `szu-cli browser install chromium --yes` to continue.';
      throw error;
    }

    const prompt = readline.createInterface({ input: process.stdin, output: process.stderr });
    const answer = await prompt.question('Playwright Chromium will be downloaded. Continue? [y/N] ');
    prompt.close();
    if (!/^y(es)?$/i.test(answer.trim())) {
      const error = new Error('Chromium installation was cancelled.');
      error.code = 'BROWSER_INSTALL_CANCELLED';
      throw error;
    }
  }

  const cliPath = resolvePlaywrightCli();
  await runBrowserInstall(cliPath);
  const selection = buildSelection('chromium', 'explicit', false, { env: process.env });
  saveBrowserConfig(selection.id, selection.profileMode, { env: process.env });
  return {
    installed: true,
    browser: selection.id,
    profilePath: selection.profilePath
  };
}

export function normalizeBrowserId(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'msedge' || normalized === 'microsoft-edge') {
    return 'edge';
  }
  if (normalized === 'google-chrome') {
    return 'chrome';
  }
  return BROWSER_IDS.includes(normalized) ? normalized : null;
}

export function isBrowserInstalled(browser, options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  if (browser === 'chromium') {
    return isManagedChromiumInstalled();
  }
  return browserExecutableCandidates(browser, platform, env).some((candidate) => existsSync(candidate))
    || browserCommands(browser, platform).some((command) => commandExists(command, platform));
}

function buildSelection(id, source, allowLegacy, options = {}) {
  const profilePath = getBrowserProfilePath(id, options);
  const legacyProfile = allowLegacy && existsSync(getLegacyProfilePath(options)) && !existsSync(profilePath);
  const definition = browserDefinition(id);
  return {
    id,
    label: definition.label,
    channel: definition.channel,
    source,
    profileMode: legacyProfile ? 'legacy' : 'browser',
    profilePath: legacyProfile ? getLegacyProfilePath(options) : profilePath
  };
}

function browserDefinition(id) {
  return {
    chrome: { label: 'Google Chrome', channel: 'chrome' },
    edge: { label: 'Microsoft Edge', channel: 'msedge' },
    chromium: { label: 'Playwright Chromium', channel: null }
  }[id];
}

function isSystemBrowser(id) {
  return id === 'chrome' || id === 'edge';
}

function readBrowserConfig(options = {}) {
  try {
    const config = JSON.parse(readFileSync(join(getSzuHome(options), CONFIG_FILE), 'utf8'));
    return config && typeof config === 'object' ? config : null;
  } catch {
    return null;
  }
}

function saveBrowserConfig(browser, profileMode, options = {}) {
  const home = getSzuHome(options);
  try {
    mkdirSync(home, { recursive: true });
    writeFileSync(join(home, CONFIG_FILE), `${JSON.stringify({ browser, profileMode }, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600
    });
    return true;
  } catch {
    return false;
  }
}

function detectDefaultBrowser(platform) {
  if (platform === 'win32') {
    const output = runCommand('reg.exe', [
      'query',
      'HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice',
      '/v',
      'ProgId'
    ], platform);
    return mapBrowserName(output);
  }

  if (platform === 'darwin') {
    const output = runCommand('defaults', [
      'read',
      'com.apple.LaunchServices/com.apple.launchservices.secure',
      'LSHandlers'
    ], platform);
    const httpsBlock = output.match(/\{[^{}]*LSHandlerURLScheme\s*=\s*https[^{}]*\}/i)?.[0];
    return mapBrowserName(httpsBlock);
  }

  if (platform === 'linux') {
    return mapBrowserName(runCommand('xdg-settings', ['get', 'default-web-browser'], platform));
  }

  return null;
}

function mapBrowserName(value) {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized.includes('chrome')) {
    return 'chrome';
  }
  if (normalized.includes('edge') || normalized.includes('msedge')) {
    return 'edge';
  }
  return null;
}

function browserExecutableCandidates(browser, platform, env) {
  if (platform === 'win32') {
    const localAppData = env.LOCALAPPDATA;
    const programFiles = env.PROGRAMFILES;
    const programFilesX86 = env['PROGRAMFILES(X86)'];
    const roots = [localAppData, programFiles, programFilesX86].filter(Boolean);
    if (browser === 'chrome') {
      return roots.flatMap((root) => [
        join(root, 'Google', 'Chrome', 'Application', 'chrome.exe')
      ]);
    }
    return roots.flatMap((root) => [
      join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    ]);
  }

  if (platform === 'darwin') {
    return browser === 'chrome'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', join(homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome')]
      : ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', join(homedir(), 'Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge')];
  }

  if (browser === 'chrome') {
    return ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];
  }
  return ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable'];
}

function browserCommands(browser, platform) {
  if (platform === 'win32') {
    return browser === 'chrome' ? ['chrome.exe'] : ['msedge.exe'];
  }
  if (browser === 'chrome') {
    return ['google-chrome', 'google-chrome-stable'];
  }
  return ['microsoft-edge', 'microsoft-edge-stable'];
}

function commandExists(command, platform) {
  const finder = platform === 'win32' ? 'where.exe' : 'which';
  try {
    execFileSync(finder, [command], { stdio: ['ignore', 'ignore', 'ignore'] });
    return true;
  } catch {
    return false;
  }
}

function runCommand(command, args, platform) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: platform === 'win32'
    });
  } catch {
    return '';
  }
}

function isManagedChromiumInstalled() {
  try {
    const { chromium } = require('playwright');
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
}

function resolvePlaywrightCli() {
  try {
    const packageJson = require.resolve('playwright/package.json');
    return join(dirname(packageJson), 'cli.js');
  } catch {
    const error = new Error('Playwright is not installed. Install szu-cli dependencies first.');
    error.code = 'BACKEND_UNAVAILABLE';
    throw error;
  }
}

function runBrowserInstall(cliPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, 'install', 'chromium'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: false
    });

    child.stdout.on('data', (chunk) => process.stderr.write(chunk));
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    child.once('error', (cause) => {
      const error = new Error(`Failed to install Playwright Chromium: ${cause.message}`);
      error.code = 'BROWSER_INSTALL_FAILED';
      error.cause = cause;
      reject(error);
    });
    child.once('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      const error = new Error(`Playwright Chromium installation failed${signal ? ` (${signal})` : ` (exit code ${code})`}.`);
      error.code = 'BROWSER_INSTALL_FAILED';
      reject(error);
    });
  });
}

function throwBrowserUnavailable(browser, platform, env) {
  const error = new Error(`No usable ${browserDefinition(browser).label} installation was found.`);
  error.code = 'BROWSER_UNAVAILABLE';
  error.hint = 'Install Google Chrome or Microsoft Edge, or run `szu-cli browser install chromium --yes` to install the recommended Playwright Chromium.';
  error.details = {
    browser,
    platform,
    available: getBrowserStatus({ platform, env }).browsers
  };
  throw error;
}
