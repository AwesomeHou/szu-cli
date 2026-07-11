---
name: szu-campus
description: 当用户需要通过本地 szu-cli 查询或操作深圳大学校园事务时使用，包括登录检查、公文通、我的课表、全校课表、成绩、绩点排名、培养方案、学业完成、思政学分、创新讲座、宿舍电费、体育场馆预约、图书馆馆藏、知网和万方检索。指导 agent 使用 JSON 输出、安全处理隐私，并对预约和取消执行 dry-run/confirm 规则。
license: MIT
metadata:
  compatible_cli: ">=0.2.0"
---

# 深圳大学校园事务 CLI Skill

以本地 `szu-cli` 为唯一事实来源。本 skill 只提供调用指引，不在此实现校园网站抓取、浏览器自动化或业务逻辑。

## 开始前

执行校园查询前，先检查本地环境：

```bash
node --version
szu-cli --version
```

`szu-cli` 要求 Node.js 20 或更高版本。若 Node.js 缺失或版本过低，先提示用户安装或升级。

若未安装 `szu-cli`，变更用户环境前先征得同意，再让用户执行：

```bash
npm install -g szu-cli
```

安装后验证 CLI：

```bash
szu-cli doctor --json
szu-cli auth status --json
```

用户在 Codex 环境中且需要从 npm 包安装附带 skill 时，执行：

```bash
szu-cli skill install --target codex --json
```

不要静默安装 CLI。需要登录时，让用户执行：

```bash
szu-cli auth login
```

用户应在 CLI 打开的浏览器窗口中完成登录。

## 工作流

1. 将用户请求映射到最小可用的只读命令。
2. 使用 `--json` 执行；仅在需要可视浏览器时添加 `--headed`。
3. `ok: false` 时，按 `references/errors.md` 中的 `error.code` 处理。
4. `ok: true` 时，只基于返回字段作答，并仅保留必要的隐私数据。

## 操作规则

- Agent 工作流使用并解析 `--json`，不要依赖 stdout 文案。
- 优先只读命令。任何会改变状态的操作都需要用户明确确认。
- 体育预约先使用 `sports bookings`、`sports slots`、`sports reserve --dry-run` 或 `sports cancel --dry-run`；预约必须用 `--field` 指定唯一场地。除非用户明确指定唯一目标，否则不要运行 `sports reserve --confirm`、`sports cancel --confirm`、支付或重复尝试。
- 不要索取密码、Cookie、令牌或浏览器 profile 文件。
- 不要绕过认证、验证码、WebVPN 限制、限流、下载控制或访问控制。
- 不要激进重试。遇到 `RATE_LIMITED` 立即停止；登录和网络错误各处理一次。
- 成绩、绩点、排名、身份字段和学习记录均为隐私；只回显用户所需内容。
- 要求 `szu-cli >= 0.2.0`。

## 按需读取参考文件

仅读取当前任务需要的文件：

- `references/commands.md`：模块级路由，用于确定请求属于哪个命令域。
- `references/examples.md`：自然语言到 CLI 的示例；用户用日常语言提问或命令形式不明确时读取。
- `references/academic-databases.md`：知网、万方的元数据检索、引用导出、条目详情和单篇可见按钮下载规则。
- `references/errors.md`：结构化错误、重试限制与后续命令。
- `references/privacy-safety.md`：密码、Cookie、profile、下载、隐私数据和状态变更边界。

信息冲突时，以已安装 `szu-cli` 的实际行为和随 CLI 发布的 `docs/cli-contract.md` 为准。
