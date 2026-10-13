# Eval Harness

外部 harness 负责把一个 case 转换为一次可复现的 Codex CLI 运行。

计划职责：

- 创建临时 `HOME` 和 `CODEX_HOME`；
- 设置 `project_root_markers = []` 等最小运行配置；
- 创建并清理 staging workspace；
- 只复制 case 允许可见的 Skill 和 fixture；
- 启动独立的 `codex exec --json` 进程；
- 保存原始事件和标准化评测 trace；
- 调用确定性的 L0 evaluator。

当前 runner 已实现 mock/no-tool case 的启动、隔离、staging、JSONL 捕获和 L0 执行：

```bash
npm run eval -- --list
npm run eval -- --case 001-course-today --dry-run
npm run eval -- --all
npm run eval -- --all --no-reuse-auth
npm run eval:l0 -- --trace <trace.jsonl> --oracle <oracle.json>
```

默认使用 `gpt-5.6-luna` 和 `low` 推理强度；可以通过 `--model` 和
`--reasoning-effort` 覆盖。每个 case 的 `manifest.json` 会记录实际使用的配置。

一次完整运行会在 `evals/runs/<run-id>/` 下生成 `run-result.json`，每个 case 下包含 `manifest.json`、`staging/`、`raw-events.jsonl`、`trace.jsonl`、`stderr.log`、`final-answer.md` 和 `l0-result.json`。`raw-events.jsonl` 只用于本地诊断，不提交 Git。

默认使用 `codex` 或 `CODEX_BIN` 指定的可执行文件。每次运行使用临时 `HOME`、`CODEX_HOME` 和 `SZU_CLI_HOME`，在 `CODEX_HOME` 中只写入 `project_root_markers = []`，并通过 `--ignore-rules` 跳过 execpolicy rules。不会使用 `--ignore-user-config`，因为本 runner 需要加载这份临时最小配置。

真实 Codex 运行默认会复用当前用户的 ChatGPT/Codex 登录缓存：runner 将用户 `CODEX_HOME` 下的 `auth.json` 自动复制到本次临时 `CODEX_HOME`，并强制使用 file credential store。`--reuse-auth` 可显式表示这一默认行为；`--no-reuse-auth` 可关闭复制，适合 fake Codex 或无认证 dry tooling。该方式只支持文件形式的认证缓存；如果凭据在 Windows Credential Manager 中，则需要改用 API key 或单独登录。

`auth.json` 包含访问令牌。运行产物位于被 Git 忽略的 `evals/runs/` 下，仍不要提交或分享其中的文件。

默认不会复制 oracle 或 fixture 到 agent workspace。前三个 case 的 fixture 通过环境变量传给 `szu-cli` mock backend；认证 mock 必须显式设置 `SZU_MOCK_AUTH_LOGGED_IN` 和 `SZU_MOCK_AUTH_PROFILE_EXISTS`，否则 mock 不会仅凭页面文本推断已登录；第四个 case 在询问目标后不应调用校园 CLI。
