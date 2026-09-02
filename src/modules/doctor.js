import process from 'node:process';

import { getProfilePath, getSzuHome } from './paths.js';
import { getBrowserStatus } from './browser.js';

const MIN_NODE_MAJOR = 20;

export async function getDoctorReport({ packageInfo }) {
  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
  const playwrightInstalled = await hasPlaywright();
  const browserStatus = getBrowserStatus();

  return {
    cli: {
      name: packageInfo.name,
      version: packageInfo.version
    },
    node: {
      version: process.versions.node,
      ok: nodeMajor >= MIN_NODE_MAJOR,
      minimumMajor: MIN_NODE_MAJOR
    },
    platform: {
      os: process.platform,
      arch: process.arch
    },
    home: {
      path: getSzuHome()
    },
    profile: {
      path: getProfilePath({ persist: false })
    },
    playwright: {
      installed: playwrightInstalled
    },
    browser: {
      ...browserStatus,
      channel: browserStatus.selected.channel ?? 'chromium',
      profileMode: 'persistent'
    }
  };
}

async function hasPlaywright() {
  try {
    await import('playwright');
    return true;
  } catch {
    return false;
  }
}
