// pages/auth/login.js
const request = require('../../utils/request');

Page({
  data: {
    phone: '',
    password: ''
  },

  // 输入手机号
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  // 输入密码
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 登录
  async handleLogin() {
    const { phone, password } = this.data;

    // 表单验证
    if (!phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return;
    }

    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '登录中...' });

      const res = await request.post('/auth/login', {
        phone,
        password
      });

      wx.hideLoading();

      // 保存token和用户信息
      wx.setStorageSync('token', res.token);
      wx.setStorageSync('userInfo', res.user);

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      // 延迟跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      });
    }
  },

  // 跳转注册
  goToRegister() {
    wx.navigateTo({
      url: '/pages/auth/register'
    });
  }
});
