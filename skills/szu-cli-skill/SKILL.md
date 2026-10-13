---
name: szu-cli-skill
display_name: 深圳大学—校园事务Skill
display_name_en: Shenzhen University — Campus Services Skill
description: 当用户需要通过本地 szu-cli 查询或操作深圳大学校园事务时使用，包括公文通、课表、成绩、电费、图书馆文献查询、健身房预约和知网论文下载等 10+ 个模块；深大学生自行制作，非官方，可在 github.com/AwesomeHou/szu-cli 反馈问题。
description_zh: 通过自然语言完成公文通、课表、成绩、电费、图书馆文献查询，健身房预约，知网论文下载等操作，覆盖深圳大学校园服务的 10+ 个模块；深大学生自行制作，非官方，可在 github.com/AwesomeHou/szu-cli 反馈问题或通过电子邮件联系作者。
description_en: Use natural language with the local szu-cli to query notices, timetables, grades, electricity balances, library literature, CNKI papers, and gym reservations across 10+ Shenzhen University campus modules. Built by Shenzhen University students; unofficial. Report issues at github.com/AwesomeHou/szu-cli or contact the author by email.
version: 0.2.3
author: Awesome
license: MIT
metadata:
  compatible_cli: ">=0.2.3"
---

# 深圳大学—校园事务Skill

以本地 `szu-cli` 为唯一事实来源。本 Skill 由深大学生自行制作，非官方，如有任何问题可在 [github.com/AwesomeHou/szu-cli](https://github.com/AwesomeHou/szu-cli) 上进行反馈或通过电子邮件与我取得联系。它只提供调用指引，不在此实现校园网站抓取、浏览器自动化或业务逻辑。

## 开始前

执行校园查询前，先检查本地环境：

```bash
node --version
szu-cli --version
```

`szu-cli` 要求 Node.js 20 或更高版本。若 Node.js 缺失或版本过低，先提示用户安装或升级。

若未安装 `szu-cli`，变更用户环境前先征得同意，再让用户执行：

```bash
npx szu-cli@latest install
```

安装后验证 CLI：

```bash
szu-cli doctor
szu-cli auth status
```

所有 CLI 命令默认输出 JSON；不要额外追加 `--json`。旧调用中出现的 `--json` 仍可兼容执行。

不要静默安装 CLI。需要登录时，让用户执行：

```bash
szu-cli auth login
```

用户应在 CLI 打开的浏览器窗口中完成登录。

如果用户要求断开本机登录态，执行 `szu-cli auth logout`。不要删除用户日常浏览器的 profile。

## 工作流

1. 将用户请求映射到最小可用的只读命令。
2. 直接执行命令；仅在需要可视浏览器时添加 `--headed`。
3. `ok: false` 时，按 `references/errors.md` 中的 `error.code` 处理。
4. `ok: true` 时，只基于返回字段作答，并仅保留必要的隐私数据。

## 体育预约流程

体育预约不是先探索校园选项，而是先确认用户要预约的唯一目标。开始任何 `sports` 命令前，必须确认：

- 校区，对应 `--campus`；
- 场馆或预约项目，对应 `--venue`；
- 具体场地，对应 `--field`；
- 预约日期和目标时间。

如果任一信息缺失或表述不唯一，先向用户询问缺失信息并停止本轮操作，不要调用 `sports campuses`、`sports venues` 或 `sports dates` 来替用户猜测目标。只有用户明确要求浏览可用校区或场馆选项时，才使用这些发现命令。

目标信息齐全后，保留用户提供的校区、场馆和场地名称原文，直接使用 `sports slots --campus <name> --venue <name> --date <YYYY-MM-DD>` 获取该日期的可用时段；不要把 `sports campuses`、`sports venues` 或 `sports dates` 作为预约流程的默认前置步骤。确认目标时段可用后，先使用完整参数运行 `sports reserve ... --dry-run` 预览，再等待用户明确确认，才可以使用同一目标的 `--confirm` 执行真实预约。

## 成绩查询流程

成绩请求直接使用 `szu-cli grade list`，需要查询相对学期时，根据当前任务提供的日期上下文将“上个学期”等相对表达转换为明确的 `--term`。当前 CLI 的 `grade list` 不支持 `--help`；不要通过执行帮助命令探测参数，读取本 Skill 的参考文件并直接构造查询命令。

讲座功能当前仅支持 `lecture status/list/item/progress` 的只读查询，不支持报名或取消报名。遇到报名请求时直接说明能力边界；如果用户同时给出了讲座 ID，可以提供详情查询，但不能调用隐藏接口或声称报名成功。

## 操作规则

- Agent 工作流解析默认 JSON，不要依赖 stdout 文案。
- 每次只运行一条会启动浏览器的命令；如果执行工具显示进程仍在运行，先等待并读取结果，不能因暂时无输出就重启。遇到特定的浏览器启动错误时，先检查是否有前一条命令未结束。
- 浏览器不可用时，先告知用户可安装 Chrome、Edge 或推荐的 Playwright Chromium；安装 Chromium 必须获得用户明确确认，并使用 `browser install chromium --yes`。
- 优先只读命令。任何会改变状态的操作都需要用户明确确认。
- 体育预约遵循上面的“体育预约流程”；预约必须用 `--field` 指定唯一场地。除非用户明确指定唯一目标且已完成 dry-run 预览，否则不要运行 `sports reserve --confirm`、`sports cancel --confirm`、支付或重复尝试。
- 不要索取密码、Cookie、令牌或浏览器 profile 文件。
- 不要绕过认证、验证码、校园网络限制、限流、下载控制或访问控制。
- 不要激进重试。遇到 `RATE_LIMITED` 立即停止；登录和网络错误各处理一次。
- 成绩、绩点、排名、身份字段和学习记录均为隐私；只回显用户所需内容。
- 用户已经提供精确班级代码时，直接使用 `timetable view <classCode>`；只有需要按年级/专业寻找班级代码时，才先使用 `timetable classes`。
- 要求 `szu-cli >= 0.2.3`。

## 按需读取参考文件

仅读取当前任务需要的文件：

- `@references/commands.md`：模块级路由，用于确定请求属于哪个命令域。
- `@references/examples.md`：自然语言到 CLI 的示例；用户用日常语言提问或命令形式不明确时读取。
- `@references/academic-databases.md`：知网、万方的元数据检索、引用导出、条目详情和单篇可见按钮下载规则。
- `@references/errors.md`：结构化错误、重试限制与后续命令。
- `@references/privacy-safety.md`：密码、Cookie、profile、下载、隐私数据和状态变更边界。

信息冲突时，以已安装 `szu-cli` 的实际行为和随 CLI 发布的 `docs/cli-contract.md` 为准。

