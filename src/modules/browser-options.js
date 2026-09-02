import { getSelectedBrowser } from './browser.js';

export function getLaunchOptions(options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const headless = options.headless ?? false;
  const browser = getSelectedBrowser({
    platform,
    env,
    persist: options.persist ?? true
  });

  return {
    ...(browser.channel ? { channel: browser.channel } : {}),
    headless
  };
}
