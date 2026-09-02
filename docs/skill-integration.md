# Skill 集成

CLI 和 skill 随同一个 npm 包发布，但运行时职责分离。

## 职责边界

```text
CLI
  -> 执行校园事务
  -> 拥有浏览器自动化
  -> 拥有解析逻辑和 JSON schema

Skill
  -> 告诉 agent 何时、如何调用 CLI
  -> 记录安全边界
  -> 解释错误处理
```

skill 不应复制浏览器自动化逻辑。agent 应调用 `szu-cli`。

## 安装模型

推荐方式：

```bash
npx szu-cli@latest install
```

该命令会将 `szu-cli` 安装到 npm 全局路径，并调用 `npx skills add` 将 `szu-cli-skill` skill 全局安装到当前环境中可识别的主流 Agent。支持的 Agent 索引见 [Supported Agents](https://github.com/vercel-labs/skills/blob/main/README.md#supported-agents)。

WorkBuddy 用户应优先从连接器市场安装“深圳大学校园事务”，也可以在技能商店搜索 `szu-cli-skill` 安装 Skill。

AI IDE 使用便携目录：

```bash
szu-cli skill install --target ai-ide --dest ./SZU-Campus.skill
```

该目录包含 `SKILL.md` 和 `AGENTS.md`，适合 Cursor、Windsurf、Cline、Trae 等支持 prompt pack、skill bundle 或项目说明文件的工具。

如需手动指定目标，WorkBuddy 和 Claude Code 仍可使用各自默认 skills 根目录：

```bash
szu-cli skill install --target workbuddy
szu-cli skill install --target claudecode
```

分别安装到 `~/.workbuddy/skills/szu-cli-skill` 和 `~/.claude/skills/szu-cli-skill`。

如果只是安装到自定义目录，可以省略 `--target codex`：

```bash
szu-cli skill install --dir ./tmp/skills
```

CLI 更新后可重新安装 skill：

```bash
npm update -g szu-cli
szu-cli skill install --target codex
```

skill 可以声明最低 CLI 版本：

```text
Skill Version: 0.2.2
Requires: szu-cli >= 0.2.2
```

## Skill 能否安装 CLI

skill 可以包含安装说明或辅助脚本，但不应静默安装可执行文件。安装 CLI 会改变用户 PATH 并执行代码，因此必须显式。

推荐写法：

```text
如果缺少 `szu-cli`，请让用户先运行 `npx szu-cli@latest install`。
```

避免：

```text
skill 被加载时自动安装全局 CLI。
```

## Agent 工作流

agent 应先运行：

```bash
szu-cli doctor
szu-cli skill path
szu-cli auth status
```

CLI 默认输出 JSON。浏览器选择优先级为用户选择、已保存选择、系统默认 Chrome/Edge、Chrome、Edge；每个浏览器使用独立 CLI profile。没有可用浏览器时，先向用户说明安装选项，只有明确确认后才运行 `szu-cli browser install chromium --yes`。

如果需要登录：

```bash
szu-cli auth login
```

然后调用只读命令：

```bash
szu-cli notice search 奖学金
szu-cli course today
szu-cli program list --limit 5
szu-cli timetable classes --limit 5
szu-cli lecture list
szu-cli lecture item <id>
szu-cli lecture progress
```

agent 不得激进循环，也不得在未经确认时提交状态变更命令。

## WorkBuddy 连接器

WorkBuddy 连接器使用 `connectors/workbuddy` 中的元信息和 CLI 配置。生成上传包：

```bash
npm run workbuddy:check
npm run workbuddy:prepare
```

将 `scratch/workbuddy-connector` 的内容直接打包上传；WorkBuddy 连接器负责安装 CLI 和加载 `szu-cli-skill`，不需要在 Skill 内再次执行 `npx skills add`。
