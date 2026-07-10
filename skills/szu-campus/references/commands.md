# 校园命令路由

这是模块路由卡。精确输出结构和新增参数以已安装 CLI 的帮助及随包发布的 `docs/cli-contract.md` 为准。

## 固定检查

```bash
szu-cli doctor --json
szu-cli auth status --json
```

仅在需要登录时让用户执行 `szu-cli auth login`；用户在 CLI 打开的浏览器中完成登录。

## 按请求路由

| 用户意图 | 使用 | 避免 |
|---|---|---|
| 环境或登录态 | `doctor --json`，再 `auth status --json` | 索取密码或 Cookie |
| 最新公文通 | `notice list --limit <n> --json` | 直接抓取公开页面 |
| 按类别、日期或关键词查公文通 | `notice list --category/--from/--to/--keyword ... --json` | 宽泛查询后再本地过滤 |
| 按发布单位查公文通 | `notice list --publisher <unit> --json` | 将 `notice search <unit>` 当作发布单位筛选 |
| 公文通详情或附件 | `notice view <id|url> --json`；单个请求文件用 `notice download ... --index <n> --dir <path> --json` | 批量下载或直接拼接隐藏附件链接 |
| 今天或指定日期的我的课表 | `course today --json`；指定日期加 `--date YYYY-MM-DD` | 用全校课表查询当前用户 |
| 按周次、星期查询我的课表 | `course list --week <n> --weekday <1-7> --json` | 猜测当前教学周 |
| 班级课表 | 先用 `timetable classes` 查 `classCode`，再 `timetable view <classCode> --json` | 猜测班级代码 |
| 培养方案要求 | `program list ... --json`，再 `program item <id-or-planCode> --json` | 把未修课程当作当前开课 |
| 剩余学分或未完成模块 | `completion summary/modules --json`；再用 `completion courses --module <code> --json` 深入 | 从成绩自行重算进度 |
| 成绩 | `grade list --json`；按需加 `--term` | 摘要足够时输出完整成绩表 |
| 绩点、排名、学分汇总 | `growth summary --json` 或 `growth list --json` | 手动从成绩计算绩点 |
| 思政与社会实践学分 | `ideology summary --json` | 根据无关记录推断是否达标 |
| 当前可报名讲座 | `lecture list --json` | 调用报名接口 |
| 仍开放但满额或容量未知的讲座 | `lecture list --availability open --json` | 将未知容量视作可报名 |
| 讲座详情或学习进度 | `lecture item <id> --json`；`lecture progress --json` | 暴露原始私人进度记录 |
| 我的体育预约 | `sports bookings --json`；需多于 3 条时加 `--limit <n>` | 暴露无关预约历史 |
| 体育场馆可用情况 | `sports campuses --json`；`sports venues --campus <name> --json`；`sports dates --campus <name> --venue <name> --json`；`sports slots --campus <name> --venue <name> --json` | 将时段可用视作预约成功 |
| 体育预约或取消的预览 | `sports reserve ... --dry-run --json`；`sports cancel --order <orderNo> --dry-run --json` | 未获明确指令就运行 `--confirm`、支付或重复尝试 |
| 宿舍电费 | 楼栋不确定时用 `electricity buildings --json`，再 `electricity query --building <name> --room <room> --json` | 猜测楼栋/房间或尝试缴费 |
| 图书馆馆藏 | `library search ... --json`；详情用 `library item <id|url> --json` | 将检索行当作馆藏册详情 |
| 知网、万方或文献检索 | 阅读 `academic-databases.md` | 在元数据/引用工作前直接下载 |

## 回答形式

- 概述返回 JSON；除非用户要求，否则不要粘贴原始 JSON。
- 日期、名称、ID、模块或保存路径重要时要准确给出。
- 字段缺失或不确定时明确说明；不要推断 CLI 未返回的数据。
- 私人记录保持最小化：回答问题，不展示整个账户。
