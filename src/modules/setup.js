import { readFile } from 'node:fs/promises';

import { getLaunchOptions } from './browser-options.js';
import { installSkill } from './skill.js';

export async function setupCodex(options = {}) {
  const packageInfo = await readPackageInfo();
  const skill = await installSkill({
    target: 'codex',
    dir: options.skillDir
  });
  const browser = getLaunchOptions({ headless: false });

  return {
    cli: {
      available: true,
      version: packageInfo.version
    },
    browser: {
      channel: browser.channel ?? 'chromium',
      available: true
    },
    skill,
    nextSteps: [
      'Run `szu-cli auth login` and complete login in the browser.',
      'Run `szu-cli auth status --json`.'
    ]
  };
}

async function readPackageInfo() {
  const packageUrl = new URL('../../package.json', import.meta.url);
  return JSON.parse(await readFile(packageUrl, 'utf8'));
}
