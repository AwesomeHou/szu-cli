# 安装

本项目通过一个 npm 包发布，同时包含 `szu-cli` CLI 和可选的 `szu-campus` agent skill。

## 安装 CLI

安装 beta 版本：

```bash
npm install -g szu-cli@beta
```

安装本地 tarball：

```bash
npm install -g ./szu-cli-0.2.0-beta.1.tgz
```

验证 CLI：

```bash
szu-cli --version
szu-cli doctor --json
```

## 安装 Codex Skill

npm 包内包含 `skills/szu-campus`，但 `npm install` 不会自动写入 agent 目录。需要显式安装：

```bash
szu-cli skill install --target codex --json
```

该命令会把随包 skill 复制到 Codex 可见的个人 skill 目录：

```text
~/.agents/skills/szu-campus
```

安装到 WorkBuddy：

```bash
szu-cli skill install --target workbuddy --json
```

默认目录：

```text
~/.workbuddy/skills/szu-campus
```

安装到 Claude Code：

```bash
szu-cli skill install --target claudecode --json
```

默认目录：

```text
~/.claude/skills/szu-campus
```

## 生成 AI IDE Skill Bundle

Cursor、Windsurf、Cline、Trae 等 AI IDE 可以使用便携目录：

```bash
szu-cli skill install --target ai-ide --dest ./SZU-Campus.skill --json
```

该命令会把随包 skill 复制到 `./SZU-Campus.skill`，并额外生成 `AGENTS.md`，方便支持项目说明文件的 AI IDE 直接读取。

只查看随包 skill 路径：

```bash
szu-cli skill path --json
```

只安装 skill：

```bash
szu-cli skill install --target codex --json
```

测试或自定义 agent 目录时，可以覆盖目标目录：

```bash
szu-cli skill install --dir ./tmp/skills --json
```

## 首次登录

CLI 不保存密码。打开持久化浏览器 profile，在网页里手动完成登录：

```bash
szu-cli auth login
szu-cli auth status --json
```

`auth login` 会等你关闭它打开的浏览器窗口后再退出。窗口关闭后，CLI 会清理本次启动的浏览器进程，登录态保留在本机 profile 中。

Windows 默认使用系统 Chrome 通道。如需使用 Edge：

```powershell
$env:SZU_BROWSER_CHANNEL='msedge'
szu-cli auth login
```

## 网络说明

- 优先支持直接校园网访问。
- 部分命令需要已登录的浏览器 profile。
- 电费查询目前需要校园内网访问。
- WebVPN 尚未实现。
- 学术数据库命令需要 `--headed`。
