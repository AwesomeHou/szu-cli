# Login State

The project should preserve login state without collecting passwords.

## Recommended Model

Use a persistent browser profile managed by the CLI:

```text
~/.szu-cli/browser-profile/
```

Flow:

```text
szu auth login
  -> launch browser with persistent profile
  -> user completes SZU or WebVPN login manually
  -> CLI verifies authenticated page state
  -> profile remains local for future commands
```

Future commands reuse the same profile:

```text
szu notice list --json
  -> open page with persistent profile
  -> if logged in, parse data
  -> if redirected to login, return LOGIN_REQUIRED
```

## Why Not Store Passwords

Passwords create unnecessary risk and usually do not solve the hard parts:

- CAS flows may require redirects or multi-factor checks.
- WebVPN may have its own session rules.
- Captchas and policy checks must remain user-driven.

The CLI should let the user log in through the normal website.

## Alternatives

### HTTP Cookie Jar

Possible, but fragile. It requires implementing login flows, CSRF, redirects, cookie refresh, and WebVPN rewriting manually.

### Existing Chrome Profile

Possible through CDP, but more invasive and harder to support across machines.

### OpenCLI

Can be an optional backend later, but should not be required for the base architecture.

## Expiration

Login state is not permanent. The CLI should detect expiration and ask the user to log in again. It must not try to bypass server-side expiration.
