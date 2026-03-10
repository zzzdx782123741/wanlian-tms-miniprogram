// pages/fleet/account/account.js
const request = require('../../../utils/request');

function showUnavailable(message) {
  wx.showToast({
    title: message,
    icon: 'none'
  });
}

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
    Promise.resolve(this.checkRole()).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async checkRole() {
    const userInfo = wx.getStorageSync('userInfo');

    if (!userInfo) {
      wx.redirectTo({
        url: '/pages/auth/login/login'
      });
      return;
    }

    const isFleetManager = userInfo.role === 'FLEET_MANAGER';
    const roleText = isFleetManager ? '车队管理员' : '司机';

    this.setData({
      userInfo,
      isFleetManager,
      roleText
    });

    if (isFleetManager) {
      await this.loadBalance();
    }
  },

  async loadBalance() {
    try {
      this.setData({ loading: true });

      const res = await request.get('/account/balance');

      this.setData({
        balance: res.data?.balance || 0,
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

  recharge() {
    showUnavailable('充值页面暂未开放');
  },

  withdraw() {
    showUnavailable('提现页面暂未开放');
  },

  viewTransactions() {
    showUnavailable('交易记录页暂未开放');
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.redirectTo({
            url: '/pages/auth/login/login'
          });
        }
      }
    });
  }
});
