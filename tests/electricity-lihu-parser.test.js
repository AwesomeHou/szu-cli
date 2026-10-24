import test from 'node:test';
import assert from 'node:assert/strict';

import { findLihuFloor, findLihuRoom, normalizeLihuBuildings, parseLihuUsageSnapshot } from '../src/modules/electricity-lihu-parser.js';

const header = ['日期', '房间名称', '用量(度)', '单价(元/度)'];

test('Lihu building options exclude the placeholder and normalize display suffixes', () => {
  assert.deepEqual(normalizeLihuBuildings([
    { value: '0', text: '楼栋' },
    { value: 'test-building', text: '梧桐树#' }
  ]), [{ id: 'test-building', name: '梧桐树' }]);
});

test('Lihu floor selection handles three/four-digit and building-prefixed room numbers', () => {
  const floors = [{ text: '楼层', value: '' }, { text: '梧桐树#5层', value: 'five' }, { text: '梧桐树#15层', value: 'fifteen' }];
  assert.equal(findLihuFloor(floors, '501').value, 'five');
  assert.equal(findLihuFloor(floors, '梧桐树#1501').value, 'fifteen');
  assert.equal(findLihuFloor(floors, '0501').value, 'five');
  assert.throws(() => findLihuFloor(floors, '601'), { code: 'ELECTRICITY_ROOM_NOT_FOUND' });
  assert.throws(() => findLihuFloor(floors, '大厅'), { code: 'ELECTRICITY_ROOM_NOT_FOUND' });
});

test('Lihu room selection matches displayed room numbers exactly rather than database ids or substrings', () => {
  const rooms = [{ text: '房间', value: '' }, { text: '梧桐树#501', value: 'test-room-id' }];
  assert.equal(findLihuRoom(rooms, '501').value, 'test-room-id');
  assert.equal(findLihuRoom(rooms, '0501').value, 'test-room-id');
  assert.throws(() => findLihuRoom(rooms, '50'), { code: 'ELECTRICITY_ROOM_NOT_FOUND' });
  assert.throws(() => findLihuRoom(rooms, 'test-room-id'), { code: 'ELECTRICITY_ROOM_NOT_FOUND' });
  assert.throws(() => findLihuRoom([...rooms, rooms[1]], '501'), { code: 'ELECTRICITY_ROOM_NOT_FOUND' });
});

test('Lihu balance is current and signed; historical usage is not a cumulative total or historical balance', () => {
  const result = parseLihuUsageSnapshot({
    text: '测试楼#501剩余电量：-12.50 度 第 1 页 / 共 2 页 每页 10 条',
    rows: [header, ['2026-10-23', '测试楼#501', '3.25', '0.6800']]
  });
  assert.equal(result.remainingKwh, -12.5);
  assert.equal(result.page, 1);
  assert.equal(result.totalPages, 2);
  assert.deepEqual(result.records, [{
    index: 1, room: '501', usedKwh: 3.25, unitPriceCny: 0.68,
    remainingKwh: null, totalUsedKwh: null, totalPurchasedKwh: null, recordedAt: '2026-10-23'
  }]);
});

test('Lihu zero balance and an empty history are valid', () => {
  assert.deepEqual(parseLihuUsageSnapshot({ text: '剩余电量：0 度 第 1 页 / 共 0 页', rows: [header] }), {
    remainingKwh: 0, records: [], page: 1, totalPages: 0
  });
});

test('Lihu records are filtered by displayed dates even when the server includes an extra boundary day', () => {
  const result = parseLihuUsageSnapshot({
    from: '2026-01-10', to: '2026-01-11',
    text: '剩余电量：5 度 第 1 页 / 共 1 页',
    rows: [header,
      ['2026/1/9', '测试楼#501', '2', '0.68'],
      ['2026/1/10', '测试楼#501', '3', '0.68'],
      ['2026/1/11', '测试楼#501', '4', '0.68'],
      ['2026/1/12', '测试楼#501', '5', '0.68']
    ]
  });
  assert.deepEqual(result.records.map(record => record.recordedAt), ['2026-01-10', '2026-01-11']);
});

test('Lihu parser does not report zero when the balance, table, or pagination has changed', () => {
  for (const snapshot of [
    { text: '暂无余额 第 1 页 / 共 1 页', rows: [header] },
    { text: '剩余电量：5 度 第 1 页 / 共 1 页', rows: [] },
    { text: '剩余电量：5 度', rows: [header] }
  ]) {
    assert.throws(() => parseLihuUsageSnapshot(snapshot), { code: 'PAGE_CHANGED' });
  }
});
