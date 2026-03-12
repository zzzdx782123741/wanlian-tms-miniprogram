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

function getRoleType(userInfo) {
  const rawRole = app.globalData.role || wx.getStorageSync('role') || userInfo?.role;
  return typeof rawRole === 'object' ? rawRole?.type : rawRole;
}

function isVehicleRole(role) {
  return role === 'DRIVER' || role === 'FLEET_MANAGER' || role === 'PLATFORM_OPERATOR';
}

function getRoleText(role) {
  const roleMap = {
    DRIVER: '司机',
    FLEET_MANAGER: '车队管理员',
    STORE_TECHNICIAN: '门店技师',
    STORE_MANAGER: '门店管理员',
    PLATFORM_OPERATOR: '平台运营'
  };

  return roleMap[role] || '用户';
}

Page({
  data: {
    userInfo: null,
    roleType: '',
    roleText: '',
    secondaryStatLabel: '我的车辆',
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
      const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
      const role = getRoleType(userInfo) || '';

      if (role) {
        app.globalData.role = role;
        wx.setStorageSync('role', role);
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
    if (!userInfo) return;

    const role = getRoleType(userInfo) || '';

    this.setData({
      userInfo,
      roleType: role,
      roleText: getRoleText(role),
      secondaryStatLabel: isVehicleRole(role) ? '我的车辆' : '待处理'
    });
  },

  async loadStats() {
    const role = this.data.roleType || getRoleType(this.data.userInfo);
    const tasks = [this.loadOrderStats()];

    if (isVehicleRole(role)) {
      tasks.push(this.loadVehicleStats());
    } else {
      this.setData({
        stats: {
          ...this.data.stats,
          vehicleCount: 0
        }
      });
    }

    await Promise.allSettled(tasks);
  },

  async loadOrderStats() {
    try {
      const res = await request.get('/orders', { page: 1, limit: 100 });
      const orders = extractOrders(res);

      const totalOrders = orders.length;
      const completedOrders = orders.filter((item) => item.status === 'completed' || item.status === 'refunded').length;

      this.setData({
        stats: {
          ...this.data.stats,
          totalOrders,
          completedOrders,
          pendingOrders: totalOrders - completedOrders
        }
      });
    } catch (error) {
      console.error('[我的] 加载订单统计失败:', error);
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
      console.error('[我的] 加载车辆统计失败:', error);
    }
  },

  onMyOrders() {
    wx.switchTab({
      url: '/pages/orders/orders'
    });
  },

  onMyVehicles() {
    const role = this.data.roleType || getRoleType(this.data.userInfo);

    if (!isVehicleRole(role)) {
      wx.showToast({
        title: '当前角色无车辆页',
        icon: 'none'
      });
      return;
    }

    wx.switchTab({
      url: '/pages/vehicle/vehicle'
    });
  },

  onSecondaryStatTap() {
    if (isVehicleRole(this.data.roleType)) {
      this.onMyVehicles();
      return;
    }

    this.onMyOrders();
  },

  onContactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服热线：400-888-8888\n服务时间：09:00-18:00',
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
