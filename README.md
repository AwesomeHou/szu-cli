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
szu notice search 奖学金 --json
szu course today --json
szu grade list --json
szu electricity query --json
```

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

This repository currently contains the project structure and design documents. Runtime implementation should begin with `szu doctor`, persistent-profile login, and the read-only notice adapter.
