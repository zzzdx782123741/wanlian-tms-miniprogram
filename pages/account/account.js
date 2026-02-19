// pages/account/account.js - 司机：我的页面
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    userInfo: null,
    roleText: '',
    stats: {
      totalOrders: 0,
      completedOrders: 0,
      pendingOrders: 0
    }
  },

  onLoad() {
    this.initUserProfile();
    this.loadOrderStats();
  },

  onShow() {
    this.initUserProfile();
  },

  /**
   * 初始化用户信息
   */
  initUserProfile() {
    const userInfo = app.globalData.userInfo;
    const role = app.globalData.role;

    if (userInfo) {
      const roleMap = {
        'DRIVER': '司机',
        'FLEET_MANAGER': '车队管理员',
        'STORE_TECHNICIAN': '门店技师',
        'PLATFORM_OPERATOR': '平台运营'
      };

      this.setData({
        userInfo,
        roleText: roleMap[role] || '用户'
      });
    }
  },

  /**
   * 加载订单统计
   */
  async loadOrderStats() {
    try {
      const res = await request.get('/orders', {
        page: 1,
        limit: 100
      });

      const orders = res.data || [];
      const stats = {
        totalOrders: orders.length,
        completedOrders: orders.filter(o => o.status === 'completed' || o.status === 'refunded').length,
        pendingOrders: orders.filter(o => o.status !== 'completed' && o.status !== 'refunded').length
      };

      this.setData({ stats });
    } catch (error) {
      console.error('加载订单统计失败:', error);
    }
  },

  /**
   * 跳转到我的订单
   */
  onMyOrders() {
    wx.switchTab({
      url: '/pages/orders/orders'
    });
  },

  /**
   * 跳转到车辆管理
   */
  onMyVehicles() {
    wx.switchTab({
      url: '/pages/vehicle/vehicle'
    });
  },

  /**
   * 联系客服
   */
  onContactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-888-8888\n工作时间：9:00-18:00',
      confirmText: '拨打电话',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '400-888-8888'
          });
        }
      }
    });
  },

  /**
   * 关于我们
   */
  onAbout() {
    wx.showModal({
      title: '关于万联驿站',
      content: '万联驿站TMS系统 v1.0\n为物流车队提供专业的车辆维修管理服务',
      showCancel: false
    });
  },

  /**
   * 退出登录
   */
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录信息
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');

          // 重新跳转到登录页
          wx.reLaunch({
            url: '/pages/auth/login/login'
          });
        }
      }
    });
  }
});
