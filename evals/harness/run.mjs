#!/usr/bin/env node
import { cp, copyFile, mkdir, readFile, readdir, chmod, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, delimiter, join, parse, relative, resolve } from 'node:path';
import { EVAL_DEFAULTS } from './config.mjs';
import { evaluateTrace } from './l0-evaluator.mjs';
import { normalizeCodexOutput } from './trace.mjs';

const harnessDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(harnessDir, '../..');
const casesRoot = join(harnessDir, '../cases');
const runsRoot = join(harnessDir, '../runs');
const skillSource = join(repoRoot, 'skills', 'szu-cli-skill');

function parseArgs(argv) {
  const options = {
    cases: [],
    all: false,
    list: false,
    dryRun: false,
    keep: true,
    reuseAuth: true,
    timeoutMs: 180000,
    model: EVAL_DEFAULTS.model,
    reasoningEffort: EVAL_DEFAULTS.reasoningEffort
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--case') options.cases.push(argv[++index]);
    else if (arg === '--all') options.all = true;
    else if (arg === '--list') options.list = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--reuse-auth') options.reuseAuth = true;
    else if (arg === '--no-reuse-auth') options.reuseAuth = false;
    else if (arg === '--codex') options.codex = argv[++index];
    else if (arg === '--model') options.model = argv[++index];
    else if (arg === '--reasoning-effort') options.reasoningEffort = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number(argv[++index]);
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function usage() {
  return `Usage:
  node evals/harness/run.mjs --list
  node evals/harness/run.mjs --case <case-id>
  node evals/harness/run.mjs --all
  node evals/harness/run.mjs --case <case-id> --dry-run

Options:
  --codex <path>       Codex executable; defaults to CODEX_BIN or codex
  --model <model>      Codex model; default gpt-5.6-luna
  --reasoning-effort <effort>
                       Codex reasoning effort; default low
  --timeout-ms <ms>    Per-case timeout; default 180000
  --dry-run            Print the plan without starting Codex
  --reuse-auth         Explicitly enable auth.json reuse (enabled by default)
  --no-reuse-auth      Do not copy the user's auth.json
`;
}

async function loadCase(caseId) {
  const caseDir = join(casesRoot, caseId);
  const definition = JSON.parse(await readFile(join(caseDir, 'case.json'), 'utf8'));
  const oracle = JSON.parse(await readFile(join(caseDir, definition.oracle), 'utf8'));
  const fixture = definition.fixture ? JSON.parse(await readFile(join(caseDir, definition.fixture), 'utf8')) : null;
  return { caseDir, definition, oracle, fixture };
}

async function listCases() {
  const entries = await readdir(casesRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && /^\d{3}-/.test(entry.name)).map((entry) => entry.name).sort();
}

function safeRunId() {
  return `${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${Math.random().toString(16).slice(2, 8)}`;
}

function quoteCmdPath(value) {
  return value.replaceAll('"', '""');
}

async function createCliShim(binDir) {
  await mkdir(binDir, { recursive: true });
  if (process.platform === 'win32') {
    const shim = join(binDir, 'szu-cli.cmd');
    const nodePath = quoteCmdPath(process.execPath);
    const cliPath = quoteCmdPath(join(repoRoot, 'src', 'cli.js'));
    await writeFile(shim, `@echo off\r\n"${nodePath}" "${cliPath}" %*\r\n`, 'utf8');
    return shim;
  }

  const shim = join(binDir, 'szu-cli');
  await writeFile(shim, `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(join(repoRoot, 'src', 'cli.js'))} "$@"\n`, 'utf8');
  await chmod(shim, 0o755);
  return shim;
}

function windowsHomeParts(home) {
  const parsed = parse(home);
  return {
    HOMEDRIVE: parsed.root.slice(0, 2),
    HOMEPATH: home.slice(parsed.root.length - 1)
  };
}

function userAuthPath() {
  if (process.env.CODEX_HOME) return join(process.env.CODEX_HOME, 'auth.json');
  const userHome = process.env.USERPROFILE ?? process.env.HOME;
  if (!userHome) throw new Error('Cannot locate the user home directory for auth.json.');
  return join(userHome, '.codex', 'auth.json');
}

async function buildEnvironment({ caseDir, caseRunDir, fixture, staging, reuseAuth }) {
  const home = join(caseRunDir, '.home');
  const codexHome = join(caseRunDir, '.codex-home');
  const szuCliHome = join(caseRunDir, '.szu-cli-home');
  const temp = join(caseRunDir, '.tmp');
  const binDir = join(staging, '.harness-bin');
  await Promise.all([home, codexHome, szuCliHome, temp].map((path) => mkdir(path, { recursive: true })));
  await createCliShim(binDir);
  const configLines = ['project_root_markers = []'];
  let authSource = null;
  let authMode = 'environment-only';
  if (reuseAuth) {
    authSource = userAuthPath();
    try {
      await copyFile(authSource, join(codexHome, 'auth.json'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        const hasApiKey = ['CODEX_API_KEY', 'OPENAI_API_KEY'].some((key) => process.env[key]);
        if (!hasApiKey) {
          throw new Error(`auth.json was not found at ${authSource}; provide auth.json or an explicit API key, or use --no-reuse-auth for dry tooling.`);
        }
        authSource = null;
      } else {
        throw error;
      }
    }
    if (authSource) {
      configLines.push('cli_auth_credentials_store = "file"');
      authMode = 'copied-auth.json';
    } else if (['CODEX_API_KEY', 'OPENAI_API_KEY'].some((key) => process.env[key])) {
      authMode = 'environment-api-key';
    }
  }
  await writeFile(join(codexHome, 'config.toml'), `${configLines.join('\n')}\n`, 'utf8');

  const inheritedKeys = [
    'PATH', 'PATHEXT', 'ComSpec', 'COMSPEC', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'OS',
    'PROCESSOR_ARCHITECTURE', 'PROCESSOR_IDENTIFIER', 'NUMBER_OF_PROCESSORS',
    'ProgramData', 'PROGRAMDATA', 'ProgramFiles', 'PROGRAMFILES', 'ProgramFiles(x86)',
    'PROGRAMFILES(X86)', 'LANG', 'LC_ALL', 'TERM', 'TERM_PROGRAM'
  ];
  const childEnv = {};
  for (const key of inheritedKeys) {
    if (process.env[key] !== undefined) childEnv[key] = process.env[key];
  }
  for (const key of ['CODEX_API_KEY', 'OPENAI_API_KEY']) {
    if (process.env[key] !== undefined) childEnv[key] = process.env[key];
  }

  childEnv.PATH = [binDir, process.env.PATH ?? ''].filter(Boolean).join(delimiter);
  childEnv.CODEX_HOME = codexHome;
  childEnv.HOME = home;
  childEnv.USERPROFILE = home;
  childEnv.TEMP = temp;
  childEnv.TMP = temp;
  childEnv.SZU_CLI_HOME = szuCliHome;
  childEnv.SZU_BROWSER_BACKEND = 'mock';
  if (process.platform === 'win32') {
    Object.assign(childEnv, windowsHomeParts(home));
    childEnv.APPDATA = join(home, 'AppData', 'Roaming');
    childEnv.LOCALAPPDATA = join(home, 'AppData', 'Local');
    await mkdir(childEnv.APPDATA, { recursive: true });
    await mkdir(childEnv.LOCALAPPDATA, { recursive: true });
  }

  for (const [key, value] of Object.entries(fixture?.env ?? {})) childEnv[key] = String(value);
  for (const [key, filePath] of Object.entries(fixture?.envFiles ?? {})) {
    childEnv[key] = await readFile(resolve(caseDir, filePath), 'utf8');
  }
  return { childEnv, home, codexHome, szuCliHome, binDir, authMode };
}

function makePrompt(definition) {
  const context = definition.runtime?.agentContext;
  return context ? `${definition.input}\n\n${context}` : definition.input;
}

function spawnCodex({ codex, args, cwd, env, timeoutMs }) {
  return new Promise((resolveResult) => {
    const invocation = /\.mjs$/i.test(codex)
    ? { command: process.execPath, args: [codex, ...args] }
      : { command: codex, args };
    const child = spawn(invocation.command, invocation.args, { cwd, env, windowsHide: true });
    child.stdin.end();
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolveResult({ exitCode: 127, signal: null, stdout, stderr: `${stderr}${error.message}\n`, timedOut });
    });
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      resolveResult({ exitCode: exitCode ?? 1, signal, stdout, stderr, timedOut });
    });
  });
}

