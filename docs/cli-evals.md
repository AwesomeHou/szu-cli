# CLI 评测集

本文件定义 `szu-cli` 的 CLI 层评测集。它评估命令本身是否稳定、准确、可恢复、可被 agent 安全调用；不评估 agent skill 的推理过程。

## 评测边界

CLI 评测分两类：

- `fixture eval`：使用脱敏 fixture 和 mock backend，适合每次提交自动运行。
- `live smoke eval`：使用真实持久浏览器 profile，只做只读抽样，不保存真实个人数据。

先以 `fixture eval` 为主。`live smoke eval` 只验证真实站点仍可访问、字段存在、错误码合理，不把真实内容作为仓库里的固定答案。

## 三层评测分工

CLI eval 也必须分三层，不用同一种评委硬评所有问题：

| 层级 | 名称 | 适合评什么 | 不适合评什么 | 主要产物 |
|---|---|---|---|---|
| L0 | 代码可测试 | JSON schema、退出码、字段值、过滤/分页、错误码、隐私黑名单、fixture ground truth | 真实网页内容是否与用户眼见完全一致 | `node:test`、assert、eval runner |
| L1 | Agent/Rubric 测试 | 输出是否易用、错误恢复建议是否合理、字段解释是否清楚、命令组合是否少而准 | 校准 ground truth、判断真实校园数据对错 | trace + rubric judge |
| L2 | 人工测试 | 真实站点口径校准、复杂异常诊断、内容准确性抽样、评测规则是否漏项 | 每次提交的快速回归 | 人工验收记录、脱敏问题单 |

默认落层规则：

- 能用 fixture、schema、断言判断的，一律放 L0。
- 需要判断“解释是否合理”“结果是否好用”的，放 L1。
- 需要真人登录真实网站对照、判断学校页面口径、确认敏感边界的，放 L2。

CLI 的日常主力是 L0；L1 只补充结构化输出的可用性；L2 用来校准和兜底，不作为每次提交的必跑项。

## 评分维度

每个 eval case 按 100 分计：

- 功能正确性 40：命令完成目标，JSON 字段和值符合 ground truth。
- 鲁棒性 25：登录缺失、权限拒绝、页面/API 变化、无结果、非法参数能给结构化错误。
- 安全与隐私 20：不泄露学号、姓名、密码、cookies、session、内部上下文。
- 契约一致性 10：退出码、`ok/data/error/meta`、`sourceUrl`、数组/空值形态稳定。
- 效率 5：不做明显多余请求，limit/page/filter 在正确阶段生效。

P0 阻断项：输出敏感信息、状态变更、绕过认证/CAPTCHA/权限、非 JSON 噪声进入 stdout、错误码不结构化。

## 通用检查

所有 agent-facing 命令必须覆盖：

- `--json` 成功输出可 `JSON.parse`。
- 成功时 `ok: true`，失败时 `ok: false`。
- `meta.command` 等于实际命令。
- 列表字段始终是数组。
- 无结果返回空数组，不返回自然语言说明。
- 非法参数返回非 0，并提供结构化错误。
- mock 登录页返回 `LOGIN_REQUIRED`。
- 403 返回 `PERMISSION_DENIED`。
- 缺关键页面/API 数据返回 `PAGE_CHANGED`。

## 模块评测集

### Foundation/Auth

| Case | 命令 | Ground truth | 重点检查 |
|---|---|---|---|
| version-shape | `szu-cli --version` | `package.json` version | semver 输出、退出码 0 |
| doctor-json | `szu-cli doctor --json` | 本机 Node/Playwright 状态 | profile path、browser channel、无敏感数据 |
| auth-missing | `szu-cli auth status --json` with temp home | 空 profile | `loggedIn:false`、`reason:profile-missing` |
| auth-cas | mock CAS page | CAS fixture | `LOGIN_REQUIRED` |

### Notice 公文通

| Case | 命令 | Ground truth | 重点检查 |
|---|---|---|---|
| list-all-default | `notice list --limit 10 --json` | `notice-list.html` | 默认 `全部`，从完整列表取，不只取首页教务块 |
| list-category | `notice list --category 科研 --json` | `notice-list.html` | 类别精确筛选 |
| list-pinned | `notice list --category 置顶 --json` | `notice-list.html` | `isPinned:true` |
| list-keyword | `notice list --keyword 奖学金 --json` | mock search HTML | 站点搜索结果不被错误二次过滤 |
| list-publisher | `notice list --publisher 土木与交通工程学院 --year 2026 --json` | publisher search fixture | 发文单位命中，即使标题不含单位名 |
| search-compat | `notice search 奖学金 --json` | search fixture | 旧入口仍可用 |
| view-detail | `notice view <id> --json` | `notice-view.html` | 标题、发文单位、正文、附件 index |
| download-attachment | `notice download <id> --dir <tmp> --json` | mock attachment | 保存路径、附件名、内容 |
| login-required | mock CAS page | CAS fixture | `LOGIN_REQUIRED` |

