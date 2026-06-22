# Security and Compliance

SZU CLI should act like a careful local assistant using the user's own account.

## Privacy Rules

- Do not store passwords.
- Do not commit cookies, local storage, session storage, browser profiles, HAR files, traces, or private screenshots.
- Do not upload browser state to third-party services.
- Redact personal data in examples and fixtures.
- Keep cached data local and minimal.

## Allowed Automation

- Low-frequency read-only queries.
- User-initiated browser sessions.
- Parsing pages the user can access manually.
- Local caching to avoid repeated loads.

## Disallowed Automation

- CAPTCHA bypass.
- Authentication bypass.
- WebVPN bypass.
- Multi-account automation.
- Bulk scraping.
- High-frequency polling.
- Hidden form submission.
- Actions outside what the logged-in user can do manually.

## State-Changing Commands

State-changing features, such as gym reservations, require extra safeguards:

- `--dry-run` support.
- Explicit confirmation for real submission.
- Clear JSON audit output.
- Retry limits.
- No hidden repeated attempts.

## Open Source Posture

Public docs can describe architecture and redacted examples. They should not publish secrets, private account data, or bypass instructions.
