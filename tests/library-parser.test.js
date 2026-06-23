import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLibraryItemPayload,
  buildLibrarySearchUrl,
  buildLibrarySearchPayload,
  parseLibraryCopies,
  parseLibraryItemMeta,
  parseLibrarySearchMeta,
  parseLibrarySearchRows
} from '../src/modules/library-parser.js';

const fixture = readFileSync(new URL('./fixtures/library-search.html', import.meta.url), 'utf8');
const itemFixture = readFileSync(new URL('./fixtures/library-item.html', import.meta.url), 'utf8');

test('parses library search metadata', () => {
  assert.deepEqual(parseLibrarySearchMeta(extractText(fixture)), {
    total: 96,
    page: 1,
    pageCount: 5,
    loggedIn: true,
    historyRecorded: true
  });
});

test('parses library search rows', () => {
  const rows = parseLibrarySearchRows(extractRows(fixture));

  assert.deepEqual(rows[0], {
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
  });
  assert.equal(rows.length, 2);
});

test('builds library search payload with limit', () => {
  const payload = buildLibrarySearchPayload({
    keyword: '交通设计',
    text: extractText(fixture),
    rows: extractRows(fixture),
    limit: 1,
    sourceUrl: 'https://www.lib.szu.edu.cn/opac/searchresult.aspx?anywords=交通设计'
  });

  assert.equal(payload.keyword, '交通设计');
  assert.equal(payload.total, 96);
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].id, '3706432');
  assert.equal(payload.loggedIn, true);
  assert.equal(payload.historyRecorded, true);
});

test('builds advanced library search URL', () => {
  const url = buildLibrarySearchUrl({
    title: '交通设计',
    author: '刘立新',
    docType: '0',
    language: '1',
    location: '125',
    limitPerPage: 20,
    sort: 'M_PUB_YEAR',
    order: 'DESC'
  });

  assert.equal(url.searchParams.get('title_f'), '交通设计');
  assert.equal(url.searchParams.get('author_f'), '刘立新');
  assert.equal(url.searchParams.get('st'), '2');
  assert.equal(url.searchParams.get('dt'), '0');
  assert.equal(url.searchParams.get('cl'), '1');
  assert.equal(url.searchParams.get('dept'), '125');
  assert.equal(url.searchParams.get('sm'), 'table');
});

test('parses library item metadata', () => {
  assert.deepEqual(parseLibraryItemMeta(extractText(itemFixture)), {
    id: '3706432',
    title: '交通设计',
    authors: '刘立新, 孟祥海, 陈亮主编',
    publisher: '北京理工大学出版社',
    publishYear: '2025',
    isbn: '978-7-5763-4896-5',
    price: 'CNY76.00',
    loggedIn: true
  });
});

test('parses library item copy rows', () => {
  const copies = parseLibraryCopies(extractRows(itemFixture));

  assert.deepEqual(copies[0], {
    location: '南馆5楼工科阅览室TU-X(汇智楼五楼主题书架1 - 1排1架1层)',
    callNumber: 'U491/L73',
    barcode: 'A4414341',
    volume: null,
    year: null,
    status: '可供出借',
    loanType: '中文图书',
    reservationQueue: 0,
    readerQueue: 0
  });
  assert.equal(copies.length, 2);
});

test('builds library item payload', () => {
  const payload = buildLibraryItemPayload({
    text: extractText(itemFixture),
    rows: extractRows(itemFixture),
    sourceUrl: 'https://www.lib.szu.edu.cn/opac/bookinfo.aspx?ctrlno=3706432'
  });

  assert.equal(payload.id, '3706432');
  assert.equal(payload.title, '交通设计');
  assert.equal(payload.holdings, 2);
  assert.equal(payload.available, 2);
  assert.equal(payload.copies[0].barcode, 'A4414341');
});

function extractText(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractRows(html) {
  return [...html.matchAll(/<tr>(.*?)<\/tr>/gs)].map((row) => {
    const htmlCells = [...row[1].matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((cell) => cell[1]);
    return {
      cells: htmlCells.map((cell) => cell.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()),
      id: row[1].match(/value="([^"]+)"/)?.[1] ?? null,
      href: row[1].match(/href="([^"]+)"/)?.[1] ?? null
    };
  });
}
