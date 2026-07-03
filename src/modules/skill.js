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
  if (target !== 'codex' && target !== 'ai-ide') {
    throw new Error(`Unsupported skill target: ${target}`);
  }

  const codexRoot = options.dir ?? defaultCodexSkillRoot();
  const installedPath = target === 'ai-ide'
    ? options.dest ?? options.dir ?? `${SKILL_NAME}.skill`
    : join(codexRoot, SKILL_NAME);

  if (target === 'codex') {
    await mkdir(codexRoot, { recursive: true });
  } else {
    await mkdir(dirname(installedPath), { recursive: true });
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
