import { spawn } from 'node:child_process';

const SKILL_SOURCE = 'https://github.com/AwesomeHou/szu-cli';

export async function installGlobal(options = {}) {
  const packageName = options.packageName ?? 'szu-cli';
  const packageVersion = options.packageVersion ?? 'latest';
  const skillSource = options.skillSource ?? SKILL_SOURCE;
  const execute = options.execute ?? runExternalCommand;

  await execute(getCommand('npm'), ['install', '--global', `${packageName}@${packageVersion}`]);
  await execute(getCommand('npx'), [
    '--yes',
    'skills',
    'add',
    skillSource,
    '--skill',
    'szu-cli-skill',
    '--yes',
    '--global'
  ]);

  return {
    cli: {
      package: packageName,
      version: packageVersion,
      installed: true,
      scope: 'global'
    },
    skill: {
      source: skillSource,
      installed: true,
      scope: 'global'
    }
  };
}

function getCommand(command) {
  return process.platform === 'win32' ? `${command}.cmd` : command;
}

function runExternalCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: false
    });

    child.stdout.on('data', (chunk) => process.stderr.write(chunk));
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));

    child.once('error', (cause) => {
      const error = new Error(`Failed to run ${command}: ${cause.message}`);
      error.code = 'INSTALL_COMMAND_FAILED';
      error.cause = cause;
      reject(error);
    });

    child.once('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const suffix = signal ? ` (signal ${signal})` : ` (exit code ${code})`;
      const error = new Error(`Command failed: ${command} ${args.join(' ')}${suffix}`);
      error.code = 'INSTALL_COMMAND_FAILED';
      reject(error);
    });
  });
}
