export function classifyAuthPage(pageState) {
  const url = pageState.url ?? '';
  const title = pageState.title ?? '';
  const text = pageState.text ?? '';

  if (url.includes('authserver.szu.edu.cn') || title.includes('统一身份认证')) {
    return {
      loggedIn: false,
      reason: 'cas-login-page'
    };
  }

  if (text.includes('个人中心') && text.includes('注销')) {
    return {
      loggedIn: true,
      reason: 'szu-user-menu'
    };
  }

  if (title.includes('我的课程表') || (url.includes('/jwapp/sys/wdkb/') && text.includes('我的课程表'))) {
    return {
      loggedIn: true,
      reason: 'ehall-course-page'
    };
  }

  if (title.includes('成绩查询') || (url.includes('/jwapp/sys/cjcx/') && text.includes('成绩查询'))) {
    return {
      loggedIn: true,
      reason: 'ehall-grade-page'
    };
  }

  if (title.includes('深圳大学网上办事服务大厅') || (text.includes('深圳大学网上办事服务大厅') && text.includes('安全退出'))) {
    return {
      loggedIn: true,
      reason: 'ehall-home-page'
    };
  }

  return {
    loggedIn: false,
    reason: 'unknown'
  };
}
