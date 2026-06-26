# szu-cli CLI Agent Guide

This repository builds `szu-cli`, an agent-friendly CLI for Shenzhen University web services.

The project direction is independent by default: do not assume OpenCLI is required. The preferred backend is a local browser automation layer with a persistent browser profile, so the user can log in through the normal web UI and the CLI can reuse that authenticated state.

## Product Intent

- Provide stable CLI commands for common Shenzhen University web workflows.
- Start with read-only features: notices, course schedule, grades, electricity balance.
- Use normal user login flows. Do not store account passwords.
- Support direct campus access first, then add WebVPN gateway support.
- Make every agent-facing command available through structured JSON.
- Pair the CLI with an optional skill that teaches agents how to use it safely.

## Architecture Direction

```text
Agent or human
  -> szu-cli CLI contract
  -> command modules
  -> gateway resolver: direct campus URL or WebVPN URL
  -> browser backend: Playwright persistent profile
  -> SZU web systems
```

The skill layer is documentation and operating guidance. It should not contain core scraping, browser automation, or campus business logic.

```text
Skill: when and how to call szu-cli
CLI: performs the operation
Browser profile: preserves login state
Adapters: understand each campus web page
```

## Repository Layout

- `README.md`: public project overview.
- `AGENTS.md`: instructions for coding agents.
- `docs/architecture.md`: system design and component boundaries.
- `docs/cli-contract.md`: command, JSON output, and error conventions.
- `docs/login-state.md`: login persistence model.
- `docs/security-and-compliance.md`: privacy, safety, and anti-abuse rules.
- `docs/skill-integration.md`: how Codex/agent skills should pair with the CLI.
- `docs/roadmap.md`: staged implementation plan.
- `src/`: future CLI implementation.
- `tests/`: future unit and integration tests.
- `examples/`: redacted examples only.
- `skills/szu-campus/`: optional agent skill that documents CLI usage.
- `scratch/`: local investigation notes, ignored by Git.

## Engineering Rules

- Keep the public `szu-cli` command stable even if internals change.
- Prefer small modules with explicit inputs and outputs.
- Every agent-facing command must support `--json`.
- Use structured errors and exit codes. Do not require agents to parse human prose.
- Use Playwright persistent profiles for browser login state unless a later design proves a safer option.
- Keep credentials, cookies, session state, traces, screenshots, and HAR files out of Git.
- Prefer read-only workflows first. Any state-changing command must support `--dry-run`.
- Do not bypass authentication, CAPTCHA, WebVPN restrictions, rate limits, or access control.

## Verification Expectations

Before claiming work is complete:

- Run the smallest relevant test command.
- For CLI behavior, verify both normal output and `--json`.
- For browser-backed behavior, verify login-required and logged-in states.
- For docs-only changes, check for stale OpenCLI assumptions, placeholder text, and safety contradictions.

## Local Notes

- Default shell is PowerShell on Windows.
- Prefer `rg` and `rg --files` for search.
- Keep temporary notes under `scratch/`.
- Do not commit generated local browser profiles.
