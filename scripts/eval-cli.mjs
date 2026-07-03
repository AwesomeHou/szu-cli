import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const cliPath = join(root, 'src', 'cli.js');
const outPath = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : join(root, 'tmp', 'cli-eval-report.json');

const fixtures = {
  noticeHtml: readFileSync(join(root, 'tests/fixtures/board.html'), 'utf8'),
  noticeListHtml: readFileSync(join(root, 'tests/fixtures/notice-list.html'), 'utf8'),
  noticeDetailHtml: readFileSync(join(root, 'tests/fixtures/notice-view.html'), 'utf8'),
  courseApi: readFileSync(join(root, 'tests/fixtures/course-api.json'), 'utf8'),
  gradeApi: readFileSync(join(root, 'tests/fixtures/grade-api.json'), 'utf8'),
  programApi: readFileSync(join(root, 'tests/fixtures/program-api.json'), 'utf8'),
  timetableApi: readFileSync(join(root, 'tests/fixtures/timetable-api.json'), 'utf8'),
  growthApi: readFileSync(join(root, 'tests/fixtures/growth-api.json'), 'utf8'),
  ideologyApi: readFileSync(join(root, 'tests/fixtures/ideology-api.json'), 'utf8'),
  completionApi: readFileSync(join(root, 'tests/fixtures/completion-api.json'), 'utf8')
};

const publisherListHtml = `<!doctype html>
<html><head><title>校园公文通</title></head><body>
<div>匿名用户 个人中心｜注销 ｜说明</div>
<table>
<tr><td>序号</td><td>类别</td><td>发文单位</td><td>标题</td><td></td><td>日期</td></tr>
<tr><td>1</td><td>讲座</td><td>土木与交通工程学院</td><td><a href="view.asp?id=577567">【2026南山讲坛】第24场：新型钢-混组合结构设计理论与智能建造</a></td><td></td><td>2026-6-23</td></tr>
<tr><td>2</td><td>讲座</td><td>土木与交通工程学院</td><td><a href="view.asp?id=577300">【2026南山讲坛】第23场：废弃物基工程生物炭</a></td><td></td><td>2026-6-23</td></tr>
</table>
</body></html>`;

const keywordSearchHtml = `<!doctype html>
<html><head><title>校园公文通</title></head><body>
<div>匿名用户 个人中心｜注销 ｜说明</div>
<table>
<tr><td>序号</td><td>类别</td><td>发文单位</td><td>标题</td><td></td><td>日期</td></tr>
<tr><td>1</td><td>学工</td><td>学生部</td><td><a href="view.asp?id=577085">【资助工作】关于启动深圳大学2026年应届本科毕业生奖学金评定工作的通知</a></td><td></td><td>2026-6-17</td></tr>
</table>
</body></html>`;

const casHtml = '<html><head><title>统一身份认证</title></head><body>账号登录 密码</body></html>';

const baseMock = {
  SZU_BROWSER_BACKEND: 'mock'
};

const electricityJson = JSON.stringify({
  campuses: [{ name: '深大新斋区', client: '192.168.84.87', buildings: [{ name: '红豆斋', id: '18120' }] }],
  query: { records: [{ index: 1, room: '838', remainingKwh: 338.88, totalUsedKwh: 21424.6, totalPurchasedKwh: 21763.49, recordedAt: '2026-01-02 23:59:01' }] }
});

const libraryJson = JSON.stringify({
  status: { available: true, loggedIn: true, historyRecorded: true, sourceUrl: 'https://www.lib.szu.edu.cn/opac/search.aspx' },
  search: {
    keyword: '交通设计',
    total: 96,
    page: 1,
    pageCount: 5,
    loggedIn: true,
    historyRecorded: true,
    items: [{ index: 3, id: '3706432', title: '交通设计', authors: '刘立新, 孟祥海, 陈亮主编', publisher: '北京理工大学出版社', publishYear: '2025', callNumber: 'U491/L73', holdings: 2, available: 2, detailUrl: 'https://www.lib.szu.edu.cn/opac/bookinfo.aspx?ctrlno=3706432' }],
    sourceUrl: 'https://www.lib.szu.edu.cn/opac/searchresult.aspx?anywords=交通设计'
  },
  item: {
    id: '3706432',
    title: '交通设计',
    authors: '刘立新, 孟祥海, 陈亮主编',
    publisher: '北京理工大学出版社',
    publishYear: '2025',
    isbn: '978-7-5763-4896-5',
    loggedIn: true,
    holdings: 2,
    available: 2,
    copies: [{ location: '南馆5楼工科阅览室TU-X', callNumber: 'U491/L73', barcode: 'A4414341', status: '可供出借', loanType: '中文图书', reservationQueue: 0, readerQueue: 0 }],
    sourceUrl: 'https://www.lib.szu.edu.cn/opac/bookinfo.aspx?ctrlno=3706432'
  }
});

