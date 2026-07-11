# 校园 CLI 示例

用户以自然语言描述任务、需要具体命令示例时读取本文件。模块级路由先读取 `commands.md`。

## 自然语言到 CLI

| 用户自然语言 | 推荐命令 | 说明 |
|---|---|---|
| “帮我看看今天有什么课” | `szu-cli course today --json` | 查询当前用户课表，不用全校课表。 |
| “查一下这周三第 3 到 4 节有什么课” | `szu-cli course list --weekday 3 --json` | 如需周次再加 `--week <n>`。 |
| “帮我查交通设计相关论文，最好给引用” | `szu-cli cnki search 交通设计 --headed --format gbt7714 --json` | 学术数据库先做元数据/引用；不要批量下载。 |
| “用万方搜王老师 2024 年的论文” | `szu-cli wanfang search --author 王老师 --year 2024 --headed --json` | 字段检索走已支持参数。 |
| “帮我查一本叫交通设计的馆藏书” | `szu-cli library search 交通设计 --json` | 详情再用返回的 id 调 `library item`。 |
| “今晚八点粤海一楼重量健身能约吗” | `szu-cli sports slots --campus 粤海校区 --venue 一楼重量型健身 --date <YYYY-MM-DD> --json` | 先查日期和时段，不把可预约当成已预约。 |
| “帮我预览预约今晚 20:00 的健身房” | `szu-cli sports reserve --campus 粤海校区 --venue 一楼重量型健身 --date <YYYY-MM-DD> --slot 20:00-21:00 --field 一楼健身房 --dry-run --json` | 真实预约必须用户明确要求 `--confirm`。 |
| “取消刚才那条健身房预约” | `szu-cli sports bookings --json`，再 `szu-cli sports cancel --order <orderNo> --dry-run --json` | 先确认订单号；真实取消必须用户明确要求 `--confirm`。 |
| “我还差哪些学分，哪些课能补” | `szu-cli completion modules --json`，再 `szu-cli completion courses --module <moduleCode> --json` | 以模块为单位看已修和未修课程。 |
| “查一下绩点和排名” | `szu-cli growth summary --json` | 不要从成绩表自行重算。 |
| “查宿舍电费，楼栋不确定” | `szu-cli electricity buildings --json` | 先列楼栋，再用 `electricity query` 精确查询。 |