async function runOne({ loaded, runRoot, options, runId }) {
  const { definition, oracle, fixture, caseDir } = loaded;
  const caseRunDir = join(runRoot, 'cases', definition.id);
  const staging = join(caseRunDir, 'staging');
  await mkdir(staging, { recursive: true });
  await cp(skillSource, join(staging, '.agents', 'skills', 'szu-cli-skill'), { recursive: true });
  const environment = await buildEnvironment({ caseDir, caseRunDir, fixture, staging, reuseAuth: options.reuseAuth });
  const finalPath = join(caseRunDir, 'final-answer.md');
  const rawPath = join(caseRunDir, 'raw-events.jsonl');
  const tracePath = join(caseRunDir, 'trace.jsonl');
  const resultPath = join(caseRunDir, 'l0-result.json');
  const startedAt = new Date().toISOString();
  const codex = options.codex ?? process.env.CODEX_BIN ?? 'codex';
  const args = [
    'exec',
    '--json',
    '--ephemeral',
    '--ignore-rules',
    '--skip-git-repo-check',
    '--approve-for-me',
    '--config', 'project_root_markers=[]',
    '--config', `model_reasoning_effort="${options.reasoningEffort}"`,
    '--cd', staging,
    '--output-last-message', finalPath
  ];
  args.push('--model', options.model);
  args.push(makePrompt(definition));

  const manifest = {
    runId,
    caseId: definition.id,
    input: definition.input,
    mode: definition.mode,
    codex,
    evalConfig: {
      model: options.model,
      reasoningEffort: options.reasoningEffort
    },
    args: args.filter((arg) => arg !== makePrompt(definition)),
    cwd: staging,
    skill: definition.skill,
    runtime: definition.runtime,
    auth: { mode: environment.authMode },
    fixture: fixture ? { backend: fixture.backend, envKeys: Object.keys(fixture.env ?? {}), envFiles: Object.keys(fixture.envFiles ?? {}) } : null,
    environment: {
      CODEX_HOME: environment.codexHome,
      HOME: environment.home,
      SZU_CLI_HOME: environment.szuCliHome,
      inheritedKeys: Object.keys(environment.childEnv).sort()
    },
    paths: {
      caseSource: relative(repoRoot, caseDir),
      staging: relative(repoRoot, staging),
      finalAnswer: relative(repoRoot, finalPath),
      rawEvents: relative(repoRoot, rawPath),
      trace: relative(repoRoot, tracePath),
      l0Result: relative(repoRoot, resultPath)
    },
    startedAt
  };
  await writeFile(join(caseRunDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const processResult = await spawnCodex({
    codex,
    args,
    cwd: repoRoot,
    env: environment.childEnv,
    timeoutMs: options.timeoutMs
  });
  const endedAt = new Date().toISOString();
  await writeFile(rawPath, processResult.stdout, 'utf8');
  await writeFile(join(caseRunDir, 'stderr.log'), processResult.stderr, 'utf8');
  let finalAnswer = '';
  try {
    finalAnswer = await readFile(finalPath, 'utf8');
  } catch {
    // The final answer can still be recovered from item.completed events.
  }
  const events = normalizeCodexOutput({
    rawText: processResult.stdout,
    caseId: definition.id,
    startedAt,
    endedAt,
    exitCode: processResult.exitCode,
    finalAnswer: finalAnswer.trim()
  });
  if (!finalAnswer.trim()) {
    finalAnswer = events.filter((event) => event.type === 'assistant.final').at(-1)?.text ?? '';
    if (finalAnswer) await writeFile(finalPath, `${finalAnswer}\n`, 'utf8');
  }
  await writeFile(tracePath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`, 'utf8');
  const l0Result = evaluateTrace({ caseId: definition.id, oracle, events });
  l0Result.process = {
    exitCode: processResult.exitCode,
    signal: processResult.signal,
    timedOut: processResult.timedOut
  };
  await writeFile(resultPath, `${JSON.stringify(l0Result, null, 2)}\n`, 'utf8');
  return {
    caseId: definition.id,
    status: l0Result.passed ? 'passed' : 'failed',
    l0Result: relative(repoRoot, resultPath),
    trace: relative(repoRoot, tracePath),
    finalAnswer: relative(repoRoot, finalPath),
    process: l0Result.process
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  if (options.list) {
    process.stdout.write(`${(await listCases()).join('\n')}\n`);
    return;
  }
  const caseIds = options.all ? await listCases() : options.cases;
  if (caseIds.length === 0) throw new Error('Specify --case <case-id> or --all.');
  const loadedCases = await Promise.all(caseIds.map(loadCase));
  const unknown = caseIds.filter((id) => !loadedCases.some((loaded) => loaded.definition.id === id));
  if (unknown.length) throw new Error(`Unknown case: ${unknown.join(', ')}`);

  const plan = loadedCases.map(({ definition }) => ({
    caseId: definition.id,
    input: definition.input,
    mode: definition.mode,
    backend: definition.runtime?.backend,
    skill: definition.skill,
    auth: options.reuseAuth ? 'copied-auth.json (default)' : 'environment-only'
  }));
  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify({
      dryRun: true,
      codex: options.codex ?? process.env.CODEX_BIN ?? 'codex',
      evalConfig: {
        model: options.model,
        reasoningEffort: options.reasoningEffort
      },
      cases: plan
    }, null, 2)}\n`);
    return;
  }

  const runId = safeRunId();
  const runRoot = join(runsRoot, runId);
  await mkdir(runRoot, { recursive: true });
  const results = [];
  for (const loaded of loadedCases) {
    results.push(await runOne({ loaded, runRoot, options, runId }));
  }
  const summary = { runId, runDir: relative(repoRoot, runRoot), passed: results.every((result) => result.status === 'passed'), cases: results };
  await writeFile(join(runRoot, 'run-result.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!summary.passed) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 2;
});
