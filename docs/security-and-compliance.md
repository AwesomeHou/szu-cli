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
- Batch PDF, CAJ, original-text, or attachment downloading from academic databases.
- Hidden academic full-text URL construction, provider-control bypass, or download automation outside a visible user-accessible button.

## State-Changing Commands

State-changing features, such as gym reservations, require extra safeguards:

- `--dry-run` support.
- Explicit confirmation for real submission.
- Clear JSON audit output.
- Retry limits.
- No hidden repeated attempts.

## Open Source Posture

Public docs can describe architecture and redacted examples. They should not publish secrets, private account data, or bypass instructions.

## Academic Database Boundaries

CNKI and Wanfang support includes metadata search plus single-item `cnki download <url>` and `wanfang download <url>` commands that open one user-provided detail page and click a visible PDF/full-text download button in the headed browser.

The CLI must not bypass CAPTCHA, slider verification, second-factor authentication, paywalls, or provider access controls. It must not implement batch downloading of PDFs, CAJ files, original full text, or attachments, and must not construct hidden download URLs to avoid normal browser controls.
