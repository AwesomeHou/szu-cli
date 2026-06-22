# CLI Contract

The CLI contract is the stable interface for humans and agents.

## Command Shape

```bash
szu <domain> <action> [flags]
```

Examples:

```bash
szu doctor --json
szu auth status --json
szu notice list --limit 10 --json
szu notice search 奖学金 --json
szu notice view 577444 --json
szu notice download 577444 --dir downloads --json
```

## Global Flags

- `--json`: emit machine-readable JSON.
- `--verbose`: include local diagnostics.
- `--profile <name>`: select a browser profile.
- `--gateway <auto|direct|webvpn>`: select access path. Default is `auto`.

## JSON Envelope

Success:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "command": "notice list",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

Failure:

```json
{
  "ok": false,
  "error": {
    "code": "LOGIN_REQUIRED",
    "message": "The browser profile is not logged in.",
    "hint": "Run `szu auth login` and complete login in the browser."
  },
  "meta": {
    "command": "notice list",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

## Error Codes

- `BACKEND_UNAVAILABLE`: browser backend cannot start.
- `LOGIN_REQUIRED`: target service needs login.
- `WEBVPN_LOGIN_REQUIRED`: WebVPN is required but not logged in.
- `NETWORK_REQUIRED`: direct campus URL and WebVPN are unavailable.
- `PERMISSION_DENIED`: account lacks access.
- `PAGE_CHANGED`: expected page structure changed.
- `RATE_LIMITED`: remote service appears to limit requests.
- `UNSUPPORTED_ACTION`: command is known but not implemented.
- `UNKNOWN_ERROR`: unexpected failure.

## Exit Codes

- `0`: success.
- `1`: generic failure.
- `2`: invalid command or flags.
- `10`: backend unavailable.
- `11`: login required.
- `12`: network or WebVPN required.
- `13`: permission denied.
- `20`: page structure changed.
- `30`: rate-limited or anti-abuse signal detected.

## Output Rules

- JSON keys use `camelCase`.
- Lists are arrays, even when empty.
- Dates use ISO 8601 where possible.
- Do not print warnings to stdout when `--json` is used.
- Do not expose cookies, tokens, full student IDs, phone numbers, or private identity details in normal output.

## Notice Detail Schema

`szu notice view <id|url> --json` returns:

```json
{
  "ok": true,
  "data": {
    "id": "577444",
    "title": "Notice title",
    "publisher": "Publishing unit",
    "publishedAt": "2026-06-22 10:30:00",
    "contentText": "Plain text content",
    "attachments": [
      {
        "name": "attachment.docx",
        "url": "https://www1.szu.edu.cn/board/uploadfiles/attachment.docx"
      }
    ],
    "url": "https://www1.szu.edu.cn/board/view.asp?id=577444"
  },
  "meta": {
    "command": "notice view",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

## Notice Download Schema

`szu notice download <id|url> --dir <path> --json` downloads an attachment by opening the logged-in notice detail page and clicking the attachment link there. Use `--index <n>` to select an attachment; the default is `1`.

```json
{
  "ok": true,
  "data": {
    "id": "577444",
    "attachment": {
      "name": "attachment.doc",
      "url": "https://www1.szu.edu.cn/board/down1oad.asp?fn=attachment.doc"
    },
    "savedPath": "downloads/attachment.doc",
    "url": "https://www1.szu.edu.cn/board/view.asp?id=577444"
  },
  "meta": {
    "command": "notice download",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```
