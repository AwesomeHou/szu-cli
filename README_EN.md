# szu-cli CLI

[![Docs 中文](https://img.shields.io/badge/docs-%E4%B8%AD%E6%96%87-blue)](README.md)
[![Docs English](https://img.shields.io/badge/docs-English-blue)](README_EN.md)
[![Node.js >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)
[![License MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

`szu-cli` is an agent-friendly CLI for Shenzhen University web services.

It provides stable commands and structured JSON output for common campus workflows, reuses a local persistent browser login profile, and never stores account passwords.

## Quick Start

Requires Node.js 20 or newer.

Install the stable package and its bundled skill for Codex:

```bash
npm install -g szu-cli && szu-cli skill install --target codex --json
```

Alternatively, install it for WorkBuddy or Claude Code:

```bash
npm install -g szu-cli && szu-cli skill install --target workbuddy --json
npm install -g szu-cli && szu-cli skill install --target claudecode --json
```

If `szu-cli` is already installed, install only the skill:

```bash
szu-cli skill install --target codex --json
szu-cli skill install --target workbuddy --json
szu-cli skill install --target claudecode --json
```

Build a portable AI IDE skill directory:

```bash
szu-cli skill install --target ai-ide --dest ./SZU-Campus.skill --json
```

Initialize the browser login profile:

```bash
szu-cli auth login
szu-cli auth status --json
```

`auth login` opens a persistent browser profile. Complete login in the normal browser window; later commands reuse the session stored under `~/.szu-cli/browser-profile/`.

Windows uses the system Chrome channel by default. To use Edge instead:

```powershell
$env:SZU_BROWSER_CHANNEL='msedge'
szu-cli auth login
szu-cli auth status --json
```

## Current Capabilities

| Module | Implemented functionality | Example commands |
|---|---|---|
| Environment and authentication | Check the runtime, browser backend, and current login state | `szu-cli doctor --json`<br>`szu-cli auth status --json` |
| Campus notices | List and search notices, then read body text and attachment metadata | `szu-cli notice list --limit 10 --json`<br>`szu-cli notice search 奖学金 --json` |
| Personal timetable | Query the current-term timetable or today's classes | `szu-cli course list --json`<br>`szu-cli course today --json` |
| Class timetables and programs | Query class timetables, training programs, and curriculum modules | `szu-cli timetable classes --limit 5 --json`<br>`szu-cli program list --limit 5 --json` |
| Grades and academic progress | Query grades, GPA, ideology credits, and training-plan completion | `szu-cli grade list --json`<br>`szu-cli completion summary --json` |
| Innovation lectures | Query registerable lectures, lecture details, and personal progress | `szu-cli lecture list --json`<br>`szu-cli lecture progress --json` |
| Sports venues | Query venues and available slots, then preview reservations or cancellations | `szu-cli sports slots --campus 粤海校区 --venue 一楼重量型健身 --date 2026-07-08 --json`<br>`szu-cli sports reserve --campus 粤海校区 --venue 一楼重量型健身 --date 2026-07-08 --slot 20:00-21:00 --field 一楼健身房 --dry-run --json` |
| Dorm electricity | List supported buildings and query a room's remaining electricity | `szu-cli electricity query --campus 深大新斋区 --building 红豆斋 --room 838 --json` |
| Library catalog | Search books and query locations, call numbers, and loan status | `szu-cli library search 交通设计 --json`<br>`szu-cli library item 3706432 --json` |
| CNKI | Search article metadata and details in a visible browser | `szu-cli cnki search 交通设计 --headed --json` |
| Wanfang | Search article metadata and details in a visible browser | `szu-cli wanfang search 交通设计 --headed --json` |

See the Chinese [README](README.md) and the [CLI Contract](docs/cli-contract.md) for more commands.

## Architecture

```text
Agent or user
  -> szu-cli command contract
  -> campus service modules
  -> direct / WebVPN gateway
  -> Playwright persistent browser profile
  -> Shenzhen University web systems
```

The skill only teaches agents when and how to call `szu-cli` safely. Login state, page parsing, browser automation, and campus business logic remain in the CLI.

## Safety Boundaries

- Never collect account passwords.
- Never bypass login, CAPTCHA, WebVPN, access control, or rate limits.
- Prefer read-only capabilities by default.
- Do not perform high-frequency scraping or bulk downloads.
- State-changing commands must support `--dry-run`. Live `sports reserve` and `sports cancel` operations require explicit `--confirm`; automatic payment and payment cancellation are not supported.
- Never commit cookies, browser profiles, screenshots, HAR files, traces, or other local sensitive data.

## Documentation

- [Architecture](docs/architecture.md)
- [CLI Contract](docs/cli-contract.md)
- [Installation](docs/installation.md)
- [Login State](docs/login-state.md)
- [Release Checklist](docs/release.md)
- [Security and Compliance](docs/security-and-compliance.md)
- [Skill Integration](docs/skill-integration.md)
- [Roadmap](docs/roadmap.md)

## License

MIT