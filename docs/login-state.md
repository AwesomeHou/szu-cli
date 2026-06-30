# 登录态

项目需要保存登录态，但不能收集密码。

## 推荐模型

CLI 管理一个持久化浏览器 profile：

```text
~/.szu-cli/browser-profile/
```

Windows 上默认通过 Playwright 使用系统 Chrome 通道，避免首次登录前必须下载 Playwright 自带 Chromium。用户可以用 `SZU_BROWSER_CHANNEL` 覆盖通道，例如 `msedge`。

流程：

```text
szu-cli auth login
  -> 用持久化 profile 启动浏览器
  -> 用户手动完成 SZU 或 WebVPN 登录
  -> 登录完成后关闭浏览器窗口
  -> profile 留在本机供后续命令复用
```

后续命令复用同一个 profile：

```text
szu-cli notice list --json
  -> 用持久化 profile 打开页面
  -> 如果已登录，解析数据
  -> 如果跳转到登录页，返回 LOGIN_REQUIRED
```

当前登录检查：

```text
szu-cli auth status --json
  -> 用持久化 profile 打开 https://www1.szu.edu.cn/board/
  -> 页面出现 个人中心、注销 等深大用户菜单时视为已登录
  -> 进入 CAS 登录页时视为未登录
```

## 为什么不保存密码

保存密码会带来不必要风险，而且通常无法真正简化问题：

- CAS 流程可能包含重定向或二次校验。
- WebVPN 有自己的会话规则。
- 验证码和策略检查必须由用户自己完成。

CLI 应让用户通过正常网站登录。

## 备选方案

### HTTP Cookie 容器

可行但脆弱，需要手动处理登录流程、CSRF、重定向、cookie 刷新和 WebVPN 改写。

### 复用现有 Chrome Profile

可通过 CDP 实现，但侵入性更强，跨机器支持更麻烦。

### OpenCLI

未来可以作为可选后端，但不应成为基础架构的必需依赖。

## 过期处理

登录态不是永久的。CLI 应检测过期并提示用户重新登录，不应尝试绕过服务端过期策略。
