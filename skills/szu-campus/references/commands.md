# Campus Command Routing

Use this as a routing card. For exact schemas and newly added flags, trust the installed CLI help and the repo `docs/cli-contract.md` that shipped with it.

## Always

```bash
szu-cli doctor --json
szu-cli auth status --json
```

Ask the user to run `szu-cli auth login` only when login is required; the user completes login in the browser opened by the CLI.

## Route By Intent

| User intent | Use | Avoid |
|---|---|---|
| Readiness or login state | `doctor --json`, then `auth status --json` | Asking for passwords or cookies |
| Latest notices | `notice list --limit <n> --json` | Scraping public pages |
| Notice by category/date/keyword | `notice list --category/--from/--to/--keyword ... --json` | Client-side filtering after an overbroad query |
| Notice by publishing unit | `notice list --publisher <unit> --json` | `notice search <unit>` as a fake publisher filter |
| Notice detail or attachment | `notice view <id|url> --json`; single requested file with `notice download ... --index <n> --dir <path> --json` | Bulk downloads or direct hidden attachment URLs |
| My timetable today or a date | `course today --json`; add `--date YYYY-MM-DD` for a specific date | Using all-school timetable for the current user |
| My timetable by week/day | `course list --week <n> --weekday <1-7> --json` | Guessing the current teaching week |
| A class timetable | Find `classCode` with `timetable classes`, then `timetable view <classCode> --json` | Guessing class codes |
| Program requirements | `program list ... --json`, then `program item <id-or-planCode> --json` | Treating `not-taken` courses as current offerings |
| Remaining credits or unfinished modules | `completion summary/modules --json`; drill down with `completion courses --module <code> --json` | Recomputing progress from grades |
| Grades | `grade list --json`; add `--term` when requested | Dumping the full grade table when a summary answers |
| GPA, rank, credit summary | `growth summary --json` or `growth list --json` | Calculating GPA manually from grades |
| Ideology/social-practice credits | `ideology summary --json` | Inferring qualification from unrelated records |
| Lectures available now | `lecture list --json` | Calling registration endpoints |
| Lectures still open but full/unknown | `lecture list --availability open --json` | Treating unknown capacity as available |
| Lecture detail or progress | `lecture item <id> --json`; `lecture progress --json` | Exposing raw private progress records |
| Sports venue availability | `sports campuses --json`; `sports venues --campus <name> --json`; `sports dates --campus <name> --venue <name> --json`; `sports slots --campus <name> --venue <name> --json` | Treating time-window availability as a successful reservation |
| Sports reservation preview | `sports reserve ... --dry-run --json` | Running `--confirm`, cancellation, payment, or repeated attempts without explicit user instruction |
| Dorm electricity | `electricity buildings --json` when names are uncertain; then `electricity query --building <name> --room <room> --json` | Guessing room/building or trying to pay |
| Library holdings | `library search ... --json`; detail with `library item <id|url> --json` | Treating search rows as copy-level holdings |
| CNKI/Wanfang/literature | Read `academic-databases.md` | Running downloads before metadata/citation work |

## Answer Shape

- Summarize returned JSON; do not paste raw JSON unless the user asks.
- Include exact dates, names, IDs, modules, or saved paths when they matter.
- Say when a field is missing or uncertain; do not infer data the CLI did not return.
- Keep private records narrow: answer the question, not the whole account.
