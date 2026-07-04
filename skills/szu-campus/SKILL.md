---
name: szu-campus
description: Use when an agent needs to operate Shenzhen University web services through the local `szu-cli` CLI. Covers login checks, read-only campus queries, safety boundaries, academic database access, and JSON error handling.
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

## Operating Rules

- Use `--json` for agent workflows and branch on `error.code`, not prose.
- Prefer read-only commands. Require explicit user confirmation before any state-changing action.
- Do not ask for passwords, cookies, tokens, or browser profile files.
- Do not bypass authentication, CAPTCHA, WebVPN restrictions, rate limits, download controls, or access control.
- Do not loop retries aggressively. Stop on `RATE_LIMITED`; handle login and network errors once.
- Treat grades, GPA, ranking, identity fields, and study records as private; echo only what the user needs.
- Requires `szu-cli >= 0.1.0` once the first runtime release exists.

## Load References

Read only the reference needed for the task:

- `references/commands.md`: command selection for notices, courses, grades, completion, lectures, electricity, library, and related campus queries.
- `references/academic-databases.md`: CNKI and Wanfang metadata search, citation export, item lookup, and single visible-button downloads.
- `references/errors.md`: structured error handling, retry limits, and follow-up commands.
- `references/privacy-safety.md`: password, cookie, profile, download, private-data, and state-changing boundaries.

When details conflict, trust the installed `szu-cli` behavior and `docs/cli-contract.md` in the project that shipped the CLI.
