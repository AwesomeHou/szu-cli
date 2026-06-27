# Lecture CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add read-only lecture availability, classroom detail, and learning-progress commands.

**Architecture:** Pure parser functions normalize the two existing page APIs.
A small Playwright adapter reuses the persistent profile and the CLI reuses the
existing JSON envelope and error mapping.

**Tech Stack:** Node.js, Playwright, `node:test`.

---

### Task 1: Parser

**Files:**
- Create: `src/modules/lecture-parser.js`
- Test: `tests/lecture-parser.test.js`

- [ ] Write failing tests for seat-aware availability filtering, classroom normalization, limits, progress math, and identity exclusion.
- [ ] Run `node --test tests/lecture-parser.test.js` and confirm the missing module failure.
- [ ] Implement `buildLectureListPayload` and `buildLectureProgressPayload`.
- [ ] Re-run the parser test and confirm it passes.

### Task 2: Browser Adapter And CLI

**Files:**
- Create: `src/modules/lecture.js`
- Modify: `src/main.js`
- Test: `tests/cli-lecture.test.js`

- [ ] Write failing CLI tests for `status`, `list --availability`, `item`, `progress`, CAS, 403, missing API, missing IDs, and invalid options.
- [ ] Run `node --test tests/cli-lecture.test.js` and confirm the unsupported-command failure.
- [ ] Implement the persistent-profile adapter, classroom-list GET requests, and CLI dispatch without calling registration endpoints.
- [ ] Re-run both lecture test files and confirm they pass.

### Task 3: Documentation And Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/cli-contract.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/skill-integration.md`
- Modify: `skills/szu-campus/SKILL.md`

- [ ] Document the four commands, availability states, read-only boundary, progress fields, and identity exclusions.
- [ ] Run `npm test`.
- [ ] Run `npm run docs:check`.
- [ ] Run live `lecture status`, `lecture list`, and `lecture progress` smoke checks without printing identity fields.
