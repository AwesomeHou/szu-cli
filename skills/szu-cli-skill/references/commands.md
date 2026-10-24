# 校园命令路由

这是模块路由卡。精确输出结构和新增参数以已安装 CLI 的帮助及随包发布的 `docs/cli-contract.md` 为准。

## 固定检查

```bash
szu-cli doctor
szu-cli auth status
szu-cli auth logout
```

仅在需要登录时让用户执行 `szu-cli auth login`；用户在 CLI 打开的浏览器中完成登录。

## 按请求路由

| 用户意图 | 使用 | 避免 |
|---|---|---|
| 环境或登录态 | `doctor`，再 `auth status` | 索取密码或 Cookie |
| 最新公文通 | `notice list --limit <n>` | 直接抓取公开页面 |
| 按类别、日期或关键词查公文通 | `notice list --category/--from/--to/--keyword ...` | 宽泛查询后再本地过滤 |
| 不限关键词、按时间范围查询公文通 | `notice search --range 24h --limit 100` | 不要裸跑 `notice search`；至少指定一个范围或筛选条件 |
| 按发布单位查公文通 | `notice list --publisher <unit>` | 将 `notice search <unit>` 当作发布单位筛选 |
| 公文通详情或附件 | `notice view <id|url>`；单个请求文件用 `notice download ... --index <n> --dir <path>` | 批量下载或直接拼接隐藏附件链接 |
| 今天或指定日期的我的课表 | `course today`；指定日期加 `--date YYYY-MM-DD` | 用全校课表查询当前用户 |
| 按周次、星期查询我的课表 | `course list --week <n> --weekday <1-7>` | 猜测当前教学周 |
| 班级课表 | 用户未给出代码时先用 `timetable classes`；已有精确 `classCode` 时直接 `timetable view <classCode>` | 猜测班级代码 |
| 培养方案要求 | `program list ...`，再 `program item <id-or-planCode>` | 把未修课程当作当前开课 |
| 剩余学分或未完成模块 | `completion summary/modules`；再用 `completion courses --module <code>` 深入 | 从成绩自行重算进度 |
| 成绩 | 直接使用 `grade list`；按需加 `--term` | 不要执行不受支持的 `grade list --help`；摘要足够时输出完整成绩表 |
| 全部学年累计绩点、排名、学分汇总 | `growth summary` | 从学年 GPA 推断全部 GPA，或手动从成绩计算绩点；注意 `rankingTerm` 是最近有排名数据的学期 |
| 思政与社会实践学分 | `ideology summary` | 根据无关记录推断是否达标 |
| 当前可报名讲座 | `lecture list` | 不要调用报名接口或把查询结果当成已报名 |
| 仍开放但满额或容量未知的讲座 | `lecture list --availability open` | 将未知容量视作可报名 |
| 讲座详情或学习进度 | `lecture item <id>`；`lecture progress` | 暴露原始私人进度记录；调用报名或取消报名接口 |
| 我的体育预约 | `sports bookings`；需多于 3 条时加 `--limit <n>` | 暴露无关预约历史 |
| 体育项目和时段可用情况 | `sports campuses`；`sports venues --campus <name>`；`sports dates --campus <name> --venue <project>`；`sports slots --campus <name> --venue <project>` | 将时段可用视作预约成功 |
| 查询时段内可选场馆/场地 | `sports fields --campus <name> --venue <project> --date <date> --slot <slot>` | 将项目名当成场馆/场地名 |
| 体育预约或取消的预览 | `sports reserve ... --dry-run [--field <venue>]`；`sports cancel --order <orderNo> --dry-run` | 缺少校区、项目、日期、时段或订单号，或未获明确指令就运行 `--confirm`、支付或重复尝试 |
| 宿舍电费 | 楼栋不确定时用 `electricity buildings`，再 `electricity query --building <name> --room <room>`；校区可由 CLI 根据唯一楼栋匹配推断 | 猜测楼栋/房间或尝试缴费 |

电费覆盖旧 SIMS 和丽湖二期。二期六栋楼从网页实时读取，可直接使用 `electricity query --building 梧桐树 --room <用户提供的房间号>`；CLI 自动核对楼层和房间。`buildings` 的 `complete: false` 表示部分来源不可用。二期 `balanceScope: "current"` 的余额是当前值，日期只过滤明细；不要将 `usedKwh` 当作累计用电量。
| 图书馆馆藏 | `library search ...`；详情用 `library item <id|url>` | 将检索行当作馆藏册详情 |
| 知网、万方或文献检索 | 阅读 `academic-databases.md` | 在元数据/引用工作前直接下载 |

## 体育预约的固定顺序

先读精简画像；不要主动询问画像。请求缺校区时，只询问校区并停止。术语上，羽毛球是项目，羽毛球场 A4 是场馆；场馆与场地同义。当前 CLI 的 `sports venues` / `--venue` 沿用旧命名，实际返回并接收的是项目名称。用户给出校区后，先运行 `sports venues --campus <校区>`，用返回的项目名称和类别匹配用户的自然语言描述。唯一明确匹配时说明采用项并继续；匹配不唯一时展示候选并请用户选择，不要要求用户提供 CLI 精确名称。

项目匹配唯一且日期已知后，运行：

```bash
szu-cli sports slots --campus <name> --venue <name> --date <YYYY-MM-DD>
```

根据结果确认目标时间是否可用。运行 `sports fields --campus <校区> --venue <项目名> --date <日期> --slot <时段>` 查看该时段的实际场馆/场地。唯一可预约项由 CLI 自动选择，无需询问；多个可预约项展示名称并请用户选择。对多个候选，使用 `--field <用户选择的场馆/场地名>` 运行 `sports reserve ... --dry-run`；唯一候选时 `--field` 可省略。预览确认无误后，等待用户明确确认，再以相同参数（包括必要的 `--field`）加 `--confirm` 提交。

## 回答形式

- 概述返回 JSON；除非用户要求，否则不要粘贴原始 JSON。
- 日期、名称、ID、模块或保存路径重要时要准确给出。
- 字段缺失或不确定时明确说明；不要推断 CLI 未返回的数据。
- 私人记录保持最小化：回答问题，不展示整个账户。

