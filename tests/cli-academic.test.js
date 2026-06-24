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
