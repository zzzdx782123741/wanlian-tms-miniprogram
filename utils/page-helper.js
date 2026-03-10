/**
 * 页面辅助函数
 * 统一管理页面初始化、权限检查、下拉刷新等逻辑
 */

const app = getApp();

/**
 * 检查用户登录状态
 * @returns {object|null} 用户信息或 null
 */
function checkLogin() {
  const userInfo = app.globalData.userInfo;

  if (!userInfo) {
    wx.redirectTo({
      url: '/pages/auth/login/login'
    });
    return null;
  }

  return userInfo;
}

/**
 * 检查角色权限
 * @param {string|string[]} allowedRoles - 允许的角色列表
 * @param {string} logPrefix - 日志前缀
 * @returns {boolean} 是否有权限
 */
function checkRole(allowedRoles, logPrefix) {
  const role = app.globalData.role || wx.getStorageSync('role') || '';

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(role)) {
    console.warn(`[${logPrefix}] 权限不足: 当前角色 ${role}，需要角色 ${roles.join(', ')}`);
    wx.showToast({
      title: '权限不足',
      icon: 'none'
    });
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }, 1500);
    return false;
  }

  return true;
}

/**
 * 创建带下拉刷新的页面配置
 * @param {function} loadDataFn - 加载数据的函数
 * @returns {object} 包含 onPullDownRefresh 方法的对象
 */
function createPullRefreshMixin(loadDataFn) {
  return {
    onPullDownRefresh() {
      if (typeof loadDataFn === 'function') {
        loadDataFn.call(this);
      }
      setTimeout(() => {
        wx.stopPullDownRefresh();
      }, 1000);
    }
  };
}

/**
 * 标准下拉刷新处理（适用于大多数列表页面）
 * @param {object} pageInstance - 页面实例
 */
function standardPullRefresh(pageInstance) {
  if (typeof pageInstance.loadData === 'function') {
    pageInstance.loadData();
  }
  setTimeout(() => {
    wx.stopPullDownRefresh();
  }, 1000);
}

/**
 * 跳转到订单详情页面
 * @param {string} orderId - 订单ID
 */
function navigateToOrderDetail(orderId) {
  if (!orderId) {
    console.error('[navigateToOrderDetail] 订单ID不能为空');
    return;
  }
  wx.navigateTo({
    url: `/pages/order-detail/order-detail?id=${orderId}`
  });
}

/**
 * 跳转到技师绩效页面
 * @param {string} technicianId - 技师ID
 */
function navigateToTechnicianPerformance(technicianId) {
  if (!technicianId) {
    console.error('[navigateToTechnicianPerformance] 技师ID不能为空');
    return;
  }
  wx.showToast({
    title: '技师绩效页暂未开放',
    icon: 'none'
  });
}

/**
 * 跳转到订单列表页面
 * @param {string} type - 订单筛选类型（可选）
 */
function navigateToOrders(type) {
  let url = '/pages/orders/orders';
  if (type) {
    url += `?type=${type}`;
  }
  wx.navigateTo({ url });
}

/**
 * 跳转到门店库存详情页面
 * @param {string} itemId - 商品ID
 */
function navigateToStockDetail(itemId) {
  if (!itemId) {
    console.error('[navigateToStockDetail] 商品ID不能为空');
    return;
  }
  wx.showToast({
    title: '库存详情页暂未开放',
    icon: 'none'
  });
}

module.exports = {
  checkLogin,
  checkRole,
  createPullRefreshMixin,
  standardPullRefresh,
  navigateToOrderDetail,
  navigateToTechnicianPerformance,
  navigateToOrders,
  navigateToStockDetail
};
