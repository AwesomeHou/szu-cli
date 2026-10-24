import { findLihuFloor, findLihuRoom, normalizeLihuBuildings, parseLihuUsageSnapshot } from './electricity-lihu-parser.js';

export const LIHU_ELECTRICITY_URL = 'http://172.25.100.105:8010/';

export async function collectLihuBuildings(page) {
  return [{
    name: '丽湖二期',
    aliases: ['丽湖校区', '西丽校区'],
    client: null,
    buildings: normalizeLihuBuildings(await selectOptions(page, '#drlouming'))
  }];
}

export async function queryLihuElectricity(page, options) {
  await postback(page, () => page.selectOption('#drlouming', options.buildingId));
  const floor = findLihuFloor(await selectOptions(page, '#drceng'), options.room);
  await postback(page, () => page.selectOption('#drceng', floor.value));
  const room = findLihuRoom(await selectOptions(page, '#drfangjian'), options.room);
  await page.selectOption('#drfangjian', room.value);
  await page.check('#usedR');
  await postback(page, () => page.locator('#ImageButton1').click({ noWaitAfter: true }));
  await page.fill('#txtstart', options.from);
  await page.fill('#txtend', options.to);
  await postback(page, () => page.locator('#btnser').click({ noWaitAfter: true }));

  const records = [];
  let previousPage = 0;
  let remainingKwh;
  while (true) {
    const snapshot = parseLihuUsageSnapshot({
      from: options.from,
      to: options.to,
      text: await page.locator('body').innerText(),
      rows: await page.locator('table tr').evaluateAll(rows => rows.map(row => [...row.cells].map(cell => cell.innerText.trim())))
    });
    if (snapshot.page !== previousPage + 1) {
      const error = new Error('Unexpected Lihu phase II electricity page number.');
      error.code = 'PAGE_CHANGED';
      throw error;
    }
    remainingKwh = snapshot.remainingKwh;
    records.push(...snapshot.records);
    if (snapshot.page >= snapshot.totalPages) {
      break;
    }
    const next = page.getByRole('link', { name: '下一页', exact: true });
    const href = await next.getAttribute('href');
    const url = new URL(href ?? '', page.url());
    if (url.origin !== new URL(page.url()).origin || url.pathname !== '/usedRecord.aspx') {
      const error = new Error('Unexpected Lihu phase II electricity next-page link.');
      error.code = 'PAGE_CHANGED';
      throw error;
    }
    previousPage = snapshot.page;
    await postback(page, () => next.click({ noWaitAfter: true }));
  }
  return {
    remainingKwh,
    records: records.map((record, index) => ({ ...record, index: index + 1 }))
  };
}

async function selectOptions(page, selector) {
  return page.locator(selector).evaluate(select => [...select.options].map(option => ({
    value: option.value,
    text: option.textContent.trim()
  })));
}

async function postback(page, action) {
  let response;
  try {
    [response] = await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      action()
    ]);
  } catch (cause) {
    if (cause.name !== 'TimeoutError') {
      throw cause;
    }
    const error = new Error('The Lihu phase II electricity service timed out.');
    error.code = 'NETWORK_REQUIRED';
    error.cause = cause;
    throw error;
  }
  if (response?.status() === 429) {
    const error = new Error('The Lihu phase II electricity service rate-limited the request.');
    error.code = 'RATE_LIMITED';
    throw error;
  }
  if (!response || response.status() >= 400) {
    const error = new Error('The Lihu phase II electricity service did not complete the query.');
    error.code = 'NETWORK_REQUIRED';
    throw error;
  }
}
