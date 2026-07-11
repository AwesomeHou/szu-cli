# 发布检查

npm 包同时发布 CLI 和随包 `szu-campus` skill。skill 通过 `szu-cli skill install --target codex --json` 显式安装；`npm install` 不会写入 agent 配置目录。

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
npm install -g ./szu-cli-0.2.0.tgz
```

验证：

```bash
szu-cli --version
szu-cli doctor --json
szu-cli skill path --json
szu-cli skill install --target codex --json
szu-cli skill install --target ai-ide --dest ./SZU-Campus.skill --json
szu-cli skill install --target workbuddy --json
szu-cli skill install --target claudecode --json
```

然后手动初始化登录：

```bash
szu-cli auth login
szu-cli auth status --json
```

## 发布 Beta

使用 npm 的 beta 发布标签：

```bash
npm publish --tag beta
```

用户安装：

```bash
npm install -g szu-cli@beta
szu-cli skill install --target codex --json
```

## SkillHub / ClawHub

`skills/szu-campus` 单独上线 SkillHub 和 ClawHub 时，按正式 skill 发布，版本号使用 `0.2.0`，不带 alpha/beta 后缀。

仓库中的 `SKILL.md` 保持 Codex 标准 frontmatter。发布前生成临时 SkillHub 包，将市场元数据注入临时副本：

```bash
npm run skill:skillhub:prepare
skillhub publish scratch/skillhub-szu-campus --dry-run --json
skillhub publish scratch/skillhub-szu-campus --json
```

ClawHub CLI 发布 skill 时展示名来自 `--name` 或目录名。发布时显式传中文展示名，并用 `--topics` 补充中文主题：

```bash
clawhub skill publish skills/szu-campus --slug szu-campus --name "深圳大学校园事务 CLI" --version 0.2.1 --topics "深圳大学,校园事务,CLI,agent,szu-cli" --dry-run --json
clawhub skill publish skills/szu-campus --slug szu-campus --name "深圳大学校园事务 CLI" --version 0.2.1 --topics "深圳大学,校园事务,CLI,agent,szu-cli" --json
```

Alpha 通道冻结，不再同步 beta；只有明确恢复早期实验通道时才从 `develop` 更新 `alpha`。
## 发布稳定版

beta 验证完成并将 `package.json` 版本更新为稳定版后：

```bash
npm pkg get version
npm publish
```

用户安装：

```bash
npm install -g szu-cli
szu-cli skill install --target codex --json
```

## 安全边界

不要发布任何会保存密码、导出 cookies、绕过验证码、批量下载学术资源，或依赖隐藏供应商 URL 的版本。浏览器后端命令必须继续使用用户可见的正常网页流程。
