const request = require('../../../utils/request');

const app = getApp();

function normalizeRegisteredUser(user, fallbackRole) {
  const roleType = typeof user?.role === 'string'
    ? user.role
    : (user?.role?.type || fallbackRole || 'DRIVER');

  return {
    roleType,
    user: Object.assign({}, user || {}, {
      role: typeof user?.role === 'object' && user.role
        ? user.role
        : { type: roleType, status: user?.roleStatus || 'normal' }
    })
  };
}

Page({
  data: {
    phone: '',
    password: '',
    confirmPassword: '',
    username: '',
    role: 'DRIVER',
    roleIndex: 0,
    roleList: [
      { value: 'DRIVER', label: '司机' },
      { value: 'FLEET_MANAGER', label: '车队管理员' },
      { value: 'STORE', label: '门店入驻' }
    ]
  },

  onRoleChange(e) {
    const index = e.detail.value;
    this.setData({
      roleIndex: index,
      role: this.data.roleList[index].value
    });
  },

  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  onUsernameInput(e) {
    this.setData({
      username: e.detail.value
    });
  },

  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  onConfirmPasswordInput(e) {
    this.setData({
      confirmPassword: e.detail.value
    });
  },

  async handleRegister() {
    const { phone, password, confirmPassword, username, role } = this.data;

    if (role === 'FLEET_MANAGER') {
      wx.navigateTo({
        url: '/pages/auth/fleet-register/fleet-register'
      });
      return;
    }

    if (role === 'STORE') {
      wx.navigateTo({
        url: '/pages/auth/store-register/store-register'
      });
      return;
    }

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
        title: '密码长度至少 6 位',
        icon: 'none'
      });
      return;
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次输入的密码不一致',
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
      }, true);

      wx.hideLoading();

      if (!res?.success || !res?.data?.token || !res?.data?.user) {
        throw new Error(res?.message || '注册失败');
      }

      const normalized = normalizeRegisteredUser(res.data.user, role);
      app.setUserInfo(res.data.token, normalized.user, normalized.roleType);

      wx.showToast({
        title: '注册成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 800);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '注册失败',
        icon: 'none'
      });
    }
  },

  goToLogin() {
    wx.navigateBack();
  }
});
