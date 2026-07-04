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
npm install -g szu-cli@alpha
szu-cli skill install --target codex --json
```

`npm install` 让 `szu-cli` 命令可用。`szu-cli skill install --target codex --json` 显式把随包 `skills/szu-campus` 复制到 Codex 可见的 skill 目录。

AI IDE 使用便携目录：

```bash
szu-cli skill install --target ai-ide --dest ./SZU-Campus.skill --json
```

该目录包含 `SKILL.md` 和 `AGENTS.md`，适合 Cursor、Windsurf、Cline、Trae 等支持 prompt pack、skill bundle 或项目说明文件的工具。

WorkBuddy 和 Claude Code 使用各自默认 skills 根目录：

```bash
szu-cli skill install --target workbuddy --json
szu-cli skill install --target claudecode --json
```

分别安装到 `~/.workbuddy/skills/szu-campus` 和 `~/.claude/skills/szu-campus`。

如果只是安装到自定义目录，可以省略 `--target codex`：

```bash
szu-cli skill install --dir ./tmp/skills --json
```

CLI 更新后可重新安装 skill：

```bash
npm update -g szu-cli
szu-cli skill install --target codex --json
```

skill 可以声明最低 CLI 版本：

```text
Requires: szu-cli >= 0.1.0
```

## Skill 能否安装 CLI

skill 可以包含安装说明或辅助脚本，但不应静默安装可执行文件。安装 CLI 会改变用户 PATH 并执行代码，因此必须显式。

推荐写法：

```text
如果缺少 `szu-cli`，请让用户先运行 `npm install -g szu-cli@alpha`，再运行 `szu-cli skill install --target codex --json`。
```

避免：

```text
skill 被加载时自动安装全局 CLI。
```

## Agent 工作流

agent 应先运行：

```bash
szu-cli doctor --json
szu-cli skill path --json
szu-cli auth status --json
```

如果需要登录：

```bash
szu-cli auth login
```

然后调用只读命令：

```bash
szu-cli notice search 奖学金 --json
szu-cli course today --json
szu-cli program list --limit 5 --json
szu-cli timetable classes --limit 5 --json
szu-cli lecture list --json
szu-cli lecture item <id> --json
szu-cli lecture progress --json
```

agent 不得激进循环，也不得在未经确认时提交状态变更命令。
