# Growth Record And Ideology Credit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add read-only `growth` GPA/ranking commands and `ideology` credit-summary commands that reuse the persistent eHall login without requiring users to provide full application URLs.

**Architecture:** Pure parser modules normalize redacted eHall API fixtures. Browser modules initialize eHall, resolve application entry URLs, capture the authenticated student's identifier only in memory, call the minimum read-only APIs, and return normalized payloads through the existing JSON envelope.

**Tech Stack:** Node.js ESM, Playwright persistent contexts, Node test runner, Markdown CLI contract.

---

### Task 1: Shared eHall Application Entry Resolver

**Files:**
- Create: `src/modules/ehall-entry.js`
- Create: `tests/ehall-entry.test.js`

- [ ] **Step 1: Write failing resolver tests**

Test `validateEhallEntryUrl`, `findPortalAppEntry`, and `buildKnownEhallEntry` with:

```js
assert.equal(
  validateEhallEntryUrl(
    'https://ehall.szu.edu.cn/jwapp/sys/czjl/*default/index.do#/czjl',
    '/jwapp/sys/czjl/'
  ).hostname,
  'ehall.szu.edu.cn'
);
assert.equal(
  findPortalAppEntry(portalFixture, { names: ['成长记录'], appPath: '/jwapp/sys/czjl/' }),
  'https://ehall.szu.edu.cn/jwapp/sys/czjl/*default/index.do?...'
);
assert.throws(
  () => validateEhallEntryUrl('https://example.com/', '/jwapp/sys/czjl/'),
  /Unexpected eHall application URL/
);
```

- [ ] **Step 2: Run the resolver test and verify RED**

Run:

```powershell
node --test tests/ehall-entry.test.js
```

Expected: FAIL because `src/modules/ehall-entry.js` does not exist.

- [ ] **Step 3: Implement the resolver**

Export:

```js
export function validateEhallEntryUrl(value, expectedPath) {}
export function findPortalAppEntry(payload, options) {}
export function buildKnownEhallEntry(options) {}
export async function resolveEhallEntry(page, options) {}
```

`resolveEhallEntry` must prefer `options.url`, inspect portal payloads supplied by the page, then build the known app entry with `Date.now()`. Validation must require HTTPS, host `ehall.szu.edu.cn`, and the expected application path.

- [ ] **Step 4: Run the resolver test and verify GREEN**

Run:

```powershell
node --test tests/ehall-entry.test.js
```

Expected: all resolver tests pass.

### Task 2: Growth Parser And Fixtures

**Files:**
- Create: `src/modules/growth-parser.js`
- Create: `tests/growth-parser.test.js`
- Create: `tests/fixtures/growth-api.json`

- [ ] **Step 1: Add a fully redacted growth fixture**

Include `cxyxkxnxq`, cumulative `cxxscjtj`, period `cxxscjtj` responses, and three `cxxsjdpm` ranking responses. Use synthetic values and identity fields such as:

```json
{
  "XH": "2023000000",
  "XM": "测试用户",
  "XNXQDM": "2025-2026-2",
  "XNXQMC": "2025-2026学年第二学期",
  "GPA": "3.75",
  "PM": "8",
  "CYPMRS": "80",
  "PMBFB": "10"
}
```

- [ ] **Step 2: Write failing parser tests**

Test:

```js
assert.deepEqual(parseGrowthTerms(fixture.cxyxkxnxq)[0], {
  id: '2025-2026-1',
  name: '2025-2026学年第一学期',
  academicYear: '2025-2026',
  semester: '1'
});
assert.equal(buildGrowthSummaryPayload(fixture, { sourceUrl: 'mock' }).cumulative.gpa, 3.75);
assert.equal(buildGrowthListPayload(fixture, { sourceUrl: 'mock' }).items[0].periodType, 'term');
assert.equal(JSON.stringify(buildGrowthListPayload(fixture)).includes('2023000000'), false);
```

Also assert request builders emit `XNXQDM`, `TJLX`, `TJXNXQDM`, `TJLXDM`, pagination, and ordering fields without leaking the identifier into normalized output.

- [ ] **Step 3: Run parser tests and verify RED**

Run:

```powershell
node --test tests/growth-parser.test.js
```

Expected: FAIL because growth parser exports do not exist.

- [ ] **Step 4: Implement growth normalization**

Export:

```js
export function parseGrowthTerms(response) {}
export function buildGrowthSummaryForm(studentId) {}
export function buildGrowthPeriodForm(studentId, options) {}
export function buildGrowthRankForm(studentId, options) {}
export function buildGrowthSummaryPayload(api, options) {}
export function buildGrowthListPayload(api, options) {}
```

Map only GPA, rank, rank population, rank percent, rank band, earned credits, and selected credits. Convert numeric strings with a finite-number helper and return unavailable values as `null`.

- [ ] **Step 5: Run parser tests and verify GREEN**

Run:

```powershell
node --test tests/growth-parser.test.js
```

Expected: all growth parser tests pass.

### Task 3: Growth Browser Module And CLI

**Files:**
- Create: `src/modules/growth.js`
- Create: `tests/cli-growth.test.js`
- Modify: `src/main.js`

- [ ] **Step 1: Write failing CLI tests**

Use `SZU_BROWSER_BACKEND=mock` and `SZU_MOCK_GROWTH_API_JSON`. Cover:

```js
runGrowth(['growth', 'status', '--json']);
runGrowth(['growth', 'summary', '--json']);
runGrowth(['growth', 'list', '--json']);
runGrowth(['growth', 'list', '--term', '2025-2026-2', '--json']);
runGrowth(['growth', 'list', '--year', '2025-2026', '--json']);
```

