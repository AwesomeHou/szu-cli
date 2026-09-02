# 安装

本项目通过一个 npm 包发布，同时包含 `szu-cli` CLI 和可选的 `szu-cli-skill` agent skill。

## 从 npm 安装（推荐）

```bash
npx szu-cli@latest install
```

该命令会将 `szu-cli` 安装到 npm 全局路径，并调用 `npx skills add` 将 `szu-cli-skill` skill 全局安装到当前环境中可识别的主流 Agent。支持的 Agent 索引见 [Supported Agents](https://github.com/vercel-labs/skills/blob/main/README.md#supported-agents)。

WorkBuddy 用户可以在连接器市场安装“深圳大学校园事务”，也可以在技能商店搜索 `szu-cli-skill` 安装 Skill。

验证 CLI：

```bash
szu-cli --version
szu-cli doctor
```

CLI 默认输出 JSON，便于 Agent 直接解析；`--json` 仍可作为旧调用的兼容参数。

## 高级 Skill 操作

如需生成 Cursor、Windsurf、Cline、Trae 等 AI IDE 使用的便携目录：

```bash
szu-cli skill install --target ai-ide --dest ./SZU-Campus.skill
```

该命令会把随包 skill 复制到 `./SZU-Campus.skill`，并额外生成 `AGENTS.md`，方便支持项目说明文件的 AI IDE 直接读取。

只查看随包 skill 路径，或将 skill 安装到自定义目录：

```bash
szu-cli skill path
szu-cli skill install --target codex
szu-cli skill install --dir ./tmp/skills
```

## 首次登录

CLI 不保存密码。打开持久化浏览器 profile，在网页里手动完成登录：

```bash
szu-cli auth login
szu-cli auth status
szu-cli auth logout
```

`auth login` 会等你关闭它打开的浏览器窗口后再退出。窗口关闭后，CLI 会清理本次启动的浏览器进程，登录态保留在本机 profile 中。
`auth logout` 会清理 CLI 专用浏览器 profile，不会索取或保存密码。

## 浏览器选择

CLI 会优先使用用户明确选择的浏览器，其次使用已保存的 CLI 浏览器选择，再检测系统默认的 Chrome/Edge，最后按 Chrome、Edge 顺序尝试。每个浏览器使用独立的 CLI profile。

当前支持 Google Chrome、Microsoft Edge 和 Playwright Chromium；Safari、Firefox 及其他默认浏览器不会被直接复用。

查看浏览器状态或主动选择：

```bash
szu-cli browser status
szu-cli browser use chrome
szu-cli browser use edge
```

如果没有可用的 Chrome 或 Edge，CLI 会推荐安装 Playwright Chromium。安装前需要明确确认，普通终端会显示下载进度：

```bash
szu-cli browser install chromium --yes
```

也可以通过 `SZU_BROWSER` 或旧的 `SZU_BROWSER_CHANNEL` 临时指定浏览器。Windows、macOS 和 Linux 的 Chrome/Edge 使用独立 profile，不能直接复用日常浏览器 profile。

例如使用 Edge：

```powershell
$env:SZU_BROWSER='edge'
szu-cli auth login
```

## 网络说明

- 优先支持直接校园网访问。
- 部分命令需要已登录的浏览器 profile。
- 电费查询目前需要校园内网访问。
- 学术数据库命令需要 `--headed`。
