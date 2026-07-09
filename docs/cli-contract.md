# CLI 契约

CLI 契约是用户和 agent 都应依赖的稳定接口。

## 命令形态

```bash
szu-cli <domain> <action> [flags]
```

示例：

```bash
szu-cli doctor --json
szu-cli auth status --json
szu-cli skill path --json
szu-cli skill install --target codex --json
szu-cli skill install --target ai-ide --dest ./SZU-Campus.skill --json
szu-cli skill install --target workbuddy --json
szu-cli skill install --target claudecode --json
szu-cli notice list --limit 10 --json
szu-cli notice list --page 2 --pages 1 --limit 10 --json
szu-cli notice search 奖学金 --json
szu-cli notice search 奖学金 --type title --range 6m --json
szu-cli notice view 577444 --json
szu-cli notice download 577444 --dir downloads --json
szu-cli course status --json
szu-cli course list --json
szu-cli course list --week 17 --weekday 2 --json
szu-cli course today --json
szu-cli course today --date 2026-06-23 --json
szu-cli program status --json
szu-cli program list --json --limit 5
szu-cli program item <id-or-planCode> --json
szu-cli timetable status --json
szu-cli timetable classes --json --limit 5
szu-cli timetable view 20250101100101 --json
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
szu-cli completion status --json
szu-cli completion summary --json
szu-cli completion modules --json
szu-cli completion courses --module <moduleCode> --json
szu-cli lecture status --json
szu-cli lecture list --json
szu-cli lecture list --availability open --json
szu-cli lecture item <id> --json
szu-cli lecture progress --json
szu-cli sports status --json
szu-cli sports campuses --json
szu-cli sports venues --campus 粤海校区 --json
szu-cli sports slots --campus 粤海校区 --venue 一楼重量型健身 --date 2026-07-08 --json
szu-cli sports reserve --campus 粤海校区 --venue 一楼重量型健身 --date 2026-07-08 --slot 20:00-21:00 --dry-run --json
szu-cli electricity status --json
szu-cli electricity buildings --json
szu-cli electricity query --building 红豆斋 --room 838 --json
szu-cli library status --json
szu-cli library search 交通设计 --page 2 --json
szu-cli library search --title 交通设计 --author 刘立新 --json
szu-cli library item 3706432 --json
szu-cli cnki search 交通设计 --headed --json
szu-cli cnki search 交通设计 --headed --year 2026 --type 期刊 --json
szu-cli cnki search 交通设计 --headed --format gbt7714 --json
szu-cli cnki search --title 优化 --abstract 交通 --abstract 调度 --headed --json
szu-cli cnki item <url> --headed --json
szu-cli cnki download <url> --headed --dir downloads --json
szu-cli wanfang search 交通设计 --headed --json
szu-cli wanfang search 交通设计 --headed --year 2026 --type 期刊 --json
szu-cli wanfang search 交通设计 --headed --format markdown --json
szu-cli wanfang search --title 优化 --keyword 交通 --abstract 调度 --headed --json
szu-cli wanfang item <url> --headed --json
szu-cli wanfang download <url> --headed --dir downloads --json
```

## 常用参数

- `--json`：输出机器可读 JSON，所有 agent-facing 命令都支持。
- `--headed`：浏览器后端命令使用可见浏览器窗口。
- `--url <entryUrl>`：覆盖默认入口 URL，主要用于调试。
- `auth login --no-wait`：打开登录浏览器后立即返回；默认会等待窗口关闭并清理本次浏览器进程。

## JSON 包装结构

成功：

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

失败：