Assert `--term` with `--year` fails, CAS returns `LOGIN_REQUIRED`, 403 returns `PERMISSION_DENIED`, missing APIs return `PAGE_CHANGED`, and serialized data has no `XH` or `XM`.

- [ ] **Step 2: Run CLI tests and verify RED**

Run:

```powershell
node --test tests/cli-growth.test.js
```

Expected: FAIL with `UNSUPPORTED_ACTION`.

- [ ] **Step 3: Implement growth orchestration**

Export from `growth.js`:

```js
export async function getGrowthStatus(options = {}) {}
export async function getGrowthSummary(options = {}) {}
export async function getGrowthList(options = {}) {}
```

The live path must:

1. Verify the persistent profile.
2. Open eHall home.
3. Resolve and open the Growth Record entry.
4. Obtain the student identifier from an authenticated app response without logging it.
5. Call only `cxyxkxnxq.do`, `cxxscjtj.do`, and `cxxsjdpm.do`.
6. Normalize and close the context.

- [ ] **Step 4: Add CLI routing and option parsing**

Add:

```js
if (domain === 'growth' && (action === 'status' || action === 'summary' || action === 'list')) {
  // Dispatch and write the existing success/error envelope.
}
```

Parse `--term`, `--year`, `--url`, `--headed`, and `--json`. Throw:

```js
if (options.term && options.year) {
  throw new Error('--term and --year cannot be used together.');
}
```

- [ ] **Step 5: Run growth tests and verify GREEN**

Run:

```powershell
node --test tests/growth-parser.test.js tests/cli-growth.test.js
```

Expected: all growth tests pass.

### Task 4: Ideology Parser, Browser Module, And CLI

**Files:**
- Create: `src/modules/ideology-parser.js`
- Create: `src/modules/ideology.js`
- Create: `tests/ideology-parser.test.js`
- Create: `tests/cli-ideology.test.js`
- Create: `tests/fixtures/ideology-api.json`
- Modify: `src/main.js`

- [ ] **Step 1: Add a redacted ideology fixture and failing parser tests**

Use synthetic `cxxshdtjlb` rows with `HDXF`, `SFJG`, `SFZC`, `SFZX`, `XZNJ_DISPLAY`, `ZYDM_DISPLAY`, and `YXDM_DISPLAY`, plus `XH` and `XM` leak sentinels.

Assert:

```js
assert.deepEqual(buildIdeologySummaryPayload(fixture, { sourceUrl: 'mock' }), {
  available: true,
  earnedCredits: 2,
  qualified: true,
  registered: true,
  activeStudent: true,
  grade: '2023',
  major: '交通工程',
  department: '交通运输学院',
  sourceUrl: 'mock'
});
```

Assert an empty row list returns `available: false` with nullable fields.

- [ ] **Step 2: Run parser tests and verify RED**

Run:

```powershell
node --test tests/ideology-parser.test.js
```

Expected: FAIL because ideology parser exports do not exist.

- [ ] **Step 3: Implement ideology parser**

Export:

```js
export function buildIdeologySummaryForm(studentId) {}
export function buildIdeologySummaryPayload(api, options) {}
```

Normalize display fields and booleans. Never expose `XH`, `XM`, `BJDM`, `WID`, or raw API rows.

- [ ] **Step 4: Write failing ideology CLI tests**

Cover `ideology status`, `ideology summary`, CAS, 403, missing API, empty rows, and unknown options.

- [ ] **Step 5: Run CLI tests and verify RED**

Run:

```powershell
node --test tests/cli-ideology.test.js
```

Expected: FAIL with `UNSUPPORTED_ACTION`.

- [ ] **Step 6: Implement browser orchestration and routing**

Export:

```js
export async function getIdeologyStatus(options = {}) {}
export async function getIdeologySummary(options = {}) {}
```

The live module opens the resolved app, obtains the authenticated identifier in memory, and calls only `modules/cxtj/cxxshdtjlb.do`. Add `ideology` dispatch and `--url`, `--headed`, `--json` parsing in `src/main.js`.

- [ ] **Step 7: Run ideology tests and verify GREEN**

Run:

```powershell
node --test tests/ideology-parser.test.js tests/cli-ideology.test.js
```

Expected: all ideology tests pass.

### Task 5: Documentation, Skill, And End-To-End Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/cli-contract.md`
- Modify: `docs/roadmap.md`
- Modify: `src/README.md`
- Modify: `skills/szu-campus/SKILL.md`

- [ ] **Step 1: Document commands and output contracts**

Add the command examples, normalized JSON fields, identity exclusions, direct-campus limitation, and `--url` debug fallback. State that `growth` is GPA/ranking data and `ideology` is ideological education/social-practice credit data.

- [ ] **Step 2: Run targeted tests**

Run:

```powershell
node --test tests/ehall-entry.test.js tests/growth-parser.test.js tests/cli-growth.test.js tests/ideology-parser.test.js tests/cli-ideology.test.js
```

Expected: all targeted tests pass.

- [ ] **Step 3: Run full verification**

Run:

```powershell
npm test
npm run docs:check
```

Expected: zero failures and all Markdown files pass checks.

- [ ] **Step 4: Run live smoke tests**

Run:

```powershell
szu-cli growth status --json
szu-cli growth summary --json
szu-cli growth list --json
szu-cli ideology status --json
szu-cli ideology summary --json
```

Inspect only normalized output. Confirm no student name or student number appears.

