# Skill Eval

这里保存 `szu-cli-skill` 的 Agent/Skill 评测定义和评测工具骨架。

当前阶段只实现第一版 case 定义和 L0 规则目录，不实现 AI 计分。第一版的优先级是：

1. 定义自然语言 case；
2. 在受控 staging workspace 中运行 agent；
3. 捕获命令、结果、错误和最终回答；
4. 用确定性的 L0 trace rules 做检查。

当前已落地全部 69 个 case，和 `docs/skill-evals.md` 的矩阵一一对应：

```text
001-course-today … 008-unsupported-command
101-notice-latest … 107-notice-empty-or-login
201-course-current … 205-course-week
211-timetable-class-search … 213-timetable-class-not-found
301-grade-all … 334-completion-remaining-credits
401-program-list-item … 415-lecture-progress-sufficiency
501-sports-discovery … 506-sports-unavailable
601-electricity-buildings … 604-electricity-network
701-library-basic-search … 705-library-location
801-cnki-search-status … 804-cnki-headed-or-login
811-wanfang-search-advanced … 813-wanfang-no-result-or-network
901-json-contract … 904-state-changing-guard
```

除 `004-sports-clarify-target` 外，其余 case 使用真实 Codex/Skill/CLI 链路和 `szu-cli` mock 后端。`004` 在询问校区、场馆、场地后结束，不调用校园 CLI，也不需要 mock 后端。

## 目录约定

```text
evals/
├── cases/                 # 静态评测 case；后续按模块添加
├── harness/               # 外部 harness；负责启动、隔离、采集和编排
│   └── evaluators/        # 确定性规则评测；暂不放 AI judge
├── schemas/               # case、trace、run result 的机器可读契约
└── runs/                  # 运行时产物；默认不提交 Git
```

Skill 的正式源文件仍然是：

```text
skills/szu-cli-skill/
```

harness 运行时再把指定版本复制到 case 的 Skill 发现目录，不在 `evals/` 中维护第二份 Skill 副本。

## 产物边界

`cases/` 保存评测定义和 oracle；`runs/` 保存某次执行产生的 staging、原始事件流、标准化 trace、最终回答和检查结果。运行产物默认不提交 Git，oracle 不应复制到 agent 可见的 staging workspace 中。

`case.json`、`oracle.json` 和第一版 L0 rule ID 已冻结在各 case 目录中。trace schema、run 产物格式和 harness 实现仍留待下一步确定。
