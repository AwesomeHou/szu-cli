import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));

const mockData = JSON.stringify({
  campuses: [
    {
      name: '深大新斋区',
      client: '192.168.84.87',
      buildings: [
        { name: '红豆斋', id: '18120' }
      ]
    }
  ],
  query: {
    records: [
      {
        index: 1,
        room: '838',
        remainingKwh: 338.88,
        totalUsedKwh: 21424.6,
        totalPurchasedKwh: 21763.49,
        recordedAt: '2026-01-02 23:59:01'
      }
    ]
  }
});

function runElectricity(args, options = {}) {
  const home = mkdtempSync(join(tmpdir(), 'szu-cli-test-'));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SZU_CLI_HOME: home,
      SZU_BROWSER_BACKEND: 'mock',
      SZU_MOCK_ELECTRICITY_JSON: mockData,
      ...options.env
    }
  });
  rmSync(home, { recursive: true, force: true });
  return result;
}

test('electricity status reports intranet readiness', () => {
  const result = runElectricity(['electricity', 'status', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.meta.command, 'electricity status');
  assert.equal(body.data.available, true);
  assert.equal(body.data.campusCount, 1);
});

test('electricity buildings lists campuses and buildings', () => {
  const result = runElectricity(['electricity', 'buildings', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.data.campuses[0].name, '深大新斋区');
  assert.equal(body.data.campuses[0].buildings[0].name, '红豆斋');
});

test('electricity query returns latest remaining kWh', () => {
  const result = runElectricity([
    'electricity',
    'query',
    '--json',
    '--campus',
    '深大新斋区',
    '--building',
    '红豆斋',
    '--room',
    '838',
    '--from',
    '2026-01-01',
    '--to',
    '2026-01-02'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.data.remainingKwh, 338.88);
  assert.equal(body.data.latestRecord.room, '838');
});

test('electricity query can infer campus from a unique building', () => {
  const result = runElectricity([
    'electricity',
    'query',
    '--json',
    '--building',
    '红豆',
    '--room',
    '838'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.campus, '深大新斋区');
  assert.equal(body.data.building, '红豆斋');
  assert.equal(body.data.remainingKwh, 338.88);
});

test('electricity query requires campus building and room', () => {
  const result = runElectricity(['electricity', 'query', '--json']);

  assert.equal(result.status, 1);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'UNKNOWN_ERROR');
});

test('electricity commands return NETWORK_REQUIRED when intranet is unavailable', () => {
  const result = runElectricity(['electricity', 'status', '--json'], {
    env: {
      SZU_MOCK_ELECTRICITY_NETWORK: 'down'
    }
  });

  assert.equal(result.status, 12);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'NETWORK_REQUIRED');
});

test('electricity routes a Lihu phase II building to its source and keeps current balance independent of history', () => {
  for (const balance of [0, -12.5]) {
    const result = runElectricity(['electricity', 'query', '--campus', '西丽校区', '--building', '梧桐树', '--room', '501'], {
      env: {
        SZU_MOCK_ELECTRICITY_JSON: JSON.stringify({
          campuses: [{
            name: '丽湖二期', aliases: ['西丽校区', '丽湖校区'], system: 'lihu-phase2',
            sourceUrl: 'http://172.25.100.105:8010/', buildings: [{ id: 'test-building', name: '梧桐树' }]
          }],
          query: { remainingKwh: balance, records: [] }
        })
      }
    });
    assert.equal(result.status, 0, result.stderr);
    const data = JSON.parse(result.stdout).data;
    assert.equal(data.campus, '丽湖二期');
    assert.equal(data.sourceUrl, 'http://172.25.100.105:8010/');
    assert.equal(data.balanceScope, 'current');
    assert.equal(data.remainingKwh, balance);
    assert.equal(data.totalUsedKwh, null);
    assert.deepEqual(data.records, []);
  }
});

test('electricity reports an unavailable source rather than declaring its missing building unknown', () => {
  const result = runElectricity(['electricity', 'query', '--building', '梧桐树', '--room', '501', '--json'], {
    env: {
      SZU_MOCK_ELECTRICITY_JSON: JSON.stringify({
        campuses: JSON.parse(mockData).campuses,
        complete: false,
        sources: [{ url: 'http://172.25.100.105:8010/', available: false, error: { code: 'NETWORK_REQUIRED' } }]
      })
    }
  });
  assert.equal(result.status, 12);
  assert.equal(JSON.parse(result.stdout).error.code, 'NETWORK_REQUIRED');
});
