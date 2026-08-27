import test from 'node:test';
import assert from 'node:assert/strict';

import { installGlobal } from '../src/modules/install.js';

test('installGlobal installs the CLI and skill globally through npm and npx', async () => {
  const calls = [];
  const result = await installGlobal({
    packageName: 'szu-cli',
    packageVersion: '0.2.0',
    skillSource: 'https://github.com/AwesomeHou/szu-cli',
    execute: async (command, args) => {
      calls.push({ command, args });
    }
  });

  assert.deepEqual(calls, [
    {
      command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
      args: ['install', '--global', 'szu-cli@0.2.0']
    },
    {
      command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
      args: [
        '--yes',
        'skills',
        'add',
        'https://github.com/AwesomeHou/szu-cli',
        '--skill',
        'szu-campus',
        '--yes',
        '--global'
      ]
    }
  ]);
  assert.equal(result.cli.installed, true);
  assert.equal(result.cli.scope, 'global');
  assert.equal(result.skill.installed, true);
  assert.equal(result.skill.scope, 'global');
});
