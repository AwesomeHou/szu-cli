import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));

const mockData = JSON.stringify({
  status: {
    available: true,
    loggedIn: true,
    historyRecorded: true,
    sourceUrl: 'https://www.lib.szu.edu.cn/opac/search.aspx'
  },
  search: {
    keyword: '交通设计',
    total: 96,
    page: 1,
    pageCount: 5,
    loggedIn: true,
    historyRecorded: true,
    items: [
      {
        index: 3,
        id: '3706432',
        title: '交通设计',
        authors: '刘立新, 孟祥海, 陈亮主编',
        publisher: '北京理工大学出版社',
        publishYear: '2025',
        callNumber: 'U491/L73',
        holdings: 2,
        available: 2,
        detailUrl: 'https://www.lib.szu.edu.cn/opac/bookinfo.aspx?ctrlno=3706432'
      }
    ],
    sourceUrl: 'https://www.lib.szu.edu.cn/opac/searchresult.aspx?anywords=交通设计'
  },
  item: {
    id: '3706432',
    title: '交通设计',
    authors: '刘立新, 孟祥海, 陈亮主编',
    publisher: '北京理工大学出版社',
    publishYear: '2025',
    isbn: '978-7-5763-4896-5',
    price: 'CNY76.00',
    loggedIn: true,
    holdings: 2,
    available: 2,
    copies: [
      {
        location: '南馆5楼工科阅览室TU-X(汇智楼五楼主题书架1 - 1排1架1层)',
        callNumber: 'U491/L73',
        barcode: 'A4414341',
        volume: null,
        year: null,
        status: '可供出借',
        loanType: '中文图书',
        reservationQueue: 0,
        readerQueue: 0
      }
    ],
    sourceUrl: 'https://www.lib.szu.edu.cn/opac/bookinfo.aspx?ctrlno=3706432'
  }
});

function runLibrary(args, options = {}) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      SZU_BROWSER_BACKEND: 'mock',
      SZU_MOCK_LIBRARY_JSON: mockData,
      ...options.env
    }
  });
  rmSync(home, { recursive: true, force: true });
  return result;
}

test('library status reports OPAC readiness and login state', () => {
  const result = runLibrary(['library', 'status', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'library status');
  assert.equal(body.data.available, true);
  assert.equal(body.data.loggedIn, true);
});

test('library search returns normalized OPAC results', () => {
  const result = runLibrary(['library', 'search', '交通设计', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'library search');
  assert.equal(body.data.keyword, '交通设计');
  assert.equal(body.data.items[0].title, '交通设计');
  assert.equal(body.data.items[0].available, 2);
  assert.equal(body.data.historyRecorded, true);
});

test('library search supports limit', () => {
  const result = runLibrary(['library', 'search', '交通设计', '--limit', '1', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.items.length, 1);
});

test('library search supports page', () => {
  const result = runLibrary(['library', 'search', '交通设计', '--page', '2', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.page, 2);
});

test('library search supports advanced fields', () => {
  const result = runLibrary([
    'library',
    'search',
    '--title',
    '交通设计',
    '--author',
    '刘立新',
    '--doc-type',
    '普通图书',
    '--location',
    '南馆',
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.data.keyword, '交通设计');
  assert.equal(body.data.advanced.title, '交通设计');
  assert.equal(body.data.advanced.author, '刘立新');
});

test('library item returns normalized OPAC detail', () => {
  const result = runLibrary(['library', 'item', '3706432', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'library item');
  assert.equal(body.data.id, '3706432');
  assert.equal(body.data.title, '交通设计');
  assert.equal(body.data.copies[0].status, '可供出借');
});

test('library search requires a keyword', () => {
  const result = runLibrary(['library', 'search', '--json']);

  assert.equal(result.status, 1);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'UNKNOWN_ERROR');
});

test('library commands return NETWORK_REQUIRED when OPAC is unavailable', () => {
  const result = runLibrary(['library', 'status', '--json'], {
    env: {
      SZU_MOCK_LIBRARY_NETWORK: 'down'
    }
  });

  assert.equal(result.status, 12);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'NETWORK_REQUIRED');
});
