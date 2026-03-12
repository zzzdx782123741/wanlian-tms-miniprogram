const request = require('../../../utils/request');

const app = getApp();

Page({
  data: {
    loading: false,
    enableTestLoginUi: false,
    showTestLogin: false,
    testLoading: false,
    testAccounts: [
      {
        username: 'driver001',
        nickname: '测试司机-张三',
        icon: '🚚',
        role: 'DRIVER',
        desc: '司机端'
      },
      {
        username: 'fleet001',
        nickname: '测试车队-李经理',
        icon: '🏢',
        role: 'FLEET_MANAGER',
        desc: '车队管理'
      },
      {
        username: 'tech001',
        nickname: '测试技师-王师傅',
        icon: '🔧',
        role: 'STORE_TECHNICIAN',
        desc: '门店技师'
      },
      {
        username: 'store001',
        nickname: '测试店长-赵经理',
        icon: '🏪',
        role: 'STORE_MANAGER',
        desc: '门店管理'
      }
    ]
  },

  onLoad() {
    this.setData({
      enableTestLoginUi: this.isTestLoginUiEnabled()
    });
  },

  isTestLoginUiEnabled() {
    try {
      const accountInfo = wx.getAccountInfoSync();
      return accountInfo?.miniProgram?.envVersion !== 'release';
    } catch (error) {
      return false;
    }
  },

  normalizeUserPayload(user, fallbackRole) {
    const roleType = typeof user?.role === 'string'
      ? user.role
      : (user?.role?.type || fallbackRole || '');

    return {
      roleType,
      user: Object.assign({}, user || {}, {
        role: typeof user?.role === 'object' && user.role
          ? user.role
          : { type: roleType, status: user?.roleStatus || 'normal' }
      })
    };
  },

  validateUserStatus(user) {
    const accountStatus = user?.status || 'normal';
    const roleStatus = user?.role?.status || user?.roleStatus || 'normal';

    if (accountStatus === 'suspended') {
      throw new Error('您的账号已被停用，请联系管理员');
    }

    if (roleStatus !== 'normal') {
      throw new Error('当前账号状态异常，请联系管理员处理');
    }
  },

  finishLogin(token, user, fallbackRole) {
    const normalized = this.normalizeUserPayload(user, fallbackRole);
    const role = normalized.roleType || normalized.user?.role?.type;

    if (!token || !normalized.user || !role) {
      throw new Error('登录信息不完整');
    }

    this.validateUserStatus(normalized.user);
    app.setUserInfo(token, normalized.user, role);

    wx.showToast({
      title: '登录成功',
      icon: 'success'
    });

    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }, 800);
  },

  async onGetPhoneNumber(e) {
    if (this.data.loading) {
      return;
    }

    if (e.detail?.errMsg !== 'getPhoneNumber:ok' || !e.detail?.code) {
      wx.showToast({
        title: '需要授权微信手机号才能登录',
        icon: 'none'
      });
      return;
    }

    let loadingVisible = false;
    wx.showLoading({ title: '登录中...' });
    loadingVisible = true;

    try {
      this.setData({ loading: true });

      const loginRes = await wx.login();
      if (!loginRes.code) {
        throw new Error('微信登录失败，请重试');
      }

      const loginResult = await request.post('/auth/wechat/universal-login', {
        code: loginRes.code
      }, true);

      if (!loginResult.success) {
        throw new Error(loginResult.message || '登录失败');
      }

      let finalData = loginResult.data || {};

      if (finalData.needPhoneBinding || finalData.needPhoneVerification) {
        const bindResult = await request.post('/auth/wechat/verify-bind', {
          openid: finalData.openid,
          unionid: finalData.unionid,
          phoneCode: e.detail.code
        }, true);

        if (!bindResult.success) {
          throw new Error(bindResult.message || '微信绑定失败');
        }

        finalData = bindResult.data || {};
      }

      if (loadingVisible) {
        wx.hideLoading();
        loadingVisible = false;
      }

      this.finishLogin(finalData.token, finalData.user, '');
    } catch (error) {
      if (loadingVisible) {
        wx.hideLoading();
      }

      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none',
        duration: 2500
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onOpenTestLogin() {
    if (!this.data.enableTestLoginUi || this.data.loading || this.data.testLoading) {
      return;
    }

    wx.vibrateShort();
    this.setData({ showTestLogin: true });
  },

  onCloseTestLogin() {
    this.setData({ showTestLogin: false });
  },

  async onQuickLogin(e) {
    const { account } = e.currentTarget.dataset;
    if (!this.data.enableTestLoginUi || this.data.testLoading) {
      return;
    }

    let loadingVisible = false;
    wx.showLoading({ title: '登录中...' });
    loadingVisible = true;

    try {
      this.setData({ testLoading: true });

      const res = await request.post('/auth/test-login', {
        username: account.username,
        password: '123456'
      }, true);

      if (!res.success || !res.data?.token || !res.data?.user) {
        throw new Error(res.message || '测试登录失败');
      }

      if (loadingVisible) {
        wx.hideLoading();
        loadingVisible = false;
      }

      this.finishLogin(res.data.token, res.data.user, account.role || '');
      this.setData({ showTestLogin: false });
    } catch (error) {
      if (loadingVisible) {
        wx.hideLoading();
      }

      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      });
    } finally {
      this.setData({ testLoading: false });
    }
  },

  noop() {}
});
