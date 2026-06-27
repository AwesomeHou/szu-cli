# szu-cli CLI

`szu-cli` is an early-stage, agent-friendly CLI for Shenzhen University web services.

The goal is to turn common campus web workflows into stable CLI commands with structured JSON output, while preserving user privacy and using normal browser login flows.

## Quick Start

Install the alpha package:

```bash
npm install -g szu-cli@alpha
```

Install the bundled Codex skill explicitly:

```bash
szu-cli setup codex
```

Then initialize the browser login profile:

```bash
szu-cli auth login
szu-cli auth status --json
```

The npm package includes the CLI and `skills/szu-campus`, but `npm install` does not automatically write agent directories. `szu-cli setup codex` copies the skill to `~/.agents/skills/szu-campus`.

## Direction

This project does not require OpenCLI as a default dependency. The planned backend is:

```text
szu-cli CLI
  -> Playwright persistent browser profile
  -> user logs in through normal web pages
  -> campus page adapters parse visible pages or stable responses
  -> normalized JSON output for agents
```

An optional agent skill can be installed alongside the CLI, but the CLI remains the executable source of truth.

## Goals

- Reuse a local browser login profile instead of storing passwords.
- Provide stable commands for campus notices, course schedules, grades, electricity balance, and later reservations.
- Support both direct campus network access and WebVPN access.
- Expose predictable `--json` output for agent use.
- Keep automation low-frequency, user-owned, and policy-respecting.

## Non-Goals

- No password collection.
- No multi-account automation.
- No CAPTCHA bypass.
- No authentication or WebVPN bypass.
- No high-frequency scraping or bulk harvesting.
- No hidden form submission.

## Planned Commands

