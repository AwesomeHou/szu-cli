# SZU Campus Skill

这是 `szu-cli` 配套的 Codex/Agent skill，用来告诉 agent 如何安全地调用深圳大学校园事务 CLI。核心业务逻辑在 `szu-cli` 内，skill 只保存使用说明、命令路由和安全边界。

## 安装

安装 `szu-cli` 后，可以一键安装本 skill：

```bash
szu-cli skill install --target codex --json
```

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
- `references/commands.md`: 常见需求到 CLI 命令的路由。
- `references/errors.md`: 结构化错误码处理。
- `references/privacy-safety.md`: 隐私、安全和状态变更边界。
- `references/academic-databases.md`: 学术数据库检索相关说明。
- `agents/`: 可选的 agent 侧辅助说明。

## 安全边界

- 默认使用 `--json`，让 agent 解析结构化输出。
- 优先只读查询。
- 体育预约、取消预约等状态变更必须先 `--dry-run`，真实执行必须由用户明确指定 `--confirm` 和具体目标。
- 不自动支付，不取消支付，不绕过认证、验证码、WebVPN、限流或访问控制。

