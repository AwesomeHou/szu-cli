import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCnkiSearchPayload,
  parseCnkiSearchMeta,
  parseCnkiSearchRows
} from '../src/modules/cnki-parser.js';
import {
  buildWanfangSearchPayload,
  parseWanfangSearchMeta,
  parseWanfangSearchRows
} from '../src/modules/wanfang-parser.js';

const cnkiFixture = readFileSync(new URL('./fixtures/cnki-search.html', import.meta.url), 'utf8');
const wanfangFixture = readFileSync(new URL('./fixtures/wanfang-search.html', import.meta.url), 'utf8');

test('parses CNKI result metadata and rows', () => {
  const text = extractText(cnkiFixture);
  const rows = extractCnkiRows(cnkiFixture);

  assert.deepEqual(parseCnkiSearchMeta(text), {
    total: 2627,
    authorized: true,
    institution: '深圳大学'
  });
  assert.deepEqual(parseCnkiSearchRows(rows)[0], {
    index: 1,
    title: '知识密集型企业一线项目精细化管理研究——以轨道交通土建设计项目为例',
    authors: ['刘国平'],
    source: '铁道建筑技术',
    publishedAt: '2026-05-20 14:38',
    year: '2026',
    type: '期刊',
    downloadCount: 19,
    url: 'https://kns.cnki.net/kcms/detail/detail.aspx?dbcode=CJFD&filename=TDJS202605001',
    rawText: '1 知识密集型企业一线项目精细化管理研究——以轨道交通土建设计项目为例 刘国平 铁道建筑技术 2026-05-20 14:38 期刊 19 原版阅读'
  });
});

test('builds CNKI search payload with limit', () => {
  const payload = buildCnkiSearchPayload({
    keyword: '交通设计',
    text: extractText(cnkiFixture),
    rows: extractCnkiRows(cnkiFixture),
    limit: 1,
    sourceUrl: 'https://kns.cnki.net/kns8s/search?kw=交通设计'
  });

  assert.equal(payload.keyword, '交通设计');
  assert.equal(payload.total, 2627);
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].source, '铁道建筑技术');
});

test('builds CNKI advanced search payload', () => {
  const advanced = {
    scope: { field: 'database', label: '学术期刊', code: 'YSTT4HG0' },
    conditions: [
      { field: 'title', label: '篇名', code: 'TI', value: '优化', match: 'exact', operator: 'AND' },
      { field: 'abstract', label: '摘要', code: 'AB', value: '交通', match: 'exact', operator: 'AND' },
      { field: 'abstract', label: '摘要', code: 'AB', value: '调度', match: 'exact', operator: null }
    ]
  };
  const payload = buildCnkiSearchPayload({
    keyword: '优化 交通 调度',
    advanced,
    text: extractText(cnkiFixture),
    rows: extractCnkiRows(cnkiFixture),
    limit: 1,
    sourceUrl: 'https://kns.cnki.net/kns8s/AdvSearch'
  });

  assert.equal(payload.keyword, '优化 交通 调度');
  assert.deepEqual(payload.advanced, advanced);
  assert.equal(payload.items.length, 1);
});

test('parses Wanfang result metadata and rows', () => {
  const text = extractText(wanfangFixture);
  const rows = extractWanfangRows(wanfangFixture);

  assert.deepEqual(parseWanfangSearchMeta(text), {
    total: 382847,
    authorized: true,
    institution: '深圳大学'
  });
  assert.deepEqual(parseWanfangSearchRows(rows)[0], {
    index: 1,
    title: '城市道路交通拥堵溯源分析方法：研究进展与展望',
    authors: ['杨晓光', '杨彦青', '朱际宸'],
    source: '公路交通科技',
    publishedAt: null,
    year: '2026',
    type: '期刊',
    downloadCount: 80,
    abstract: '提出一种面向城市道路交通拥堵的溯源分析方法。',
    url: 'https://d.wanfangdata.com.cn/periodical/gljk202605002',
    rawText: '城市道路交通拥堵溯源分析方法：研究进展与展望 杨晓光; 杨彦青; 朱际宸 公路交通科技 2026年 第05期 提出一种面向城市道路交通拥堵的溯源分析方法。 下载量：80'
  });
});

test('builds Wanfang search payload with limit', () => {
  const payload = buildWanfangSearchPayload({
    keyword: '交通设计',
    text: extractText(wanfangFixture),
    rows: extractWanfangRows(wanfangFixture),
    limit: 1,
    sourceUrl: 'https://s.wanfangdata.com.cn/periodical?q=交通设计'
  });

  assert.equal(payload.keyword, '交通设计');
  assert.equal(payload.total, 382847);
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].source, '公路交通科技');
});

function extractCnkiRows(html) {
  return [...html.matchAll(/<tr>(.*?)<\/tr>/gs)].map((row) => {
    const cells = [...row[1].matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((cell) => strip(cell[1]));
    return {
      cells,
      href: row[1].match(/href="([^"]+)"/)?.[1] ?? null,
      rawText: cells.join(' ')
    };
  });
}

function extractWanfangRows(html) {
  return [...html.matchAll(/<article class="result-item">(.*?)<\/article>/gs)].map((item, index) => ({
    index: index + 1,
    title: strip(item[1].match(/class="title"[^>]*>(.*?)<\/a>/s)?.[1]),
    href: item[1].match(/href="([^"]+)"/)?.[1] ?? null,
    authors: strip(item[1].match(/class="authors"[^>]*>(.*?)<\/div>/s)?.[1]),
    source: strip(item[1].match(/class="source"[^>]*>(.*?)<\/div>/s)?.[1]),
    abstract: strip(item[1].match(/class="abstract"[^>]*>(.*?)<\/div>/s)?.[1]),
    stats: strip(item[1].match(/class="stats"[^>]*>(.*?)<\/div>/s)?.[1])
  }));
}

function extractText(html) {
  return strip(html);
}

function strip(value) {
  return String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