const lectureListJson = JSON.stringify({
  code: 0,
  count: 2,
  data: [
    { id: 'open', name: '开放讲座', status: '正在报名中', startRegistration: '2026-06-26 08:00:00', deadlineRegistration: '2026-06-28 18:00:00' },
    { id: 'full', name: '已满讲座', status: '正在报名中', startRegistration: '2026-06-26 08:00:00', deadlineRegistration: '2026-06-28 18:00:00' },
    { id: 'closed', name: '结束讲座', status: '报名已结束', startRegistration: '2026-06-20 08:00:00', deadlineRegistration: '2026-06-21 18:00:00' }
  ]
});
const lectureClassroomsJson = JSON.stringify({
  open: { code: 0, count: 1, data: [{ campus: '粤海校区', building: '致理楼（L3）', roomNumber: '1201', isSpeaker: '是', seatNum: 100, reservedSeats: 98, remainSeats: 2, chooseStatus: '可报名' }] },
  full: { code: 0, count: 1, data: [{ campus: '粤海校区', building: '致理楼（L3）', roomNumber: '1202', isSpeaker: '否', seatNum: 100, reservedSeats: 100, remainSeats: 0, chooseStatus: '已报满' }] }
});
const lectureProgressJson = JSON.stringify({ offlineTimes: '1', onlineTimes: '3', sumOfflineTimes: 2, sumOnlineTimes: 5, studentId: '2023000000', name: '测试用户' });

const cnkiJson = JSON.stringify({
  status: { available: true, authorized: true, institution: '深圳大学', requiresHeaded: true, sourceUrl: 'https://kns.cnki.net/kns8s/?classid=YSTT4HG0' },
  search: { keyword: '交通设计', total: 1, authorized: true, institution: '深圳大学', items: [{ index: 1, title: '城市道路交通拥堵溯源分析方法：研究进展与展望', authors: ['杨晓光', '杨彦青'], source: '公路交通科技', year: '2026', type: '期刊', url: 'https://kns.cnki.net/kcms/detail/detail.aspx?dbcode=CJFD&filename=GLJK202605002' }], sourceUrl: 'https://kns.cnki.net/kns8s/search?kw=交通设计' },
  item: { provider: 'cnki', title: '城市道路交通拥堵溯源分析方法：研究进展与展望', authors: ['杨晓光', '杨彦青'], source: '公路交通科技', year: '2026', type: '期刊', abstract: '系统梳理城市道路交通拥堵溯源分析方法。', doi: '10.1234/cnki.glkj.2026.05.002', sourceUrl: 'https://kns.cnki.net/kcms/detail/detail.aspx?dbcode=CJFD&filename=GLJK202605002' }
});
const wanfangJson = JSON.stringify({
  status: { available: true, authorized: true, institution: '深圳大学', requiresHeaded: true, sourceUrl: 'https://c.wanfangdata.com.cn/periodical' },
  search: { keyword: '交通设计', total: 1, authorized: true, institution: '深圳大学', items: [{ index: 1, title: '基于BIM技术的市政交通设计及应用', authors: ['李帅', '杨沙'], source: '工程技术研究', year: '2026', type: '期刊', url: 'https://d.wanfangdata.com.cn/periodical/gcjs202604001' }], sourceUrl: 'https://s.wanfangdata.com.cn/periodical?q=交通设计' },
  item: { provider: 'wanfang', title: '基于BIM技术的市政交通设计及应用', authors: ['李帅', '杨沙'], source: '工程技术研究', year: '2026', type: '期刊', abstract: '分析BIM技术在市政交通设计中的应用路径。', doi: '10.5678/wanfang.gcjs.2026.04.001', sourceUrl: 'https://d.wanfangdata.com.cn/periodical/gcjs202604001' }
});

