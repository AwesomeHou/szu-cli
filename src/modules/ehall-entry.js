const EHALL_ORIGIN = 'https://ehall.szu.edu.cn';

export function validateEhallEntryUrl(value, expectedPath) {
  const url = new URL(value, EHALL_ORIGIN);
  if (
    url.protocol !== 'https:'
    || url.hostname !== 'ehall.szu.edu.cn'
    || !url.pathname.includes(expectedPath)
  ) {
    throw new Error(`Unexpected eHall application URL: ${url.href}`);
  }
  return url;
}

export function findPortalAppEntry(payload, options = {}) {
  return findInValue(payload, options);
}

export function buildKnownEhallEntry(options = {}) {
  const url = new URL(options.appPath, EHALL_ORIGIN);
  url.searchParams.set('t_s', String(options.now ?? Date.now()));
  url.searchParams.set('amp_sec_version_', '1');
  url.searchParams.set('gid_', options.gid);
  url.searchParams.set('EMAP_LANG', 'zh');
  url.searchParams.set('THEME', 'cherry');
  url.hash = options.hash;
  return url.href;
}

export async function resolveEhallEntry(page, options = {}) {
  if (options.url) {
    return validateEhallEntryUrl(options.url, options.expectedPath).href;
  }

  const endpoints = options.portalEndpoints ?? [
    `https://ehall.szu.edu.cn/jsonp/serviceCenterData.json?containLabels=true&searchKey=${encodeURIComponent(options.names?.[0] ?? '')}&_=${Date.now()}`,
    `https://ehall.szu.edu.cn/jsonp/serviceRoleApp.json?serviceRoleId=1__2&type=all&_=${Date.now()}`
  ];
  for (const endpoint of endpoints) {
    try {
      const response = await page.request.get(endpoint);
      if (!response.ok()) {
        continue;
      }
      const candidate = findPortalAppEntry(await response.json(), {
        names: options.names,
        appPath: options.expectedPath
      });
      if (candidate) {
        return candidate;
      }
    } catch {
      // The known entry remains available when the optional portal lookup changes.
    }
  }

  return validateEhallEntryUrl(
    buildKnownEhallEntry(options.known),
    options.expectedPath
  ).href;
}

export function sanitizeEhallSourceUrl(value) {
  const url = new URL(value);
  for (const key of ['t_s', 'amp_sec_version_', 'gid_']) {
    url.searchParams.delete(key);
  }
  return url.href;
}

function findInValue(value, options) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findInValue(item, options);
      if (result) {
        return result;
      }
    }
    return null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const appName = String(value.appName ?? value.name ?? '');
  const candidate = value.pcOpenUrl ?? value.appPc?.entranceUrl ?? value.entranceUrl ?? null;
  if (
    candidate
    && (options.names ?? []).some((name) => appName.includes(name))
  ) {
    try {
      return validateEhallEntryUrl(candidate, options.appPath).href;
    } catch {
      return null;
    }
  }

  for (const item of Object.values(value)) {
    const result = findInValue(item, options);
    if (result) {
      return result;
    }
  }
  return null;
}
