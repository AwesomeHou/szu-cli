# Error Handling

Always parse JSON and branch on `error.code`.

## Common Codes

- `BACKEND_UNAVAILABLE`: report that the browser backend could not start; run or ask for `szu-cli doctor --json`.
- `LOGIN_REQUIRED`: ask the user to run `szu-cli auth login`, then retry the original command once after they confirm login.
- `WEBVPN_LOGIN_REQUIRED`: ask the user to log in through WebVPN.
- `NETWORK_REQUIRED`: explain that campus network or WebVPN access is needed.
- `PERMISSION_DENIED`: explain that the current account cannot access the service; do not retry with workarounds.
- `PAGE_CHANGED`: report that the adapter may need updating; do not guess data from a broken page.
- `PROGRAM_NOT_FOUND`: ask the user to rerun `szu-cli program list --json`.
- `CLASS_NOT_FOUND`: ask the user to rerun `szu-cli timetable classes --json`.
- `MODULE_NOT_FOUND`: ask the user to rerun `szu-cli completion modules --json`.
- `CALCULATION_TIMEOUT`: do not retry aggressively; increase `--timeout <seconds>` only when the user needs the result and waiting is reasonable.
- `LECTURE_NOT_FOUND`: ask the user to rerun `szu-cli lecture list --json`.
- `SPORTS_CONFIRM_REQUIRED`: rerun with `--dry-run` for preview, or ask the user for explicit confirmation before `--confirm`.
- `SPORTS_CAMPUS_NOT_FOUND`: rerun `szu-cli sports campuses --json`.
- `SPORTS_VENUE_NOT_FOUND`: rerun `szu-cli sports venues --campus <name> --json`.
- `SPORTS_SLOT_NOT_FOUND` / `SPORTS_SLOT_UNAVAILABLE`: rerun `szu-cli sports slots ... --json` and pick a selectable slot.
- `SPORTS_SUBMIT_UNVERIFIED`: do not retry automatically; ask the user to check `我的预约` or rerun `szu-cli sports bookings --json`.
- `SPORTS_BOOKING_NOT_FOUND`: rerun `szu-cli sports bookings --json` and copy the target `orderNo`.
- `SPORTS_CANCEL_UNVERIFIED`: do not retry automatically; rerun `szu-cli sports bookings --json` to inspect the order status.
- `DOWNLOAD_UNAVAILABLE`: tell the user the visible download button was unavailable; do not construct direct links.
- `RATE_LIMITED`: stop retrying.
- `HEADED_REQUIRED`: rerun the same academic database command with `--headed`.
- `UNSUPPORTED_ACTION`: explain that the installed CLI does not support that command yet.

## Retry Rules

- Retry login-required commands only after the user completes login.
- Retry transient network failures at most once unless the user asks for another attempt.
- Do not batch retries for academic database downloads, attachment downloads, lecture operations, or sports reservations.
- Prefer status commands before deeper queries when the access state is unclear.
- Preserve the original `error.hint` when it contains the next safe command.
