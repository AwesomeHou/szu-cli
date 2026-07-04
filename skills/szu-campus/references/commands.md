# Campus Commands

Use JSON output for agent workflows.

## Readiness

```bash
szu-cli doctor --json
szu-cli auth status --json
```

Run `szu-cli auth login` only by asking the user to do it; the user completes login in the opened browser.

## Notices

Use `notice list` as the preferred entry point:

```bash
szu-cli notice list --limit 10 --json
szu-cli notice list --category 科研 --limit 10 --json
szu-cli notice list --publisher 土木与交通工程学院 --year 2026 --limit 10 --json
szu-cli notice list --keyword 奖学金 --type title --json
szu-cli notice list --from 2026-06-18 --to 2026-06-22 --json
szu-cli notice list --page 2 --limit 10 --json
```

Use `notice search <keyword>` only when the website search form behavior is wanted:

```bash
szu-cli notice search 奖学金 --json
szu-cli notice search 奖学金 --type title --range 6m --json
```

Use `notice view <id|url>` for title, publisher, publish time, plain-text body, and indexed attachments. Use `notice download <id|url> --index <n> --dir <path>` for a user-requested attachment; do not ask users to open attachment URLs directly.

## Courses And Programs

```bash
szu-cli course status --json
szu-cli course list --json
szu-cli course list --week 17 --weekday 2 --json
szu-cli course today --json
szu-cli course today --date 2026-06-23 --json
szu-cli program status --json
szu-cli program list --limit 5 --json
szu-cli program item <id-or-planCode> --json
szu-cli timetable status --json
szu-cli timetable classes --limit 5 --json
szu-cli timetable view <classCode> --json
```

Use `course` for the current user's timetable. Use `timetable` for all-school class schedules. Convert relative dates such as "tomorrow" to `YYYY-MM-DD` before using `course today --date`.

## Grades And Progress

```bash
szu-cli grade status --json
szu-cli grade list --json
szu-cli grade list --term 2025-2026-1 --json
szu-cli growth status --json
szu-cli growth summary --json
szu-cli growth list --json
szu-cli growth list --term 2025-2026-2 --json
szu-cli growth list --year 2025-2026 --json
szu-cli ideology status --json
szu-cli ideology summary --json
```

Grades, GPA, ranking, and ideology records are private. Summarize narrowly.

## Academic Completion

```bash
szu-cli completion status --json
szu-cli completion summary --json
szu-cli completion modules --json
szu-cli completion courses --module <moduleCode> --json
```

Use `completion summary` for plan-level remaining credits, `completion modules` to find unfinished module codes, and `completion courses --module <moduleCode>` for completed, selected, and `not-taken` curriculum courses. Treat `not-taken` as a curriculum candidate only, not a current offering or enrollment recommendation.

## Lectures

```bash
szu-cli lecture status --json
szu-cli lecture list --json
szu-cli lecture list --availability open --json
szu-cli lecture item <id> --json
szu-cli lecture progress --json
```

`lecture list` defaults to registerable lectures with remaining capacity. Use `--availability open` to include full or unknown open lectures, and `--availability all` only when history is needed. Do not register for lectures.

## Electricity

```bash
szu-cli electricity status --json
szu-cli electricity buildings --json
szu-cli electricity query --building 红豆斋 --room 838 --json
```

Use `electricity buildings` to discover valid names. Add `--campus <name>` when a building name is ambiguous. Electricity payment is not supported.

## Library

```bash
szu-cli library status --json
szu-cli library search 交通设计 --page 2 --json
szu-cli library search --title 交通设计 --author 刘立新 --json
szu-cli library item 3706432 --json
```

Use quick search for a keyword and field flags for advanced OPAC search. Use `library item <id|url>` for copy-level holdings, locations, barcodes, status, and reservation queues.
