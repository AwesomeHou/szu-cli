import { copyFile, cp, mkdir, rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_NAME = 'szu-campus';

export async function getSkillPath() {
  const sourcePath = bundledSkillPath();
  await assertSkillExists(sourcePath);
  return {
    name: SKILL_NAME,
    sourcePath
  };
}

export async function installSkill(options = {}) {
  const sourcePath = bundledSkillPath();
  await assertSkillExists(sourcePath);
  const target = options.target ?? 'codex';
  if (!['codex', 'ai-ide', 'workbuddy', 'claudecode'].includes(target)) {
    throw new Error(`Unsupported skill target: ${target}`);
  }

  const root = options.dir ?? defaultSkillRoot(target);
  const installedPath = target === 'ai-ide'
    ? options.dest ?? options.dir ?? `${SKILL_NAME}.skill`
    : join(root, SKILL_NAME);

  if (target === 'ai-ide') {
    await mkdir(dirname(installedPath), { recursive: true });
  } else {
    await mkdir(root, { recursive: true });
  }
  await rm(installedPath, { recursive: true, force: true });
  await cp(sourcePath, installedPath, { recursive: true });
  if (target === 'ai-ide') {
    await copyFile(join(installedPath, 'SKILL.md'), join(installedPath, 'AGENTS.md'));
  }

  return {
    target,
    name: SKILL_NAME,
    installed: true,
    sourcePath,
    installedPath
  };
}

export function defaultCodexSkillRoot() {
  return join(homedir(), '.agents', 'skills');
}

export function defaultWorkBuddySkillRoot() {
  return join(homedir(), '.workbuddy', 'skills');
}

export function defaultClaudeCodeSkillRoot() {
  return join(homedir(), '.claude', 'skills');
}

function defaultSkillRoot(target) {
  if (target === 'workbuddy') {
    return defaultWorkBuddySkillRoot();
  }
  if (target === 'claudecode') {
    return defaultClaudeCodeSkillRoot();
  }
  return defaultCodexSkillRoot();
}

function bundledSkillPath() {
  return fileURLToPath(new URL('../../skills/szu-campus', import.meta.url));
}

async function assertSkillExists(sourcePath) {
  try {
    const skillFile = join(sourcePath, 'SKILL.md');
    const info = await stat(skillFile);
    if (!info.isFile()) {
      throw new Error('SKILL.md is not a file.');
    }
  } catch (cause) {
    const error = new Error(`Bundled ${SKILL_NAME} skill is missing.`);
    error.code = 'SKILL_NOT_FOUND';
    error.hint = `Expected ${join(sourcePath, 'SKILL.md')}.`;
    error.cause = cause;
    throw error;
  }
}
