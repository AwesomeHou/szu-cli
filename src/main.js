import { readFile } from 'node:fs/promises';

import { loginWithBrowserProfile, getAuthStatus } from './modules/auth.js';
import { getDoctorReport } from './modules/doctor.js';
import { errorEnvelope, successEnvelope, writeJson } from './modules/output.js';

export async function run(argv) {
  const packageInfo = await readPackageInfo();

  if (argv.includes('--version') || argv.includes('-v')) {
    process.stdout.write(`${packageInfo.version}\n`);
    return;
  }

  const [domain, action] = argv;
  const json = argv.includes('--json');

  if (domain === 'doctor') {
    const data = await getDoctorReport({ packageInfo });
    writeJson(successEnvelope(data, { command: 'doctor' }));
    return;
  }

  if (domain === 'auth' && action === 'status') {
    const data = await getAuthStatus(parseStatusOptions(argv.slice(2)));
    writeJson(successEnvelope(data, { command: 'auth status' }));
    return;
  }

  if (domain === 'auth' && action === 'login') {
    const data = await loginWithBrowserProfile(parseLoginOptions(argv.slice(2)));
    writeJson(successEnvelope(data, { command: 'auth login' }));
    return;
  }

  const error = {
    code: 'UNSUPPORTED_ACTION',
    message: `Unsupported command: ${argv.join(' ') || '(empty)'}`,
    hint: 'Try `szu doctor --json`.'
  };

  if (json) {
    writeJson(errorEnvelope(error, { command: [domain, action].filter(Boolean).join(' ') || 'unknown' }));
  } else {
    process.stderr.write(`${error.message}\n${error.hint}\n`);
  }
  process.exitCode = 2;
}

function parseLoginOptions(argv) {
  const options = {
    url: 'https://www1.szu.edu.cn/board/',
    headless: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      continue;
    }
    if (arg === '--url') {
      options.url = requireValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--headless') {
      options.headless = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function parseStatusOptions(argv) {
  const options = {
    url: 'https://www1.szu.edu.cn/board/',
    headless: true
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      continue;
    }
    if (arg === '--url') {
      options.url = requireValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--headed') {
      options.headless = false;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function requireValue(args, index, option) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

async function readPackageInfo() {
  const packageUrl = new URL('../package.json', import.meta.url);
  return JSON.parse(await readFile(packageUrl, 'utf8'));
}
