import process from 'node:process';

import { getProfilePath, getSzuHome } from './paths.js';
import { getLaunchOptions } from './browser-options.js';

const MIN_NODE_MAJOR = 20;

export async function getDoctorReport({ packageInfo }) {
  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
  const playwrightInstalled = await hasPlaywright();

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
      path: getProfilePath()
    },
    playwright: {
      installed: playwrightInstalled
    },
    browser: {
      channel: getLaunchOptions().channel ?? 'chromium',
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
