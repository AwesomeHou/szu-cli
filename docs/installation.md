# 安装

本项目通过一个 npm 包发布，同时包含 `szu-cli` CLI 和可选的 `szu-campus` agent skill。

## 安装 CLI

安装 alpha 版本：

```bash
npm install -g szu-cli@alpha
```

安装本地 tarball：

```bash
npm install -g ./szu-cli-0.1.0-alpha.2.tgz
```

验证 CLI：

```bash
szu-cli --version
szu-cli doctor --json
```

## 安装 Codex Skill

npm 包内包含 `skills/szu-campus`，但 `npm install` 不会自动写入 agent 目录。需要显式安装：

```bash
szu-cli setup codex
```

该命令会把随包 skill 复制到 Codex 可见的个人 skill 目录：

```text
~/.agents/skills/szu-campus
```

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
szu-cli skill install --target codex --dir ./tmp/skills --json
szu-cli setup codex --skill-dir ./tmp/skills --json
```

## 首次登录

CLI 不保存密码。打开持久化浏览器 profile，在网页里手动完成登录：

```bash
szu-cli auth login
szu-cli auth status --json
```

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
