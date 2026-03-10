const app = getApp();
const request = require('../../utils/request');

function extractOrders(response) {
  if (Array.isArray(response?.data?.orders)) return response.data.orders;
  if (Array.isArray(response?.orders)) return response.orders;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
}

function extractVehicles(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.vehicles)) return response.data.vehicles;
  if (Array.isArray(response?.vehicles)) return response.vehicles;
  if (Array.isArray(response)) return response;
  return [];
}

Page({
  data: {
    userInfo: null,
    roleText: '',
    stats: {
      totalOrders: 0,
      vehicleCount: 0,
      completedOrders: 0,
      pendingOrders: 0
    }
  },

  onLoad() {
    this.initUserProfile();
    this.loadStats();
  },

  onShow() {
    this.initUserProfile();
    this.loadStats();

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const tabBar = this.getTabBar();

      // 重新加载角色（增强容错性）
      const role = app.globalData.role || wx.getStorageSync('role') || '';
      console.log('[我的] onShow - 当前角色:', role);

      // 如果角色为空，尝试从userInfo中提取
      if (!role) {
        const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
        if (userInfo && userInfo.role) {
          const extractedRole = typeof userInfo.role === 'object' ? userInfo.role.type : userInfo.role;
          if (extractedRole) {
            app.globalData.role = extractedRole;
            wx.setStorageSync('role', extractedRole);
            console.log('[我的] 从userInfo提取角色:', extractedRole);
            tabBar.setData({ role: extractedRole });
          }
        }
      } else {
        tabBar.setData({ role });
      }

      tabBar.updateTabBar();
    }
  },

  onPullDownRefresh() {
    this.loadStats().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  initUserProfile() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    const role = app.globalData.role || wx.getStorageSync('role') || userInfo?.role?.type;

    if (!userInfo) return;

    const roleMap = {
      DRIVER: '司机',
      FLEET_MANAGER: '车队管理员',
      STORE_TECHNICIAN: '门店技师',
      STORE_MANAGER: '门店管理员',
      PLATFORM_OPERATOR: '平台运营'
    };

    this.setData({
      userInfo,
      roleText: roleMap[role] || '用户'
    });
  },

  async loadStats() {
    await Promise.allSettled([
      this.loadOrderStats(),
      this.loadVehicleStats()
    ]);
  },

  async loadOrderStats() {
    try {
      const res = await request.get('/orders', { page: 1, limit: 100 });
      const orders = extractOrders(res);

      const totalOrders = orders.length;
      const completedOrders = orders.filter((o) => o.status === 'completed' || o.status === 'refunded').length;

      this.setData({
        stats: {
          ...this.data.stats,
          totalOrders,
          completedOrders,
          pendingOrders: totalOrders - completedOrders
        }
      });
    } catch (error) {
      console.error('加载订单统计失败:', error);
    }
  },

  async loadVehicleStats() {
    try {
      const res = await request.get('/vehicles');
      const vehicles = extractVehicles(res);

      this.setData({
        stats: {
          ...this.data.stats,
          vehicleCount: vehicles.length
        }
      });
    } catch (error) {
      console.error('加载车辆统计失败:', error);
    }
  },

  onMyOrders() {
    wx.switchTab({
      url: '/pages/orders/orders'
    });
  },

  onMyVehicles() {
    wx.switchTab({
      url: '/pages/vehicle/vehicle'
    });
  },

  onContactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服热线：400-888-8888\n服务时间：9:00-18:00',
      confirmText: '拨打电话',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({ phoneNumber: '400-888-8888' });
        }
      }
    });
  },

  onAddressManage() {
    wx.navigateTo({
      url: '/pages/address-list/address-list'
    });
  },

  onAbout() {
    wx.showModal({
      title: '关于万联驿站',
      content: '万联驿站 2.0 v1.0\n为物流车队提供专业的车辆维修管理服务',
      showCancel: false
    });
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (!res.confirm) return;

        if (typeof app.clearUserInfo === 'function') {
          app.clearUserInfo();
        } else {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('role');
        }

        wx.reLaunch({
          url: '/pages/auth/login/login'
        });
      }
    });
  }
});
