# Cases

这里保存自然语言 Skill Eval case。当前已落地全部 69 个 case：

```text
001-course-today/                 101-notice-latest/             201-course-current/
002-grade-previous-term/         102-notice-category/           202-course-date-filter/
003-notice-scholarship/           103-notice-publisher/          203-course-empty/
004-sports-clarify-target/        104-notice-keyword-search/     204-course-page-changed/
005-readiness-check/              105-notice-detail/             205-course-week/
006-auth-profile-missing/         106-notice-download-one/       211-timetable-class-search/
007-command-login-required/       107-notice-empty-or-login/     212-timetable-class-view/
008-unsupported-command/                                           213-timetable-class-not-found/
301-grade-all/                    311-growth-summary/            321-ideology-summary/
302-grade-term/                   312-growth-list/               322-ideology-unavailable/
303-grade-empty-or-page-changed/  313-growth-unavailable/        323-ideology-earned-credits/
331-completion-summary-modules/   401-program-list-item/         411-lecture-available/
332-completion-module-courses/    402-program-not-found/          412-lecture-open-all/
333-completion-invalid-or-timeout/                               413-lecture-detail-progress/
334-completion-remaining-credits/                                  414-lecture-registration-unsupported/
                                                                  415-lecture-progress-sufficiency/
501-sports-discovery/             601-electricity-buildings/     701-library-basic-search/
502-sports-slots-complete-target/ 602-electricity-query/          702-library-advanced-item/
503-sports-reserve-dry-run/       603-electricity-missing-ambiguous/ 703-library-missing-or-unsupported/
504-sports-reserve-confirm/       604-electricity-network/        704-library-network/
505-sports-bookings-cancel/       705-library-location/
506-sports-unavailable/           801-cnki-search-status/         811-wanfang-search-advanced/
                                  802-cnki-advanced-citation/      812-wanfang-item-download-one/
                                  803-cnki-item-download-one/     813-wanfang-no-result-or-network/
                                  804-cnki-headed-or-login/
901-json-contract/                902-error-recovery-once/        903-privacy-minimal-output/
904-state-changing-guard/
```

单个 case 使用以下结构：

```text
<case-id>/
├── case.json       # 用户任务、Skill 版本、mock 和运行配置
├── oracle.json     # 期望行为和 L0 检查规则；不得暴露给 agent
└── fixture.json    # mock 后端输入来源；不得复制到 agent workspace
```

自然语言任务放在 `case.json`，不要直接把期望 CLI 命令写进 agent 的输入。`fixture.json` 可以引用仓库中的脱敏 CLI fixture，由 harness 转换为 mock 环境变量。
