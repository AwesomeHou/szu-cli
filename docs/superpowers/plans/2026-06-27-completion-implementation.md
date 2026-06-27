# Academic Completion CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement module-based academic completion queries with reliable server-calculation waiting and structured course details.

**Architecture:** A pure parser normalizes plan, module, course, and progress fixtures. A Playwright module resolves the eHall entry, observes page-triggered calculation progress, re-fetches final read-only APIs, and exposes four commands through the existing JSON envelope.

**Tech Stack:** Node.js ESM, Playwright persistent contexts, Node test runner, Markdown documentation.

---

### Task 1: Completion Parser

**Files:**
- Create: `src/modules/completion-parser.js`
- Create: `tests/completion-parser.test.js`
- Create: `tests/fixtures/completion-api.json`

- [ ] **Step 1: Add a redacted fixture**

Include synthetic `cxscfa`, `cxscfakz`, `cxscfakzkc`, and progress rows. Add fake `XH`, `XM`, `WID`, and `BJDM` fields as leak sentinels.

- [ ] **Step 2: Write failing parser tests**

Test these exports:

```js
parseCompletionProgress(response)
buildCompletionSummaryPayload(api, options)
buildCompletionModulesPayload(api, options)
buildCompletionCoursesPayload(api, options)
buildCompletionContextForm(row)
buildCompletionCourseForm(context, module)
```

Assertions must cover remaining-credit calculation, module pass state, `completed/selected/not-taken` course states, module selection, course details, and absence of identity fields.

- [ ] **Step 3: Verify RED**

```powershell
node --test tests/completion-parser.test.js
```

Expected: FAIL because `completion-parser.js` does not exist.

- [ ] **Step 4: Implement minimal parser**

Normalize only documented fields. Remaining credits are:

```js
Math.max(0, requiredCredits - completedCredits)
```

Course status is:

```js
if (SFTG === '1') return 'completed';
if (SFXK === '1') return 'selected';
if (SFTG === '2') return 'not-taken';
return 'unknown';
```

- [ ] **Step 5: Verify GREEN**

```powershell
node --test tests/completion-parser.test.js
```

Expected: all parser tests pass.

### Task 2: Completion CLI Contract

**Files:**
- Create: `tests/cli-completion.test.js`
- Modify: `src/main.js`

- [ ] **Step 1: Write failing CLI tests**

Cover:

```text
completion status --json
completion summary --json
completion modules --json
completion courses --module module-01 --json
completion courses without --module
completion courses with unknown module
completion summary --timeout 30
CAS, 403, PAGE_CHANGED, CALCULATION_TIMEOUT
unknown option
```

Mock responses use `SZU_MOCK_COMPLETION_API_JSON` and optional `SZU_MOCK_COMPLETION_TIMEOUT=1`.

- [ ] **Step 2: Verify RED**

```powershell
node --test tests/cli-completion.test.js
```

Expected: FAIL with `UNSUPPORTED_ACTION`.

- [ ] **Step 3: Add route and option parser**

Import:

```js
getCompletionStatus
getCompletionSummary
getCompletionModules
getCompletionCourses
```

Parse `--module`, `--timeout`, `--url`, `--headed`, and `--json`. Default timeout is 180 seconds. Require `--module` only for `courses`.

- [ ] **Step 4: Extend structured errors**

Add exit codes:

```js
CALCULATION_TIMEOUT: 24
MODULE_NOT_FOUND: 25
```

Include `error.details` in the JSON error body when present.

### Task 3: Browser And API Orchestration

**Files:**
- Create: `src/modules/completion.js`
- Modify: `tests/cli-completion.test.js`

- [ ] **Step 1: Implement mock path to pass CLI tests**

Use the fixture payload, normalize the selected action, and raise mock timeout/module errors.

- [ ] **Step 2: Verify CLI mock tests GREEN**

```powershell
node --test tests/completion-parser.test.js tests/cli-completion.test.js
```

- [ ] **Step 3: Implement live page flow**

The live module must:

1. Check the persistent profile.
2. Open eHall home.
3. Resolve `/jwapp/sys/xywccx/`.
4. Capture the latest `cxscfa` row and `byscjd` progress.
5. Wait until `ZS > 0 && YWCS >= ZS`.
6. Throw `CALCULATION_TIMEOUT` with progress details after `timeout * 1000`.
7. Re-fetch `cxscfa.do` and `cxscfakz.do`.
8. For `courses`, find the requested module and fetch `cxscfakzkc.do` with `pageSize=999`.
9. Sanitize `sourceUrl`.

- [ ] **Step 4: Validate required API shapes**

Missing final summary or module data returns `PAGE_CHANGED`. Missing module returns `MODULE_NOT_FOUND` with a hint to run `completion modules --json`.

### Task 4: Documentation And Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/cli-contract.md`
- Modify: `docs/roadmap.md`
- Modify: `src/README.md`
- Modify: `skills/szu-campus/SKILL.md`

- [ ] **Step 1: Document all four commands**

Explain module-based course output, 180-second calculation timeout, status meanings, and that `not-taken` does not guarantee current offering or enrollment eligibility.

- [ ] **Step 2: Run targeted tests**

```powershell
node --test tests/completion-parser.test.js tests/cli-completion.test.js
```

- [ ] **Step 3: Run full checks**

```powershell
npm test
npm run docs:check
```

- [ ] **Step 4: Run live smoke**

```powershell
szu-cli completion status --json
szu-cli completion summary --json
szu-cli completion modules --json
szu-cli completion courses --module <moduleCode> --json
```

Inspect normalized shapes only. Confirm no student identity, internal IDs, or dynamic entry context appears.
