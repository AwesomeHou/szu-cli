import { readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTrace } from '../evals/harness/l0-evaluator.mjs';
import { extractCommandArgv, normalizeCodexOutput, splitShellCommands } from '../evals/harness/trace.mjs';

const testDir = dirname(fileURLToPath(import.meta.url));
const casesDir = join(testDir, '..', 'evals', 'cases');

function oracle(caseId) {
  const caseDir = join(casesDir, caseId);
  const definition = JSON.parse(readFileSync(join(caseDir, 'case.json'), 'utf8'));
  return JSON.parse(readFileSync(join(caseDir, definition.oracle), 'utf8'));
}

function commandCall(seq, argv) {
  return { seq, type: 'tool.call', tool: 'shell', command: argv.join(' '), argv };
}

function commandResult(seq, argv, stdoutJson, exitCode = 0) {
  return { seq, type: 'tool.result', tool: 'shell', command: argv.join(' '), argv, stdoutJson, stdout: JSON.stringify(stdoutJson), stderr: '', exitCode };
}

test('trace extracts szu-cli commands wrapped by PowerShell -Command', () => {
  assert.deepEqual(
    extractCommandArgv("powershell.exe -Command 'szu-cli notice list --keyword \"奖学金\"'"),
    ['szu-cli', 'notice', 'list', '--keyword', '奖学金']
  );
  assert.deepEqual(
    extractCommandArgv("powershell.exe -Command 'szu-cli course today --date 2026-06-22'"),
    ['szu-cli', 'course', 'today', '--date', '2026-06-22']
  );
  assert.deepEqual(
    splitShellCommands("powershell.exe -Command 'szu-cli auth status && szu-cli grade list --term 2025-2026-1'"),
    ['szu-cli auth status', 'szu-cli grade list --term 2025-2026-1']
  );
});

test('trace splits PowerShell compound commands and maps JSON results to each szu-cli command', () => {
  const command = "powershell.exe -Command 'node --version; szu-cli --version; szu-cli auth status; szu-cli grade list --term 2025-2026-1'";
  const auth = { ok: true, data: { loggedIn: true }, meta: { command: 'auth status', backend: 'mock' } };
  const grade = { ok: true, data: { items: [{ termId: '2025-2026-1' }] }, meta: { command: 'grade list', backend: 'mock' } };
  const events = normalizeCodexOutput({
    caseId: '002-grade-previous-term',
    rawText: [
      JSON.stringify({ type: 'item.started', item: { id: 'command-1', type: 'command_execution', command } }),
      JSON.stringify({ type: 'item.completed', item: { id: 'command-1', type: 'command_execution', command, exit_code: 0, aggregated_output: `v24.14.1\r\n0.2.2\r\n${JSON.stringify(auth, null, 2)}\r\n${JSON.stringify(grade, null, 2)}\r\n` } }),
      JSON.stringify({ type: 'item.completed', item: { id: 'message-1', type: 'agent_message', text: '2025-2026-1 学期成绩不错。' } })
    ].join('\n'),
    startedAt: '2026-09-05T00:00:00.000Z',
    endedAt: '2026-09-05T00:00:01.000Z',
    exitCode: 0
  });

  const commands = events.filter((event) => event.type === 'tool.call' && event.argv?.[0] === 'szu-cli');
  const results = events.filter((event) => event.type === 'tool.result' && event.argv?.[0] === 'szu-cli');
  assert.deepEqual(commands.map((event) => event.argv), [
    ['szu-cli', '--version'],
    ['szu-cli', 'auth', 'status'],
    ['szu-cli', 'grade', 'list', '--term', '2025-2026-1']
  ]);
  assert.equal(results.find((event) => event.stdoutJson?.meta?.command === 'auth status')?.exitCode, 0);
  assert.equal(results.find((event) => event.stdoutJson?.meta?.command === 'grade list')?.exitCode, 0);

  const evaluated = evaluateTrace({
    caseId: '002-grade-previous-term',
    oracle: oracle('002-grade-previous-term'),
    events
  });
  assert.equal(evaluated.status, 'passed');
});

test('L0 passes the course today trace', () => {
  const argv = ['szu-cli', 'course', 'today'];
  const result = evaluateTrace({
    caseId: '001-course-today',
    oracle: oracle('001-course-today'),
    events: [
      commandCall(1, argv),
      commandResult(2, argv, { ok: true, data: { date: '2026-06-22', items: [{ courseName: '图像处理' }] }, meta: { command: 'course today' } }),
      { seq: 3, type: 'assistant.final', text: '今天是 2026-06-22，你有图像处理。' }
    ]
  });

  assert.equal(result.status, 'passed');
  assert.equal(result.failedCount, 0);
});

