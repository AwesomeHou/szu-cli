# Growth Record And Ideology Credit CLI Design

## Scope

Add two read-only eHall domains:

- `growth`: query cumulative, academic-year, and term-level GPA and ranking data from the Growth Record application.
- `ideology`: query the current student's ideological and political education / social-practice credit summary.

The implementation reuses the existing Playwright persistent profile. It does not expose student identity fields and does not perform any state-changing action.

## Commands

```text
szu-cli growth status --json [--url <entryUrl>] [--headed]
szu-cli growth summary --json [--url <entryUrl>] [--headed]
szu-cli growth list --json [--term <termId>] [--year <academicYear>] [--url <entryUrl>] [--headed]

szu-cli ideology status --json [--url <entryUrl>] [--headed]
szu-cli ideology summary --json [--url <entryUrl>] [--headed]
```

`--term` and `--year` are mutually exclusive. Without either filter, `growth list` returns all available periods in chronological order.

## Entry Resolution

Unlike several existing eHall applications, these two applications return `403` when opened without the eHall application context. The browser layer resolves an entry URL in this order:

1. Use an explicit `--url` override when provided.
2. Initialize `https://ehall.szu.edu.cn/new/index.html` and inspect eHall application-directory responses for a matching application name or path.
3. Build the known eHall application entry with the application-specific context and a fresh `t_s` timestamp.

The resolver validates that the final URL belongs to `ehall.szu.edu.cn` and matches the expected application path. It never persists an entry URL, `gid_`, cookies, or response data. If all automatic candidates return `403`, the command returns `PERMISSION_DENIED` with a hint to open the application from eHall once or supply `--url`.

Default application paths:

```text
/jwapp/sys/czjl/*default/index.do#/czjl
/jwapp/sys/szshsjgl/*default/index.do#/cxtj
```

## Growth Data Flow

The browser opens the resolved Growth Record entry and reads these application APIs:

- `cxyxkxnxq.do`: available academic terms.
- `cxxscjtj.do`: GPA and credit summary for a selected period.
- `cxxsjdpm.do`: ranking records for the selected period and ranking type.

The application also exposes student-profile, warning, reward, and punishment APIs. They are outside this MVP and must not be requested by the CLI.

The adapter may obtain the current student identifier from an authenticated response solely to make the required API calls. It must keep that value in memory and remove it before normalization or output.

### Growth Summary Output

```json
{
  "cumulative": {
    "gpa": 3.66,
    "majorRank": 12,
    "rankedStudentCount": 60,
    "rankPercent": 20,
    "earnedCredits": 120,
    "selectedCredits": 124
  },
  "latestTerm": {
    "id": "2025-2026-2",
    "name": "2025-2026学年第二学期"
  },
  "sourceUrl": "https://ehall.szu.edu.cn/..."
}
```

Unavailable values are `null`; they are never inferred.

### Growth List Output

Each item represents either a term or an academic year:

```json
{
  "periodType": "term",
  "periodId": "2025-2026-2",
  "periodName": "2025-2026学年第二学期",
  "gpa": 3.66,
  "majorRank": 12,
  "rankedStudentCount": 60,
  "rankPercent": 20,
  "rankBand": null,
  "earnedCredits": 24,
  "selectedCredits": 26
}
```

`periodType` is `term` or `academic-year`. `growth list --term` returns one term item. `growth list --year` returns one academic-year item.

## Ideology Data Flow

The browser opens the resolved Ideology and Social Practice entry and reads:

- `modules/cxtj/cxxshdtjlb.do`: the authenticated student's credit summary.

The page makes an initial metadata request before the data request. The adapter calls the data endpoint with the same read-only query shape and normalizes only the summary fields. Activity submission, editing, review, and attachment endpoints are out of scope.

### Ideology Summary Output

```json
{
  "earnedCredits": 2,
  "qualified": true,
  "registered": true,
  "activeStudent": true,
  "grade": "2023",
  "major": "交通工程",
  "department": "交通运输学院",
  "sourceUrl": "https://ehall.szu.edu.cn/..."
}
```

School-specific display fields are used where available. Codes are not exposed unless no display value exists. The output omits student name, student number, class code, and internal record identifiers.

## Authentication And Errors

Both domains use existing eHall authentication conventions:

- CAS page: `LOGIN_REQUIRED`
- eHall or application `403`: `PERMISSION_DENIED`
- Missing expected API data or changed schema: `PAGE_CHANGED`
- No ideology summary row: successful response with nullable summary values and `available: false`

Every result uses the existing JSON envelope and includes:

```json
{
  "meta": {
    "command": "growth list",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

## Modules

Add:

- `src/modules/ehall-entry.js`: shared eHall application-entry resolution and URL validation.
- `src/modules/growth.js`: browser and API orchestration.
- `src/modules/growth-parser.js`: pure request builders and output normalization.
- `src/modules/ideology.js`: browser and API orchestration.
- `src/modules/ideology-parser.js`: pure request builders and output normalization.

Update `src/main.js`, public documentation, and the bundled `szu-campus` skill.

The shared resolver is intentionally narrow. Existing eHall modules do not migrate to it in this change.

## Tests

Parser tests cover:

- Growth term discovery and period normalization.
- Cumulative, term, and academic-year GPA/ranking normalization.
- Growth filter request shapes.
- Ideology credit/status normalization.
- Identity fields do not appear in serialized output.
- Empty ideology rows return `available: false`.

CLI tests cover:

- `growth status`, `summary`, and `list`.
- `growth list --term` and `--year`.
- Mutual exclusion of `--term` and `--year`.
- `ideology status` and `summary`.
- `LOGIN_REQUIRED`, `PERMISSION_DENIED`, and `PAGE_CHANGED`.
- Unknown options fail.

Verification order:

1. Targeted parser and CLI tests.
2. `npm test`.
3. `npm run docs:check`.
4. Live eHall smoke tests using the persistent profile.

## Safety Boundaries

- Read-only requests only.
- No password handling.
- No CAPTCHA, authorization, rate-limit, or access-control bypass.
- No identity fields in fixtures, logs, or output.
- Live verification prints only normalized, redacted summaries.
- Browser profiles, cookies, traces, screenshots, and raw API responses remain outside Git.
