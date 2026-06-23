import { getLaunchOptions } from './browser-options.js';
import {
  buildElectricityQueryPayload,
  normalizeCampusOptions,
  parseElectricityTableRows
} from './electricity-parser.js';

const ELECTRICITY_ENTRY_URL = 'http://192.168.84.3:9090/cgcSims/login.do?task=station&client=192.168.84.110';

export async function getElectricityStatus(options = {}) {
  const campuses = await getElectricityBuildings(options);
  return {
    available: true,
    campusCount: campuses.campuses.length,
    sourceUrl: campuses.sourceUrl
  };
}

export async function getElectricityBuildings(options = {}) {
  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    return mockBuildings();
  }

  const context = await launchContext(options);
  try {
    const page = await context.newPage();
    await gotoElectricity(page, options.url ?? ELECTRICITY_ENTRY_URL);
    const campuses = await collectCampusesAndBuildings(page);
    return {
      campuses,
      sourceUrl: page.url()
    };
  } finally {
    await closeContext(context);
  }
}

export async function queryElectricity(options = {}) {
  requireQueryOptions(options);

  if (process.env.SZU_BROWSER_BACKEND === 'mock') {
    const data = readMockData();
    return buildElectricityQueryPayload({
      campus: options.campus,
      building: options.building,
      room: options.room,
      from: options.from,
      to: options.to,
      records: data.query?.records ?? [],
      sourceUrl: options.url ?? ELECTRICITY_ENTRY_URL
    });
  }

  const context = await launchContext(options);
  try {
    const page = await context.newPage();
    await gotoElectricity(page, options.url ?? ELECTRICITY_ENTRY_URL);
    await selectCampus(page, options.campus);
    await selectBuilding(page, options.building);
    await page.fill('input[name="roomName"]', options.room);
    await Promise.all([
      page.waitForLoadState('domcontentloaded').catch(() => {}),
      page.click('input[name="select"]')
    ]);
    await page.waitForTimeout(500);

    await page.fill('input[name="beginTime"]', options.from);
    await page.fill('input[name="endTime"]', options.to);
    await page.selectOption('select[name="type"]', '2');
    await Promise.all([
      page.waitForLoadState('domcontentloaded').catch(() => {}),
      page.click('input[type="submit"]')
    ]);
    await page.waitForTimeout(500);

    const rows = await tableRows(page, '#oTable');
    const records = parseElectricityTableRows(rows, 'usage');
    return buildElectricityQueryPayload({
      campus: options.campus,
      building: options.building,
      room: options.room,
      from: options.from,
      to: options.to,
      records,
      sourceUrl: page.url()
    });
  } finally {
    await closeContext(context);
  }
}

async function collectCampusesAndBuildings(page) {
  const campusOptions = await getSelectOptions(page, 'select[name="client"]');
  const campuses = [];

  for (const campus of campusOptions) {
    if (!campus.value || !campus.text) {
      continue;
    }
    await page.selectOption('select[name="client"]', campus.value);
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(250);
    campuses.push({
      ...campus,
      buildings: await getSelectOptions(page, 'select[name="buildingId"]')
    });
  }

  return normalizeCampusOptions(campuses);
}

async function selectCampus(page, campusName) {
  await page.selectOption('select[name="client"]', { label: campusName });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(250);
}

async function selectBuilding(page, buildingName) {
  await page.selectOption('select[name="buildingId"]', { label: buildingName });
}

async function getSelectOptions(page, selector) {
  return page.locator(selector).evaluate((select) => (
    [...select.options].map((option) => ({
      value: option.value,
      text: option.textContent.trim()
    }))
  ));
}

async function tableRows(page, selector) {
  return page.locator(selector).evaluate((table) => (
    [...table.rows].map((row) => [...row.cells].map((cell) => cell.innerText.trim()))
  ));
}

async function gotoElectricity(page, url = ELECTRICITY_ENTRY_URL) {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (!response || response.status() >= 500) {
      throw new Error(`HTTP ${response?.status() ?? 'unknown'}`);
    }
  } catch (cause) {
    const error = new Error('SZU electricity intranet system is not reachable.');
    error.code = 'NETWORK_REQUIRED';
    error.hint = 'Connect to the campus network first. WebVPN for this service is not implemented yet.';
    error.cause = cause;
    throw error;
  }
}

function requireQueryOptions(options) {
  for (const key of ['campus', 'building', 'room']) {
    if (!options[key]) {
      throw new Error(`electricity query requires --${key}.`);
    }
  }
}

async function launchContext(options) {
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch(getLaunchOptions({ headless: options.headless ?? true }));
  const context = await browser.newContext();
  context.__szuBrowser = browser;
  return context;
}

async function closeContext(context) {
  const browser = context.__szuBrowser;
  await context.close();
  await browser?.close();
}

async function importPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const error = new Error('Playwright is not installed. Run `npm install`.');
    error.code = 'BACKEND_UNAVAILABLE';
    throw error;
  }
}

function mockBuildings() {
  if (process.env.SZU_MOCK_ELECTRICITY_NETWORK === 'down') {
    const error = new Error('SZU electricity intranet system is not reachable.');
    error.code = 'NETWORK_REQUIRED';
    error.hint = 'Connect to the campus network first. WebVPN for this service is not implemented yet.';
    throw error;
  }

  const data = readMockData();
  return {
    campuses: data.campuses ?? [],
    sourceUrl: ELECTRICITY_ENTRY_URL
  };
}

function readMockData() {
  return JSON.parse(process.env.SZU_MOCK_ELECTRICITY_JSON ?? '{}');
}
