import test from 'node:test';
import assert from 'node:assert/strict';

import { queryLihuElectricity } from '../src/modules/electricity-lihu.js';

function usagePage({ nextHref = 'http://172.25.100.105:8010/usedRecord.aspx?p=2', httpStatus = 200 } = {}) {
  let historyPage = 1;
  const actions = [];
  const page = {
    actions,
    url: () => 'http://172.25.100.105:8010/usedRecord.aspx',
    waitForNavigation: async () => ({ status: () => httpStatus }),
    selectOption: async (selector, value) => { actions.push([selector, value]); },
    check: async selector => { actions.push([selector]); },
    fill: async (selector, value) => { actions.push([selector, value]); },
    locator(selector) {
      if (selector === '#drceng' || selector === '#drfangjian') {
        return { evaluate: fn => fn({ options: [{
          value: selector === '#drceng' ? 'floor-id' : 'room-id',
          textContent: selector === '#drceng' ? '测试楼#5层' : '测试楼#501'
        }] }) };
      }
      if (selector === 'body') {
        return { innerText: async () => `剩余电量：12.50 度 第 ${historyPage} 页 / 共 2 页` };
      }
      if (selector === 'table tr') {
        const rows = [['日期', '房间名称', '用量(度)', '单价(元/度)'],
          [historyPage === 1 ? '2026-10-12' : '2026-10-11', '测试楼#501', '2.5', '0.68']];
        return { evaluateAll: fn => fn(rows.map(row => ({ cells: row.map(innerText => ({ innerText })) }))) };
      }
      return { click: async () => { actions.push([selector]); } };
    },
    getByRole(role, options) {
      assert.equal(role, 'link');
      assert.equal(options.name, '下一页');
      return {
        getAttribute: async () => nextHref,
        click: async () => { historyPage++; actions.push(['next page']); }
      };
    }
  };
  return page;
}

test('Lihu query uses exact dropdown ids, the usage action, requested dates, and every history page', async () => {
  const page = usagePage();
  const result = await queryLihuElectricity(page, { buildingId: 'building-id', room: '501', from: '2026-10-11', to: '2026-10-12' });
  assert.equal(result.remainingKwh, 12.5);
  assert.deepEqual(result.records.map(record => record.recordedAt), ['2026-10-12', '2026-10-11']);
  assert.deepEqual(result.records.map(record => record.index), [1, 2]);
  assert.deepEqual(page.actions, [
    ['#drlouming', 'building-id'], ['#drceng', 'floor-id'], ['#drfangjian', 'room-id'],
    ['#usedR'], ['#ImageButton1'], ['#txtstart', '2026-10-11'], ['#txtend', '2026-10-12'], ['#btnser'], ['next page']
  ]);
});

test('Lihu query does not follow an unrelated next-page URL', async () => {
  const page = usagePage({ nextHref: 'https://example.com/' });
  await assert.rejects(() => queryLihuElectricity(page, { buildingId: 'building-id', room: '501', from: '2026-10-11', to: '2026-10-12' }), { code: 'PAGE_CHANGED' });
  assert.equal(page.actions.some(action => action[0] === 'next page'), false);
});

test('Lihu query stops on rate limiting without trying the next dropdown', async () => {
  const page = usagePage({ httpStatus: 429 });
  await assert.rejects(() => queryLihuElectricity(page, { buildingId: 'building-id', room: '501' }), { code: 'RATE_LIMITED' });
  assert.deepEqual(page.actions, [['#drlouming', 'building-id']]);
});
