# Lecture CLI Design

Add a read-only `lecture` domain for `https://lecture.szu.edu.cn/`.

## Commands

```text
szu-cli lecture status --json [--url <entryUrl>] [--headed]
szu-cli lecture list --json [--availability available|open|all] [--limit <n>] [--url <entryUrl>] [--headed]
szu-cli lecture item <id> --json [--url <entryUrl>] [--headed]
szu-cli lecture progress --json [--url <entryUrl>] [--headed]
```

The persistent Playwright profile completes the normal SZU CAS redirect. No
registration command or registration endpoint is included.

## Data

- `GET /tLectureSignUp/list`: lecture rows. `list` keeps only rows whose status
  is `正在报名中` and whose registration window contains the current time.
- `GET /lectureClassroomSignUp/list?lectureId=<id>`: classroom and remaining-seat
  rows. The CLI never calls `/tSelectLecture/addItem` or cancellation endpoints.
- `POST /sysUser/getUserInfo`: progress. Only `offlineTimes`, `onlineTimes`,
  `sumOfflineTimes`, and `sumOnlineTimes` are normalized. Identity and
  credential fields are never returned.

`lecture list` defaults to `--availability available`. It enriches currently
open lectures with classroom capacity, returns only lectures with positive
remaining seats, and includes `availableCount`, `fullCount`, and `unknownCount`.
`open` includes full and unknown currently open lectures; `all` also includes
closed rows. `registrationOpen` describes status/time only, while `registerable`
requires at least one classroom with remaining seats.

`lecture item <id>` returns the normalized lecture plus classroom rows:
`campus`, `building`, `roomNumber`, `isSpeaker`, `capacity`, `reservedSeats`,
`remainingSeats`, and `status`. Missing IDs return `LECTURE_NOT_FOUND`.

All returned source URLs remove `jsessionid`, query parameters, and fragments.
CAS pages return `LOGIN_REQUIRED`, HTTP 403 returns `PERMISSION_DENIED`, and
missing or changed API data returns `PAGE_CHANGED`.