test('L0 passes the previous-term grade trace', () => {
  const argv = ['szu-cli', 'grade', 'list', '--term', '2025-2026-1'];
  const result = evaluateTrace({
    caseId: '002-grade-previous-term',
    oracle: oracle('002-grade-previous-term'),
    events: [
      commandCall(1, argv),
      commandResult(2, argv, { ok: true, data: { items: [{ termId: '2025-2026-1', courseName: '应用统计学', grade: 'A+' }] }, meta: { command: 'grade list' } }),
      { seq: 3, type: 'assistant.final', text: '2025-2026-1 学期整体成绩不错，应用统计学为 A+。' }
    ]
  });

  assert.equal(result.status, 'passed');
});

test('L0 accepts either notice search route', () => {
  const argv = ['szu-cli', 'notice', 'search', '奖学金'];
  const result = evaluateTrace({
    caseId: '003-notice-scholarship',
    oracle: oracle('003-notice-scholarship'),
    events: [
      commandCall(1, argv),
      commandResult(2, argv, { ok: true, data: { items: [{ title: '奖学金评定通知' }] }, meta: { command: 'notice search' } }),
      { seq: 3, type: 'assistant.final', text: '找到一条奖学金通知：奖学金评定通知。' }
    ]
  });

  assert.equal(result.status, 'passed');
});

test('L0 checks command sequence, result paths, and required final fields', () => {
  const search = ['szu-cli', 'library', 'search', '交通设计'];
  const item = ['szu-cli', 'library', 'item', '3706432'];
  const result = evaluateTrace({
    caseId: '705-library-location',
    oracle: oracle('705-library-location'),
    events: [
      commandCall(1, search),
      commandResult(2, search, { ok: true, data: { items: [{ id: '3706432', title: '交通设计' }] }, meta: { command: 'library search' } }),
      commandCall(3, item),
      commandResult(4, item, { ok: true, data: { copies: [{ location: '南馆5楼工科阅览室TU-X', callNumber: 'U491/L73', status: '可供出借' }] }, meta: { command: 'library item' } }),
      { seq: 5, type: 'assistant.final', text: '这本书在南馆5楼工科阅览室，索书号为 U491/L73，目前可供出借。' }
    ]
  });

  assert.equal(result.status, 'passed');
  assert.equal(result.failedCount, 0);
});

test('L0 requires sports target clarification before any campus command', () => {
  const result = evaluateTrace({
    caseId: '004-sports-clarify-target',
    oracle: oracle('004-sports-clarify-target'),
    events: [
      { seq: 1, type: 'assistant.final', text: '请先告诉我校区、场馆和具体场地，我再继续。' }
    ]
  });

  assert.equal(result.status, 'passed');
});

test('L0 rejects a sports confirmation command', () => {
  const argv = ['szu-cli', 'sports', 'reserve', '--confirm'];
  const result = evaluateTrace({
    caseId: '004-sports-clarify-target',
    oracle: oracle('004-sports-clarify-target'),
    events: [
      commandCall(1, argv),
      { seq: 2, type: 'assistant.final', text: '预约成功。' }
    ]
  });

  assert.equal(result.status, 'failed');
  assert.ok(result.rules.some((rule) => rule.id === 'sports.no-confirm' && rule.status === 'failed'));
});

test('L0 accepts a venue synonym when checking sports clarification', () => {
  const result = evaluateTrace({
    caseId: '004-sports-clarify-target',
    oracle: oracle('004-sports-clarify-target'),
    events: [
      { seq: 1, type: 'assistant.final', text: '请先告诉我校区、哪座健身房和具体场地，我再继续。' }
    ]
  });

  assert.equal(result.status, 'passed');
});

test('L0 treats a forbidden min threshold as a count threshold', () => {
  const argv = ['szu-cli', 'sports', 'reserve', '--confirm'];
  const result = evaluateTrace({
    caseId: '504-sports-reserve-confirm',
    oracle: oracle('504-sports-reserve-confirm'),
    events: [
      commandCall(1, argv),
      commandResult(2, argv, { ok: true, data: { submitted: true }, meta: { command: 'sports reserve', backend: 'mock' } }),
      { seq: 3, type: 'assistant.final', text: '预约已提交。' }
    ]
  });

  assert.equal(result.rules.find((rule) => rule.id === 'sports.no-duplicate-confirm')?.status, 'passed');
});

test('L0 allows read-only lecture inspection for registration boundary', () => {
  const argv = ['szu-cli', 'lecture', 'item', 'open'];
  const result = evaluateTrace({
    caseId: '414-lecture-registration-unsupported',
    oracle: oracle('414-lecture-registration-unsupported'),
    events: [
      commandCall(1, argv),
      commandResult(2, argv, { ok: true, data: { id: 'open' }, meta: { command: 'lecture item', backend: 'mock' } }),
      { seq: 3, type: 'assistant.final', text: '当前 CLI 不支持报名，但可以查询这场讲座详情。' }
    ]
  });

  assert.equal(result.status, 'passed');
});