### Course 我的课表

| Case | 命令 | Ground truth | 重点检查 |
|---|---|---|---|
| course-status | `course status --json` | `course-api.json` | term/currentWeek/sourceUrl |
| course-list | `course list --json` | `course-api.json` | 课程时间、周次、地点、教师 |
| course-today | `course today --json` | 固定日期 + fixture | 只返回当天且当前周课程 |
| course-login | mock CAS | CAS fixture | `LOGIN_REQUIRED` |
| course-forbidden | mock 403 | 403 fixture | `PERMISSION_DENIED` |

### Grade 成绩

| Case | 命令 | Ground truth | 重点检查 |
|---|---|---|---|
| grade-status | `grade status --json` | `grade-api.json` | terms、total |
| grade-list | `grade list --json` | `grade-api.json` | 课程名、学分、成绩、绩点、学期 |
| grade-term | `grade list --term <term> --json` | `grade-api.json` | term filter |
| grade-privacy | `grade list --json` | `grade-api.json` | 不含姓名/完整学号 |
| grade-empty-api | missing API | empty fixture | 空数组、结构稳定 |

### Growth/Ideology 成长记录与思政学分

| Case | 命令 | Ground truth | 重点检查 |
|---|---|---|---|
| growth-summary | `growth summary --json` | `growth-api.json` | GPA、排名、学分汇总 |
| growth-list | `growth list --json` | `growth-api.json` | 学期/学年项 |
| growth-filter | `growth list --term <term> --json` | `growth-api.json` | term/year 互斥 |
| ideology-summary | `ideology summary --json` | `ideology-api.json` | earned/required/remaining |
| ideology-empty | empty rows | empty fixture | `available:false` |
| privacy | all above | fixtures | 不含身份字段 |

### Completion 学业完成

| Case | 命令 | Ground truth | 重点检查 |
|---|---|---|---|
| completion-status | `completion status --json` | `completion-api.json` | 计算完成状态 |
| completion-summary | `completion summary --json` | `completion-api.json` | 总学分、已修、剩余 |
| completion-modules | `completion modules --json` | `completion-api.json` | 模块学分完成度 |
| completion-courses | `completion courses --module <code> --json` | module fixture | completed/selected/not-taken |
| module-not-found | unknown module | fixture | `MODULE_NOT_FOUND` |
| timeout | mock calculation timeout | progress fixture | `CALCULATION_TIMEOUT` 带 details |

### Program/Timetable 全校查询

| Case | 命令 | Ground truth | 重点检查 |
|---|---|---|---|
| program-list | `program list --json` | `program-api.json` | 培养方案摘要、分页 |
| program-item | `program item <id> --json` | `program-api.json` | 模块和课程详情 |
| program-not-found | missing id | fixture | `PROGRAM_NOT_FOUND` |
| timetable-classes | `timetable classes --json` | `timetable-api.json` | 班级列表、classCode |
| timetable-view | `timetable view <classCode> --json` | `timetable-api.json` | 班级周课表 |
| class-not-found | unknown class | fixture | `CLASS_NOT_FOUND` |

### Lecture 创新领航讲座

| Case | 命令 | Ground truth | 重点检查 |
|---|---|---|---|
| lecture-status | `lecture status --json` | lecture fixture | registerableCount |
| lecture-default | `lecture list --json` | lecture fixture | 默认只返回有剩余座位 |
| lecture-open | `lecture list --availability open --json` | lecture fixture | 包含 open 但 full/unknown |
| lecture-all | `lecture list --availability all --json` | lecture fixture | 包含 closed |
| lecture-item | `lecture item <id> --json` | classroom fixture | 教室、容量、余位 |
| lecture-progress | `lecture progress --json` | progress fixture | offline/online/percentage |
| lecture-privacy | all above | fixtures | 不含 studentId/createUser/session |

### Sports 体育场馆