const cases = [
  {
    id: 'foundation.version-shape',
    layer: 'L0',
    args: ['--version'],
    checks: [
      statusIs(0),
      stdoutMatches(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\s*$/)
    ]
  },
  {
    id: 'foundation.unsupported-json',
    layer: 'L0',
    args: ['unknown', '--json'],
    checks: [
      statusIs(2),
      jsonPathIs('error.code', 'UNSUPPORTED_ACTION')
    ]
  },
  {
    id: 'doctor.report',
    layer: 'L0',
    args: ['doctor', '--json'],
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'doctor'),
      jsonPathIs('data.node.ok', true)
    ]
  },
  {
    id: 'auth.missing-profile',
    layer: 'L0',
    args: ['auth', 'status', '--json'],
    checks: [
      statusIs(0),
      jsonPathIs('ok', true),
      jsonPathIs('data.loggedIn', false),
      jsonPathIs('data.reason', 'profile-missing')
    ]
  },
  {
    id: 'auth.login',
    layer: 'L0',
    args: ['auth', 'login', '--url', 'https://www1.szu.edu.cn/board/', '--json'],
    env: baseMock,
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'auth login'),
      jsonPathIs('data.opened', true)
    ]
  },
  {
    id: 'skill.path',
    layer: 'L0',
    args: ['skill', 'path', '--json'],
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'skill path'),
      jsonPathIs('data.name', 'szu-campus')
    ]
  },
  {
    id: 'skill.install',
    layer: 'L0',
    args: (home) => ['skill', 'install', '--target', 'codex', '--dir', join(home, 'skills'), '--json'],
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'skill install'),
      jsonPathIs('data.installed', true)
    ]
  },
  {
    id: 'setup.codex',
    layer: 'L0',
    args: (home) => ['setup', 'codex', '--skill-dir', join(home, 'skills'), '--json'],
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'setup codex'),
      jsonPathIs('data.skill.installed', true)
    ]
  },
  {
    id: 'notice.list-all-default',
    layer: 'L0',
    args: ['notice', 'list', '--limit', '2', '--json'],
    env: noticeEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'notice list'),
      jsonPathIs('data.items.0.id', '577164'),
      jsonPathIs('data.items.0.isPinned', true)
    ]
  },
  {
    id: 'notice.list-category',
    layer: 'L0',
    args: ['notice', 'list', '--category', '教务', '--json'],
    env: noticeEnv(),
    checks: [
      statusIs(0),
      jsonEvery('data.items', (item) => item.category === '教务')
    ]
  },
  {
    id: 'notice.list-pinned',
    layer: 'L0',
    args: ['notice', 'list', '--category', '置顶', '--json'],
    env: noticeEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('data.search.category', '置顶'),
      jsonEvery('data.items', (item) => item.isPinned === true)
    ]
  },
  {
    id: 'notice.list-keyword',
    layer: 'L0',
    args: ['notice', 'list', '--keyword', '奖学金', '--json'],
    env: noticeEnv({ SZU_MOCK_NOTICE_SEARCH_HTML: keywordSearchHtml }),
    checks: [
      statusIs(0),
      jsonPathIs('data.search.keyword', '奖学金'),
      jsonPathIs('data.items.0.id', '577085')
    ]
  },
  {
    id: 'notice.list-date-range',
    layer: 'L0',
    args: ['notice', 'list', '--from', '2026-06-18', '--to', '2026-06-22', '--json'],
    env: noticeEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('data.search.from', '2026-06-18'),
      jsonPathIs('data.search.to', '2026-06-22'),
      jsonPathIs('data.items.length', 2)
    ]
  },
  {
    id: 'notice.list-publisher',
    layer: 'L0',
    args: ['notice', 'list', '--publisher', '土木与交通工程学院', '--year', '2026', '--limit', '2', '--json'],
    env: noticeEnv({ SZU_MOCK_NOTICE_SEARCH_HTML: publisherListHtml }),
    checks: [
      statusIs(0),
      jsonPathIs('data.search.publisher', '土木与交通工程学院'),
      jsonPathIs('data.items.0.id', '577567'),
      jsonPathIs('data.items.1.id', '577300')
    ]
  },
  {
    id: 'notice.search',
    layer: 'L0',
    args: ['notice', 'search', '奖学金', '--limit', '1', '--json'],
    env: noticeEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'notice search'),
      jsonPathIs('data.search.keyword', '奖学金')
    ]
  },
  {
    id: 'notice.search-publisher-compat',
    layer: 'L0',
    args: ['notice', 'search', '--publisher', '土木与交通工程学院', '--limit', '1', '--json'],
    env: noticeEnv({ SZU_MOCK_NOTICE_SEARCH_HTML: publisherListHtml }),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'notice search'),
      jsonPathIs('data.search.publisher', '土木与交通工程学院'),
      jsonPathIs('data.items.length', 1)
    ]
  },
  {
    id: 'notice.view',
    layer: 'L0',
    args: ['notice', 'view', '577444', '--json'],
    env: noticeEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'notice view'),
      jsonPathIs('data.id', '577444')
    ]
  },
  {
    id: 'notice.download',
    layer: 'L0',
    args: (home) => ['notice', 'download', '577444', '--dir', join(home, 'downloads'), '--json'],
    env: noticeEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'notice download'),
      jsonPathIs('data.attachment.name', '领取名单.docx')
    ]
  },
  {
    id: 'notice.search-required',
    layer: 'L0',
    args: ['notice', 'search', '--json'],
    env: noticeEnv(),
    checks: [
      statusIs(1),
      jsonPathIs('error.code', 'UNKNOWN_ERROR')
    ]
  },
  {
    id: 'notice.login-required',
    layer: 'L0',
    args: ['notice', 'list', '--json'],
    env: noticeEnv({ SZU_MOCK_NOTICE_LIST_HTML: casHtml }),
    checks: [
      statusIs(11),
      jsonPathIs('ok', false),
      jsonPathIs('error.code', 'LOGIN_REQUIRED')
    ]
  },
  {
    id: 'course.status',
    layer: 'L0',
    args: ['course', 'status', '--json'],
    env: courseEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'course status'),
      jsonPathIs('data.loggedIn', true)
    ]
  },
  {
    id: 'course.list',
    layer: 'L0',
    args: ['course', 'list', '--json'],
    env: courseEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'course list'),
      jsonPathIs('data.items.0.courseName', '交通设计与管控'),
      outputExcludes('2023000000')
    ]
  },
  {
    id: 'course.today',
    layer: 'L0',
    args: ['course', 'today', '--json'],
    env: courseEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('data.date', '2026-06-22'),
      jsonPathIs('data.items.0.courseName', '图像处理'),
      outputExcludes('2023000000')
    ]
  },
  {
    id: 'course.list-weekday',
    layer: 'L0',
    args: ['course', 'list', '--week', '17', '--weekday', '2', '--json'],
    env: courseEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('data.filters.week', 17),
      jsonPathIs('data.filters.weekday', 2),
      jsonPathIs('data.items.0.courseName', '交通设计与管控')
    ]
  },
  {
    id: 'course.today-date',
    layer: 'L0',
    args: ['course', 'today', '--date', '2026-06-23', '--json'],
    env: courseEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('data.date', '2026-06-23'),
      jsonPathIs('data.items.0.courseName', '交通设计与管控')
    ]
  },
  {
    id: 'program.status',
    layer: 'L0',
    args: ['program', 'status', '--json'],
    env: programEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'program status'),
      jsonPathIs('data.total', 2)
    ]
  },
  {
    id: 'program.list',
    layer: 'L0',
    args: ['program', 'list', '--keyword', '计算机', '--grade', '2024', '--json'],
    env: programEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'program list'),
      jsonPathIs('data.filters.keyword', '计算机')
    ]
  },
  {
    id: 'program.item',
    layer: 'L0',
    args: ['program', 'item', '2025-050101-01', '--json'],
    env: programEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'program item'),
      jsonPathIs('data.summary.planCode', '2025-050101-01')
    ]
  },
  {
    id: 'timetable.status',
    layer: 'L0',
    args: ['timetable', 'status', '--json'],
    env: timetableEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'timetable status'),
      jsonPathIs('data.term.id', '2025-2026-2')
    ]
  },
  {
    id: 'timetable.classes',
    layer: 'L0',
    args: ['timetable', 'classes', '--keyword', '汉语言', '--grade', '2025', '--json'],
    env: timetableEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'timetable classes'),
      jsonPathIs('data.items.0.classCode', '20250101100101')
    ]
  },
  {
    id: 'timetable.view',
    layer: 'L0',
    args: ['timetable', 'view', '20250101100101', '--term', '2025-2026-2', '--json'],
    env: timetableEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'timetable view'),
      jsonPathIs('data.class.className', '2025汉语言文学（卓越班）01')
    ]
  },
  {
    id: 'grade.status',
    layer: 'L0',
    args: ['grade', 'status', '--json'],
    env: gradeEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'grade status'),
      jsonPathIs('data.loggedIn', true)
    ]
  },
  {
    id: 'grade.list',
    layer: 'L0',
    args: ['grade', 'list', '--json'],
    env: gradeEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('data.items.0.courseName', '应用统计学'),
      outputExcludes('2023000000'),
      outputExcludes('测试用户')
    ]
  },
  {
    id: 'growth.status',
    layer: 'L0',
    args: ['growth', 'status', '--json'],
    env: growthEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'growth status'),
      jsonPathIs('data.periodCount', 2)
    ]
  },
  {
    id: 'growth.summary',
    layer: 'L0',
    args: ['growth', 'summary', '--json'],
    env: growthEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'growth summary'),
      jsonPathIs('data.cumulative.gpa', 3.75),
      outputExcludes('2023000000')
    ]
  },
  {
    id: 'growth.list',
    layer: 'L0',
    args: ['growth', 'list', '--json'],
    env: growthEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'growth list'),
      jsonPathIs('data.items.0.periodType', 'term')
    ]
  },
  {
    id: 'ideology.status',
    layer: 'L0',
    args: ['ideology', 'status', '--json'],
    env: ideologyEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'ideology status'),
      jsonPathIs('data.available', true)
    ]
  },
  {
    id: 'ideology.summary',
    layer: 'L0',
    args: ['ideology', 'summary', '--json'],
    env: ideologyEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'ideology summary'),
      jsonPathIs('data.earnedCredits', 2),
      outputExcludes('2023000000')
    ]
  },
  {
    id: 'completion.status',
    layer: 'L0',
    args: ['completion', 'status', '--json'],
    env: completionEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'completion status'),
      jsonPathIs('data.calculation.state', 'completed')
    ]
  },
  {
    id: 'completion.summary',
    layer: 'L0',
    args: ['completion', 'summary', '--timeout', '30', '--json'],
    env: completionEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'completion summary'),
      jsonPathIs('data.plan.requiredCredits', 150)
    ]
  },
  {
    id: 'completion.modules',
    layer: 'L0',
    args: ['completion', 'modules', '--json'],
    env: completionEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'completion modules'),
      jsonPathIs('data.items.0.moduleCode', 'module-01')
    ]
  },
  {
    id: 'completion.courses',
    layer: 'L0',
    args: ['completion', 'courses', '--module', 'module-01', '--json'],
    env: completionEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'completion courses'),
      jsonPathIs('data.module.moduleCode', 'module-01')
    ]
  },
  {
    id: 'completion.courses-required',
    layer: 'L0',
    args: ['completion', 'courses', '--json'],
    env: completionEnv(),
    checks: [
      statusIs(1),
      jsonPathIs('error.code', 'UNKNOWN_ERROR')
    ]
  },
  {
    id: 'lecture.status',
    layer: 'L0',
    args: ['lecture', 'status', '--json'],
    env: lectureEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'lecture status'),
      jsonPathIs('data.loggedIn', true)
    ]
  },
  {
    id: 'lecture.list',
    layer: 'L0',
    args: ['lecture', 'list', '--limit', '1', '--json'],
    env: lectureEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'lecture list'),
      jsonPathIs('data.items.0.id', 'open')
    ]
  },
  {
    id: 'lecture.availability-open',
    layer: 'L0',
    args: ['lecture', 'list', '--availability', 'open', '--json'],
    env: lectureEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('data.items.0.id', 'open'),
      jsonPathIs('data.items.1.id', 'full')
    ]
  },
  {
    id: 'lecture.availability-all',
    layer: 'L0',
    args: ['lecture', 'list', '--availability', 'all', '--json'],
    env: lectureEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('data.total', 3),
      jsonPathIs('data.items.2.id', 'closed')
    ]
  },
  {
    id: 'lecture.item',
    layer: 'L0',
    args: ['lecture', 'item', 'open', '--json'],
    env: lectureEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'lecture item'),
      jsonPathIs('data.classrooms.0.remainingSeats', 2)
    ]
  },
  {
    id: 'lecture.progress',
    layer: 'L0',
    args: ['lecture', 'progress', '--json'],
    env: lectureEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'lecture progress'),
      jsonPathIs('data.percentage', 57),
      outputExcludes('2023000000')
    ]
  },
  {
    id: 'electricity.status',
    layer: 'L0',
    args: ['electricity', 'status', '--json'],
    env: electricityEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'electricity status'),
      jsonPathIs('data.campusCount', 1)
    ]
  },
  {
    id: 'electricity.buildings',
    layer: 'L0',
    args: ['electricity', 'buildings', '--json'],
    env: electricityEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'electricity buildings'),
      jsonPathIs('data.campuses.0.buildings.0.name', '红豆斋')
    ]
  },
  {
    id: 'electricity.query',
    layer: 'L0',
    args: ['electricity', 'query', '--campus', '深大新斋区', '--building', '红豆斋', '--room', '838', '--from', '2026-01-01', '--to', '2026-01-02', '--json'],
    env: electricityEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'electricity query'),
      jsonPathIs('data.remainingKwh', 338.88)
    ]
  },
  {
    id: 'electricity.query-infer-campus',
    layer: 'L0',
    args: ['electricity', 'query', '--building', '红豆', '--room', '838', '--json'],
    env: electricityEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('data.campus', '深大新斋区'),
      jsonPathIs('data.building', '红豆斋')
    ]
  },
  {
    id: 'library.status',
    layer: 'L0',
    args: ['library', 'status', '--json'],
    env: libraryEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'library status'),
      jsonPathIs('data.available', true)
    ]
  },
  {
    id: 'library.search',
    layer: 'L0',
    args: ['library', 'search', '交通设计', '--limit', '1', '--json'],
    env: libraryEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'library search'),
      jsonPathIs('data.items.0.title', '交通设计')
    ]
  },
  {
    id: 'library.search-page',
    layer: 'L0',
    args: ['library', 'search', '交通设计', '--page', '2', '--json'],
    env: libraryEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('data.page', 2)
    ]
  },
  {
    id: 'library.item',
    layer: 'L0',
    args: ['library', 'item', '3706432', '--json'],
    env: libraryEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'library item'),
      jsonPathIs('data.copies.0.status', '可供出借')
    ]
  },
  {
    id: 'cnki.status',
    layer: 'L0',
    args: ['cnki', 'status', '--headed', '--json'],
    env: cnkiEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'cnki status'),
      jsonPathIs('data.authorized', true)
    ]
  },
  {
    id: 'cnki.search',
    layer: 'L0',
    args: ['cnki', 'search', '交通设计', '--headed', '--limit', '1', '--json'],
    env: cnkiEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'cnki search'),
      jsonPathIs('data.items.0.source', '公路交通科技')
    ]
  },
  {
    id: 'cnki.search-year-type',
    layer: 'L0',
    args: ['cnki', 'search', '交通设计', '--headed', '--year', '2026', '--type', '期刊', '--json'],
    env: cnkiEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('data.filters.year', '2026'),
      jsonPathIs('data.filters.type', '期刊'),
      jsonPathIs('data.items.0.year', '2026')
    ]
  },
  {
    id: 'cnki.item',
    layer: 'L0',
    args: ['cnki', 'item', 'https://kns.cnki.net/kcms/detail/detail.aspx?dbcode=CJFD&filename=GLJK202605002', '--headed', '--json'],
    env: cnkiEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'cnki item'),
      jsonPathIs('data.doi', '10.1234/cnki.glkj.2026.05.002')
    ]
  },
  {
    id: 'cnki.download',
    layer: 'L0',
    args: (home) => ['cnki', 'download', 'https://kns.cnki.net/kcms/detail/detail.aspx?dbcode=CJFD&filename=GLJK202605002', '--headed', '--dir', join(home, 'downloads'), '--json'],
    env: cnkiEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'cnki download'),
      jsonPathIs('data.provider', 'cnki')
    ]
  },
  {
    id: 'wanfang.status',
    layer: 'L0',
    args: ['wanfang', 'status', '--headed', '--json'],
    env: wanfangEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'wanfang status'),
      jsonPathIs('data.authorized', true)
    ]
  },
  {
    id: 'wanfang.search',
    layer: 'L0',
    args: ['wanfang', 'search', '交通设计', '--headed', '--limit', '1', '--json'],
    env: wanfangEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'wanfang search'),
      jsonPathIs('data.items.0.title', '基于BIM技术的市政交通设计及应用')
    ]
  },
  {
    id: 'wanfang.search-year-type',
    layer: 'L0',
    args: ['wanfang', 'search', '交通设计', '--headed', '--year', '2026', '--type', '期刊', '--json'],
    env: wanfangEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('data.filters.year', '2026'),
      jsonPathIs('data.filters.type', '期刊'),
      jsonPathIs('data.items.0.year', '2026')
    ]
  },
  {
    id: 'wanfang.item',
    layer: 'L0',
    args: ['wanfang', 'item', 'https://d.wanfangdata.com.cn/periodical/gcjs202604001', '--headed', '--json'],
    env: wanfangEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'wanfang item'),
      jsonPathIs('data.doi', '10.5678/wanfang.gcjs.2026.04.001')
    ]
  },
  {
    id: 'wanfang.download',
    layer: 'L0',
    args: (home) => ['wanfang', 'download', 'https://d.wanfangdata.com.cn/periodical/gcjs202604001', '--headed', '--dir', join(home, 'downloads'), '--json'],
    env: wanfangEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('meta.command', 'wanfang download'),
      jsonPathIs('data.provider', 'wanfang')
    ]
  },
  {
    id: 'cnki.advanced-search',
    layer: 'L0',
    args: ['cnki', 'search', '--title', '优化', '--abstract', '交通', '--headed', '--limit', '1', '--json'],
    env: cnkiEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('data.keyword', '优化 交通'),
      jsonPathIs('data.advanced.conditions.0.code', 'TI'),
      jsonPathIs('data.advanced.conditions.1.code', 'AB')
    ]
  },
  {
    id: 'wanfang.advanced-search',
    layer: 'L0',
    args: ['wanfang', 'search', '--title', '优化', '--keyword', '交通', '--abstract', '调度', '--headed', '--limit', '1', '--json'],
    env: wanfangEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('data.keyword', '优化 交通 调度'),
      jsonPathIs('data.advanced.conditions.1.code', 'keyword')
    ]
  },
  {
    id: 'course.login-required',
    layer: 'L0',
    args: ['course', 'list', '--json'],
    env: courseEnv({
      SZU_MOCK_COURSE_TEXT: '统一身份认证 账号登录 密码',
      SZU_MOCK_COURSE_URL: 'https://authserver.szu.edu.cn/authserver/login',
      SZU_MOCK_COURSE_TITLE: '统一身份认证'
    }),
    checks: [
      statusIs(11),
      jsonPathIs('error.code', 'LOGIN_REQUIRED')
    ]
  },
  {
    id: 'course.permission-denied',
    layer: 'L0',
    args: ['course', 'list', '--json'],
    env: courseEnv({
      SZU_MOCK_COURSE_STATUS: '403',
      SZU_MOCK_COURSE_TEXT: '403 版权信息'
    }),
    checks: [
      statusIs(13),
      jsonPathIs('error.code', 'PERMISSION_DENIED')
    ]
  },
  {
    id: 'program.not-found',
    layer: 'L0',
    args: ['program', 'item', 'missing-plan', '--json'],
    env: programEnv({
      SZU_MOCK_PROGRAM_API_JSON: JSON.stringify({
        programItem: {
          qxpyfacx: { datas: { qxpyfacx: { totalSize: 0, rows: [] } } },
          kzcx: { datas: { kzcx: { totalSize: 0, rows: [] } } },
          kzkccx: { datas: { kzkccx: { totalSize: 0, rows: [] } } }
        }
      })
    }),
    checks: [
      statusIs(23),
      jsonPathIs('error.code', 'PROGRAM_NOT_FOUND')
    ]
  },
  {
    id: 'timetable.class-not-found',
    layer: 'L0',
    args: ['timetable', 'view', 'missing-class', '--json'],
    env: timetableEnv(),
    checks: [
      statusIs(22),
      jsonPathIs('error.code', 'CLASS_NOT_FOUND')
    ]
  },
  {
    id: 'grade.term-filter',
    layer: 'L0',
    args: ['grade', 'list', '--term', '2025-2026-1', '--json'],
    env: gradeEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('data.terms.0.termId', '2025-2026-1'),
      jsonPathIs('data.items.1.courseName', '线性代数')
    ]
  },
  {
    id: 'grade.permission-denied',
    layer: 'L0',
    args: ['grade', 'list', '--json'],
    env: gradeEnv({
      SZU_MOCK_GRADE_STATUS: '403',
      SZU_MOCK_GRADE_TEXT: '403 版权信息'
    }),
    checks: [
      statusIs(13),
      jsonPathIs('error.code', 'PERMISSION_DENIED')
    ]
  },
  {
    id: 'grade.empty-api',
    layer: 'L0',
    args: ['grade', 'list', '--json'],
    env: gradeEnv({ SZU_MOCK_GRADE_API_JSON: '{}' }),
    checks: [
      statusIs(0),
      jsonPathIs('ok', true),
      jsonPathIs('data.items.length', 0)
    ]
  },
  {
    id: 'growth.term-year-conflict',
    layer: 'L0',
    args: ['growth', 'list', '--term', '2025-2026-2', '--year', '2025-2026', '--json'],
    env: growthEnv(),
    checks: [
      statusIs(1),
      jsonPathIs('error.code', 'UNKNOWN_ERROR')
    ]
  },
  {
    id: 'growth.page-changed',
    layer: 'L0',
    args: ['growth', 'summary', '--json'],
    env: growthEnv({ SZU_MOCK_GROWTH_API_JSON: '{}' }),
    checks: [
      statusIs(20),
      jsonPathIs('error.code', 'PAGE_CHANGED')
    ]
  },
  {
    id: 'ideology.empty-summary',
    layer: 'L0',
    args: ['ideology', 'summary', '--json'],
    env: ideologyEnv({
      SZU_MOCK_IDEOLOGY_API_JSON: JSON.stringify({
        cxxshdtjlb: { datas: { cxxshdtjlb: { rows: [] } } }
      })
    }),
    checks: [
      statusIs(0),
      jsonPathIs('data.available', false)
    ]
  },
  {
    id: 'ideology.page-changed',
    layer: 'L0',
    args: ['ideology', 'summary', '--json'],
    env: ideologyEnv({ SZU_MOCK_IDEOLOGY_API_JSON: '{}' }),
    checks: [
      statusIs(20),
      jsonPathIs('error.code', 'PAGE_CHANGED')
    ]
  },
  {
    id: 'completion.module-not-found',
    layer: 'L0',
    args: ['completion', 'courses', '--module', 'missing-module', '--json'],
    env: completionEnv(),
    checks: [
      statusIs(25),
      jsonPathIs('error.code', 'MODULE_NOT_FOUND')
    ]
  },
  {
    id: 'completion.timeout',
    layer: 'L0',
    args: ['completion', 'summary', '--timeout', '1', '--json'],
    env: completionEnv({ SZU_MOCK_COMPLETION_TIMEOUT: '1' }),
    checks: [
      statusIs(24),
      jsonPathIs('error.code', 'CALCULATION_TIMEOUT'),
      jsonPathIs('error.details.timeoutSeconds', 1)
    ]
  },
  {
    id: 'lecture.not-found',
    layer: 'L0',
    args: ['lecture', 'item', 'missing', '--json'],
    env: lectureEnv(),
    checks: [
      statusIs(26),
      jsonPathIs('error.code', 'LECTURE_NOT_FOUND')
    ]
  },
  {
    id: 'lecture.invalid-availability',
    layer: 'L0',
    args: ['lecture', 'list', '--availability', 'maybe', '--json'],
    env: lectureEnv(),
    checks: [
      statusIs(1),
      jsonPathIs('error.code', 'UNKNOWN_ERROR')
    ]
  },
  {
    id: 'lecture.permission-denied',
    layer: 'L0',
    args: ['lecture', 'progress', '--json'],
    env: lectureEnv({
      SZU_MOCK_LECTURE_STATUS: '403',
      SZU_MOCK_LECTURE_TITLE: '403',
      SZU_MOCK_LECTURE_TEXT: '403'
    }),
    checks: [
      statusIs(13),
      jsonPathIs('error.code', 'PERMISSION_DENIED')
    ]
  },
  {
    id: 'electricity.query-required',
    layer: 'L0',
    args: ['electricity', 'query', '--json'],
    env: electricityEnv(),
    checks: [
      statusIs(1),
      jsonPathIs('error.code', 'UNKNOWN_ERROR')
    ]
  },
  {
    id: 'electricity.network-required',
    layer: 'L0',
    args: ['electricity', 'status', '--json'],
    env: electricityEnv({ SZU_MOCK_ELECTRICITY_NETWORK: 'down' }),
    checks: [
      statusIs(12),
      jsonPathIs('error.code', 'NETWORK_REQUIRED')
    ]
  },
  {
    id: 'library.advanced-search',
    layer: 'L0',
    args: ['library', 'search', '--title', '交通设计', '--author', '刘立新', '--doc-type', '普通图书', '--location', '南馆', '--json'],
    env: libraryEnv(),
    checks: [
      statusIs(0),
      jsonPathIs('data.advanced.title', '交通设计'),
      jsonPathIs('data.advanced.author', '刘立新')
    ]
  },
  {
    id: 'library.search-required',
    layer: 'L0',
    args: ['library', 'search', '--json'],
    env: libraryEnv(),
    checks: [
      statusIs(1),
      jsonPathIs('error.code', 'UNKNOWN_ERROR')
    ]
  },
  {
    id: 'library.network-required',
    layer: 'L0',
    args: ['library', 'status', '--json'],
    env: libraryEnv({ SZU_MOCK_LIBRARY_NETWORK: 'down' }),
    checks: [
      statusIs(12),
      jsonPathIs('error.code', 'NETWORK_REQUIRED')
    ]
  },
  {
    id: 'academic.headed-required',
    layer: 'L0',
    args: ['wanfang', 'status', '--json'],
    env: { SZU_BROWSER_BACKEND: 'real' },
    checks: [
      statusIs(2),
      jsonPathIs('error.code', 'HEADED_REQUIRED')
    ]
  },
  {
    id: 'academic.search-required',
    layer: 'L0',
    args: ['cnki', 'search', '--headed', '--json'],
    env: cnkiEnv(),
    checks: [
      statusIs(1),
      jsonPathIs('error.code', 'UNKNOWN_ERROR')
    ]
  },
  {
    id: 'grade.login-required',
    layer: 'L0',
    args: ['grade', 'list', '--json'],
    env: gradeEnv({
      SZU_MOCK_GRADE_TEXT: '统一身份认证 账号登录 密码',
      SZU_MOCK_GRADE_URL: 'https://authserver.szu.edu.cn/authserver/login',
      SZU_MOCK_GRADE_TITLE: '统一身份认证'
    }),
    checks: [
      statusIs(11),
      jsonPathIs('error.code', 'LOGIN_REQUIRED')
    ]
  }
];

