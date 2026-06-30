# 路线图

## 阶段 0：骨架

交付物：

- 仓库文档。
- agent 指南。
- CLI 契约。
- 登录态设计。
- skill 集成设计。

退出标准：

- 新贡献者无需依赖历史聊天记录，也能理解项目方向。

## 阶段 1：CLI 基础

交付物：

- `szu-cli doctor --json`。
- 版本输出。
- JSON 包装结构工具。
- 结构化错误工具。
- 基础测试。

退出标准：

- CLI 可以用稳定 schema 报告环境是否就绪。

状态：

- 已实现最小 `--version`、`doctor --json` 和结构化未知命令处理。

## 阶段 2：浏览器登录 Profile

交付物：

- Playwright 依赖。
- 持久化 profile 路径。
- `szu-cli auth login`。
- `szu-cli auth status --json`。

退出标准：

- 用户可以手动登录一次，并复用该浏览器 profile。

状态：

- 已实现 `auth status --json` 和 `auth login` 命令形态。
- 安装 Playwright 后，`auth login` 会启动持久化 profile。

## 阶段 3：公文通 MVP

交付物：

- `szu-cli notice list --limit <n> --json`。
- `szu-cli notice list --page <n> --pages <n> --json`。
- `szu-cli notice search <keyword> --json`。
- 通过公文通搜索表单做站内搜索。
- `szu-cli notice view <id|url> --json`。
- `szu-cli notice download <id|url> --dir <path> --json`。
- 脱敏 fixture。
- parser 测试。

退出标准：

- 本地 agent 无需理解浏览器细节，也能查询公文通。

状态：

- 已实现列表、分页、站内搜索、详情和附件下载。

## 阶段 4：更多只读服务

交付物：

- `szu-cli course status/list/today --json`。
- `szu-cli program status/list/item --json`。
- `szu-cli timetable status/classes/view --json`。
- `szu-cli grade status/list --json`。
- `szu-cli growth status/summary/list --json`。
- `szu-cli ideology status/summary --json`。
- `szu-cli completion status/summary/modules --json`。
- `szu-cli completion courses --module <moduleCode> --json`。
- `szu-cli lecture status/list/item/progress --json`。
- 电费余额。
- WebVPN 网关支持。

退出标准：

- 常见只读校园事务可以通过稳定命令完成。

状态：

- 已实现我的课表、全校培养方案、全校班级课表、成绩、成长记录、思政学分、学业完成、创新领航讲座、电费、图书馆馆藏、CNKI 和万方元数据检索。
- CNKI 和万方支持单条用户可见按钮下载 MVP；批量下载、CAJ 下载和隐藏直链构造仍不在范围内。
- WebVPN 尚未实现。

## 阶段 5：受控状态变更

候选：

- 健身房可预约查询。
- 健身房预约 dry-run。
- 健身房预约确认提交。

退出标准：

- 状态变更命令具备 dry-run、确认和审计输出。

## 阶段 6：打包发布

交付物：

- npm 包。
- 随包 `szu-campus` skill。
- `szu-cli skill path --json`。
- `szu-cli skill install --target codex --json`。
- `szu-cli setup codex --json`。
- 安装文档。
- 发布检查清单。

退出标准：

- 用户可以安装 npm 包、运行 `szu-cli setup codex`，并通过 `npm pack --dry-run` 验证包内容。
