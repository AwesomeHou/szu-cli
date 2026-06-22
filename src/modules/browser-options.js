export function getLaunchOptions(options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const headless = options.headless ?? false;
  const channel = env.SZU_BROWSER_CHANNEL ?? (platform === 'win32' ? 'chrome' : null);

  return {
    ...(channel ? { channel } : {}),
    headless
  };
}
