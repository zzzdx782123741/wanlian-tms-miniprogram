// pages/fleet/account/account.js
const request = require('../../../utils/request');

Page({
  data: {
    userInfo: null,
    balance: 0,
    isFleetManager: false,
    loading: false
  },

  onLoad() {
    this.checkRole();
  },

  onShow() {
    this.checkRole();
  },

  onPullDownRefresh() {
    this.checkRole().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 检查用户角色
  async checkRole() {
    const userInfo = wx.getStorageSync('userInfo');

    if (!userInfo) {
      wx.redirectTo({
        url: '/pages/auth/login'
      });
      return;
    }

    const isFleetManager = userInfo.role === 'FLEET_MANAGER';

    this.setData({
      userInfo,
      isFleetManager
    });

    // 只有FLEET_MANAGER加载账户余额
    if (isFleetManager) {
      this.loadBalance();
    }
  },

  // 加载账户余额
  async loadBalance() {
    try {
      this.setData({ loading: true });

      const res = await request.get('/fleet/balance');

      this.setData({
        balance: res.balance,
        loading: false
      });

    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  // 充值
  recharge() {
    wx.navigateTo({
      url: '/pages/fleet/account/recharge'
    });
  },

  // 提现
  withdraw() {
    wx.navigateTo({
      url: '/pages/fleet/account/withdraw'
    });
  },

  // 交易记录
  viewTransactions() {
    wx.navigateTo({
      url: '/pages/fleet/account/transactions'
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.redirectTo({
            url: '/pages/auth/login'
          });
        }
      }
    });
  }
});