test('L0 allows szu-cli version preflight for unsupported tasks', () => {
  const argv = ['szu-cli', '--version'];
  const result = evaluateTrace({
    caseId: '008-unsupported-command',
    oracle: oracle('008-unsupported-command'),
    events: [
      commandCall(1, argv),
      { seq: 2, type: 'assistant.final', text: '当前 CLI 不支持缴纳宿舍电费。' }
    ]
  });

  assert.equal(result.status, 'passed');
});

test('L0 rejects an MCP tool event', () => {
  const result = evaluateTrace({
    caseId: '001-course-today',
    oracle: oracle('001-course-today'),
    events: [
      { seq: 1, type: 'tool.call', tool: 'mcp', server: 'unexpected', name: 'lookup' },
      { seq: 2, type: 'assistant.final', text: '没有执行校园查询。' }
    ]
  });

  assert.equal(result.status, 'failed');
  assert.ok(result.rules.some((rule) => rule.id === 'trace.no-mcp' && rule.status === 'failed'));
});

test('eval runner lists the frozen cases without starting Codex', () => {
  const runner = join(testDir, '..', 'evals', 'harness', 'run.mjs');
  const result = spawnSync(process.execPath, [runner, '--list'], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split(/\r?\n/), [
    '001-course-today',
    '002-grade-previous-term',
    '003-notice-scholarship',
    '004-sports-clarify-target',
    '005-readiness-check',
    '006-auth-profile-missing',
    '007-command-login-required',
    '008-unsupported-command',
    '101-notice-latest',
    '102-notice-category',
    '103-notice-publisher',
    '104-notice-keyword-search',
    '105-notice-detail',
    '106-notice-download-one',
    '107-notice-empty-or-login',
    '201-course-current',
    '202-course-date-filter',
    '203-course-empty',
    '204-course-page-changed',
    '205-course-week',
    '211-timetable-class-search',
    '212-timetable-class-view',
    '213-timetable-class-not-found',
    '301-grade-all',
    '302-grade-term',
    '303-grade-empty-or-page-changed',
    '311-growth-summary',
    '312-growth-list',
    '313-growth-unavailable',
    '321-ideology-summary',
    '322-ideology-unavailable',
    '323-ideology-earned-credits',
    '331-completion-summary-modules',
    '332-completion-module-courses',
    '333-completion-invalid-or-timeout',
    '334-completion-remaining-credits',
    '401-program-list-item',
    '402-program-not-found',
    '411-lecture-available',
    '412-lecture-open-all',
    '413-lecture-detail-progress',
    '414-lecture-registration-unsupported',
    '415-lecture-progress-sufficiency',
    '501-sports-discovery',
    '502-sports-slots-complete-target',
    '503-sports-reserve-dry-run',
    '504-sports-reserve-confirm',
    '505-sports-bookings-cancel',
    '506-sports-unavailable',
    '601-electricity-buildings',
    '602-electricity-query',
    '603-electricity-missing-ambiguous',
    '604-electricity-network',
    '701-library-basic-search',
    '702-library-advanced-item',
    '703-library-missing-or-unsupported',
    '704-library-network',
    '705-library-location'
    , '801-cnki-search-status',
    '802-cnki-advanced-citation',
    '803-cnki-item-download-one',
    '804-cnki-headed-or-login',
    '811-wanfang-search-advanced',
    '812-wanfang-item-download-one',
    '813-wanfang-no-result-or-network',
    '901-json-contract',
    '902-error-recovery-once',
    '903-privacy-minimal-output',
    '904-state-changing-guard'
  ]);
});

test('eval runner executes a Codex-compatible JSONL process and evaluates the run', () => {
  const runner = join(testDir, '..', 'evals', 'harness', 'run.mjs');
  const fakeCodex = join(testDir, 'fixtures', 'fake-codex.mjs');
  const result = spawnSync(process.execPath, [runner, '--case', '001-course-today', '--codex', fakeCodex, '--no-reuse-auth'], {
    encoding: 'utf8',
    timeout: 20000
  });

  try {
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const summary = JSON.parse(result.stdout);
    assert.equal(summary.passed, true);
    assert.equal(summary.cases[0].status, 'passed');
    assert.match(summary.cases[0].trace, /evals[\\/]runs[\\/]/);
  } finally {
    if (result.stdout) {
      try {
        const summary = JSON.parse(result.stdout);
        const runDir = join(testDir, '..', summary.runDir);
        rmSync(runDir, { recursive: true, force: true });
      } catch {
        // Preserve the original test failure.
      }
    }
  }
});
