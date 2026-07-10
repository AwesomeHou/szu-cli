# 学术数据库

仅通过深圳大学图书馆通道执行用户主动发起的知网、万方元数据检索、引用导出、条目详情或单篇下载操作。这些命令需要 `--headed`。

访问状态不确定时，先检查：

```bash
szu-cli cnki status --headed --json
szu-cli wanfang status --headed --json
```

## 按请求路由

| 用户意图 | 使用 | 边界 |
|---|---|---|
| 检索论文 | `cnki search <keyword> --headed --json` 或 `wanfang search <keyword> --headed --json` | 仅元数据 |
| 字段检索 | 知网：`--title`、可重复的 `--abstract`；万方：`--title`、`--author`、`--keyword`、`--abstract` | 仅使用已支持字段 |
| 过滤返回结果 | 添加 `--year <yyyy>` 或 `--type <type>` | 不改变远端服务商检索范围 |
| 导出引用 | 添加 `--format markdown`、`--format gbt7714` 或 `--format bibtex`；读取 `data.exports.items` | 不重新格式化或补造缺失字段 |
| 单篇详情 | `cnki item <url> --headed --json` 或 `wanfang item <url> --headed --json` | 条目命令不下载 |
| 单篇指定全文 | `cnki download <url> --headed --dir <path> --json` 或相应万方命令 | 仅点击页面可见下载按钮下载单篇 |

## 硬性限制

- 下载前优先获取元数据和引用。
- 不要批量下载 PDF、CAJ、原文或附件。
- 不要构造隐藏下载链接、绕过验证码/访问控制、转换 CAJ 或排队重试。
- 引用字符串必须来自可见元数据或 `data.exports`；不要凭记忆补全 DOI、期号、页码或作者信息。