```json
{
  "ok": false,
  "error": {
    "code": "LOGIN_REQUIRED",
    "message": "浏览器 profile 尚未登录。",
    "hint": "运行 `szu-cli auth login` 并在浏览器中完成登录。"
  },
  "meta": {
    "command": "notice list",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

## 错误码

- `BACKEND_UNAVAILABLE`：浏览器后端无法启动。
- `LOGIN_REQUIRED`：目标服务需要登录。
- `WEBVPN_LOGIN_REQUIRED`：需要 WebVPN，但 WebVPN 尚未登录。
- `NETWORK_REQUIRED`：直接校园网和 WebVPN 路径都不可用。
- `PERMISSION_DENIED`：当前账号无权访问。
- `PAGE_CHANGED`：页面结构与预期不一致。
- `RATE_LIMITED`：远端服务疑似限制请求。
- `DOWNLOAD_UNAVAILABLE`：未找到可见下载按钮，或下载按钮没有产出可下载文件。
- `SKILL_NOT_FOUND`：安装包中缺少随包 agent skill。
- `LECTURE_NOT_FOUND`：讲座列表中找不到指定讲座 ID。
- `SPORTS_CONFIRM_REQUIRED`：体育预约需要 `--dry-run` 或 `--confirm`。
- `SPORTS_CAMPUS_NOT_FOUND`：找不到指定体育场馆校区。
- `SPORTS_VENUE_NOT_FOUND`：找不到指定体育场馆。
- `SPORTS_SLOT_NOT_FOUND`：找不到指定预约时段。
- `SPORTS_SLOT_UNAVAILABLE`：指定时段不可预约。
- `SPORTS_SUBMIT_UNVERIFIED`：体育预约点击提交后，页面没有出现可确认的成功、订单或待支付状态。
- `CLASS_NOT_FOUND`：全校课表中找不到指定班级。
- `PROGRAM_NOT_FOUND`：培养方案中找不到指定方案。
- `CALCULATION_TIMEOUT`：学业完成计算超时。
- `MODULE_NOT_FOUND`：学业完成中找不到指定模块。
- `HEADED_REQUIRED`：命令需要可见浏览器会话。
- `UNSUPPORTED_ACTION`：命令已知但尚未实现。
- `UNKNOWN_ERROR`：未知失败。

## 退出码

- `0`：成功。
- `1`：通用失败。
- `2`：命令或参数无效。
- `10`：浏览器后端不可用。
- `11`：需要登录。
- `12`：需要网络或 WebVPN。
- `13`：无权访问。
- `20`：页面结构变化。
- `21`：随包 skill 缺失。
- `22`：班级不存在。
- `23`：培养方案不存在。
- `24`：学业完成计算超时。
- `25`：模块不存在。
- `26`：讲座不存在。
- `27`：体育预约缺少确认模式。
- `28`：体育场馆校区不存在。
- `29`：体育场馆不存在。
- `32`：体育预约时段不存在。
- `33`：体育预约时段不可用。
- `30`：疑似限流或反滥用信号。
- `31`：下载不可用。

## Skill 输出 Schema

`szu-cli skill path --json` 返回随包 skill 路径，不执行安装：

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

`szu-cli skill install --target codex --json` 会把随包 skill 复制到 Codex 可见的个人 skill 目录。`target` 默认是 `codex`，使用 `--dir <path>` 可覆盖目标根目录，也可以省略 `--target codex`。

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

`szu-cli skill install --target ai-ide --dest ./SZU-Campus.skill --json` 会生成 AI IDE 可引用的便携目录。目录内包含 `SKILL.md` 和同内容的 `AGENTS.md`。

```json
{
  "ok": true,
  "data": {
    "target": "ai-ide",
    "name": "szu-campus",
    "installed": true,
    "sourcePath": ".../skills/szu-campus",
    "installedPath": "./SZU-Campus.skill"
  },
  "meta": {
    "command": "skill install",
    "gateway": "auto",
    "backend": "playwright"
  }
}
```

`szu-cli skill install --target workbuddy --json` 和 `szu-cli skill install --target claudecode --json` 会安装到对应工具的默认 skill 根目录。

```json
{
  "ok": true,
  "data": {
    "target": "workbuddy",
    "name": "szu-campus",
    "installed": true,
    "sourcePath": ".../skills/szu-campus",
    "installedPath": "C:/Users/name/.workbuddy/skills/szu-campus"
  },
  "meta": {
    "command": "skill install",
    "gateway": "auto",
    "backend": "playwright"
  }
}
```

## 输出规则

- JSON key 使用 `camelCase`。
- 列表始终使用数组，即使为空。
- 日期尽量使用 ISO 8601。
- 使用 `--json` 时，不要向 stdout 打印警告文本。
- 常规输出不得暴露 cookies、tokens、完整学号、手机号或私人身份信息。

## 公文通详情 Schema

`szu-cli notice view <id|url> --json` 返回：

```json
{
  "ok": true,
  "data": {
    "id": "577444",
    "title": "公文标题",
    "publisher": "发布单位",
    "publishedAt": "2026-06-22 10:30:00",
    "contentText": "纯文本正文",
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

## 公文通列表和搜索分页

`notice list` 和 `notice search` 支持：

- `--limit <n>`：每页条数，默认 `10`。
- `--page <n>`：页码，默认 `1`。
- `--pages <n>`：从 `--page` 开始返回多少页，默认 `1`。
- `--category <置顶|教务|科研|行政|学工|会议|讲座|生活|全部>`：公文类别，默认 `全部`。
- `--keyword <关键词>`：可选搜索词；推荐在 `notice list` 中使用，`notice search <关键词>` 保留为兼容别名。
- `--from YYYY-MM-DD` / `--to YYYY-MM-DD`：按发布日期闭区间过滤，可与类别、关键词、发文单位组合。

`notice search` 会提交网站搜索表单，同时支持：

- `--type <title|body|full>`，默认 `full`。
- `--range <24h|7d|30d|6m|2026|2025|...>`，默认 `6m`。
- `--publisher <发文单位>` 和 `--year <年份>`，使用公文通的指定单位/年份筛选；可用于 `notice list` 或无关键词的 `notice search`。

## 公文通下载 Schema

`szu-cli notice download <id|url> --dir <path> --json` 会打开已登录的公文详情页，并在页面中点击附件链接完成下载。使用 `--index <n>` 选择附件，默认 `1`；使用 `--output <filename>` 可指定保存文件名。

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

## 我的课表列表 Schema

`szu-cli course list --json` 返回当前 eHall 我的课表，不暴露姓名或学号。

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

`szu-cli course list --json` 可用 `--term <termId>`、`--week <n>` 和 `--weekday <1-7>` 过滤当前已读取课表，其中星期一为 `1`、星期日为 `7`。`szu-cli course today --json` 返回同样的课程 item 结构，但按本机日期和当前教学周过滤；使用 `--date YYYY-MM-DD` 可查询指定日期。`szu-cli course status --json` 只检查访问状态，返回 `loggedIn`、`reason`、`term` 和 `sourceUrl`。

## 培养方案 Schema

`szu-cli program list --json` 返回已发布的全校培养方案摘要。可用 `--keyword`、`--grade`、`--department`、`--major`、`--page` 和 `--limit` 缩小结果范围。

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

`szu-cli program status --json` 只检查访问状态，返回 `loggedIn`、`reason`、`total` 和 `sourceUrl`。

`szu-cli program item <id-or-planCode> --json` 返回一个已发布培养方案详情。参数使用 `program list` 返回的 `id` 或 `planCode`。

```json
{
  "ok": true,
  "data": {
    "summary": {
      "id": "program-001",
      "planCode": "2025-050101-01",
      "title": "2025级汉语言文学（卓越班）主修培养方案",
      "grade": "2025",
      "department": "人文学院",
      "major": "汉语言文学（卓越班）",
      "minimumCredits": 160
    },
    "detail": {
      "trainingObjectives": "培养具备扎实中文基础和创新能力的人才。",
      "graduationRequirements": "学生应完成通识、专业和实践模块要求。",
      "mainSubjects": ["中国语言文学"],
      "coreCourses": ["现代汉语", "中国古代文学"],
      "notes": ["毕业总学分160学分。"],
      "features": "卓越班培养。"
    },
    "modules": [
      {
        "id": "module-002",
        "groupCode": "group-basic",
        "parentGroupCode": "module-general",
        "name": "基本通识课",
        "type": "课组",
        "category": "基本通识课",
        "courseNature": "必修",
        "requiredCredits": 20,
        "totalCredits": 20,
        "totalHours": 360,
        "courseCount": 6,
        "order": 1
      }
    ],
    "courses": [
      {
        "id": "course-001",
        "groupCode": "group-basic",
        "courseCode": "0501010001",
        "courseName": "现代汉语",
        "credits": 3,
        "hours": 54,
        "termId": "2025-2026-1",
        "termName": "2025-2026学年第一学期",
        "recommendedSemester": 1,
        "courseNature": "必修",
        "examType": "考试",
        "required": true,
        "order": 1
      }
    ],
    "sourceUrl": "https://ehall.szu.edu.cn/jwapp/sys/qxfacx/*default/index.do?EMAP_LANG=zh&THEME=cherry#/pyfacx"
  },
  "meta": {
    "command": "program item",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

## 全校班级课表 Schema

`szu-cli timetable classes --json` 返回全校班级课表查询中的班级列表。可用 `--keyword`、`--grade`、`--department`、`--major`、`--page` 和 `--limit` 查找 `classCode`。

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

`szu-cli timetable view <classCode> --json` 返回指定班级的周课表。课程 item 结构与 `course list` 一致，并额外包含 `class` 对象和班级级别的 `extraItems`。

`szu-cli timetable status --json` 只检查访问状态，返回 `loggedIn`、`reason`、`term`、`total` 和 `sourceUrl`。

## 成绩列表 Schema

`szu-cli grade list --json` 返回 eHall 成绩查询记录，不暴露姓名或学号。

使用 `--term <termId>` 过滤单个学期，例如 `--term 2025-2026-1`。

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

`szu-cli grade status --json` 只检查访问状态，返回 `loggedIn`、`reason`、`total`、`terms` 和 `sourceUrl`。

## 成长记录 Schema

`szu-cli growth summary --json` 返回累计 GPA、专业排名、排名人数、相对排名和学分汇总。`szu-cli growth list --json` 返回学期和学年汇总。使用 `--term <termId>` 或 `--year <academicYear>` 过滤，两者互斥。

```json
{
  "ok": true,
  "data": {
    "terms": [
      {
        "id": "2025-2026-2",
        "name": "2025-2026学年第二学期",
        "academicYear": "2025-2026",
        "semester": "2"
      }
    ],
    "filters": {},
    "items": [
      {
        "periodType": "term",
        "periodId": "2025-2026-2",
        "periodName": "2025-2026学年第二学期",
        "gpa": 3.75,
        "majorRank": 8,
        "rankedStudentCount": 80,
        "rankPercent": 10,
        "rankBand": "前10%",
        "earnedCredits": 24,
        "selectedCredits": 26
      }
    ],
    "sourceUrl": "https://ehall.szu.edu.cn/jwapp/sys/czjl/..."
  },
  "meta": {
    "command": "growth list",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

`growth` 输出永不包含姓名或学号。`growth status` 返回 `loggedIn`、`reason`、`periodCount` 和 `sourceUrl`。

## 思政学分 Schema

`szu-cli ideology summary --json` 读取思政与社会实践学分汇总：

```json
{
  "ok": true,
  "data": {
    "available": true,
    "earnedCredits": 2,
    "qualified": true,
    "registered": true,
    "activeStudent": true,
    "grade": "2023",
    "major": "交通工程",
    "department": "交通运输学院",
    "sourceUrl": "https://ehall.szu.edu.cn/jwapp/sys/szshsjgl/..."
  },
  "meta": {
    "command": "ideology summary",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

没有汇总行的账号会返回 `available: false`，相关汇总字段可为空。命令会省略姓名、学号、班级代码和内部记录 ID。`ideology status` 返回 `loggedIn`、`reason`、`available`、`earnedCredits` 和 `sourceUrl`。

## 学业完成 Schema

学业完成页面打开后会计算培养方案进度。命令会等待进度 API 报告计算完成。默认超时时间为 180 秒，可用 `--timeout <seconds>` 修改。

`szu-cli completion summary --json` 返回培养方案层面的学分汇总。`completion modules --json` 额外返回模块行：

```json
{
  "ok": true,
  "data": {
    "plan": {
      "planCode": "plan-code",
      "planName": "2023级智慧交通主修培养方案",
      "requiredCredits": 150,
      "completedCredits": 90,
      "selectedCredits": 100,
      "actualCompletedCredits": 88,
      "outsidePlanCredits": 2,
      "remainingCredits": 60,
      "note": null
    },
    "calculation": {
      "state": "completed",
      "completed": 1,
      "total": 1,
      "percent": 100
    },
    "items": [
      {
        "moduleCode": "module-code",
        "parentModuleCode": null,
        "moduleName": "公共基础课程",
        "moduleTypeCode": "01",
        "courseCategoryCode": "01",
        "requiredCredits": 20,
        "completedCredits": 16,
        "selectedCredits": 18,
        "remainingCredits": 4,
        "requiredCourseCount": 10,
        "completedCourseCount": 8,
        "passed": false
      }
    ],
    "sourceUrl": "https://ehall.szu.edu.cn/jwapp/sys/xywccx/*default/index.do#/xywccx"
  },
  "meta": {
    "command": "completion modules",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

把返回的 `moduleCode` 传给 `szu-cli completion courses --module <moduleCode> --json`。结果包含该模块下的全部课程，`status` 可能为 `completed`、`selected`、`not-taken` 或 `unknown`，并包含学分、类别、性质、考核方式、成绩、学期、替代课程和备注等信息。`not-taken` 表示培养方案候选课程，不保证当前开课或可选。

计算超时返回 `CALCULATION_TIMEOUT`，并在 `error.details` 中包含 `completed`、`total`、`percent` 和 `timeoutSeconds`。未知模块代码返回 `MODULE_NOT_FOUND`。

## 创新领航讲座 Schema

`szu-cli lecture list --json` 默认只返回报名窗口已开启，且教室详情显示仍有余量的讲座：

```json
{
  "ok": true,
  "data": {
    "total": 1,
    "summary": {
      "openCount": 2,
      "availableCount": 1,
      "fullCount": 1,
      "unknownCount": 0,
      "closedCount": 18
    },
    "items": [
      {
        "id": "lecture-id",
        "title": "讲座名称",
        "type": "线下",
        "teacher": "主讲人",
        "department": "学院",
        "sponsor": "主办单位",
        "registrationStart": "2026-06-26 08:00:00",
        "registrationDeadline": "2026-06-28 18:00:00",
        "lectureStart": "2026-06-29 14:00:00",
        "lectureEnd": "2026-06-29 16:00:00",
        "status": "正在报名中",
        "registrationOpen": true,
        "registerable": true,
        "availabilityState": "available",
        "availableRooms": 1,
        "totalRemainingSeats": 2,
        "introduction": "讲座简介",
        "teacherIntroduction": "主讲人简介"
      }
    ],
    "sourceUrl": "https://lecture.szu.edu.cn/"
  },
  "meta": {
    "command": "lecture list",
    "gateway": "direct"
  }
}
```

使用 `--availability open` 可包含仍在报名窗口内但已满额或余量未知的讲座。使用 `--availability all` 可包含已结束历史。`lecture item <id>` 返回同样的讲座字段，并额外返回教室行：`campus`、`building`、`roomNumber`、`isSpeaker`、`capacity`、`reservedSeats`、`remainingSeats` 和 `status`。不存在的 ID 返回 `LECTURE_NOT_FOUND`。

`lecture progress` 返回 `offline` 和 `online` 对象，包含 `completed`、`required`、`remaining` 和 `passed`，并包含总体 `percentage`。它永不返回原始用户记录、姓名、学号、密码、salt 或 session 标识。`lecture status` 检查登录状态并返回 `registerableCount`。当前不支持讲座报名，适配器也不会调用报名或取消报名接口。

## 体育场馆预约 Schema

`szu-cli sports campuses --json` 返回体育场馆预约页可见校区。`sports venues --campus <校区> --json` 返回该校区可见场馆。`sports dates --campus <校区> --venue <场馆> --json` 返回该场馆当前开放预约的日期。`sports slots --campus <校区> --venue <场馆> --json` 会按开放日期分组返回日期和对应时段；加 `--date YYYY-MM-DD` 时只返回指定日期的时段状态。

```json
{
  "ok": true,
  "data": {
    "campus": "粤海校区",
    "venue": "一楼重量型健身",
    "date": "2026-07-08",
    "bookingMode": "散场",
    "place": "运动广场西馆一楼健身房",
    "items": [
      {
        "id": "20:00-21:00",
        "label": "20:00-21:00",
        "startTime": "20:00",
        "endTime": "21:00",
        "state": "可预约",
        "expired": false,
        "selectable": true,
        "remaining": 3,
        "place": "运动广场西馆一楼健身房"
      }
    ],
    "sourceUrl": "https://ehall.szu.edu.cn/qljfwapp/sys/lwSzuCgyy/index.do#/sportVenue"
  },
  "meta": {
    "command": "sports slots",
    "gateway": "direct",
    "backend": "playwright"
  }
}
```

`sports reserve --dry-run --json` 只选择页面条件并检查是否可提交，不点击“提交预约”。真实提交必须显式传入 `--confirm`；当前 live MVP 不自动支付、不取消预约、不取消支付。如果提交后出现付款入口，CLI 只返回 `payment.required` 和付款提示/链接。
## 电费 Schema

`szu-cli electricity buildings --json` 返回 SIMS 电费查询页中的可用校区和楼栋。该命令需要校园内网访问。

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

`szu-cli electricity query --campus <name> --building <name> --room <room> --json` 查询用电记录，并返回日期范围内找到的最新剩余电量。默认查询最近 7 天。使用 `--from YYYY-MM-DD --to YYYY-MM-DD` 可覆盖范围。`--campus` 可省略；当 `--building` 能唯一匹配一个楼栋时，CLI 会自动补全校区。校区和楼栋支持唯一的部分匹配。

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

`szu-cli electricity status --json` 只检查内网系统是否可达，返回 `available`、`campusCount` 和 `sourceUrl`。系统不可达时返回 `NETWORK_REQUIRED`。

## 图书馆馆藏搜索 Schema

`szu-cli library search <keyword> --json` 搜索深大 OPAC 馆藏。它使用持久化浏览器 profile，因此 OPAC 已登录时可以记录检索历史。使用 `--limit <n>` 限制返回行数，默认 `10`；使用 `--page <n>` 翻页。

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

`szu-cli library status --json` 检查 OPAC 可达性和登录状态，返回 `available`、`loggedIn`、`historyRecorded` 和 `sourceUrl`。

同一个 `library search` 命令支持 OPAC 高级检索字段。如果提供位置参数关键词，则使用快速检索；如果提供字段参数，则使用高级检索。支持的字段包括 `--title`、`--author`、`--subject`、`--publisher`、`--isbn`、`--issn`、`--call-number`、`--classification`、`--doc-type`、`--language`、`--location`、`--sort` 和 `--order`。

```bash
szu-cli library search --title 交通设计 --author 刘立新 --doc-type 普通图书 --location 南馆 --json
```

高级检索输出保持相同 item 结构，并增加 `advanced` 对象：

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

`szu-cli library item <id|url> --json` 返回一条馆藏详情及副本级馆藏信息。

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

## 学术数据库元数据检索 Schema

`szu-cli cnki search <keyword> --headed --json` 和 `szu-cli wanfang search <keyword> --headed --json` 通过深大图书馆校内通道执行只读元数据检索。

这些 MVP 命令需要 `--headed`。CNKI 和万方也支持由用户发起的单条 PDF/全文下载命令，该命令只点击可见下载按钮。使用 `--limit <n>` 限制返回行数，默认 `10`。使用 `--year <yyyy>` 和 `--type <类型>` 可对已返回元数据做结果层过滤；这不是远端站点高级筛选。

搜索命令支持通过 `--format <markdown|gbt7714|bibtex>` 导出引用。引用字符串只基于可见元数据生成，返回在 `data.exports` 下；缺失信息不会编造。

CNKI 还支持一个基于字段参数的高级检索 MVP：

```bash
szu-cli cnki search --title 优化 --abstract 交通 --abstract 调度 --headed --json
```

该命令映射为 CNKI 高级检索条件：篇名 = 优化 AND 摘要 = 交通 AND 摘要 = 调度。`--abstract` 可重复。该 MVP 针对学术论文工作流默认使用 学术期刊 数据库范围（`YSTT4HG0`）。输出保持相同 item 结构，并额外包含可选 `advanced` 对象：

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
        "rawText": "原始结果行文本"
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

万方支持类似的字段化元数据检索 MVP：

```bash
szu-cli wanfang search --title 优化 --keyword 交通 --abstract 调度 --headed --json
```

该命令映射为万方期刊检索条件：题名 = 优化 AND 关键词 = 交通 AND 摘要 = 调度。万方支持的字段参数包括 `--title`、`--author`、`--keyword` 和 `--abstract`。该 MVP 默认使用 学术期刊 期刊范围。输出使用相同 item 结构和 `advanced` 对象结构，但字段标签和代码使用万方体系：

万方对应片段如下：

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

`szu-cli cnki status --headed --json` 和 `szu-cli wanfang status --headed --json` 检查可达性和校园授权状态，不返回结果行。

`szu-cli cnki item <url> --headed --json` 和 `szu-cli wanfang item <url> --headed --json` 打开一个详情页并返回只读文献元数据。它们不会下载 PDF、CAJ、原文或附件。

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
    "abstract": "系统规范化摘要文本",
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

`szu-cli cnki download <url> --headed --dir <path> --json` 和 `szu-cli wanfang download <url> --headed --dir <path> --json` 打开一个详情页，并在浏览器中点击可见 PDF/全文下载按钮。使用 `--output <filename>` 可指定保存文件名。它们不支持批量下载、隐藏下载 URL 构造、验证码绕过、CAJ 转换或 CNKI 非 PDF 下载。

```json
{
  "ok": true,
  "data": {
    "provider": "cnki",
    "title": "论文标题",
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
