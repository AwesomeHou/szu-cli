# Error Handling

Always parse JSON and branch on `error.code`.

## Common Codes

- `LOGIN_REQUIRED`: ask the user to run `szu-cli auth login`, then retry the original command once after they confirm login.
- `WEBVPN_LOGIN_REQUIRED`: ask the user to log in through WebVPN.
- `NETWORK_REQUIRED`: explain that campus network or WebVPN access is needed.
- `PAGE_CHANGED`: report that the adapter may need updating; do not guess data from a broken page.
- `PROGRAM_NOT_FOUND`: ask the user to rerun `szu-cli program list --json`.
- `CLASS_NOT_FOUND`: ask the user to rerun `szu-cli timetable classes --json`.
- `MODULE_NOT_FOUND`: ask the user to rerun `szu-cli completion modules --json`.
- `CALCULATION_TIMEOUT`: do not retry aggressively; increase `--timeout <seconds>` only when the user needs the result and waiting is reasonable.
- `LECTURE_NOT_FOUND`: ask the user to rerun `szu-cli lecture list --json`.
- `RATE_LIMITED`: stop retrying.
- `HEADED_REQUIRED`: rerun the same command with `--headed`.

## Retry Rules

- Retry login-required commands only after the user completes login.
- Retry transient network failures at most once unless the user asks for another attempt.
- Do not batch retries for academic database downloads, attachment downloads, or lecture operations.
- Prefer status commands before deeper queries when the access state is unclear.
