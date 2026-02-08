// pages/auth/login.js
const request = require('../../../utils/request');
const app = getApp();

Page({
  data: {
    loading: false
  },

  // 微信授权登录
  async onGetUserInfo(e) {
    if (this.data.loading) return;

    // 用户拒绝授权
    if (e.detail.errMsg !== 'getUserInfo:ok') {
      wx.showToast({
        title: '需要授权才能登录',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '登录中...' });

    try {
      this.setData({ loading: true });

      // 1. 获取微信登录凭证
      const loginRes = await wx.login();

      if (!loginRes.code) {
        throw new Error('微信登录失败');
      }

      // 2. 调用后端接口登录
      const res = await request.post('/auth/wechat-login', {
        code: loginRes.code,
        userInfo: e.detail.userInfo
      });

      // 3. 保存token和用户信息
      const role = res.user.role?.type || 'DRIVER';
      app.setUserInfo(res.token, res.user, role);

      wx.hideLoading();

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      // 4. 延迟跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      });
    }
  }
});
