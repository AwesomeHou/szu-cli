import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { installGlobal } from '../src/modules/install.js';

test('installGlobal installs the CLI from npm and the bundled skill globally through skills', async () => {
  const calls = [];
  const result = await installGlobal({
    packageName: 'szu-cli',
    packageVersion: '0.2.0',
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
        fileURLToPath(new URL('../skills/szu-cli-skill', import.meta.url)),
        '--skill',
        'szu-cli-skill',
        '--yes',
        '--global'
      ]
    }
  ]);
  assert.equal(result.cli.installed, true);
  assert.equal(result.cli.scope, 'global');
  assert.equal(result.skill.installed, true);
  assert.equal(result.skill.scope, 'global');
  assert.equal(result.skill.source, fileURLToPath(new URL('../skills/szu-cli-skill', import.meta.url)));
});
