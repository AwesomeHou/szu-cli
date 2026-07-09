# SZU Campus Skill

这是 `szu-cli` 配套的 Codex/Agent skill，用来告诉 agent 如何安全地调用深圳大学校园事务 CLI。核心业务逻辑在 `szu-cli` 内，skill 只保存使用说明、命令路由和安全边界。

## 推荐安装

推荐用一行命令同时安装 `szu-cli` 和本 skill：

```bash
npm install -g szu-cli@beta && szu-cli skill install --target codex --json
```

如果已经安装过 `szu-cli`，只安装或更新 skill：

```bash
szu-cli skill install --target codex --json
```

上架后，也可以从 SkillHub 或 ClawHub 安装本 skill：

```bash
skillhub install szu-campus
clawhub install szu-campus
```

但 skill 只是 agent 使用说明，仍然需要本机安装 `szu-cli` 才能真正查询校园事务。

也可以从本仓库复制 `skills/szu-campus` 到 Codex 的 skills 目录。

## 使用前检查

```bash
szu-cli doctor --json
szu-cli auth status --json
```

如需登录：

```bash
szu-cli auth login
```

登录过程由用户在浏览器中完成。不要把密码、Cookie、Token 或浏览器 profile 交给 agent。

## 目录

- `SKILL.md`: agent 入口说明。
- `references/commands.md`: 模块到命令的路由。
- `references/examples.md`: 自然语言到 CLI 命令的示例。
- `references/errors.md`: 结构化错误码处理。
- `references/privacy-safety.md`: 隐私、安全和状态变更边界。
- `references/academic-databases.md`: 学术数据库检索相关说明。
- `agents/`: 可选的 agent 侧辅助说明。

## 安全边界

- 默认使用 `--json`，让 agent 解析结构化输出。
- 优先只读查询。
- 体育预约、取消预约等状态变更必须先 `--dry-run`，真实执行必须由用户明确指定 `--confirm` 和具体目标。
- 不自动支付，不取消支付，不绕过认证、验证码、WebVPN、限流或访问控制。

