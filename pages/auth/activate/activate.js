// pages/auth/activate/activate.js
const request = require('../../../utils/request');
const app = getApp();

Page({
  data: {
    phone: '',
    code: '',
    countdown: 0,
    activating: false,
    openid: '',
    unionid: '',
    userInfo: null,
    requireSmsCode: false, // 是否需要短信验证码（根据后端配置）
    codeRequired: false // 验证码是否必填
  },

  normalizeUserPayload(user, fallbackRole) {
    const roleType = typeof user?.role === 'string'
      ? user.role
      : (user?.role?.type || fallbackRole || '');

    const normalizedUser = Object.assign({}, user || {}, {
      role: typeof user?.role === 'object' && user.role
        ? user.role
        : { type: roleType, status: 'normal' }
    });

    return {
      roleType,
      user: normalizedUser
    };
  },

  onLoad() {
    // 获取登录时保存的openid等信息
    const openid = wx.getStorageSync('pending_openid') || '';
    const unionid = wx.getStorageSync('pending_unionid') || '';
    const userInfo = wx.getStorageSync('pending_userInfo') || null;
    const requireSmsCode = wx.getStorageSync('requireSmsCode') || false;

    this.setData({
      openid,
      unionid,
      userInfo,
      requireSmsCode,
      codeRequired: requireSmsCode // 如果需要验证码，则必填
    });
  },

  onUnload() {
    // 清除定时器
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  },

  // 输入手机号
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  // 输入验证码
  onCodeInput(e) {
    this.setData({
      code: e.detail.value
    });
  },

  // 发送验证码
  async sendCode() {
    const { phone } = this.data;

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

    try {
      const res = await request.post('/auth/driver/send-code', { phone });
      const debugCode = res?.data?.debugCode;

      wx.showToast({
        title: debugCode ? `验证码:${debugCode}` : '验证码已发送',
        icon: 'none',
        duration: 2000
      });

      this.startCountdown(60);
    } catch (error) {
      wx.showToast({
        title: error.message || '发送验证码失败',
        icon: 'none'
      });
    }
  },

  startCountdown(seconds) {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }

    this.setData({ countdown: seconds });
    this.countdownTimer = setInterval(() => {
      const next = this.data.countdown - 1;
      if (next <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.setData({ countdown: 0 });
        return;
      }
      this.setData({ countdown: next });
    }, 1000);
  },

  // 激活账号
  async handleActivate() {
    const { phone, code, openid, unionid, userInfo, codeRequired } = this.data;

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

    // 验证码验证（根据后端配置决定是否必填）
    if (codeRequired && !code) {
      wx.showToast({
        title: '请输入验证码',
        icon: 'none'
      });
      return;
    }

    // 如果输入了验证码，进行格式验证
    if (code && !/^\d{6}$/.test(code)) {
      wx.showToast({
        title: '验证码格式不正确',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({ activating: true });
      wx.showLoading({ title: '激活中...' });

      // 调用激活接口
      const res = await request.post('/auth/driver/activate', {
        openid,
        phone,
        code, // 可选
        unionid,
        userInfo
      });

      wx.hideLoading();
      this.setData({ activating: false });

      // 清除临时存储
      wx.removeStorageSync('pending_openid');
      wx.removeStorageSync('pending_unionid');
      wx.removeStorageSync('pending_userInfo');

      // 激活成功，保存用户信息
      const { token, user } = res.data;
      const normalized = this.normalizeUserPayload(user, 'DRIVER');
      const role = normalized.roleType || 'DRIVER';

      app.setUserInfo(token, normalized.user, role);

      wx.showModal({
        title: '激活成功',
        content: `欢迎，${user.name || user.nickname}！`,
        showCancel: false,
        success: () => {
          // 跳转到首页
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      });

    } catch (error) {
      wx.hideLoading();
      this.setData({ activating: false });

      // 处理特定错误码
      const errorCode = error.code || '';
      const errorMsg = error.message || '激活失败';

      let showMsg = errorMsg;

      if (errorCode === 'PHONE_ALREADY_ACTIVATED') {
        showMsg = '该手机号已被其他微信账号激活，如需更换请联系车队管理员';
      } else if (errorCode === 'PENDING_NOT_FOUND') {
        showMsg = '未找到待激活记录，请确认车队管理员已添加您的信息';
      } else if (errorCode === 'PENDING_EXPIRED') {
        showMsg = '激活记录已过期（超过30天），请联系车队管理员重新添加';
      } else if (errorCode === 'ACCOUNT_SUSPENDED') {
        showMsg = '账号已暂停，请联系车队管理员';
      }

      wx.showModal({
        title: '激活失败',
        content: showMsg,
        showCancel: false
      });
    }
  },

  // 返回登录
  relogin() {
    wx.redirectTo({
      url: '/pages/auth/login/login'
    });
  }
});
