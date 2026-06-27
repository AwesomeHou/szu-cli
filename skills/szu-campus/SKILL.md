---
name: szu-campus
description: Use when an agent needs to operate Shenzhen University web services through the local `szu-cli` CLI. Covers login checks, read-only campus queries, safety boundaries, and JSON error handling.
---

# SZU Campus CLI Skill

Use the `szu-cli` CLI as the source of truth. Do not implement campus scraping or browser automation inside this skill.

## First Steps

Check local readiness:

```bash
szu-cli doctor --json
szu-cli auth status --json
```

If login is required, ask the user to run:

```bash
szu-cli auth login
```

The user should complete login in the browser window opened by the CLI.

## Read-Only Commands

Use JSON output for agent workflows:

```bash
szu-cli notice list --limit 10 --json
szu-cli notice list --page 2 --limit 10 --json
szu-cli notice search 奖学金 --json
szu-cli notice search 奖学金 --type title --range 6m --json
szu-cli notice view 577444 --json
szu-cli notice download 577444 --dir downloads --json
szu-cli course status --json
szu-cli course list --json
szu-cli course today --json
szu-cli program status --json
szu-cli program list --limit 5 --json
szu-cli program item <id-or-planCode> --json
szu-cli timetable status --json
szu-cli timetable classes --limit 5 --json
szu-cli timetable view <classCode> --json
szu-cli grade status --json
szu-cli grade list --json
szu-cli grade list --term 2025-2026-1 --json
szu-cli growth status --json
szu-cli growth summary --json
szu-cli growth list --json
szu-cli growth list --term 2025-2026-2 --json
szu-cli growth list --year 2025-2026 --json
szu-cli ideology status --json
szu-cli ideology summary --json
szu-cli electricity status --json
szu-cli electricity buildings --json
szu-cli electricity query --campus 深大新斋区 --building 红豆斋 --room 838 --json
szu-cli library status --json
szu-cli library search 交通设计 --json
szu-cli library search --title 交通设计 --author 刘立新 --json
szu-cli library item 3706432 --json
szu-cli cnki search 交通设计 --headed --json
szu-cli cnki search 交通设计 --headed --format gbt7714 --json
szu-cli cnki search --title 优化 --abstract 交通 --abstract 调度 --headed --json
szu-cli cnki item <url> --headed --json
szu-cli cnki download <url> --headed --dir downloads --json
szu-cli wanfang search 交通设计 --headed --json
szu-cli wanfang search 交通设计 --headed --format markdown --json
szu-cli wanfang search --title 优化 --keyword 交通 --abstract 调度 --headed --json
szu-cli wanfang item <url> --headed --json
szu-cli wanfang download <url> --headed --dir downloads --json
```

Use `notice list --page <n> --limit <n>` for paged full-list queries. `notice search` submits the website search form; default search is full text over the last 6 months. Use `--type title` when the user expects the keyword to appear in titles. Use `notice view <id|url>` to fetch the title, publisher, publish time, plain-text body, and indexed attachment links. Do not ask users to open attachment URLs directly; use `notice download <id|url> --index <n> --dir <path>` so the CLI downloads through the logged-in detail page.

Use `course status` to check eHall timetable access, `course list` for the current term timetable, and `course today` for today's courses. Course commands do not require the user to provide the eHall URL in normal use.

Use `program status` to check all-school training program query access, `program list` to search published program summaries, and `program item <id-or-planCode>` to read one program's objectives, requirements, modules, and courses.

Use `timetable status` to check all-school class timetable access, `timetable classes` to find a `classCode`, and `timetable view <classCode>` to read that class's weekly schedule. Keep `timetable` separate from `course`: `course` is the current user's own timetable.

Use `grade status` to check eHall grade-query access and `grade list` for read-only grade records. Use `grade list --term <termId>` when the user asks for one term. Grade output must not be treated as public data; avoid echoing full grade records unless the user explicitly needs them.

Use `growth status` to check Growth Record access, `growth summary` for cumulative GPA and professional ranking, and `growth list` for term or academic-year summaries. Use `--term <termId>` or `--year <academicYear>` when the user requests one period. GPA and ranking data are private; only echo the fields needed for the user's request.

Use `ideology status` to check Ideology and Social Practice access and `ideology summary` to read earned credits and qualification status. Do not expose student name, student number, class code, or internal record IDs.

Use `electricity status` to check whether the SIMS electricity intranet system is reachable, `electricity buildings` to discover valid campus/building names, and `electricity query --campus <name> --building <name> --room <room>` to read recent usage records and latest remaining kWh. Electricity payment is not supported.

Use `library status` to check OPAC reachability and login state. Use `library search <keyword>` for quick catalog search. Use `library search --title <text> --author <text> --isbn <isbn>` and related field flags for advanced OPAC search. Use `library item <id|url>` to inspect copy-level holdings, locations, barcodes, status, and reservation queues. OPAC commands use the persistent browser profile so search history can be recorded when logged in.

Use `cnki search <keyword> --headed --json` and `wanfang search <keyword> --headed --json` for academic metadata search. For CNKI advanced search, use field flags such as `cnki search --title 优化 --abstract 交通 --abstract 调度 --headed --json`; `--abstract` can be repeated, conditions are joined with AND, and the MVP defaults to the 学术期刊 database scope. For Wanfang advanced search, use `wanfang search --title 优化 --keyword 交通 --abstract 调度 --headed --json`; supported fields are `--title`, `--author`, `--keyword`, and `--abstract`, joined with AND in the 学术期刊 periodical scope. Add `--format markdown`, `--format gbt7714`, or `--format bibtex` when the user asks for citations or exportable references; read `data.exports.items` instead of reformatting manually. Use `cnki item <url> --headed --json` or `wanfang item <url> --headed --json` to inspect one detail page's abstract, keywords, DOI, fund, classification, and citation helper fields. Use `cnki download <url> --headed --dir <path> --json` or `wanfang download <url> --headed --dir <path> --json` only for a single user-requested detail page when the user explicitly asks to download that one item; it clicks a visible PDF/full-text browser download button and returns the saved path. Do not use downloads for batches, queues, retries, direct-link extraction, CAJ conversion, CAPTCHA bypass, or hidden downloads.

## Error Handling

Branch on `error.code`, not natural-language messages.

Important codes:

- `LOGIN_REQUIRED`: ask the user to log in.
- `WEBVPN_LOGIN_REQUIRED`: ask the user to log in through WebVPN.
- `NETWORK_REQUIRED`: explain that campus network or WebVPN is needed.
- `PAGE_CHANGED`: report that the adapter may need updating.
- `RATE_LIMITED`: stop retrying.
- `HEADED_REQUIRED`: rerun with `--headed`.

## Safety Rules

- Do not ask for the user's password.
- Do not request cookies or browser profile files.
- Do not loop commands aggressively.
- Do not batch download academic database PDFs, CAJ files, original full text, or attachments.
- Do not use hidden direct links or bypass controls; only `cnki download <url>` and `wanfang download <url>` may click one visible provider download button for one user-requested item.
- Do not submit state-changing actions unless the user explicitly confirms.
- Prefer read-only commands.

## Version Requirement

Requires `szu-cli >= 0.1.0` once the first runtime release exists.
