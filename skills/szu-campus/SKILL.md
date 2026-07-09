---
name: szu-campus
slug: szu-campus
displayName: 深圳大学校园事务 CLI
summary: 面向深圳大学校园事务的 agent skill，指导 agent 安全调用本地 szu-cli 完成登录检查、公文通、课表、成绩、体育场馆、图书馆和学术数据库等查询。
description: 用于通过本地 szu-cli 操作深圳大学校园事务。覆盖 CLI 安装、登录态检查、只读校园查询、安全边界、学术数据库访问、体育预约 dry-run/confirm 规则和 JSON 错误处理。
tags: [深圳大学, 校园事务, CLI, agent, szu-cli]
license: MIT
version: 0.2.0
compatible_cli: ">=0.2.0-beta.1"
---

# SZU Campus CLI Skill

Use the local `szu-cli` CLI as the source of truth. Keep this skill as operating guidance only; do not implement campus scraping, browser automation, or campus business logic here.

## First Steps

Check local readiness before campus queries:

```bash
node --version
szu-cli --version
```

`szu-cli` requires Node.js 20 or newer. If Node.js is missing or too old, tell the user to install or upgrade Node.js first.

If `szu-cli` is missing, ask before changing the user's environment, then have the user run:

```bash
npm install -g szu-cli@beta
```

Verify the CLI after installation:

```bash
szu-cli doctor --json
szu-cli auth status --json
```

If the user is using a Codex environment and needs the bundled skill installed from the npm package, tell them to run:

```bash
szu-cli skill install --target codex --json
```

Do not install the CLI silently. If login is required, ask the user to run:

```bash
szu-cli auth login
```

The user should complete login in the browser window opened by the CLI.

## Workflow

1. Map the user's request to the smallest supported read-only command.
2. Run the command with `--json`; add `--headed` only for commands that require a visible browser.
3. If `ok: false`, branch on `error.code` with `references/errors.md`.
4. If `ok: true`, answer from returned fields only and include the minimum private data needed.

## Operating Rules

- Use `--json` for agent workflows and parse JSON, not stdout prose.
- Prefer read-only commands. Require explicit user confirmation before any state-changing action.
- For sports reservations, use `sports bookings`, `sports slots`, `sports reserve --dry-run`, or `sports cancel --dry-run` first; do not run `sports reserve --confirm`, `sports cancel --confirm`, payment, or repeated attempts unless the user explicitly asks for one exact target.
- Do not ask for passwords, cookies, tokens, or browser profile files.
- Do not bypass authentication, CAPTCHA, WebVPN restrictions, rate limits, download controls, or access control.
- Do not loop retries aggressively. Stop on `RATE_LIMITED`; handle login and network errors once.
- Treat grades, GPA, ranking, identity fields, and study records as private; echo only what the user needs.
- Requires `szu-cli >= 0.2.0-beta.1`.

## Load References

Read only the reference needed for the task:

- `references/commands.md`: module-level routing; use it to decide which command family fits the user request.
- `references/examples.md`: natural-language-to-CLI examples; use it when the user asks in ordinary language or when command shape is unclear.
- `references/academic-databases.md`: CNKI and Wanfang metadata search, citation export, item lookup, and single visible-button downloads.
- `references/errors.md`: structured error handling, retry limits, and follow-up commands.
- `references/privacy-safety.md`: password, cookie, profile, download, private-data, and state-changing boundaries.

When details conflict, trust the installed `szu-cli` behavior and `docs/cli-contract.md` in the project that shipped the CLI.
