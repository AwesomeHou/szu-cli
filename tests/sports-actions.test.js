import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findSportsCancelButton,
  isSportsCancellationConfirmed,
  isSportsSubmitConfirmed,
  resolveUniqueSportsField
} from '../src/modules/sports.js';

test('sports submit confirmation requires an explicit success state', () => {
  assert.equal(isSportsSubmitConfirmed('订单详情 支付方式'), false);
  assert.equal(isSportsSubmitConfirmed('预约成功，请前往我的预约支付'), true);
});

test('sports cancellation requires explicit confirmation evidence', () => {
  assert.equal(isSportsCancellationConfirmed('我的预约', '202607091405161043'), false);
  assert.equal(isSportsCancellationConfirmed('取消成功', '202607091405161043'), true);
  assert.equal(
    isSportsCancellationConfirmed('取消预约\t202607091405161043\ttime\tbooked\tcampus\tvenue\tfield\tproject\t已取消\ttype\tnote', '202607091405161043'),
    true
  );
});

test('sports reservation automatically selects the only available field', () => {
  assert.deepEqual(resolveUniqueSportsField([
    { name: '一楼健身房', label: '一楼健身房(109/120)', remaining: 109 }
  ]), { name: '一楼健身房', label: '一楼健身房(109/120)', remaining: 109 });
  assert.equal(resolveUniqueSportsField([]), null);
});

test('sports reservation does not guess when multiple fields are available', () => {
  assert.throws(
    () => resolveUniqueSportsField([
      { name: '一号场', remaining: 1 },
      { name: '二号场', remaining: 1 }
    ]),
    (error) => error.code === 'SPORTS_FIELD_SELECTION_REQUIRED' && error.details.fields.length === 2
  );
});

test('sports cancellation never falls back to another order button', async () => {
  const cancel = {
    count: async () => 0
  };
  const row = {
    getByText: () => ({ first: () => cancel })
  };
  const order = {
    first: () => ({ locator: () => row })
  };
  let lookups = 0;
  const page = {
    getByText: (text, options) => {
      lookups += 1;
      assert.equal(text, 'order-2');
      assert.deepEqual(options, { exact: true });
      return order;
    }
  };

  await assert.rejects(
    findSportsCancelButton(page, 'order-2'),
    (error) => error.code === 'PAGE_CHANGED'
  );
  assert.equal(lookups, 1);
});
