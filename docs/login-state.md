# 登录态

项目需要保存登录态，但不能收集密码。

## 推荐模型

CLI 管理一个持久化浏览器 profile：

```text
~/.szu-cli/browser-profiles/<browser>/
```

浏览器选择顺序是：用户显式选择、已保存的 CLI 选择、系统默认 Chrome/Edge、Chrome、Edge；都不可用时推荐用户确认安装 Playwright Chromium。用户可以用 `SZU_BROWSER` 指定 `chrome`、`edge` 或 `chromium`，旧的 `SZU_BROWSER_CHANNEL` 仍兼容。

Chrome、Edge 和 Chromium 各自使用独立目录：

```text
~/.szu-cli/browser-profiles/chrome/
~/.szu-cli/browser-profiles/edge/
~/.szu-cli/browser-profiles/chromium/
```

不同浏览器的登录态不保证互通，切换浏览器后通常需要重新登录。CLI 不直接复用你日常浏览器的个人 profile。

升级前已经存在的 `~/.szu-cli/browser-profile/` 会作为一次性兼容 profile 使用，不会被自动复制到其他浏览器目录。

CLI 不应该挤掉你日常浏览器里的登录态。只有学校系统服务端限制“同一账号只能保留一个会话”时，CLI 新登录才可能让另一个浏览器会话失效；这不是 Chrome/Edge 本地 profile 互相覆盖，而是服务端会话策略。

流程：

```text
szu-cli auth login
  -> 用持久化 profile 启动浏览器
  -> 用户手动完成 SZU 服务登录
  -> 登录完成后关闭浏览器窗口
  -> CLI 等待窗口关闭并清理浏览器进程
  -> profile 留在本机供后续命令复用
```

后续命令复用同一个 profile：

```text
szu-cli notice list
  -> 用持久化 profile 打开页面
  -> 如果已登录，解析数据
  -> 如果跳转到登录页，返回 LOGIN_REQUIRED，并提示运行 auth login
```

当前登录检查：

```text
szu-cli auth status
  -> 用持久化 profile 打开 https://www1.szu.edu.cn/board/
  -> 页面出现 个人中心、注销 等深大用户菜单时视为已登录
  -> 进入 CAS 登录页时视为未登录
```

`auth status` 只检查状态，不会因为没有浏览器或 profile 而自动安装浏览器。

## 登录检查的范围

同一个 CLI profile 保存各网站的浏览器状态，并可复用统一身份认证。公文通、图书馆、eHall 门户和 eHall 子应用仍可能拥有各自的服务端会话；一个网站已登录，不代表其他网站也已登录或允许访问。

`auth status` 的 `scope: "checked-url"` 表示结果只适用于 `checkedUrl` 对应的页面。默认检查公文通；使用 `--url https://ehall.szu.edu.cn/new/index.html` 时检查 eHall 门户，不代表检查所有 eHall 子应用。

`status` 明确区分三种结果：

- `authenticated`：检测到页面的登录依据，`loggedIn: true`。
- `unauthenticated`：检测到登录入口、CAS 登录页，或档案不存在，`loggedIn: false`。
- `unknown`：页面无法识别，无法确认是否登录；为兼容保留 `loggedIn: false`，不能据此断言未登录。

eHall 门户只有出现“安全退出”等登录依据才判为已登录。首页能加载、HTTP 200 或页面标题正确，都不能单独证明已登录。门户未登录也不能据此认定成绩、课表等子应用未登录；应分别运行模块命令验证。模块成功读取受保护数据，只能证明该次操作可用。

`course status/list/today` 会先经过 eHall 的 `/login` 入口，复用有效的统一身份认证会话建立门户会话，再从大厅的“我的课表”卡片读取应用 ID，经 `/appShow?appId=...` 打开课表。不会把目录中裸课表地址当成完整启动流程，也不会保存或硬编码 `gid_` 等临时参数。统一认证需要手动登录时返回 `LOGIN_REQUIRED`；大厅应用入口无法识别时返回 `PAGE_CHANGED`。

## 为什么不保存密码

保存密码会带来不必要风险，而且通常无法真正简化问题：

- CAS 流程可能包含重定向或二次校验。
- 验证码和策略检查必须由用户自己完成。

CLI 应让用户通过正常网站登录。

## 备选方案

### HTTP Cookie 容器

可行但脆弱，需要手动处理登录流程、CSRF、重定向和 cookie 刷新。

### 复用现有 Chrome Profile

可通过 CDP 实现，但侵入性更强，跨机器支持更麻烦。

### OpenCLI

未来可以作为可选后端，但不应成为基础架构的必需依赖。

## 过期处理

登录态不是永久的。CLI 应检测过期并提示用户重新登录，不应尝试绕过服务端过期策略。
