import { readFile } from 'node:fs/promises';

import { normalizeAcademicFormat } from './modules/academic-format.js';
import { loginWithBrowserProfile, getAuthStatus } from './modules/auth.js';
import { downloadCnkiPdf, getCnkiItem, getCnkiStatus, searchCnki } from './modules/cnki.js';
import {
  getCompletionCourses,
  getCompletionModules,
  getCompletionStatus,
  getCompletionSummary
} from './modules/completion.js';
import { getCourseList, getCourseStatus, getTodayCourses } from './modules/course.js';
import { getDoctorReport } from './modules/doctor.js';
import { getElectricityBuildings, getElectricityStatus, queryElectricity } from './modules/electricity.js';
import { getGradeList, getGradeStatus } from './modules/grade.js';
import { getGrowthList, getGrowthStatus, getGrowthSummary } from './modules/growth.js';
import { getIdeologyStatus, getIdeologySummary } from './modules/ideology.js';
import {
  getLectureItem,
  getLectureList,
  getLectureProgress,
  getLectureStatus
} from './modules/lecture.js';
import { getLibraryItem, getLibraryStatus, searchLibrary } from './modules/library.js';
import { errorEnvelope, successEnvelope, writeJson } from './modules/output.js';
import { getProgramItem, getProgramList, getProgramStatus } from './modules/program.js';
import { downloadNoticeAttachment, getNoticeDetail, getNoticeItems } from './modules/notice.js';
import { getSkillPath, installSkill } from './modules/skill.js';
import {
  getSportsCampuses,
  getSportsDates,
  getSportsSlots,
  getSportsStatus,
  getSportsVenues,
  reserveSportsSlot
} from './modules/sports.js';
import { getTimetableClasses, getTimetableStatus, getTimetableView } from './modules/timetable.js';
import { downloadWanfangPdf, getWanfangItem, getWanfangStatus, searchWanfang } from './modules/wanfang.js';

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

  if (domain === 'skill' && (action === 'path' || action === 'install')) {
    try {
      const options = parseSkillOptions(action, argv.slice(2));
      const data = action === 'path'
        ? await getSkillPath(options)
        : await installSkill(options);
      writeJson(successEnvelope(data, { command: `skill ${action}` }));
    } catch (error) {
      handleKnownError(error, `skill ${action}`);
    }
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

  if (domain === 'program' && (action === 'status' || action === 'list' || action === 'item')) {
    try {
      const options = parseProgramOptions(action, argv.slice(2));
      const data = action === 'status'
        ? await getProgramStatus(options)
        : action === 'item'
          ? await getProgramItem(options.target, options)
          : await getProgramList(options);
      writeJson(successEnvelope(data, {
        command: `program ${action}`,
        gateway: 'direct',
        sourceUrl: data.sourceUrl
      }));
    } catch (error) {
      handleKnownError(error, `program ${action}`);
    }
    return;
  }

  if (domain === 'timetable' && (action === 'status' || action === 'classes' || action === 'view')) {
    try {
      const options = parseTimetableOptions(action, argv.slice(2));
      const data = action === 'status'
        ? await getTimetableStatus(options)
        : action === 'classes'
          ? await getTimetableClasses(options)
          : await getTimetableView(options.classCode, options);
      writeJson(successEnvelope(data, {
        command: `timetable ${action}`,
        gateway: 'direct',
        sourceUrl: data.sourceUrl
      }));
    } catch (error) {
      handleKnownError(error, `timetable ${action}`);
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

  if (domain === 'growth' && (action === 'status' || action === 'summary' || action === 'list')) {
    try {
      const options = parseGrowthOptions(argv.slice(2));
      const data = action === 'status'
        ? await getGrowthStatus(options)
        : action === 'summary'
          ? await getGrowthSummary(options)
          : await getGrowthList(options);
      writeJson(successEnvelope(data, {
        command: `growth ${action}`,
        gateway: 'direct',
        sourceUrl: data.sourceUrl
      }));
    } catch (error) {
      handleKnownError(error, `growth ${action}`);
    }
    return;
  }

  if (domain === 'ideology' && (action === 'status' || action === 'summary')) {
    try {
      const options = parseIdeologyOptions(argv.slice(2));
      const data = action === 'status'
        ? await getIdeologyStatus(options)
        : await getIdeologySummary(options);
      writeJson(successEnvelope(data, {
        command: `ideology ${action}`,
        gateway: 'direct',
        sourceUrl: data.sourceUrl
      }));
    } catch (error) {
      handleKnownError(error, `ideology ${action}`);
    }
    return;
  }

  if (domain === 'completion' && (action === 'status' || action === 'summary' || action === 'modules' || action === 'courses')) {
    try {
      const options = parseCompletionOptions(action, argv.slice(2));
      const data = action === 'status'
        ? await getCompletionStatus(options)
        : action === 'summary'
          ? await getCompletionSummary(options)
          : action === 'modules'
            ? await getCompletionModules(options)
            : await getCompletionCourses(options.moduleCode, options);
      writeJson(successEnvelope(data, {
        command: `completion ${action}`,
        gateway: 'direct',
        sourceUrl: data.sourceUrl
      }));
    } catch (error) {
      handleKnownError(error, `completion ${action}`);
    }
    return;
  }

  if (domain === 'lecture' && (action === 'status' || action === 'list' || action === 'item' || action === 'progress')) {
    try {
      const options = parseLectureOptions(action, argv.slice(2));
      const data = action === 'status'
        ? await getLectureStatus(options)
        : action === 'item'
          ? await getLectureItem(options.target, options)
        : action === 'progress'
          ? await getLectureProgress(options)
          : await getLectureList(options);
      writeJson(successEnvelope(data, {
        command: `lecture ${action}`,
        gateway: 'direct',
        sourceUrl: data.sourceUrl
      }));
    } catch (error) {
      handleKnownError(error, `lecture ${action}`);
    }
    return;
  }

  if (domain === 'sports' && (action === 'status' || action === 'campuses' || action === 'venues' || action === 'dates' || action === 'slots' || action === 'reserve')) {
    try {
      const options = parseSportsOptions(action, argv.slice(2));
      const data = action === 'status'
        ? await getSportsStatus(options)
        : action === 'campuses'
          ? await getSportsCampuses(options)
          : action === 'venues'
            ? await getSportsVenues(options)
            : action === 'dates'
              ? await getSportsDates(options)
              : action === 'slots'
                ? await getSportsSlots(options)
                : await reserveSportsSlot(options);
      writeJson(successEnvelope(data, {
        command: `sports ${action}`,
        gateway: 'direct',
        sourceUrl: data.sourceUrl
      }));
    } catch (error) {
      handleKnownError(error, `sports ${action}`);
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

  if (domain === 'library' && (action === 'status' || action === 'search' || action === 'item')) {
    try {
      const options = parseLibraryOptions(action, argv.slice(2));
      const data = action === 'status'
        ? await getLibraryStatus(options)
        : action === 'item'
          ? await getLibraryItem(options.target, options)
          : await searchLibrary(options);
      writeJson(successEnvelope(data, {
        command: `library ${action}`,
        gateway: 'direct',
        sourceUrl: data.sourceUrl
      }));
    } catch (error) {
      handleKnownError(error, `library ${action}`);
    }
    return;
  }

  if ((domain === 'cnki' || domain === 'wanfang') && (action === 'status' || action === 'search' || action === 'item' || action === 'download')) {
    try {
      const options = parseAcademicOptions(domain, action, argv.slice(2));
      const data = domain === 'cnki'
        ? action === 'status'
          ? await getCnkiStatus(options)
          : action === 'item'
            ? await getCnkiItem(options.target, options)
            : action === 'download'
              ? await downloadCnkiPdf(options.target, options)
              : await searchCnki(options)
        : action === 'status'
          ? await getWanfangStatus(options)
          : action === 'item'
            ? await getWanfangItem(options.target, options)
            : action === 'download'
              ? await downloadWanfangPdf(options.target, options)
              : await searchWanfang(options);
      writeJson(successEnvelope(data, {
        command: `${domain} ${action}`,
        gateway: 'direct',
        sourceUrl: data.sourceUrl
      }));
    } catch (error) {
      handleKnownError(error, `${domain} ${action}`);
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
    hint: 'Try `szu-cli doctor --json`.'
  };

  if (json) {
    writeJson(errorEnvelope(error, { command: [domain, action].filter(Boolean).join(' ') || 'unknown' }));
  } else {
    process.stderr.write(`${error.message}\n${error.hint}\n`);
  }
  process.exitCode = 2;
}

function parseProgramOptions(action, argv) {
  const args = [...argv];
  const options = {
    headless: true,
    url: null,
    target: null,
    keyword: null,
    grade: null,
    department: null,
    major: null,
    page: 1,
    limit: 10
  };

  if (action === 'item') {
    const target = args.shift();
    if (!target || target.startsWith('--')) {
      throw new Error('program item requires an id or planCode.');
    }
    options.target = target;
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      continue;
    }
    if (arg === '--url') {
      options.url = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--keyword' && action !== 'item') {
      options.keyword = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--grade' && action !== 'item') {
      options.grade = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--department' && action !== 'item') {
      options.department = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--major' && action !== 'item') {
      options.major = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--page' && action !== 'item') {
      options.page = Number.parseInt(requireValue(args, i, arg), 10);
      i += 1;
      continue;
    }
    if (arg === '--limit' && action !== 'item') {
      options.limit = Number.parseInt(requireValue(args, i, arg), 10);
      i += 1;
      continue;
    }
    if (arg === '--headed') {
      options.headless = false;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  assertPositiveInteger(options.page, '--page');
  assertPositiveInteger(options.limit, '--limit');
  return options;
}

function parseTimetableOptions(action, argv) {
  const args = [...argv];
  const options = {
    headless: true,
    url: null,
    keyword: null,
    grade: null,
    department: null,
    major: null,
    term: null,
    page: 1,
    limit: 10,
    classCode: null
  };

  if (action === 'view') {
    const classCode = args.shift();
    if (!classCode || classCode.startsWith('--')) {
      throw new Error('timetable view requires a classCode.');
    }
    options.classCode = classCode;
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      continue;
    }
    if (arg === '--url') {
      options.url = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--keyword') {
      options.keyword = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--grade') {
      options.grade = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--department') {
      options.department = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--major') {
      options.major = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--term' && action === 'view') {
      options.term = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--page' && action !== 'view') {
      options.page = Number.parseInt(requireValue(args, i, arg), 10);
      i += 1;
      continue;
    }
    if (arg === '--limit' && action !== 'view') {
      options.limit = Number.parseInt(requireValue(args, i, arg), 10);
      i += 1;
      continue;
    }
    if (arg === '--headed') {
      options.headless = false;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  assertPositiveInteger(options.page, '--page');
  assertPositiveInteger(options.limit, '--limit');
  return options;
}

function parseCourseOptions(argv) {
  const options = {
    headless: true,
    url: null,
    today: process.env.SZU_MOCK_TODAY ? new Date(process.env.SZU_MOCK_TODAY) : undefined,
    term: null,
    week: null,
    weekday: null
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
    if (arg === '--date') {
      options.today = parseDateOption(requireValue(argv, i, arg), '--date');
      options.weekday = weekdayOf(options.today);
      i += 1;
      continue;
    }
    if (arg === '--term') {
      options.term = requireValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--week') {
      options.week = Number.parseInt(requireValue(argv, i, arg), 10);
      i += 1;
      continue;
    }
    if (arg === '--weekday') {
      options.weekday = Number.parseInt(requireValue(argv, i, arg), 10);
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

function parseSkillOptions(action, argv) {
  const options = {
    target: 'codex',
    dir: null,
    dest: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      continue;
    }
    if (arg === '--target' && action === 'install') {
      options.target = requireValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--dir' && action === 'install') {
      options.dir = requireValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--dest' && action === 'install') {
      options.dest = requireValue(argv, i, arg);
      i += 1;
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

function parseGrowthOptions(argv) {
  const options = {
    headless: true,
    url: null,
    term: null,
    year: null
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
    if (arg === '--year') {
      options.year = requireValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--headed') {
      options.headless = false;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  if (options.term && options.year) {
    throw new Error('--term and --year cannot be used together.');
  }
  return options;
}

function parseIdeologyOptions(argv) {
  const options = {
    headless: true,
    url: null
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

function parseLectureOptions(action, argv) {
  const args = [...argv];
  const options = {
    headless: true,
    url: null,
    limit: 20,
    availability: 'available',
    target: null
  };

  if (action === 'item') {
    const target = args.shift();
    if (!target || target.startsWith('--')) {
      throw new Error('lecture item requires an id.');
    }
    options.target = target;
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      continue;
    }
    if (arg === '--url') {
      options.url = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--limit' && action === 'list') {
      options.limit = Number.parseInt(requireValue(args, i, arg), 10);
      i += 1;
      continue;
    }
    if (arg === '--availability' && action === 'list') {
      options.availability = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--headed') {
      options.headless = false;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  assertPositiveInteger(options.limit, '--limit');
  if (!['available', 'open', 'all'].includes(options.availability)) {
    throw new Error('--availability must be one of: available, open, all.');
  }
  return options;
}

function parseSportsOptions(action, argv) {
  const options = {
    headless: true,
    url: null,
    campus: null,
    venue: null,
    date: null,
    slot: null,
    dryRun: false,
    confirm: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      continue;
    }
    if (arg === '--url' && action === 'status') {
      options.url = requireValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--campus' && ['venues', 'dates', 'slots', 'reserve'].includes(action)) {
      options.campus = requireValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--venue' && ['dates', 'slots', 'reserve'].includes(action)) {
      options.venue = requireValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--date' && ['slots', 'reserve'].includes(action)) {
      options.date = parseDateString(requireValue(argv, i, arg), '--date');
      i += 1;
      continue;
    }
    if (arg === '--slot' && action === 'reserve') {
      options.slot = requireValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--dry-run' && action === 'reserve') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--confirm' && action === 'reserve') {
      options.confirm = true;
      continue;
    }
    if (arg === '--headed') {
      options.headless = false;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  if (options.dryRun && options.confirm) {
    throw new Error('--dry-run and --confirm cannot be used together.');
  }
  return options;
}

function parseCompletionOptions(action, argv) {
  const options = {
    headless: true,
    url: null,
    moduleCode: null,
    timeoutSeconds: 180
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
    if (arg === '--module' && action === 'courses') {
      options.moduleCode = requireValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--timeout') {
      options.timeoutSeconds = Number.parseInt(requireValue(argv, i, arg), 10);
      i += 1;
      continue;
    }
    if (arg === '--headed') {
      options.headless = false;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  assertPositiveInteger(options.timeoutSeconds, '--timeout');
  if (action === 'courses' && !options.moduleCode) {
    throw new Error('--module is required for completion courses.');
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

function parseLibraryOptions(action, argv) {
  const args = [...argv];
  const options = {
    headless: true,
    url: null,
    keyword: null,
    target: null,
    limit: 10,
    page: 1,
    advanced: {}
  };

  if (action === 'search' && args[0] && !args[0].startsWith('--')) {
    options.keyword = args.shift();
  }

  if (action === 'item') {
    const target = args.shift();
    if (!target || target.startsWith('--')) {
      throw new Error('library item requires an id or URL.');
    }
    options.target = target;
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      continue;
    }
    if (arg === '--url') {
      options.url = requireValue(args, i, arg);
      i += 1;
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
    if (arg === '--title') {
      options.advanced.title = requireValue(args, i, arg);
      options.keyword ??= options.advanced.title;
      i += 1;
      continue;
    }
    if (arg === '--author') {
      options.advanced.author = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--subject') {
      options.advanced.subject = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--publisher') {
      options.advanced.publisher = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--isbn') {
      options.advanced.isbn = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--issn') {
      options.advanced.issn = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--call-number') {
      options.advanced.callNumber = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--classification') {
      options.advanced.classification = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--doc-type') {
      options.advanced.docType = normalizeLibraryDocType(requireValue(args, i, arg));
      i += 1;
      continue;
    }
    if (arg === '--language') {
      options.advanced.language = normalizeLibraryLanguage(requireValue(args, i, arg));
      i += 1;
      continue;
    }
    if (arg === '--location') {
      options.advanced.location = normalizeLibraryLocation(requireValue(args, i, arg));
      i += 1;
      continue;
    }
    if (arg === '--sort') {
      options.advanced.sort = normalizeLibrarySort(requireValue(args, i, arg));
      i += 1;
      continue;
    }
    if (arg === '--order') {
      options.advanced.order = requireValue(args, i, arg).toUpperCase();
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
  assertPositiveInteger(options.page, '--page');

  if (action === 'search' && !options.keyword && !hasAnyLibraryAdvancedField(options.advanced)) {
    throw new Error('library search requires a keyword or advanced search field.');
  }

  return options;
}

function parseAcademicOptions(domain, action, argv) {
  const args = [...argv];
  const options = {
    headless: true,
    url: null,
    keyword: null,
    target: null,
    limit: 10,
    advanced: {
      conditions: []
    }
  };

  if (action === 'search' && args[0] && !args[0].startsWith('--')) {
    options.keyword = args.shift();
  }

  if (action === 'item') {
    const target = args.shift();
    if (!target || target.startsWith('--')) {
      throw new Error(`${domain} item requires a URL.`);
    }
    options.target = target;
  }

  if (action === 'download') {
    const target = args.shift();
    if (!target || target.startsWith('--')) {
      throw new Error(`${domain} download requires a URL.`);
    }
    options.target = target;
    options.dir = process.cwd();
    options.output = null;
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      continue;
    }
    if (arg === '--url') {
      options.url = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--limit') {
      options.limit = Number.parseInt(requireValue(args, i, arg), 10);
      i += 1;
      continue;
    }
    if (arg === '--format') {
      options.format = normalizeAcademicFormat(requireValue(args, i, arg));
      i += 1;
      continue;
    }
    if (arg === '--year') {
      options.year = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--type') {
      options.type = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--dir' && action === 'download') {
      options.dir = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--output' && action === 'download') {
      options.output = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--title') {
      addAcademicAdvancedCondition(domain, options, 'title', requireValue(args, i, arg));
      i += 1;
      continue;
    }
    if (arg === '--author') {
      addAcademicAdvancedCondition(domain, options, 'author', requireValue(args, i, arg));
      i += 1;
      continue;
    }
    if (arg === '--keyword') {
      addAcademicAdvancedCondition(domain, options, 'keyword', requireValue(args, i, arg));
      i += 1;
      continue;
    }
    if (arg === '--abstract') {
      addAcademicAdvancedCondition(domain, options, 'abstract', requireValue(args, i, arg));
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

  if (options.advanced.conditions.length) {
    options.keyword ??= options.advanced.conditions.map((condition) => condition.value).join(' ');
    options.advanced.scope = domain === 'cnki'
      ? { field: 'database', label: '学术期刊', code: 'YSTT4HG0' }
      : { field: 'database', label: '学术期刊', code: 'periodical' };
    options.advanced.conditions = options.advanced.conditions.map((condition, index, conditions) => ({
      ...condition,
      operator: index === conditions.length - 1 ? null : 'AND'
    }));
  } else {
    delete options.advanced;
  }

  if (action === 'search' && !options.keyword) {
    throw new Error(`${domain} search requires a keyword.`);
  }

  return options;
}

function addAcademicAdvancedCondition(domain, options, field, value) {
  const fieldsByDomain = {
    cnki: {
      title: { label: '篇名', code: 'TI', match: 'exact' },
      abstract: { label: '摘要', code: 'AB', match: 'exact' }
    },
    wanfang: {
      title: { label: '题名', code: 'title', match: 'fuzzy' },
      author: { label: '作者', code: 'author', match: 'fuzzy' },
      keyword: { label: '关键词', code: 'keyword', match: 'fuzzy' },
      abstract: { label: '摘要', code: 'abstract', match: 'fuzzy' }
    }
  };
  const config = fieldsByDomain[domain]?.[field];
  if (!config) {
    throw new Error(`--${field} is not supported by ${domain} search.`);
  }
  options.advanced.conditions.push({
    field,
    label: config.label,
    code: config.code,
    value,
    match: config.match,
    operator: 'AND'
  });
}

function hasAnyLibraryAdvancedField(advanced) {
  return Boolean(
    advanced.title
    || advanced.author
    || advanced.subject
    || advanced.publisher
    || advanced.isbn
    || advanced.issn
    || advanced.callNumber
    || advanced.classification
  );
}

function normalizeLibraryDocType(value) {
  return mapLibraryOption(value, {
    全部: 'ALL',
    普通图书: '0',
    连续出版物: '1',
    非书资料: '2',
    测绘资料: '3',
    档案: '4',
    乐谱: '5',
    计算机文档: '6',
    古籍善本: '7',
    学位论文: '8'
  });
}

function normalizeLibraryLanguage(value) {
  return mapLibraryOption(value, {
    全部: 'ALL',
    中文: '1',
    西文: '2',
    日文: '3',
    俄文: '4',
    其它: '5'
  });
}

function normalizeLibraryLocation(value) {
  return mapLibraryOption(value, {
    全部: 'ALL',
    北馆: '70',
    '学科分馆与学院/部门资料室': '71',
    南馆: '125',
    丽湖馆: '243'
  });
}

function normalizeLibrarySort(value) {
  return mapLibraryOption(value, {
    title: 'M_TITLE',
    题名: 'M_TITLE',
    publisher: 'M_PUBLISHER',
    出版社: 'M_PUBLISHER',
    year: 'M_PUB_YEAR',
    出版日期: 'M_PUB_YEAR',
    author: 'M_AUTHOR',
    著者: 'M_AUTHOR',
    subject: 'M_SUBJECT',
    主题词: 'M_SUBJECT',
    classification: 'M_CLC',
    分类号: 'M_CLC',
    catalogDate: 'M_CATALOGDATE',
    进馆日期: 'M_CATALOGDATE'
  });
}

function mapLibraryOption(value, map) {
  return map[value] ?? value;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function parseDateOption(value, option) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${option} must use YYYY-MM-DD.`);
  }
  const date = new Date(`${value}T12:00:00+08:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${option} must be a valid date.`);
  }
  return date;
}

function parseDateString(value, option) {
  parseDateOption(value, option);
  return value;
}

function weekdayOf(date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
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
    category: 'all',
    keyword: null,
    publisher: null,
    year: null,
    range: '6m',
    type: 'full'
  };
  const args = [...argv];

  if (action === 'search') {
    if (args[0] && !args[0].startsWith('--')) {
      options.keyword = args.shift();
    }
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
    if (arg === '--category') {
      options.category = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--keyword') {
      options.keyword = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--publisher') {
      options.publisher = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--year') {
      options.year = requireValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === '--from') {
      options.from = parseDateString(requireValue(args, i, arg), '--from');
      i += 1;
      continue;
    }
    if (arg === '--to') {
      options.to = parseDateString(requireValue(args, i, arg), '--to');
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
  if (options.from && options.to && options.from > options.to) {
    throw new Error('--from must be earlier than or equal to --to.');
  }
  if (action === 'search' && !options.keyword && !options.publisher && !options.year && !options.from && !options.to && options.category === 'all') {
    throw new Error('notice search requires a keyword or filter option.');
  }

  return options;
}

function assertPositiveInteger(value, option) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${option} must be a positive integer.`);
  }
}

function handleKnownError(error, command) {
  const code = error.code ?? 'UNKNOWN_ERROR';
  const exitCodes = {
    BACKEND_UNAVAILABLE: 10,
    LOGIN_REQUIRED: 11,
    NETWORK_REQUIRED: 12,
    PERMISSION_DENIED: 13,
    PAGE_CHANGED: 20,
    SKILL_NOT_FOUND: 21,
    CLASS_NOT_FOUND: 22,
    PROGRAM_NOT_FOUND: 23,
    CALCULATION_TIMEOUT: 24,
    MODULE_NOT_FOUND: 25,
    LECTURE_NOT_FOUND: 26,
    SPORTS_CONFIRM_REQUIRED: 27,
    SPORTS_CAMPUS_NOT_FOUND: 28,
    SPORTS_VENUE_NOT_FOUND: 29,
    SPORTS_SLOT_NOT_FOUND: 32,
    SPORTS_SLOT_UNAVAILABLE: 33,
    SPORTS_SUBMIT_UNVERIFIED: 34,
    RATE_LIMITED: 30,
    DOWNLOAD_UNAVAILABLE: 31,
    HEADED_REQUIRED: 2
  };

  writeJson(errorEnvelope({
    code,
    message: error.message,
    ...(error.hint ? { hint: error.hint } : {}),
    ...(error.details ? { details: error.details } : {})
  }, { command }));
  process.exitCode = exitCodes[code] ?? 1;
}

function parseLoginOptions(argv) {
  const options = {
    url: 'https://www1.szu.edu.cn/board/',
    headless: false,
    waitForClose: true
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
    if (arg === '--no-wait') {
      options.waitForClose = false;
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
