---
name: szu-campus
description: Use when an agent needs to operate Shenzhen University web services through the local `szu` CLI. Covers login checks, read-only campus queries, safety boundaries, and JSON error handling.
---

# SZU Campus CLI Skill

Use the `szu` CLI as the source of truth. Do not implement campus scraping or browser automation inside this skill.

## First Steps

Check local readiness:

```bash
szu doctor --json
szu auth status --json
```

If login is required, ask the user to run:

```bash
szu auth login
```

The user should complete login in the browser window opened by the CLI.

## Read-Only Commands

Use JSON output for agent workflows:

```bash
szu notice list --limit 10 --json
szu notice list --page 2 --limit 10 --json
szu notice search 奖学金 --json
szu notice search 奖学金 --type title --range 6m --json
szu notice view 577444 --json
szu notice download 577444 --dir downloads --json
szu course today --json
```

Use `notice list --page <n> --limit <n>` for paged full-list queries. `notice search` submits the website search form; default search is full text over the last 6 months. Use `--type title` when the user expects the keyword to appear in titles. Use `notice view <id|url>` to fetch the title, publisher, publish time, plain-text body, and indexed attachment links. Do not ask users to open attachment URLs directly; use `notice download <id|url> --index <n> --dir <path>` so the CLI downloads through the logged-in detail page.

## Error Handling

Branch on `error.code`, not natural-language messages.

Important codes:

- `LOGIN_REQUIRED`: ask the user to log in.
- `WEBVPN_LOGIN_REQUIRED`: ask the user to log in through WebVPN.
- `NETWORK_REQUIRED`: explain that campus network or WebVPN is needed.
- `PAGE_CHANGED`: report that the adapter may need updating.
- `RATE_LIMITED`: stop retrying.

## Safety Rules

- Do not ask for the user's password.
- Do not request cookies or browser profile files.
- Do not loop commands aggressively.
- Do not submit state-changing actions unless the user explicitly confirms.
- Prefer read-only commands.

## Version Requirement

Requires `szu-cli >= 0.1.0` once the first runtime release exists.
