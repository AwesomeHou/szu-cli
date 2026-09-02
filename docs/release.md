# 发布检查

npm 包同时发布 CLI 和随包 `szu-cli-skill` Skill。用户推荐运行 `npx szu-cli@latest install`，该命令会全局安装 CLI，并通过 `npx skills add` 将 Skill 安装到当前环境中可识别的主流 Agent。

## 发布前检查

运行：

```bash
npm test
npm run docs:check
npm pack --dry-run
npm run workbuddy:check
```

对照 `docs/skill-evals.md` 检查新增或变更命令是否已有对应 skill eval 设计。

确认 dry-run 包含：

- `src/cli.js`
- `src/main.js`
- `src/modules/`
- `skills/szu-cli-skill/SKILL.md`
- `docs/`
- `README.md`
- `README_EN.md`
- `LICENSE`
- `AGENTS.md`

## 当前发布状态

- 本次待发布稳定版：`0.2.2`；发布前 npm `latest` 仍指向 `0.2.1`。
- 预发布：只维护 `beta` 通道，当前版本为 `0.2.0-beta.1`。
- `alpha` 仅作为历史版本保留，不再继续发布或维护。

## 本地 Tarball 安装测试

创建并安装 tarball：

```bash
npm pack
npm install -g ./szu-cli-0.2.2.tgz
```

验证：

```bash
szu-cli --version
szu-cli doctor
szu-cli skill path
szu-cli skill install --target codex
szu-cli skill install --target ai-ide --dest ./SZU-Campus.skill
szu-cli skill install --target workbuddy
szu-cli skill install --target claudecode
```

然后手动初始化登录：

```bash
szu-cli auth login
szu-cli auth status
```

## 发布 Beta

只使用 npm 的 `beta` 标签发布预发布版本：

```bash
npm publish --tag beta
```

用户安装：

```bash
npx szu-cli@beta install
```

不再创建新的 alpha 通道。已经发布的 alpha 版本会保留在 npm 的版本历史中；如需隐藏旧的 dist-tag，应单独执行 npm tag 管理，不影响已发布版本。若 npm 账号启用了 `auth-and-writes` 二次验证，删除标签时需要在本地附带一次性验证码：`npm dist-tag rm szu-cli alpha --otp=<一次性验证码>`。

## SkillHub / ClawHub

`skills/szu-cli-skill` 单独上线 SkillHub 和 ClawHub 时，按正式 Skill 发布，版本号使用 `0.2.2`，不带 alpha/beta 后缀。

仓库中的 `SKILL.md` 保持 Codex 标准 frontmatter。发布前生成临时 SkillHub 包，将市场元数据注入临时副本：

```bash
npm run skill:skillhub:prepare
skillhub publish scratch/skillhub-szu-cli-skill --dry-run
skillhub publish scratch/skillhub-szu-cli-skill
```

ClawHub CLI 发布 skill 时展示名来自 `--name` 或目录名。发布时显式传中文展示名，并用 `--topics` 补充中文主题：

```bash
clawhub skill publish skills/szu-cli-skill --slug szu-cli-skill --name "深圳大学—校园事务Skill" --version 0.2.2 --topics "深圳大学,校园事务,Skill,CLI,agent,szu-cli" --dry-run
clawhub skill publish skills/szu-cli-skill --slug szu-cli-skill --name "深圳大学—校园事务Skill" --version 0.2.2 --topics "深圳大学,校园事务,Skill,CLI,agent,szu-cli"
```

## WorkBuddy 连接器

连接器元数据和 CLI 配置位于 `connectors/workbuddy`。上传前运行：

```bash
npm run workbuddy:check
npm run workbuddy:prepare
```

将 `scratch/workbuddy-connector` 的内容直接打包为 ZIP，ZIP 根目录应直接包含 `connector-meta.json`、`cli.json`、`icon.svg` 和 `skills/szu-cli-skill/`。WorkBuddy 连接器与 npm tarball、SkillHub/ClawHub Skill 是独立发布物。

## 发布稳定版

本次稳定版为 `0.2.2`。确认 npm 登录状态后执行：

```bash
npm pkg get version
npm publish
```

用户安装：

```bash
npx szu-cli@latest install
```

## 安全边界

不要发布任何会保存密码、导出 cookies、绕过验证码、批量下载学术资源，或依赖隐藏供应商 URL 的版本。浏览器后端命令必须继续使用用户可见的正常网页流程。
