import test from 'node:test';
import assert from 'node:assert/strict';

import { waitForContextClose } from '../src/modules/auth.js';

test('waits for browser closure without Playwright timeout', async () => {
  let actualEvent;
  let actualOptions;
  const context = {
    waitForEvent(event, options) {
      actualEvent = event;
      actualOptions = options;
      return Promise.resolve();
    }
  };

  await waitForContextClose(context);

  assert.equal(actualEvent, 'close');
  assert.deepEqual(actualOptions, { timeout: 0 });
});