const startedAt = new Date();
const results = cases.map(runCase);
const passed = results.filter((item) => item.passed).length;
const failed = results.length - passed;
const report = {
  suite: 'cli-fixture',
  generatedAt: startedAt.toISOString(),
  durationMs: Date.now() - startedAt.getTime(),
  passed,
  failed,
  score: Math.round((passed / results.length) * 100),
  reportPath: outPath,
  cases: results
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  suite: report.suite,
  passed,
  failed,
  score: report.score,
  reportPath: outPath
}, null, 2)}\n`);
process.exitCode = failed ? 1 : 0;

function runCase(testCase) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-eval-'));
  const args = typeof testCase.args === 'function' ? testCase.args(home) : testCase.args;
  const input = {
    argv: args,
    command: `node src/cli.js ${args.join(' ')}`,
    env: {
      SZU_CLI_HOME: '<temp>',
      ...Object.fromEntries(Object.keys(testCase.env ?? {}).map((key) => [key, envSummary(key)]))
    }
  };
  const started = Date.now();
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      ...(testCase.env ?? {})
    }
  });
  rmSync(home, { recursive: true, force: true });
  const output = {
    exitCode: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? String(result.error) : null
  };
  const parsed = parseJson(output.stdout);
  const checks = testCase.checks.map((check) => check({ result, parsed }));
  const passedCase = checks.every((check) => check.pass);
  return {
    id: testCase.id,
    layer: testCase.layer,
    evaluator: 'deterministic',
    score: Math.round((checks.filter((check) => check.pass).length / checks.length) * 100),
    passed: passedCase,
    durationMs: Date.now() - started,
    input,
    output,
    checks
  };
}

function noticeEnv(extra = {}) {
  return {
    ...baseMock,
    SZU_MOCK_NOTICE_HTML: fixtures.noticeHtml,
    SZU_MOCK_NOTICE_LIST_HTML: fixtures.noticeListHtml,
    SZU_MOCK_NOTICE_SEARCH_HTML: fixtures.noticeListHtml,
    SZU_MOCK_NOTICE_DETAIL_HTML: fixtures.noticeDetailHtml,
    ...extra
  };
}

function gradeEnv(extra = {}) {
  return {
    ...baseMock,
    SZU_MOCK_GRADE_API_JSON: fixtures.gradeApi,
    SZU_MOCK_GRADE_TEXT: '深圳大学网上办事服务大厅 成绩查询 个人中心 安全退出',
    ...extra
  };
}

function courseEnv(extra = {}) {
  return {
    ...baseMock,
    SZU_MOCK_COURSE_API_JSON: fixtures.courseApi,
    SZU_MOCK_COURSE_TEXT: '深圳大学网上办事服务大厅 我的课程表 个人中心 安全退出',
    SZU_MOCK_TODAY: '2026-06-22T12:00:00+08:00',
    ...extra
  };
}

function programEnv(extra = {}) {
  return {
    ...baseMock,
    SZU_MOCK_PROGRAM_API_JSON: fixtures.programApi,
    SZU_MOCK_PROGRAM_TEXT: '深圳大学网上办事服务大厅 全校方案查询 培养方案 个人中心 安全退出',
    ...extra
  };
}

function timetableEnv(extra = {}) {
  return {
    ...baseMock,
    SZU_MOCK_TIMETABLE_API_JSON: fixtures.timetableApi,
    SZU_MOCK_TIMETABLE_TEXT: '深圳大学网上办事服务大厅 全校课表查询 班级课程表 个人中心 安全退出',
    ...extra
  };
}

function growthEnv(extra = {}) {
  return {
    ...baseMock,
    SZU_MOCK_GROWTH_API_JSON: fixtures.growthApi,
    SZU_MOCK_GROWTH_TEXT: '深圳大学网上办事服务大厅 成长记录 个人中心 安全退出',
    ...extra
  };
}

function ideologyEnv(extra = {}) {
  return {
    ...baseMock,
    SZU_MOCK_IDEOLOGY_API_JSON: fixtures.ideologyApi,
    SZU_MOCK_IDEOLOGY_TEXT: '深圳大学网上办事服务大厅 思政与社会实践 个人中心 安全退出',
    ...extra
  };
}

function completionEnv(extra = {}) {
  return {
    ...baseMock,
    SZU_MOCK_COMPLETION_API_JSON: fixtures.completionApi,
    SZU_MOCK_COMPLETION_TEXT: '深圳大学网上办事服务大厅 学业完成查询 个人中心 安全退出',
    ...extra
  };
}

function lectureEnv(extra = {}) {
  return {
    ...baseMock,
    SZU_MOCK_NOW: '2026-06-27T12:00:00+08:00',
    SZU_MOCK_LECTURE_LIST_JSON: lectureListJson,
    SZU_MOCK_LECTURE_CLASSROOMS_JSON: lectureClassroomsJson,
    SZU_MOCK_LECTURE_PROGRESS_JSON: lectureProgressJson,
    SZU_MOCK_LECTURE_TITLE: '创新领航讲座',
    SZU_MOCK_LECTURE_TEXT: '公告 讲座报名 学习进度 查看报名信息',
    ...extra
  };
}

function electricityEnv(extra = {}) {
  return {
    ...baseMock,
    SZU_MOCK_ELECTRICITY_JSON: electricityJson,
    ...extra
  };
}

function libraryEnv(extra = {}) {
  return {
    ...baseMock,
    SZU_MOCK_LIBRARY_JSON: libraryJson,
    ...extra
  };
}

function cnkiEnv(extra = {}) {
  return {
    ...baseMock,
    SZU_MOCK_CNKI_JSON: cnkiJson,
    ...extra
  };
}

function wanfangEnv(extra = {}) {
  return {
    ...baseMock,
    SZU_MOCK_WANFANG_JSON: wanfangJson,
    ...extra
  };
}

function statusIs(expected) {
  return ({ result }) => ({
    name: `exitCode == ${expected}`,
    pass: result.status === expected,
    actual: result.status,
    expected
  });
}

function stdoutMatches(pattern) {
  return ({ result }) => ({
    name: `stdout matches ${pattern}`,
    pass: pattern.test(result.stdout ?? ''),
    actual: (result.stdout ?? '').trim()
  });
}

function jsonPathIs(path, expected) {
  return ({ parsed }) => {
    const actual = getPath(parsed, path);
    return {
      name: `${path} == ${JSON.stringify(expected)}`,
      pass: actual === expected,
      actual,
      expected
    };
  };
}

function jsonEvery(path, predicate) {
  return ({ parsed }) => {
    const actual = getPath(parsed, path);
    return {
      name: `${path} every item matches predicate`,
      pass: Array.isArray(actual) && actual.every(predicate),
      actual
    };
  };
}

function outputExcludes(text) {
  return ({ result }) => ({
    name: `output excludes ${text}`,
    pass: !`${result.stdout ?? ''}\n${result.stderr ?? ''}`.includes(text)
  });
}

function parseJson(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function getPath(value, path) {
  return path.split('.').reduce((current, part) => {
    if (current === null || current === undefined) {
      return undefined;
    }
    return current[part];
  }, value);
}

function envSummary(key) {
  if (key.endsWith('_JSON')) {
    return '<fixture-json>';
  }
  if (key.endsWith('_HTML')) {
    return '<fixture-html>';
  }
  return '<mock>';
}
