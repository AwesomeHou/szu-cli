# SZU CLI

`szu` is an early-stage, agent-friendly CLI for Shenzhen University web services.

The goal is to turn common campus web workflows into stable CLI commands with structured JSON output, while preserving user privacy and using normal browser login flows.

## Direction

This project does not require OpenCLI as a default dependency. The planned backend is:

```text
szu CLI
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
szu doctor --json
szu auth status --json
szu auth login
szu notice list --limit 10 --json
szu notice list --page 2 --limit 10 --json
szu notice search 奖学金 --json
szu notice search 奖学金 --type title --range 6m --json
szu notice view 577444 --json
szu notice download 577444 --dir downloads --json
szu course status --json
szu course list --json
szu course today --json
szu grade status --json
szu grade list --json
szu grade list --term 2025-2026-1 --json
szu electricity status --json
szu electricity buildings --json
szu electricity query --json
szu library status --json
szu library search 交通设计 --json
szu library search --title 交通设计 --author 刘立新 --json
szu library item 3706432 --json
szu cnki search 交通设计 --headed --json
szu cnki search --title 优化 --abstract 交通 --abstract 调度 --headed --json
szu cnki item <url> --headed --json
szu wanfang search 交通设计 --headed --json
szu wanfang item <url> --headed --json
```

Current implemented foundation:

```bash
npm run szu -- --version
npm run szu -- doctor --json
npm run szu -- auth status --json
npm run szu -- auth login --url https://www1.szu.edu.cn/board/
npm run szu -- notice list --limit 10 --json
npm run szu -- notice list --page 2 --limit 10 --json
npm run szu -- notice search 奖学金 --limit 10 --json
npm run szu -- notice search 奖学金 --type title --range 6m --limit 10 --json
npm run szu -- notice view 577444 --json
npm run szu -- notice download 577444 --dir downloads --json
npm run szu -- course status --json
npm run szu -- course list --json
npm run szu -- course today --json
npm run szu -- grade status --json
npm run szu -- grade list --json
npm run szu -- grade list --term 2025-2026-1 --json
npm run szu -- electricity status --json
npm run szu -- electricity buildings --json
npm run szu -- electricity query --campus 深大新斋区 --building 红豆斋 --room 838 --json
npm run szu -- library status --json
npm run szu -- library search 交通设计 --limit 10 --json
npm run szu -- library search --title 交通设计 --author 刘立新 --doc-type 普通图书 --location 南馆 --json
npm run szu -- library item 3706432 --json
npm run szu -- cnki status --headed --json
npm run szu -- cnki search 交通设计 --headed --limit 10 --json
npm run szu -- cnki search --title 优化 --abstract 交通 --abstract 调度 --headed --limit 10 --json
npm run szu -- cnki item "<search返回的url>" --headed --json
npm run szu -- wanfang status --headed --json
npm run szu -- wanfang search 交通设计 --headed --limit 10 --json
npm run szu -- wanfang item "<详情页url>" --headed --json
```

`auth login` opens a persistent browser profile. Complete login in the browser, then close the browser window. Later commands reuse the saved profile under `~/.szu-cli/browser-profile/`.

`auth status` opens the board page with the same persistent profile and checks whether the page still shows the SZU user menu.

On Windows, the browser backend uses the system Chrome channel by default, so it does not require downloading Playwright's bundled Chromium. To use Edge instead:

```powershell
$env:SZU_BROWSER_CHANNEL='msedge'
npm run szu -- auth login --url https://www1.szu.edu.cn/board/
npm run szu -- auth status --json
```

Notice commands read the current board pages with the persistent browser profile. `notice list` reads the homepage by default and switches to the full `infolist.asp` source when `--page` or `--pages` is used. `notice search` submits the site's search form; default search is `--type full --range 6m`. `notice view` accepts either a numeric notice id or an absolute notice detail URL and includes attachment indexes. Attachment links may reject direct browser opening, so use `notice download --index <n>` to download through the logged-in detail page.

Course commands read the current undergraduate timetable from eHall. They reuse the same persistent browser profile, initialize eHall through the service hall homepage, then open the stable timetable entry automatically. You do not need to pass the full eHall URL for normal use.

Grade commands read the current eHall grade query page. They reuse the same persistent browser profile and automatically open the stable grade entry. Normal output includes course, term, credit, grade, and GPA fields, but does not include student name or student ID.

Electricity commands read the campus intranet SIMS electricity query system. They do not require login, do not use the persistent browser profile, and currently support direct campus-network access only. Use `electricity buildings --json` to list available campuses and buildings before querying a room. `electricity query` defaults to the last 7 days of usage records and reports the latest remaining kWh found in that range.

Library commands read the SZU OPAC catalog. They use the same persistent browser profile by default so the OPAC can record search history when the profile is logged in. Search still works when OPAC is not logged in, but `historyRecorded` will be `false`. `library search <keyword>` uses quick search; `library search --title ... --author ...` uses OPAC advanced search.

CNKI and Wanfang commands are headed-browser, read-only metadata MVPs. They use SZU library campus access channels and return search result metadata such as title, authors, source, year, download count, and detail URL. CNKI supports basic fielded advanced search with `--title` and repeatable `--abstract`, for example `cnki search --title 优化 --abstract 交通 --abstract 调度 --headed --json`; this advanced-search MVP defaults to the 学术期刊 database scope. `cnki item <url>` and `wanfang item <url>` open one detail page and return metadata such as abstract, keywords, DOI, fund, and classification. They intentionally do not download PDFs, CAJ files, or original full text. Use `--headed`; headless mode is not reliable for these providers.

State-changing commands, such as reservations, must begin with dry-run behavior:

```bash
szu gym availability --date 2026-06-23 --json
szu gym reserve --date 2026-06-23 --slot 19:00 --dry-run --json
```

## Documentation

- [Architecture](docs/architecture.md)
- [CLI Contract](docs/cli-contract.md)
- [Login State](docs/login-state.md)
- [Security and Compliance](docs/security-and-compliance.md)
- [Skill Integration](docs/skill-integration.md)
- [Roadmap](docs/roadmap.md)

## Status

This repository currently contains the project structure, design documents, persistent-profile login foundation, and read-only adapters for notices, course timetable, grades, electricity usage, library catalog search, and headed academic metadata search for CNKI and Wanfang.
