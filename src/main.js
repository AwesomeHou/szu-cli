import { readFile } from 'node:fs/promises';

import { loginWithBrowserProfile, getAuthStatus } from './modules/auth.js';
import { getCourseList, getCourseStatus, getTodayCourses } from './modules/course.js';
import { getDoctorReport } from './modules/doctor.js';
import { getElectricityBuildings, getElectricityStatus, queryElectricity } from './modules/electricity.js';
import { getGradeList, getGradeStatus } from './modules/grade.js';
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

  if (domain === 'course' && (action === 'status' || action === 'list' || action === 'today')) {
    try {
      const options = parseCourseOptions(argv.slice(2));
      const data = action === 'status'
        ? await getCourseStatus(options)
        : action === 'today'
          ? await getTodayCourses(options)
          : await getCourseList(options);
      writeJson(successEnvelope(data, {
        command: `course ${action}`,
        gateway: 'direct',
        sourceUrl: data.sourceUrl
      }));
    } catch (error) {
      handleKnownError(error, `course ${action}`);
    }
    return;
  }

  if (domain === 'grade' && (action === 'status' || action === 'list')) {
    try {
      const options = parseGradeOptions(argv.slice(2));
      const data = action === 'status'
        ? await getGradeStatus(options)
        : await getGradeList(options);
      writeJson(successEnvelope(data, {
        command: `grade ${action}`,
        gateway: 'direct',
        sourceUrl: data.sourceUrl
      }));
    } catch (error) {
      handleKnownError(error, `grade ${action}`);
    }
    return;
  }

  if (domain === 'electricity' && (action === 'status' || action === 'buildings' || action === 'query')) {
    try {
      const options = parseElectricityOptions(argv.slice(2));
      const data = action === 'status'
        ? await getElectricityStatus(options)
        : action === 'buildings'
          ? await getElectricityBuildings(options)
          : await queryElectricity(options);
      writeJson(successEnvelope(data, {
        command: `electricity ${action}`,
        gateway: 'direct',
        sourceUrl: data.sourceUrl
      }));
    } catch (error) {
      handleKnownError(error, `electricity ${action}`);
    }
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

function parseCourseOptions(argv) {
  const options = {
    headless: true,
    url: null,
    today: process.env.SZU_MOCK_TODAY ? new Date(process.env.SZU_MOCK_TODAY) : undefined
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

function parseGradeOptions(argv) {
  const options = {
    headless: true,
    url: null,
    term: null
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
    if (arg === '--term') {
      options.term = requireValue(argv, i, arg);
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

function parseElectricityOptions(argv) {
  const today = process.env.SZU_MOCK_TODAY ? new Date(process.env.SZU_MOCK_TODAY) : new Date();
  const options = {
    headless: true,
    url: null,
    campus: null,
    building: null,
    room: null,
    from: formatDate(addDays(today, -7)),
    to: formatDate(today)
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
    if (arg === '--campus') {
      options.campus = requireValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--building') {
      options.building = requireValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--room') {
      options.room = requireValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--from') {
      options.from = requireValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--to') {
      options.to = requireValue(argv, i, arg);
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

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