| Case | 命令 | Ground truth | 重点检查 |
|---|---|---|---|
| sports-status | `sports status --json` | sports fixture | 登录态 |
| sports-campuses | `sports campuses --json` | sports fixture | 校区列表 |
| sports-venues | `sports venues --campus ... --json` | sports fixture | 指定校区场馆 |
| sports-dates | `sports dates --campus ... --venue ... --json` | sports fixture | 开放日期 |
| sports-slots | `sports slots --campus ... --venue ... --date ... --json` | sports fixture | 时段可用性 |
| sports-bookings | `sports bookings --json` | sports fixture | 订单号与隐私过滤 |
| sports-reserve-dry-run | `sports reserve ... --field ... --dry-run --json` | sports fixture | 完整目标、不提交 |
| sports-cancel-dry-run | `sports cancel --order ... --dry-run --json` | sports fixture | 验证订单、不取消 |

### Electricity 电费

| Case | 命令 | Ground truth | 重点检查 |
|---|---|---|---|
| buildings | `electricity buildings --json` | `electricity-usage.html` | 校区/楼栋选项 |
| query | `electricity query --campus ... --building ... --room ... --json` | usage table | latest remaining kWh |
| query-required | missing campus/building/room | none | 参数错误 |
| network-required | unavailable page | broken fixture | `NETWORK_REQUIRED` |

### Library/CNKI/Wanfang 学术检索

| Case | 命令 | Ground truth | 重点检查 |
|---|---|---|---|
| library-search | `library search <keyword> --json` | `library-search.html` | 题名、作者、出版社、馆藏 URL |
| library-advanced | `library search --title ... --author ... --json` | URL builder | 高级检索参数 |
| library-item | `library item <id> --json` | `library-item.html` | 副本馆藏 |
| cnki-search | `cnki search <keyword> --headed --json` | `cnki-search.html` | 元数据、授权状态 |
| cnki-advanced | `cnki search --title ... --abstract ... --headed --json` | advanced fixture | 条件映射 |
| cnki-item | `cnki item <url> --headed --json` | `cnki-item.html` | 摘要、关键词、DOI |
| wanfang-search | `wanfang search <keyword> --headed --json` | `wanfang-search.html` | 元数据 |
| wanfang-item | `wanfang item <url> --headed --json` | `wanfang-item.html` | 摘要、关键词 |
| headed-required | academic command no `--headed` | none | `HEADED_REQUIRED` |

## 评测产物

每次 eval run 应输出一个 JSON 报告：

```bash
npm run eval:cli
npm run eval:cli -- --out tmp/custom-cli-eval-report.json
```

当前 `scripts/eval-cli.mjs` 已实现 95 个 L0 fixture case，覆盖每个公开 CLI 子命令，并补充关键筛选和鲁棒性场景：

- foundation/doctor/auth/skill：`--version`、unknown JSON error、`doctor`、`auth status/login`、`skill path/install`
- notice：`list/search/view/download`，含类别、发文单位和登录页错误
- course/grade/growth/ideology/completion：各 status/list/summary/modules/courses/today 子命令
- program/timetable：`status/list/item/classes/view`
- lecture/electricity/library：所有公开子命令
- cnki/wanfang：`status/search/item/download`
- 筛选/兼容：公文通置顶/关键词/发文单位/日期范围、课程周次/星期/指定日期、电费唯一楼栋反查校区、讲座 availability、图书馆翻页和高级检索、学术库高级检索和结果层年份/类型过滤
- 鲁棒性：`LOGIN_REQUIRED`、`PERMISSION_DENIED`、`*_NOT_FOUND`、`NETWORK_REQUIRED`、`CALCULATION_TIMEOUT`、`HEADED_REQUIRED`、参数错误、空结果

```json
{
  "suite": "cli-fixture",
  "passed": 0,
  "failed": 0,
  "score": 0,
  "cases": [
    {
      "id": "notice.list-publisher",
      "layer": "L0",
      "evaluator": "deterministic",
      "input": {
        "argv": ["notice", "list", "--publisher", "土木与交通工程学院", "--year", "2026", "--json"],
        "command": "node src/cli.js notice list --publisher 土木与交通工程学院 --year 2026 --json",
        "env": { "SZU_CLI_HOME": "<temp>" }
      },
      "output": {
        "exitCode": 0,
        "stdout": "{...}",
        "stderr": "",
        "error": null
      },
      "score": 100,
      "checks": []
    }
  ]
}
```

## 执行顺序

1. L0 runner 先覆盖每个公开 CLI 子命令。
2. 再给高风险模块补无结果、页面变化、隐私泄露检测。
3. 对少量 L1 case 增加 rubric judge。
4. 最后再做 L2 live smoke，只记录 pass/fail 和脱敏摘要。
