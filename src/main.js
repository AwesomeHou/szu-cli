import { readFile } from 'node:fs/promises';

import { loginWithBrowserProfile, getAuthStatus } from './modules/auth.js';
import { getDoctorReport } from './modules/doctor.js';
import { errorEnvelope, successEnvelope, writeJson } from './modules/output.js';
import { downloadNoticeAttachment, getNoticeDetail, getNoticeItems } from './modules/notice.js';

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

  if (domain === 'notice' && (action === 'list' || action === 'search')) {
    try {
      const options = parseNoticeOptions(action, argv.slice(2));
      const data = await getNoticeItems(options);
      writeJson(successEnvelope(data, {
        command: `notice ${action}`,
        gateway: 'direct',
        sourceUrl: data.sourceUrl
      }));
    } catch (error) {
      handleKnownError(error, `notice ${action}`);
    }
    return;
  }

  if (domain === 'notice' && action === 'view') {
    try {
      const options = parseNoticeViewOptions(argv.slice(2));
      const data = await getNoticeDetail(options.target, options);
      writeJson(successEnvelope(data, {
        command: 'notice view',
        gateway: 'direct',
        sourceUrl: data.url
      }));
    } catch (error) {
      handleKnownError(error, 'notice view');
    }
    return;
  }

  if (domain === 'notice' && action === 'download') {
    try {
      const options = parseNoticeDownloadOptions(argv.slice(2));
      const data = await downloadNoticeAttachment(options.target, options);
      writeJson(successEnvelope(data, {
        command: 'notice download',
        gateway: 'direct',
        sourceUrl: data.url
      }));
    } catch (error) {
      handleKnownError(error, 'notice download');
    }
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

function parseNoticeDownloadOptions(argv) {
  const args = [...argv];
  const target = args.shift();
  if (!target || target.startsWith('--')) {
    throw new Error('notice download requires an id or URL.');
  }

  const options = {
    target,
    headless: true,
    index: 1,
    dir: process.cwd(),
    output: null
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      continue;
    }
    if (arg === '--headed') {
      options.headless = false;
      continue;
    }
    if (arg === '--index') {
      options.index = Number.parseInt(requireValue(args, i, arg), 10);
      i += 1;
      continue;
    }
    if (arg === '--dir') {
      options.dir = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--output') {
      options.output = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  if (!Number.isInteger(options.index) || options.index < 1) {
    throw new Error('--index must be a positive integer.');
  }

  return options;
}

function parseNoticeViewOptions(argv) {
  const args = [...argv];
  const target = args.shift();
  if (!target || target.startsWith('--')) {
    throw new Error('notice view requires an id or URL.');
  }

  const options = {
    target,
    headless: true
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
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

function parseNoticeOptions(action, argv) {
  const options = {
    limit: 10,
    page: 1,
    pages: 1,
    headless: true,
    keyword: null,
    range: '6m',
    type: 'full'
  };
  const args = [...argv];

  if (action === 'search') {
    const keyword = args.shift();
    if (!keyword || keyword.startsWith('--')) {
      throw new Error('notice search requires a keyword.');
    }
    options.keyword = keyword;
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      continue;
    }
    if (arg === '--limit') {
      options.limit = Number.parseInt(requireValue(args, i, arg), 10);
      i += 1;
      continue;
    }
    if (arg === '--page') {
      options.page = Number.parseInt(requireValue(args, i, arg), 10);
      i += 1;
      continue;
    }
    if (arg === '--pages') {
      options.pages = Number.parseInt(requireValue(args, i, arg), 10);
      i += 1;
      continue;
    }
    if (arg === '--range') {
      options.range = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--type') {
      options.type = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--headed') {
      options.headless = false;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new Error('--limit must be a positive integer.');
  }
  if (!Number.isInteger(options.page) || options.page < 1) {
    throw new Error('--page must be a positive integer.');
  }
  if (!Number.isInteger(options.pages) || options.pages < 1) {
    throw new Error('--pages must be a positive integer.');
  }

  return options;
}

function handleKnownError(error, command) {
  const code = error.code ?? 'UNKNOWN_ERROR';
  const exitCodes = {
    BACKEND_UNAVAILABLE: 10,
    LOGIN_REQUIRED: 11,
    NETWORK_REQUIRED: 12,
    PERMISSION_DENIED: 13,
    PAGE_CHANGED: 20,
    RATE_LIMITED: 30
  };

  writeJson(errorEnvelope({
    code,
    message: error.message,
    ...(error.hint ? { hint: error.hint } : {})
  }, { command }));
  process.exitCode = exitCodes[code] ?? 1;
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
