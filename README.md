# SZI-CLI

[![文档 中文](https://img.shields.io/badge/docs-%E4%B8%AD%E6%96%87-blue)](README.md)
[![Docs English](https://img.shields.io/badge/docs-English-blue)](README_EN.md)
[![Node.js >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)
[![License MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

`szu-cli` 是面向深圳大学网页服务的 agent-friendly CLI。

它把常用校园网页能力整理成稳定命令和结构化 JSON 输出，同时复用本机持久化浏览器登录态，不保存账号密码。

## 快速开始

要求 Node.js 20 或更高版本。

安装正式版，并把随包附带的 skill 安装到 Codex：

```bash
npm install -g szu-cli && szu-cli skill install --target codex --json
```

或者安装到 WorkBuddy 或 Claude Code：

```bash
npm install -g szu-cli && szu-cli skill install --target workbuddy --json
npm install -g szu-cli && szu-cli skill install --target claudecode --json
```

如果已经安装过 `szu-cli`，也可以只安装 skill：

```bash
szu-cli skill install --target codex --json
szu-cli skill install --target workbuddy --json
szu-cli skill install --target claudecode --json
```

生成 AI IDE 便携 skill 目录：

```bash
szu-cli skill install --target ai-ide --dest ./SZU-Campus.skill --json
```

初始化浏览器登录态：

```bash
szu-cli auth login
szu-cli auth status --json
```

`auth login` 会打开一个持久化浏览器 profile。你在正常网页里完成登录后，后续命令会复用 `~/.szu-cli/browser-profile/` 下的登录态。

Windows 上默认使用系统 Chrome 通道。如需使用 Edge：

```powershell
$env:SZU_BROWSER_CHANNEL='msedge'
szu-cli auth login
szu-cli auth status --json
```

## 当前能力

| 模块 | 实现的功能 | 示例命令 |
|---|---|---|
| 环境与认证 | 检查运行环境、浏览器后端和当前登录状态 | `szu-cli doctor --json`<br>`szu-cli auth status --json` |
| 公文通 | 查询公告列表、搜索公告并读取正文和附件信息 | `szu-cli notice list --limit 10 --json`<br>`szu-cli notice search 奖学金 --json` |
| 个人课表 | 查询本学期课表或当天课程 | `szu-cli course list --json`<br>`szu-cli course today --json` |
| 全校课表与培养方案 | 查询班级课表、培养方案及课程模块 | `szu-cli timetable classes --limit 5 --json`<br>`szu-cli program list --limit 5 --json` |
| 成绩与学业进度 | 查询成绩、GPA、思政学分和培养方案完成情况 | `szu-cli grade list --json`<br>`szu-cli completion summary --json` |
| 创新领航讲座 | 查询可报名讲座、讲座详情和个人学习进度 | `szu-cli lecture list --json`<br>`szu-cli lecture progress --json` |
| 体育场馆 | 查询场馆和可预约时段，预览预约或取消操作 | `szu-cli sports slots --campus 粤海校区 --venue 一楼重量型健身 --date 2026-07-08 --json`<br>`szu-cli sports reserve --campus 粤海校区 --venue 一楼重量型健身 --date 2026-07-08 --slot 20:00-21:00 --field 一楼健身房 --dry-run --json` |
| 宿舍电费 | 查询可用楼栋及指定房间的用电余额 | `szu-cli electricity query --campus 深大新斋区 --building 红豆斋 --room 838 --json` |
| 图书馆馆藏 | 搜索图书并查询馆藏位置、索书号和借阅状态 | `szu-cli library search 交通设计 --json`<br>`szu-cli library item 3706432 --json` |
| 知网 | 在用户可见浏览器中检索论文元数据和详情 | `szu-cli cnki search 交通设计 --headed --json` |
| 万方 | 在用户可见浏览器中检索论文元数据和详情 | `szu-cli wanfang search 交通设计 --headed --json` |

更多命令请看英文版 [README](README_EN.md) 和 [CLI 契约](docs/cli-contract.md)。

## 设计方向

```text
Agent 或用户
  -> szu-cli 命令契约
  -> 校园事务模块
  -> direct / WebVPN 网关
  -> Playwright 持久化浏览器 profile
  -> 深圳大学网页系统
```

skill 只负责告诉 agent 何时、如何安全调用 `szu-cli`。核心登录态、网页解析和校园业务逻辑都放在 CLI 中。

## 安全边界

- 不收集账号密码。
- 不绕过登录、验证码、WebVPN、访问控制或频率限制。
- 默认优先实现只读能力。
- 不做高频抓取或批量下载。
- 状态变更命令必须先支持 `--dry-run`。`sports reserve` 和 `sports cancel` 的真实状态变更都必须显式 `--confirm`，不自动支付、不取消支付。
- 不把 cookies、浏览器 profile、截图、HAR、trace 等本地敏感文件提交到 Git。

## 文档

- [架构](docs/architecture.md)
- [CLI 契约](docs/cli-contract.md)
- [安装](docs/installation.md)
- [登录态](docs/login-state.md)
- [发布检查](docs/release.md)
- [安全与合规](docs/security-and-compliance.md)
- [Skill 集成](docs/skill-integration.md)
- [路线图](docs/roadmap.md)

## 许可证

MIT