```bash
szu-cli doctor --json
szu-cli auth status --json
szu-cli auth login
szu-cli skill path --json
szu-cli skill install --target codex --json
szu-cli setup codex
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
szu-cli program list --json --limit 5
szu-cli program item <id-or-planCode> --json
szu-cli timetable status --json
szu-cli timetable classes --json --limit 5
szu-cli timetable view 20250101100101 --json
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
szu-cli completion status --json
szu-cli completion summary --json
szu-cli completion modules --json
szu-cli completion courses --module <moduleCode> --json
szu-cli electricity status --json
szu-cli electricity buildings --json
szu-cli electricity query --json
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

Current implemented foundation:

```bash
npm run szu-cli -- --version
npm run szu-cli -- doctor --json
npm run szu-cli -- auth status --json
npm run szu-cli -- auth login --url https://www1.szu.edu.cn/board/
npm run szu-cli -- skill path --json
npm run szu-cli -- skill install --target codex --json
npm run szu-cli -- setup codex
npm run szu-cli -- notice list --limit 10 --json
npm run szu-cli -- notice list --page 2 --limit 10 --json
npm run szu-cli -- notice search 奖学金 --limit 10 --json
npm run szu-cli -- notice search 奖学金 --type title --range 6m --limit 10 --json
npm run szu-cli -- notice view 577444 --json
npm run szu-cli -- notice download 577444 --dir downloads --json
npm run szu-cli -- course status --json
npm run szu-cli -- course list --json
npm run szu-cli -- course today --json
npm run szu-cli -- program status --json
npm run szu-cli -- program list --limit 5 --json
npm run szu-cli -- program item <id-or-planCode> --json
npm run szu-cli -- timetable status --json
npm run szu-cli -- timetable classes --limit 5 --json
npm run szu-cli -- timetable view 20250101100101 --json
npm run szu-cli -- grade status --json
npm run szu-cli -- grade list --json
npm run szu-cli -- grade list --term 2025-2026-1 --json
npm run szu-cli -- growth status --json
npm run szu-cli -- growth summary --json
npm run szu-cli -- growth list --json
npm run szu-cli -- growth list --term 2025-2026-2 --json
npm run szu-cli -- growth list --year 2025-2026 --json
npm run szu-cli -- ideology status --json
npm run szu-cli -- ideology summary --json
npm run szu-cli -- completion status --json
npm run szu-cli -- completion summary --json
npm run szu-cli -- completion modules --json
npm run szu-cli -- completion courses --module <moduleCode> --json
npm run szu-cli -- electricity status --json
npm run szu-cli -- electricity buildings --json
npm run szu-cli -- electricity query --campus 深大新斋区 --building 红豆斋 --room 838 --json
npm run szu-cli -- library status --json
npm run szu-cli -- library search 交通设计 --limit 10 --json
npm run szu-cli -- library search --title 交通设计 --author 刘立新 --doc-type 普通图书 --location 南馆 --json
npm run szu-cli -- library item 3706432 --json
npm run szu-cli -- cnki status --headed --json
npm run szu-cli -- cnki search 交通设计 --headed --limit 10 --json
npm run szu-cli -- cnki search 交通设计 --headed --format gbt7714 --limit 10 --json
npm run szu-cli -- cnki search --title 优化 --abstract 交通 --abstract 调度 --headed --limit 10 --json
npm run szu-cli -- cnki item "<search返回的url>" --headed --json
npm run szu-cli -- cnki download "<详情页url>" --headed --dir downloads --json
npm run szu-cli -- wanfang status --headed --json
npm run szu-cli -- wanfang search 交通设计 --headed --limit 10 --json
npm run szu-cli -- wanfang search 交通设计 --headed --format markdown --limit 10 --json
npm run szu-cli -- wanfang search --title 优化 --keyword 交通 --abstract 调度 --headed --limit 10 --json
npm run szu-cli -- wanfang item "<详情页url>" --headed --json
npm run szu-cli -- wanfang download "<详情页url>" --headed --dir downloads --json
```

`auth login` opens a persistent browser profile. Complete login in the browser, then close the browser window. Later commands reuse the saved profile under `~/.szu-cli/browser-profile/`.

`auth status` opens the board page with the same persistent profile and checks whether the page still shows the SZU user menu.

On Windows, the browser backend uses the system Chrome channel by default, so it does not require downloading Playwright's bundled Chromium. To use Edge instead:

```powershell
$env:SZU_BROWSER_CHANNEL='msedge'
npm run szu-cli -- auth login --url https://www1.szu.edu.cn/board/
npm run szu-cli -- auth status --json
```

Notice commands read the current board pages with the persistent browser profile. `notice list` reads the homepage by default and switches to the full `infolist.asp` source when `--page` or `--pages` is used. `notice search` submits the site's search form; default search is `--type full --range 6m`. `notice view` accepts either a numeric notice id or an absolute notice detail URL and includes attachment indexes. Attachment links may reject direct browser opening, so use `notice download --index <n>` to download through the logged-in detail page.

Course commands read the current undergraduate timetable from eHall. They reuse the same persistent browser profile, initialize eHall through the service hall homepage, then open the stable timetable entry automatically. You do not need to pass the full eHall URL for normal use.

Program commands read the eHall all-school training program query. `program list` returns published program summaries such as grade, college, major, degree, duration, and minimum credits. `program item <id-or-planCode>` returns the selected program summary, training objectives, graduation requirements, module or course-group requirements, and course rows.

Timetable commands read the eHall all-school timetable query in class-timetable mode. Use `timetable classes` to discover `classCode`, then `timetable view <classCode>` to return that class's weekly schedule. This is separate from `course`, which means the current user's own timetable.

Grade commands read the current eHall grade query page. They reuse the same persistent browser profile and automatically open the stable grade entry. Normal output includes course, term, credit, grade, and GPA fields, but does not include student name or student ID.

Growth commands read the eHall Growth Record application. `growth summary` returns cumulative GPA and professional ranking data. `growth list` returns term and academic-year GPA, ranking, and credit summaries; use `--term` or `--year` to select one period. Identity fields are used only inside the authenticated browser session and are not included in output.

Ideology commands read the eHall Ideology and Social Practice application. `ideology summary` returns the available ideological education/social-practice credit summary and qualification status without exposing student name, student number, class code, or internal record IDs.

Completion commands read the eHall Academic Completion Query application. The page performs a server-side training-plan calculation before results are ready, so the CLI waits for the progress API instead of the sometimes-stale progress dialog. `completion summary` returns plan-level credits, `completion modules` returns each module's required/completed/remaining credits, and `completion courses --module <moduleCode>` returns every curriculum course in one module with its completion state and details. A `not-taken` course is a curriculum candidate only; the CLI does not claim it is currently offered or selectable. Use `--timeout <seconds>` to override the default 180-second calculation timeout.

Electricity commands read the campus intranet SIMS electricity query system. They do not require login, do not use the persistent browser profile, and currently support direct campus-network access only. Use `electricity buildings --json` to list available campuses and buildings before querying a room. `electricity query` defaults to the last 7 days of usage records and reports the latest remaining kWh found in that range.

Library commands read the SZU OPAC catalog. They use the same persistent browser profile by default so the OPAC can record search history when the profile is logged in. Search still works when OPAC is not logged in, but `historyRecorded` will be `false`. `library search <keyword>` uses quick search; `library search --title ... --author ...` uses OPAC advanced search.

CNKI and Wanfang commands are headed-browser academic MVPs. They use SZU library campus access channels and return search result metadata such as title, authors, source, year, download count, and detail URL. CNKI supports basic fielded advanced search with `--title` and repeatable `--abstract`, for example `cnki search --title 优化 --abstract 交通 --abstract 调度 --headed --json`; this advanced-search MVP defaults to the 学术期刊 database scope. Wanfang supports fielded advanced metadata search with `--title`, `--author`, `--keyword`, and `--abstract`, for example `wanfang search --title 优化 --keyword 交通 --abstract 调度 --headed --json`. Search commands support citation export metadata with `--format markdown`, `--format gbt7714`, or `--format bibtex`; the generated citations are included under `data.exports`. `cnki item <url>` and `wanfang item <url>` open one detail page and return metadata such as abstract, keywords, DOI, fund, classification, and citation helper fields. `cnki download <url>` and `wanfang download <url>` are limited to one user-provided detail page at a time and only click a visible PDF/full-text download button in the headed browser; they do not support batch downloading, hidden direct-link construction, CAJ conversion, CAPTCHA bypass, or non-PDF CNKI downloading. Use `--headed`; headless mode is not reliable for these providers.

State-changing commands, such as reservations, must begin with dry-run behavior:

```bash
szu-cli gym availability --date 2026-06-23 --json
szu-cli gym reserve --date 2026-06-23 --slot 19:00 --dry-run --json
```

## Documentation

- [Architecture](docs/architecture.md)
- [CLI Contract](docs/cli-contract.md)
- [Installation](docs/installation.md)
- [Login State](docs/login-state.md)
- [Release Checklist](docs/release.md)
- [Security and Compliance](docs/security-and-compliance.md)
- [Skill Integration](docs/skill-integration.md)
- [Roadmap](docs/roadmap.md)

## Status

This repository currently contains the project structure, design documents, persistent-profile login foundation, and read-only adapters for notices, personal course timetable, all-school program/timetable queries, grades, Growth Record GPA/rankings, ideology/social-practice credits, academic completion modules/courses, electricity usage, library catalog search, and headed academic metadata search for CNKI and Wanfang.
