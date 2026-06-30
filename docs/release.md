# 发布检查

npm 包同时发布 CLI 和随包 `szu-campus` skill。skill 通过 `szu-cli setup codex` 显式安装；`npm install` 不会写入 agent 配置目录。

## 发布前检查

运行：

```bash
npm test
npm run docs:check
npm pack --dry-run
```

对照 `docs/cli-evals.md` 和 `docs/skill-evals.md` 检查新增或变更命令是否已有对应 eval 设计。

确认 dry-run 包含：

- `src/cli.js`
- `src/main.js`
- `src/modules/`
- `skills/szu-campus/SKILL.md`
- `docs/`
- `README.md`
- `README_EN.md`
- `LICENSE`
- `AGENTS.md`

## 本地 Tarball 安装测试

创建并安装 tarball：

```bash
npm pack
npm install -g ./szu-cli-0.1.0-alpha.2.tgz
```

验证：

```bash
szu-cli --version
szu-cli doctor --json
szu-cli skill path --json
szu-cli setup codex --json
```

然后手动初始化登录：

```bash
szu-cli auth login
szu-cli auth status --json
```

## 发布 Alpha

使用 npm 的 alpha 发布标签：

```bash
npm publish --tag alpha
```

用户安装：

```bash
npm install -g szu-cli@alpha
szu-cli setup codex
```

## 发布稳定版

alpha 验证完成后：

```bash
npm version 0.1.0
npm publish
```

用户安装：

```bash
npm install -g szu-cli
szu-cli setup codex
```

## 安全边界

不要发布任何会保存密码、导出 cookies、绕过验证码、批量下载学术资源，或依赖隐藏供应商 URL 的版本。浏览器后端命令必须继续使用用户可见的正常网页流程。
