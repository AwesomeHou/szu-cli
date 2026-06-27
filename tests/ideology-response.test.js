import test from 'node:test';
import assert from 'node:assert/strict';

import { isIdeologySummaryRequest } from '../src/modules/ideology.js';

test('recognizes the final querySetting ideology summary request', () => {
  assert.equal(
    isIdeologySummaryRequest('*order=&XH=2023000000&pageSize=10&pageNumber=1'),
    false
  );
  assert.equal(
    isIdeologySummaryRequest('*order=&querySetting=%5B%7B%22name%22%3A%22XH%22%7D%5D&pageSize=10&pageNumber=1'),
    true
  );
});
