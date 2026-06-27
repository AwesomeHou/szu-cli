# Academic Completion CLI Design

## Scope

Add a read-only `completion` domain for the eHall Academic Completion Query application.

The MVP answers:

- How many credits the training plan requires, has completed, and still lacks.
- How each curriculum module is progressing.
- Which courses belong to one selected module, including completed, selected, and not-taken courses.

The CLI does not claim that a not-taken curriculum course is offered this term or that the student is currently eligible to enroll.

## Commands

```text
szu-cli completion status --json [--timeout <seconds>] [--url <entryUrl>] [--headed]
szu-cli completion summary --json [--timeout <seconds>] [--url <entryUrl>] [--headed]
szu-cli completion modules --json [--timeout <seconds>] [--url <entryUrl>] [--headed]
szu-cli completion courses --module <moduleCode> --json [--timeout <seconds>] [--url <entryUrl>] [--headed]
```

The default timeout is 180 seconds. `--timeout` must be a positive integer.

## Entry And Calculation Flow

The browser:

1. Opens `https://ehall.szu.edu.cn/new/index.html`.
2. Resolves the Academic Completion application through the shared eHall entry resolver.
3. Opens `/jwapp/sys/xywccx/*default/index.do#/xywccx`.
4. Captures the authenticated plan context from `grpyfacx.do` or `cxscfa.do`.
5. Watches `byscjd.do` progress responses.
6. Treats calculation as complete only when `ZS > 0` and `YWCS >= ZS`.
7. Re-requests final summary and detail APIs after completion.

The UI progress dialog is not a completion signal because it can remain visible after the server reports completion.

If calculation does not finish before the configured timeout, return:

```json
{
  "code": "CALCULATION_TIMEOUT",
  "details": {
    "completed": 0,
    "total": 1,
    "percent": 0,
    "timeoutSeconds": 180
  }
}
```

## APIs

Use only read-only application APIs:

- `cxscfa.do`: final plan-level completion summary.
- `cxscfakz.do`: curriculum module completion rows.
- `cxscfakzkc.do`: courses belonging to one selected module.
- `byscjd.do`: calculation progress emitted by the page.

The browser page itself starts the calculation. The CLI does not call state-changing submission, review, or graduation-audit endpoints.

## Output

### Summary

```json
{
  "plan": {
    "planCode": "plan-code",
    "planName": "2023级智慧交通主修培养方案",
    "requiredCredits": 150,
    "completedCredits": 90,
    "selectedCredits": 100,
    "actualCompletedCredits": 90,
    "outsidePlanCredits": 2,
    "remainingCredits": 60
  },
  "calculation": {
    "state": "completed",
    "completed": 1,
    "total": 1,
    "percent": 100
  },
  "sourceUrl": "https://ehall.szu.edu.cn/jwapp/sys/xywccx/*default/index.do#/xywccx"
}
```

### Modules

Each module item contains:

```json
{
  "moduleCode": "module-code",
  "parentModuleCode": null,
  "moduleName": "公共基础课程",
  "moduleTypeCode": "01",
  "courseCategoryCode": "01",
  "requiredCredits": 20,
  "completedCredits": 16,
  "selectedCredits": 18,
  "remainingCredits": 4,
  "requiredCourseCount": 10,
  "completedCourseCount": 8,
  "passed": false
}
```

The payload also includes the plan summary and calculation state.

### Module Courses

`completion courses --module <moduleCode>` returns one module summary and all curriculum courses under that module:

```json
{
  "module": {
    "moduleCode": "module-code",
    "moduleName": "公共基础课程",
    "requiredCredits": 20,
    "completedCredits": 16,
    "remainingCredits": 4
  },
  "items": [
    {
      "courseCode": "course-code",
      "courseName": "课程名称",
      "credit": 2,
      "category": "公共选修课",
      "nature": "选修",
      "examType": "考试",
      "status": "completed",
      "passed": true,
      "selected": false,
      "score": "A",
      "termId": "2025-2026-1",
      "termName": "2025-2026学年第一学期",
      "substituteCourse": null,
      "sameCourseCount": 1,
      "note": null
    }
  ],
  "candidateMeaning": "not-taken curriculum course; current offering and enrollment eligibility are not guaranteed",
  "sourceUrl": "https://ehall.szu.edu.cn/jwapp/sys/xywccx/*default/index.do#/xywccx"
}
```

Course `status` is:

- `completed`: the application marks the course as passed.
- `selected`: selected but not yet passed.
- `not-taken`: not marked as passed or selected.
- `unknown`: unrecognized school status.

## Authentication And Errors

- CAS page: `LOGIN_REQUIRED`.
- Application `403`: `PERMISSION_DENIED`.
- Calculation timeout: `CALCULATION_TIMEOUT`.
- Unknown module code: `MODULE_NOT_FOUND`.
- Missing expected API data: `PAGE_CHANGED`.

All errors use the existing JSON envelope. `error.details` is included when available.

## Privacy

The application requires student number and plan context in authenticated requests. These values remain inside the browser session.

Output and fixtures omit:

- Student name and student number.
- Class and internal record identifiers.
- Dynamic `gid_`, `t_s`, and application context parameters.

Course score is included because the user requested detailed course information and the existing grade domain already exposes the same academic data.

## Files

Add:

- `src/modules/completion.js`
- `src/modules/completion-parser.js`
- `tests/completion-parser.test.js`
- `tests/cli-completion.test.js`
- `tests/fixtures/completion-api.json`

Update CLI routing, error mapping, public documentation, roadmap, source index, and bundled `szu-campus` skill.

## Verification

- Parser tests for summary, modules, course states, remaining credits, and identity exclusion.
- CLI tests for all four actions, module validation, timeout details, login, permission, and page-change errors.
- Full `npm test`.
- `npm run docs:check`.
- Live eHall smoke tests with normalized output and no identity/context leakage.
