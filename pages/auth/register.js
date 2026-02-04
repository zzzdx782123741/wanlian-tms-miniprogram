// pages/auth/register.js
const request = require('../../utils/request');

Page({
  data: {
    phone: '',
    password: '',
    confirmPassword: '',
    username: '',
    role: 'DRIVER',
    roleList: [
      { value: 'DRIVER', label: '司机' },
      { value: 'FLEET_MANAGER', label: '车队管理员' },
      { value: 'STORE', label: '门店' }
    ]
  },

  // 选择角色
  onRoleChange(e) {
    this.setData({
      role: this.data.roleList[e.detail.value].value
    });
  },

  // 输入手机号
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  // 输入用户名
  onUsernameInput(e) {
    this.setData({
      username: e.detail.value
    });
  },

  // 输入密码
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 输入确认密码
  onConfirmPasswordInput(e) {
    this.setData({
      confirmPassword: e.detail.value
    });
  },

  // 注册
  async handleRegister() {
    const { phone, password, confirmPassword, username, role } = this.data;

    // 表单验证
    if (!username) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      });
      return;
    }

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

    if (password.length < 6) {
      wx.showToast({
        title: '密码至少6位',
        icon: 'none'
      });
      return;
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码不一致',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '注册中...' });

      const res = await request.post('/auth/register', {
        phone,
        password,
        username,
        role
      });

      wx.hideLoading();

      wx.showToast({
        title: '注册成功',
        icon: 'success'
      });

      // 延迟跳转到登录页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '注册失败',
        icon: 'none'
      });
    }
  },

  // 返回登录
  goToLogin() {
    wx.navigateBack();
  }
});
