# 安装

本项目通过一个 npm 包发布，同时包含 `szu-cli` CLI 和可选的 `szu-campus` agent skill。

## 从 npm 安装（推荐）

```bash
npx szu-cli@latest install
```

该命令会将 `szu-cli` 安装到 npm 全局路径，并调用 `npx skills add` 将 `szu-campus` skill 全局安装到当前环境中可识别的主流 Agent。支持的 Agent 索引见 [Supported Agents](https://github.com/vercel-labs/skills/blob/main/README.md#supported-agents)。

WorkBuddy 用户可以直接在技能商店搜索 `szu-campus` 安装 skill。

验证 CLI：

```bash
szu-cli --version
szu-cli doctor --json
```

## 高级 Skill 操作

如需生成 Cursor、Windsurf、Cline、Trae 等 AI IDE 使用的便携目录：

```bash
szu-cli skill install --target ai-ide --dest ./SZU-Campus.skill --json
```

该命令会把随包 skill 复制到 `./SZU-Campus.skill`，并额外生成 `AGENTS.md`，方便支持项目说明文件的 AI IDE 直接读取。

只查看随包 skill 路径，或将 skill 安装到自定义目录：

```bash
szu-cli skill path --json
szu-cli skill install --target codex --json
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
