# 错误处理

始终解析 JSON，并根据 `error.code` 分支处理。

## 常见错误码

- `BACKEND_UNAVAILABLE`：浏览器后端无法启动；运行或提示用户运行 `szu-cli doctor --json`。
- `LOGIN_REQUIRED`：让用户运行 `szu-cli auth login`；用户确认完成登录后，原命令最多重试一次。
- `WEBVPN_LOGIN_REQUIRED`：让用户通过 WebVPN 登录。
- `NETWORK_REQUIRED`：说明该功能需要校园网或 WebVPN。
- `PERMISSION_DENIED`：说明当前账号无权访问；不要尝试绕过或反复重试。
- `PAGE_CHANGED`：页面适配可能已经失效；不要从异常页面猜测数据。
- `SKILL_NOT_FOUND`：随 CLI 发布的 skill 缺失；检查安装包或重新安装 CLI。
- `PROGRAM_NOT_FOUND`：让用户重新运行 `szu-cli program list --json`。
- `CLASS_NOT_FOUND`：让用户重新运行 `szu-cli timetable classes --json`。
- `MODULE_NOT_FOUND`：让用户重新运行 `szu-cli completion modules --json`。
- `CALCULATION_TIMEOUT`：不要激进重试；仅在用户仍需要结果且等待合理时增加 `--timeout <seconds>`。
- `LECTURE_NOT_FOUND`：让用户重新运行 `szu-cli lecture list --json`。
- `SPORTS_CONFIRM_REQUIRED`：使用 `--dry-run` 预览；只有用户明确确认后才能改用 `--confirm`。
- `SPORTS_CAMPUS_NOT_FOUND`：重新运行 `szu-cli sports campuses --json`。
- `SPORTS_VENUE_NOT_FOUND`：重新运行 `szu-cli sports venues --campus <name> --json`。
- `SPORTS_SLOT_NOT_FOUND` / `SPORTS_SLOT_UNAVAILABLE`：重新运行 `szu-cli sports slots ... --json` 并选择可用时段。
- `SPORTS_SUBMIT_UNVERIFIED`：不要自动重试；让用户检查“我的预约”，或运行 `szu-cli sports bookings --json`。
- `SPORTS_BOOKING_NOT_FOUND`：重新运行 `szu-cli sports bookings --json` 并使用目标记录的 `orderNo`。
- `SPORTS_CANCEL_UNVERIFIED`：不要自动重试；运行 `szu-cli sports bookings --json` 检查订单状态。
- `DOWNLOAD_UNAVAILABLE`：说明页面可见下载按钮不可用；不要构造直链。
- `RATE_LIMITED`：立即停止重试。
- `HEADED_REQUIRED`：在同一学术数据库命令中添加 `--headed` 后重试。
- `UNSUPPORTED_ACTION`：说明当前 CLI 尚不支持该命令。
- `UNKNOWN_ERROR`：保留原始错误提示并停止；不要猜测结果或循环重试。

## 重试规则

- 仅在用户完成登录后重试登录错误命令。
- 短暂网络错误最多重试一次，除非用户明确要求再次尝试。
- 不要批量重试学术数据库下载、公文通附件下载、讲座操作或体育预约。
- 访问状态不明确时，先运行对应的 `status` 命令。
- `error.hint` 包含安全的后续命令时，保留其原始内容。
