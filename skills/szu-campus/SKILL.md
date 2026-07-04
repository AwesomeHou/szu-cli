---
name: szu-campus
description: Use when an agent needs to operate Shenzhen University web services through the local `szu-cli` CLI. Covers login checks, read-only campus queries, safety boundaries, academic database access, and JSON error handling.
---

# SZU Campus CLI Skill

Use the local `szu-cli` CLI as the source of truth. Keep this skill as operating guidance only; do not implement campus scraping, browser automation, or campus business logic here.

## First Steps

Check local readiness before campus queries:

```bash
szu-cli doctor --json
szu-cli auth status --json
```

If `szu-cli` is missing, tell the user to install it explicitly:

```bash
npm install -g szu-cli@alpha
szu-cli skill install --target codex --json
```

Do not install it silently. If login is required, ask the user to run:

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
- Do not ask for passwords, cookies, tokens, or browser profile files.
- Do not bypass authentication, CAPTCHA, WebVPN restrictions, rate limits, download controls, or access control.
- Do not loop retries aggressively. Stop on `RATE_LIMITED`; handle login and network errors once.
- Treat grades, GPA, ranking, identity fields, and study records as private; echo only what the user needs.
- Requires `szu-cli >= 0.1.0` once the first runtime release exists.

## Load References

Read only the reference needed for the task:

- `references/commands.md`: compact user-intent routing for common campus queries.
- `references/academic-databases.md`: CNKI and Wanfang metadata search, citation export, item lookup, and single visible-button downloads.
- `references/errors.md`: structured error handling, retry limits, and follow-up commands.
- `references/privacy-safety.md`: password, cookie, profile, download, private-data, and state-changing boundaries.

When details conflict, trust the installed `szu-cli` behavior and `docs/cli-contract.md` in the project that shipped the CLI.
