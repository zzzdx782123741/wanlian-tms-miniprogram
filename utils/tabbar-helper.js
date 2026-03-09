/**
 * TabBar 辅助函数
 * 统一管理自定义 TabBar 的角色状态更新
 */

const app = getApp();

/**
 * 更新页面 TabBar 角色状态
 * @param {object} pageInstance - 页面实例（通常传 this）
 * @param {string} logPrefix - 日志前缀（用于标识页面）
 */
function updateTabBarRole(pageInstance, logPrefix) {
  if (typeof pageInstance.getTabBar !== 'function') {
    return;
  }

  const tabBar = pageInstance.getTabBar();
  if (!tabBar) {
    return;
  }

  // 重新加载角色（增强容错性）
  let role = app.globalData.role || wx.getStorageSync('role') || '';
  console.log(`[${logPrefix}] onShow - 当前角色:`, role);

  // 如果角色为空，尝试从 userInfo 中提取
  if (!role) {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (userInfo && userInfo.role) {
      const extractedRole = typeof userInfo.role === 'object' ? userInfo.role.type : userInfo.role;
      if (extractedRole) {
        app.globalData.role = extractedRole;
        wx.setStorageSync('role', extractedRole);
        console.log(`[${logPrefix}] 从 userInfo 提取角色:`, extractedRole);
        tabBar.setData({ role: extractedRole });
      }
    }
  } else {
    tabBar.setData({ role });
  }

  if (tabBar.updateTabBar) {
    tabBar.updateTabBar();
  }
}

module.exports = {
  updateTabBarRole
};
