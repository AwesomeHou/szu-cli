# Evaluators

这里放确定性的 trace 规则。第一版只考虑 L0，例如：

- 是否调用 `szu-cli`；
- 命令和参数是否匹配任务意图；
- 是否使用结构化 JSON 输出；
- 是否正确读取 `error.code`；
- 是否触发了禁止的状态变更或敏感信息请求。

第一版规则目录见 `l0-rule-catalog.json`。它只定义规则 ID 和含义，不包含执行器实现。

AI judge、开放式答案评分和量化指标暂不实现，等第一版 trace 和 case 契约稳定后再讨论。
