# CLI Contract

The CLI contract is the stable interface for humans and agents.

## Command Shape

```bash
szu-cli <domain> <action> [flags]
```

Examples:

```bash
szu-cli doctor --json
szu-cli auth status --json
szu-cli skill path --json
szu-cli skill install --target codex --json
szu-cli setup codex --json
szu-cli notice list --limit 10 --json
szu-cli notice list --page 2 --pages 1 --limit 10 --json
szu-cli notice search 奖学金 --json
szu-cli notice search 奖学金 --type title --range 6m --json
szu-cli notice view 577444 --json
szu-cli notice download 577444 --dir downloads --json
szu-cli course status --json
szu-cli course list --json
szu-cli course today --json
szu-cli program status --json
szu-cli program list --json --limit 5
szu-cli timetable status --json
szu-cli timetable classes --json --limit 5
szu-cli timetable view 20250101100101 --json
szu-cli grade status --json
szu-cli grade list --json
szu-cli grade list --term 2025-2026-1 --json
szu-cli electricity status --json
szu-cli electricity buildings --json
szu-cli electricity query --campus 深大新斋区 --building 红豆斋 --room 838 --json
szu-cli library status --json
szu-cli library search 交通设计 --json
szu-cli library search --title 交通设计 --author 刘立新 --json
szu-cli library item 3706432 --json
szu-cli cnki search 交通设计 --headed --json
szu-cli cnki search 交通设计 --headed --format gbt7714 --json
szu-cli cnki search --title 优化 --abstract 交通 --abstract 调度 --headed --json
szu-cli cnki item <url> --headed --json
szu-cli cnki download <url> --headed --dir downloads --json
szu-cli wanfang search 交通设计 --headed --json
szu-cli wanfang search 交通设计 --headed --format markdown --json
szu-cli wanfang search --title 优化 --keyword 交通 --abstract 调度 --headed --json
szu-cli wanfang item <url> --headed --json
szu-cli wanfang download <url> --headed --dir downloads --json
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
    "hint": "Run `szu-cli auth login` and complete login in the browser."
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
- `DOWNLOAD_UNAVAILABLE`: visible provider download button was missing or did not produce a downloadable file.
- `SKILL_NOT_FOUND`: bundled agent skill is missing from the installed package.
- `HEADED_REQUIRED`: command requires a visible browser session.
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
- `21`: bundled skill missing.
- `30`: rate-limited or anti-abuse signal detected.
- `31`: download unavailable.

## Skill And Setup Schema

`szu-cli skill path --json` returns the bundled skill path without installing it:

```json
{
  "ok": true,
  "data": {
    "name": "szu-campus",
    "sourcePath": "C:/Users/name/AppData/Roaming/npm/node_modules/szu-cli/skills/szu-campus"
  },
  "meta": {
    "command": "skill path",
    "gateway": "auto",
    "backend": "playwright"
  }
}
```

`szu-cli skill install --target codex --json` copies the bundled skill to the Codex-visible personal skill directory. Use `--dir <path>` to override the target root.

```json
{
  "ok": true,
  "data": {
    "target": "codex",
    "name": "szu-campus",
    "installed": true,
    "sourcePath": ".../skills/szu-campus",
    "installedPath": "C:/Users/name/.agents/skills/szu-campus"
  },
  "meta": {
    "command": "skill install",
    "gateway": "auto",
    "backend": "playwright"
  }
}
```

`szu-cli setup codex --json` installs the bundled Codex skill and returns first-use next steps. Use `--skill-dir <path>` to override the skill root.

```json
{
  "ok": true,
  "data": {
    "cli": {
      "available": true,
      "version": "0.1.0-alpha.1"
    },
    "browser": {
      "channel": "chrome",
      "available": true
    },
    "skill": {
      "target": "codex",
      "name": "szu-campus",
      "installed": true,
      "sourcePath": ".../skills/szu-campus",
      "installedPath": "C:/Users/name/.agents/skills/szu-campus"
    },
    "nextSteps": [
      "Run `szu-cli auth login` and complete login in the browser.",
      "Run `szu-cli auth status --json`."
    ]
  },
  "meta": {
    "command": "setup codex",
    "gateway": "auto",
    "backend": "playwright"
  }
}
```

## Output Rules

- JSON keys use `camelCase`.
- Lists are arrays, even when empty.
- Dates use ISO 8601 where possible.
- Do not print warnings to stdout when `--json` is used.
- Do not expose cookies, tokens, full student IDs, phone numbers, or private identity details in normal output.

## Notice Detail Schema

`szu-cli notice view <id|url> --json` returns:

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
        "index": 1,
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

## Notice List and Search Pagination

`notice list` and `notice search` support:

- `--limit <n>`: items per page, default `10`.
- `--page <n>`: page number, default `1`.
- `--pages <n>`: number of pages to return from `--page`, default `1`.

`notice search` submits the website search form. It also supports:

- `--type <title|body|full>`, default `full`.
- `--range <24h|7d|30d|6m|2026|2025|...>`, default `6m`.

## Notice Download Schema

`szu-cli notice download <id|url> --dir <path> --json` downloads an attachment by opening the logged-in notice detail page and clicking the attachment link there. Use `--index <n>` to select an attachment; the default is `1`.

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

## Course List Schema

`szu-cli course list --json` returns the current eHall timetable. It does not expose student names or IDs.

```json
{
  "ok": true,
  "data": {
    "term": {
      "id": "2025-2026-2",
      "name": "2025-2026学年第二学期",
      "year": "2025-2026",
      "semester": "2",
      "currentWeek": 16
    },
    "items": [
      {
        "courseCode": "0901970032",
        "courseName": "交通设计与管控",
        "section": "01",
        "teachers": ["王京元", "刘明辉"],
        "weeksText": "1-17周",
        "weekday": 2,
        "startSection": 3,
        "endSection": 4,
        "location": "致理楼L3-416",
        "campus": "01",
        "rawId": "202520262090197003201"
      }
    ],
    "extraItems": {
      "adjusted": [],
      "unlisted": [],
      "practice": []
    },
    "sourceUrl": "https://ehall.szu.edu.cn/jwapp/sys/wdkb/*default/index.do?EMAP_LANG=zh&THEME=cherry#/xskcb"
  },
  "meta": {
    "command": "course list",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

`szu-cli course today --json` returns the same item shape filtered to the current local date and current teaching week. `szu-cli course status --json` only checks access and returns `loggedIn`, `reason`, `term`, and `sourceUrl`.

## Program List Schema

`szu-cli program list --json` returns published all-school training program summaries. Use `--keyword`, `--grade`, `--department`, `--major`, `--page`, and `--limit` to narrow the result.

```json
{
  "ok": true,
  "data": {
    "total": 2,
    "page": 1,
    "pageSize": 10,
    "filters": {
      "grade": "2025"
    },
    "items": [
      {
        "id": "program-001",
        "planCode": "2025-050101-01",
        "title": "2025级汉语言文学（卓越班）主修培养方案",
        "grade": "2025",
        "department": "人文学院",
        "major": "汉语言文学（卓越班）",
        "direction": "卓越班",
        "minimumCredits": 160,
        "durationYears": 4,
        "degree": "文学学士",
        "startYear": "2025-2026学年",
        "startSemester": "第一学期",
        "status": "99",
        "published": true
      }
    ],
    "sourceUrl": "https://ehall.szu.edu.cn/jwapp/sys/qxfacx/*default/index.do?EMAP_LANG=zh&THEME=cherry#/pyfacx"
  },
  "meta": {
    "command": "program list",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

`szu-cli program status --json` only checks access and returns `loggedIn`, `reason`, `total`, and `sourceUrl`.

## Timetable Schema

`szu-cli timetable classes --json` returns class rows from the all-school class timetable query. Use `--keyword`, `--grade`, `--department`, `--major`, `--page`, and `--limit` to discover a `classCode`.

```json
{
  "ok": true,
  "data": {
    "term": {
      "id": "2025-2026-2",
      "name": "2025-2026学年第二学期",
      "year": "2025-2026",
      "semester": "2",
      "currentWeek": null
    },
    "total": 2,
    "items": [
      {
        "classCode": "20250101100101",
        "className": "2025汉语言文学（卓越班）01",
        "grade": "2025",
        "department": "人文学院",
        "major": "汉语言文学（卓越班）",
        "studentCount": 30,
        "scheduled": true
      }
    ],
    "sourceUrl": "https://ehall.szu.edu.cn/jwapp/sys/kcbcx/*default/index.do?EMAP_LANG=zh&THEME=cherry#/bjkcb"
  },
  "meta": {
    "command": "timetable classes",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

`szu-cli timetable view <classCode> --json` returns that class's weekly timetable. It uses the same course item shape as `course list`, plus a `class` object and class-specific `extraItems`.

`szu-cli timetable status --json` only checks access and returns `loggedIn`, `reason`, `term`, `total`, and `sourceUrl`.

## Grade List Schema

`szu-cli grade list --json` returns eHall grade-query records. It does not expose student names or IDs.

Use `--term <termId>` to filter one term, for example `--term 2025-2026-1`.

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "termId": "2025-2026-1",
        "termName": "2025-2026学年第一学期",
        "courseCode": "0902260001",
        "courseName": "应用统计学",
        "courseNatureCode": "02",
        "courseNature": "选修",
        "credit": 2,
        "earnedCredit": 2,
        "score": "A+",
        "gradePoint": 4.5,
        "creditGradePoint": 9,
        "section": "02",
        "examDate": "2026-01-18",
        "valid": true,
        "rawId": "202520261090226000102"
      }
    ],
    "terms": [
      {
        "termId": "2025-2026-1",
        "termName": "2025-2026学年第一学期",
        "selectedCredits": 22,
        "earnedCredits": 22,
        "averageGradePoint": 3.91,
        "percent": 100,
        "itemCount": 9
      }
    ],
    "sourceUrl": "https://ehall.szu.edu.cn/jwapp/sys/cjcx/*default/index.do?EMAP_LANG=zh&THEME=cherry#/cjcx"
  },
  "meta": {
    "command": "grade list",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

`szu-cli grade status --json` only checks access and returns `loggedIn`, `reason`, `total`, `terms`, and `sourceUrl`.

## Electricity Schema

`szu-cli electricity buildings --json` returns the available campuses and buildings from the SIMS electricity query page. This command requires campus intranet access.

```json
{
  "ok": true,
  "data": {
    "campuses": [
      {
        "name": "深大新斋区",
        "client": "192.168.84.87",
        "buildings": [
          {
            "name": "红豆斋",
            "id": "18120"
          }
        ]
      }
    ],
    "sourceUrl": "http://192.168.84.3:9090/cgcSims/login.do?task=station&client=192.168.84.110"
  },
  "meta": {
    "command": "electricity buildings",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

`szu-cli electricity query --campus <name> --building <name> --room <room> --json` queries usage records and reports the latest remaining kWh found in the date range. It defaults to the last 7 days. Use `--from YYYY-MM-DD --to YYYY-MM-DD` to override the range.

```json
{
  "ok": true,
  "data": {
    "campus": "深大新斋区",
    "building": "红豆斋",
    "room": "838",
    "from": "2026-06-16",
    "to": "2026-06-23",
    "remainingKwh": 253,
    "totalUsedKwh": 21920.49,
    "totalPurchasedKwh": 22173.49,
    "latestRecord": {
      "index": 7,
      "room": "838",
      "remainingKwh": 253,
      "totalUsedKwh": 21920.49,
      "totalPurchasedKwh": 22173.49,
      "recordedAt": "2026-06-22 23:59:00"
    },
    "records": [],
    "sourceUrl": "http://192.168.84.3:9090/cgcSims/selectList.do"
  },
  "meta": {
    "command": "electricity query",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

`szu-cli electricity status --json` only checks whether the intranet system is reachable and returns `available`, `campusCount`, and `sourceUrl`. If the system is unreachable, commands return `NETWORK_REQUIRED`.

## Library Search Schema

`szu-cli library search <keyword> --json` searches the SZU OPAC catalog. It uses the persistent browser profile, so OPAC search history can be recorded when the profile is logged in. Use `--limit <n>` to limit returned rows; default is `10`.

```json
{
  "ok": true,
  "data": {
    "keyword": "交通设计",
    "total": 96,
    "page": 1,
    "pageCount": 5,
    "loggedIn": true,
    "historyRecorded": true,
    "items": [
      {
        "index": 3,
        "id": "3706432",
        "title": "交通设计",
        "authors": "刘立新, 孟祥海, 陈亮主编",
        "publisher": "北京理工大学出版社",
        "publishYear": "2025",
        "callNumber": "U491/L73",
        "holdings": 2,
        "available": 2,
        "detailUrl": "https://www.lib.szu.edu.cn/opac/bookinfo.aspx?ctrlno=3706432"
      }
    ],
    "sourceUrl": "https://www.lib.szu.edu.cn/opac/searchresult.aspx?anywords=..."
  },
  "meta": {
    "command": "library search",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

`szu-cli library status --json` checks OPAC reachability and login state. It returns `available`, `loggedIn`, `historyRecorded`, and `sourceUrl`.

The same `library search` command supports advanced OPAC fields. If a positional keyword is provided, it uses quick search. If field flags are provided, it uses advanced search. Supported field flags include `--title`, `--author`, `--subject`, `--publisher`, `--isbn`, `--issn`, `--call-number`, `--classification`, `--doc-type`, `--language`, `--location`, `--sort`, and `--order`.

```bash
szu-cli library search --title 交通设计 --author 刘立新 --doc-type 普通图书 --location 南馆 --json
```

Advanced search output keeps the same item shape and adds an `advanced` object:

```json
{
  "ok": true,
  "data": {
    "keyword": "交通设计",
    "advanced": {
      "title": "交通设计",
      "author": "刘立新",
      "docType": "0",
      "location": "125"
    },
    "total": 1,
    "items": []
  },
  "meta": {
    "command": "library search",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

`szu-cli library item <id|url> --json` returns one catalog item and its copy-level holdings.

```json
{
  "ok": true,
  "data": {
    "id": "3706432",
    "title": "交通设计",
    "authors": "刘立新, 孟祥海, 陈亮主编",
    "publisher": "北京理工大学出版社",
    "publishYear": "2025",
    "isbn": "978-7-5763-4896-5",
    "price": "CNY76.00",
    "loggedIn": true,
    "holdings": 2,
    "available": 2,
    "copies": [
      {
        "location": "南馆5楼工科阅览室TU-X(汇智楼五楼主题书架1 - 1排1架1层)",
        "callNumber": "U491/L73",
        "barcode": "A4414341",
        "volume": null,
        "year": null,
        "status": "可供出借",
        "loanType": "中文图书",
        "reservationQueue": 0,
        "readerQueue": 0
      }
    ],
    "sourceUrl": "https://www.lib.szu.edu.cn/opac/bookinfo.aspx?ctrlno=3706432"
  },
  "meta": {
    "command": "library item",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

## Academic Metadata Search Schema

`szu-cli cnki search <keyword> --headed --json` and `szu-cli wanfang search <keyword> --headed --json` perform read-only metadata search through the SZU library campus channels.

These MVP commands require `--headed`. CNKI and Wanfang also support single-item user-initiated PDF/full-text download commands that click visible download buttons. Use `--limit <n>` to limit returned search rows; default is `10`.

Search commands support citation exports through `--format <markdown|gbt7714|bibtex>`. Exported citation strings are derived only from visible metadata and are returned under `data.exports`; missing metadata is not invented.

CNKI also supports a small advanced-search MVP through field flags:

```bash
szu-cli cnki search --title 优化 --abstract 交通 --abstract 调度 --headed --json
```

This maps to CNKI advanced search conditions: 篇名 = 优化 AND 摘要 = 交通 AND 摘要 = 调度. `--abstract` is repeatable. The MVP defaults to the 学术期刊 database scope (`YSTT4HG0`) for this academic-paper workflow. The output keeps the same item shape and adds an optional `advanced` object:

```json
{
  "ok": true,
  "data": {
    "keyword": "优化 交通 调度",
    "advanced": {
      "scope": { "field": "database", "label": "学术期刊", "code": "YSTT4HG0" },
      "conditions": [
        { "field": "title", "label": "篇名", "code": "TI", "value": "优化", "match": "exact", "operator": "AND" },
        { "field": "abstract", "label": "摘要", "code": "AB", "value": "交通", "match": "exact", "operator": "AND" },
        { "field": "abstract", "label": "摘要", "code": "AB", "value": "调度", "match": "exact", "operator": null }
      ]
    },
    "total": 641,
    "authorized": true,
    "institution": "深圳大学",
    "items": [
      {
        "index": 1,
        "title": "城市道路交通拥堵溯源分析方法：研究进展与展望",
        "authors": ["杨晓光", "杨彦青"],
        "source": "公路交通科技",
        "publishedAt": "2026-05-15",
        "year": "2026",
        "type": "期刊",
        "downloadCount": 80,
        "url": "https://kns.cnki.net/kcms/detail/detail.aspx?...",
        "rawText": "Original row text"
      }
    ],
    "exports": {
      "format": "gbt7714",
      "items": [
        "杨晓光, 杨彦青. 城市道路交通拥堵溯源分析方法：研究进展与展望[J]. 公路交通科技, 2026."
      ]
    },
    "sourceUrl": "https://kns.cnki.net/kns8s/search?..."
  },
  "meta": {
    "command": "cnki search",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

Wanfang supports a similar fielded metadata-search MVP:

```bash
szu-cli wanfang search --title 优化 --keyword 交通 --abstract 调度 --headed --json
```

This maps to Wanfang periodical search conditions: 题名 = 优化 AND 关键词 = 交通 AND 摘要 = 调度. Supported Wanfang field flags are `--title`, `--author`, `--keyword`, and `--abstract`. The MVP defaults to the 学术期刊 periodical scope. The output uses the same item shape and `advanced` object shape, with Wanfang field labels and codes:

For Wanfang the same section becomes:

```json
{
  "advanced": {
    "scope": { "field": "database", "label": "学术期刊", "code": "periodical" },
    "conditions": [
      { "field": "title", "label": "题名", "code": "title", "value": "优化", "match": "fuzzy", "operator": "AND" },
      { "field": "keyword", "label": "关键词", "code": "keyword", "value": "交通", "match": "fuzzy", "operator": "AND" },
      { "field": "abstract", "label": "摘要", "code": "abstract", "value": "调度", "match": "fuzzy", "operator": null }
    ]
  }
}
```

`szu-cli cnki status --headed --json` and `szu-cli wanfang status --headed --json` check reachability and campus authorization without returning result rows.

`szu-cli cnki item <url> --headed --json` and `szu-cli wanfang item <url> --headed --json` open one detail page and return read-only bibliographic metadata. They do not download PDFs, CAJ files, original full text, or attachments.

```json
{
  "ok": true,
  "data": {
    "provider": "cnki",
    "title": "城市道路交通拥堵溯源分析方法：研究进展与展望",
    "authors": ["杨晓光", "杨彦青"],
    "institutions": ["同济大学交通运输工程学院"],
    "source": "公路交通科技",
    "publishedAt": null,
    "year": "2026",
    "type": "期刊",
    "abstract": "System-normalized abstract text",
    "keywords": ["城市道路", "交通拥堵"],
    "doi": "10.xxxx/example",
    "fund": "国家自然科学基金项目",
    "classification": "U491",
    "citationTitle": "城市道路交通拥堵溯源分析方法：研究进展与展望",
    "citationAuthorsText": "杨晓光, 杨彦青",
    "citationSourceText": "公路交通科技",
    "citationYear": "2026",
    "sourceUrl": "https://kns.cnki.net/kcms/detail/detail.aspx?..."
  },
  "meta": {
    "command": "cnki item",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

`szu-cli cnki download <url> --headed --dir <path> --json` and `szu-cli wanfang download <url> --headed --dir <path> --json` open one detail page and click a visible PDF/full-text download button in the browser. They do not support batch downloading, hidden download URL construction, CAPTCHA bypass, CAJ conversion, or non-PDF CNKI downloading.

```json
{
  "ok": true,
  "data": {
    "provider": "cnki",
    "title": "Paper title",
    "fileName": "example.pdf",
    "savedPath": "downloads/example.pdf",
    "sourceUrl": "https://kns.cnki.net/kcms2/article/abstract?...",
    "downloadedBy": "visible-button-click"
  },
  "meta": {
    "command": "cnki download",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```
