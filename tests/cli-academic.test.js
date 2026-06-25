import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));

const cnkiMockData = JSON.stringify({
  status: {
    available: true,
    authorized: true,
    institution: '深圳大学',
    requiresHeaded: true,
    sourceUrl: 'https://kns.cnki.net/kns8s/?classid=YSTT4HG0'
  },
  search: {
    keyword: '交通设计',
    total: 2627,
    authorized: true,
    institution: '深圳大学',
    items: [
      {
        index: 1,
        title: '城市道路交通拥堵溯源分析方法：研究进展与展望',
        authors: ['杨晓光', '杨彦青'],
        source: '公路交通科技',
        publishedAt: '2026-05-15',
        year: '2026',
        type: '期刊',
        downloadCount: 80,
        url: 'https://kns.cnki.net/kcms/detail/detail.aspx?dbcode=CJFD&filename=GLJK202605002',
        rawText: '城市道路交通拥堵溯源分析方法：研究进展与展望 杨晓光 杨彦青 公路交通科技 2026-05-15 期刊 80'
      }
    ],
    sourceUrl: 'https://kns.cnki.net/kns8s/search?kw=交通设计'
  },
  item: {
    provider: 'cnki',
    title: '城市道路交通拥堵溯源分析方法：研究进展与展望',
    authors: ['杨晓光', '杨彦青'],
    institutions: ['同济大学交通运输工程学院'],
    source: '公路交通科技',
    publishedAt: null,
    year: '2026',
    type: '期刊',
    abstract: '系统梳理城市道路交通拥堵溯源分析方法。',
    keywords: ['城市道路', '交通拥堵'],
    doi: '10.1234/cnki.glkj.2026.05.002',
    fund: '国家自然科学基金项目',
    classification: 'U491',
    sourceUrl: 'https://kns.cnki.net/kcms/detail/detail.aspx?dbcode=CJFD&filename=GLJK202605002'
  }
});

const wanfangMockData = JSON.stringify({
  status: {
    available: true,
    authorized: true,
    institution: '深圳大学',
    requiresHeaded: true,
    sourceUrl: 'https://c.wanfangdata.com.cn/periodical'
  },
  search: {
    keyword: '交通设计',
    total: 382847,
    authorized: true,
    institution: '深圳大学',
    items: [
      {
        index: 1,
        title: '基于BIM技术的市政交通设计及应用',
        authors: ['李帅', '杨沙'],
        source: '工程技术研究',
        publishedAt: null,
        year: '2026',
        type: '期刊',
        downloadCount: 5,
        abstract: '分析BIM技术在市政交通设计中的应用路径。',
        url: 'https://d.wanfangdata.com.cn/periodical/gcjs202604001',
        rawText: '基于BIM技术的市政交通设计及应用 李帅 杨沙 工程技术研究 2026 下载量 5'
      }
    ],
    sourceUrl: 'https://s.wanfangdata.com.cn/periodical?q=交通设计'
  },
  item: {
    provider: 'wanfang',
    title: '基于BIM技术的市政交通设计及应用',
    authors: ['李帅', '杨沙'],
    institutions: ['深圳大学土木与交通工程学院'],
    source: '工程技术研究',
    publishedAt: null,
    year: '2026',
    type: '期刊',
    abstract: '分析BIM技术在市政交通设计中的应用路径。',
    keywords: ['BIM', '市政交通'],
    doi: '10.5678/wanfang.gcjs.2026.04.001',
    fund: '广东省教育厅项目',
    classification: 'U412',
    sourceUrl: 'https://d.wanfangdata.com.cn/periodical/gcjs202604001'
  }
});

test('cnki status reports headed metadata-search readiness', () => {
  const result = runAcademic(['cnki', 'status', '--headed', '--json'], {
    SZU_MOCK_CNKI_JSON: cnkiMockData
  });

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'cnki status');
  assert.equal(body.data.authorized, true);
  assert.equal(body.data.requiresHeaded, true);
});

test('cnki search returns normalized metadata results', () => {
  const result = runAcademic(['cnki', 'search', '交通设计', '--headed', '--limit', '1', '--json'], {
    SZU_MOCK_CNKI_JSON: cnkiMockData
  });

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'cnki search');
  assert.equal(body.data.keyword, '交通设计');
  assert.equal(body.data.items[0].source, '公路交通科技');
});

test('cnki search can include citation exports', () => {
  const result = runAcademic(['cnki', 'search', '交通设计', '--headed', '--format', 'gbt7714', '--limit', '1', '--json'], {
    SZU_MOCK_CNKI_JSON: cnkiMockData
  });

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.deepEqual(body.data.exports, {
    format: 'gbt7714',
    items: [
      '杨晓光, 杨彦青. 城市道路交通拥堵溯源分析方法：研究进展与展望[J]. 公路交通科技, 2026.'
    ]
  });
});

