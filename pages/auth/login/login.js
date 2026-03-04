// pages/auth/login.js
const request = require('../../../utils/request');
const app = getApp();

Page({
  data: {
    loading: false,
    enableTestLoginUi: false,
    showTestLogin: false,
    testLoading: false,
    testUsername: '',
    testPassword: ''
  },

  onLoad() {
    this.setData({
      enableTestLoginUi: this.isTestLoginUiEnabled()
    });
  },

  isTestLoginUiEnabled() {
    try {
      const accountInfo = wx.getAccountInfoSync();
      const envVersion = accountInfo?.miniProgram?.envVersion;
      return envVersion !== 'release';
    } catch (error) {
      return false;
    }
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

  // 微信授权登录（新方案：司机登录）
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

      // 2. 调用司机登录接口
      const res = await request.post('/auth/driver/login', {
        code: loginRes.code,
        userInfo: e.detail.userInfo
      });

      wx.hideLoading();

      // 3. 判断登录结果
      if (res.success) {
        const { needActivation, token, user } = res.data;

        if (needActivation) {
          // 待激活状态，跳转到激活页面
          wx.setStorageSync('pending_openid', res.data.openid);
          wx.setStorageSync('pending_unionid', res.data.unionid);
          wx.setStorageSync('pending_userInfo', e.detail.userInfo);
          wx.setStorageSync('requireSmsCode', res.data.requireSmsCode || false);

          wx.redirectTo({
            url: '/pages/auth/activate/activate'
          });
          return;
        }

        // 登录成功
        const normalized = this.normalizeUserPayload(user, 'DRIVER');
        const role = normalized.roleType || 'DRIVER';

        // 检查账号状态
        if (user.status === 'suspended') {
          wx.showModal({
            title: '账号已暂停',
            content: '您的账号已被暂停，请联系车队管理员',
            showCancel: false
          });
          this.setData({ loading: false });
          return;
        }

        app.setUserInfo(token, normalized.user, role);

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
      }

    } catch (error) {
      wx.hideLoading();
      this.setData({ loading: false });

      console.error('登录失败详细错误:', error);
      console.error('错误堆栈:', error.stack);

      // 显示更详细的错误信息
      let errorMsg = '登录失败';
      if (error.message) {
        errorMsg = error.message;
      }

      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
      });
    }
  },

  onOpenTestLogin() {
    if (!this.data.enableTestLoginUi || this.data.loading || this.data.testLoading) return;
    this.setData({ showTestLogin: true });
  },

  onCloseTestLogin() {
    this.setData({
      showTestLogin: false,
      testUsername: '',
      testPassword: ''
    });
  },

  noop() {},

  onTestUsernameInput(e) {
    this.setData({
      testUsername: e.detail.value
    });
  },

  onTestPasswordInput(e) {
    this.setData({
      testPassword: e.detail.value
    });
  },

  async onTestLogin() {
    const { testUsername, testPassword, enableTestLoginUi, testLoading } = this.data;
    if (!enableTestLoginUi || testLoading) return;

    if (!testUsername || !testPassword) {
      wx.showToast({
        title: '请输入账号和密码',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '登录中...' });

    try {
      this.setData({ testLoading: true });

      const res = await request.post('/auth/test-login', {
        username: testUsername,
        password: testPassword
      });

      wx.hideLoading();

      if (!res.success || !res.data?.token || !res.data?.user) {
        throw new Error('测试登录返回异常');
      }

      const normalized = this.normalizeUserPayload(res.data.user, '');
      const role = normalized.roleType || normalized.user?.role?.type || '';

      if (!role) {
        throw new Error('测试账号缺少角色信息');
      }

      app.setUserInfo(res.data.token, normalized.user, role);

      wx.showToast({
        title: '测试登录成功',
        icon: 'success'
      });

      this.setData({ showTestLogin: false });

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 800);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '测试登录失败',
        icon: 'none'
      });
    } finally {
      this.setData({ testLoading: false });
    }
  }
});
