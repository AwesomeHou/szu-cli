# 校园 CLI 示例

用户以自然语言描述任务、需要具体命令示例时读取本文件。模块级路由先读取 `commands.md`。

## 自然语言到 CLI

| 用户自然语言 | 推荐命令 | 说明 |
|---|---|---|
| “帮我看看今天有什么课” | `szu-cli course today` | 查询当前用户课表，不用全校课表。 |
| “查一下这周三第 3 到 4 节有什么课” | `szu-cli course list --weekday 3` | 如需周次再加 `--week <n>`。 |
| “帮我查交通设计相关论文，最好给引用” | `szu-cli cnki search 交通设计 --headed --format gbt7714` | 学术数据库先做元数据/引用；不要批量下载。 |
| “用万方搜王老师 2024 年的论文” | `szu-cli wanfang search --author 王老师 --year 2024 --headed` | 字段检索走已支持参数。 |
| “帮我查一本叫交通设计的馆藏书” | `szu-cli library search 交通设计` | 详情再用返回的 id 调 `library item`。 |
| “粤海校区无氧重量型健身，明早 8 点能约吗” | 先用 `szu-cli sports venues --campus 粤海校区` 匹配用户描述与返回的名称/类别；唯一匹配“一楼重量型健身”后运行 `sports slots --campus 粤海校区 --venue 一楼重量型健身 --date <YYYY-MM-DD>` | 告知用户自然语言映射到的 CLI 场馆名称；日期换算后查时段，不能把可预约说成已预约。 |
| “粤海校区健身房，明早 8 点帮我预约” | 运行 `szu-cli sports venues --campus 粤海校区`；若有多个健身相关选项，展示名称和类别供选择 | 不要求用户提供 CLI 精确术语；只有匹配不唯一时才询问选择。 |
| “帮我预约今天下午 3 点的健身房” | 先询问校区；读取画像时可把常用校区作为建议 | 缺校区时不运行场馆命令；校区确定后用 `sports venues` 发现匹配项。 |
| “帮我预览预约今晚 20:00 的健身房” | 查询并匹配场馆后，确认日期和时段，再运行 `sports reserve ... --dry-run` | 不要求用户提供具体场地；真实预约必须用户明确确认后才能 `--confirm`。 |
| “取消刚才那条健身房预约” | `szu-cli sports bookings`，再 `szu-cli sports cancel --order <orderNo> --dry-run` | 先确认订单号；真实取消必须用户明确要求 `--confirm`。 |
| “我还差哪些学分，哪些课能补” | `szu-cli completion modules`，再 `szu-cli completion courses --module <moduleCode>` | 以模块为单位看已修和未修课程。 |
| “查一下全部学年的 GPA 和排名” | `szu-cli growth summary` | 使用累计 GPA；若最新学期尚无成绩，CLI 会回退到最近有排名数据的学期，按 `rankingTerm` 说明排名对应的学期。不要用学年 GPA 代替累计 GPA。 |
| “查宿舍电费，楼栋不确定” | `szu-cli electricity buildings` | 先列楼栋，再用 `electricity query` 精确查询。 |