test('cnki search supports advanced title and abstract fields', () => {
  const result = runAcademic([
    'cnki',
    'search',
    '--title',
    '优化',
    '--abstract',
    '交通',
    '--abstract',
    '调度',
    '--headed',
    '--limit',
    '1',
    '--json'
  ], {
    SZU_MOCK_CNKI_JSON: cnkiMockData
  });

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.data.keyword, '优化 交通 调度');
  assert.deepEqual(body.data.advanced, {
    scope: { field: 'database', label: '学术期刊', code: 'YSTT4HG0' },
    conditions: [
      { field: 'title', label: '篇名', code: 'TI', value: '优化', match: 'exact', operator: 'AND' },
      { field: 'abstract', label: '摘要', code: 'AB', value: '交通', match: 'exact', operator: 'AND' },
      { field: 'abstract', label: '摘要', code: 'AB', value: '调度', match: 'exact', operator: null }
    ]
  });
});

test('cnki item returns detail metadata', () => {
  const result = runAcademic([
    'cnki',
    'item',
    'https://kns.cnki.net/kcms/detail/detail.aspx?dbcode=CJFD&filename=GLJK202605002',
    '--headed',
    '--json'
  ], {
    SZU_MOCK_CNKI_JSON: cnkiMockData
  });

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'cnki item');
  assert.equal(body.data.title, '城市道路交通拥堵溯源分析方法：研究进展与展望');
  assert.equal(body.data.doi, '10.1234/cnki.glkj.2026.05.002');
});

test('wanfang status reports headed metadata-search readiness', () => {
  const result = runAcademic(['wanfang', 'status', '--headed', '--json'], {
    SZU_MOCK_WANFANG_JSON: wanfangMockData
  });

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'wanfang status');
  assert.equal(body.data.authorized, true);
});

test('wanfang search returns normalized metadata results', () => {
  const result = runAcademic(['wanfang', 'search', '交通设计', '--headed', '--limit', '1', '--json'], {
    SZU_MOCK_WANFANG_JSON: wanfangMockData
  });

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'wanfang search');
  assert.equal(body.data.keyword, '交通设计');
  assert.equal(body.data.items[0].title, '基于BIM技术的市政交通设计及应用');
});

test('wanfang search can include citation exports', () => {
  const result = runAcademic(['wanfang', 'search', '交通设计', '--headed', '--format', 'markdown', '--limit', '1', '--json'], {
    SZU_MOCK_WANFANG_JSON: wanfangMockData
  });

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.deepEqual(body.data.exports, {
    format: 'markdown',
    items: [
      '- 李帅, 杨沙. 基于BIM技术的市政交通设计及应用[J]. 工程技术研究, 2026. https://d.wanfangdata.com.cn/periodical/gcjs202604001'
    ]
  });
});

test('wanfang search supports advanced title keyword and abstract fields', () => {
  const result = runAcademic([
    'wanfang',
    'search',
    '--title',
    '优化',
    '--keyword',
    '交通',
    '--abstract',
    '调度',
    '--headed',
    '--limit',
    '1',
    '--json'
  ], {
    SZU_MOCK_WANFANG_JSON: wanfangMockData
  });

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.data.keyword, '优化 交通 调度');
  assert.deepEqual(body.data.advanced, {
    scope: { field: 'database', label: '学术期刊', code: 'periodical' },
    conditions: [
      { field: 'title', label: '题名', code: 'title', value: '优化', match: 'fuzzy', operator: 'AND' },
      { field: 'keyword', label: '关键词', code: 'keyword', value: '交通', match: 'fuzzy', operator: 'AND' },
      { field: 'abstract', label: '摘要', code: 'abstract', value: '调度', match: 'fuzzy', operator: null }
    ]
  });
});

test('wanfang item returns detail metadata', () => {
  const result = runAcademic([
    'wanfang',
    'item',
    'https://d.wanfangdata.com.cn/periodical/gcjs202604001',
    '--headed',
    '--json'
  ], {
    SZU_MOCK_WANFANG_JSON: wanfangMockData
  });

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'wanfang item');
  assert.equal(body.data.title, '基于BIM技术的市政交通设计及应用');
  assert.equal(body.data.doi, '10.5678/wanfang.gcjs.2026.04.001');
});

test('academic item requires a URL', () => {
  const result = runAcademic(['cnki', 'item', '--headed', '--json'], {
    SZU_MOCK_CNKI_JSON: cnkiMockData
  });

  assert.equal(result.status, 1);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
});

test('academic search requires a keyword', () => {
  const result = runAcademic(['cnki', 'search', '--headed', '--json'], {
    SZU_MOCK_CNKI_JSON: cnkiMockData
  });

  assert.equal(result.status, 1);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
});

test('academic commands require headed mode outside mock backend', () => {
  const result = runAcademic(['wanfang', 'status', '--json'], {
    SZU_BROWSER_BACKEND: 'real'
  });

  assert.equal(result.status, 2);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'HEADED_REQUIRED');
});

function runAcademic(args, env = {}) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      SZU_BROWSER_BACKEND: 'mock',
      ...env
    }
  });
  rmSync(home, { recursive: true, force: true });
  return result;
}
