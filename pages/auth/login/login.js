// pages/auth/login.js
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
        username: 'driver_test',
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

  // 微信授权登录（通用方案：支持所有角色）
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

      // 2. 调用通用微信登录接口（支持所有角色）
      const res = await request.post('/auth/wechat/universal-login', {
        code: loginRes.code,
        userInfo: e.detail.userInfo
      });

      wx.hideLoading();

      // 3. 判断登录结果
      if (res.success) {
        const { needPhoneVerification, token, user } = res.data;

        if (needPhoneVerification) {
          // 需要验证手机号（首次登录或未绑定微信）
          wx.setStorageSync('pending_openid', res.data.openid);
          wx.setStorageSync('pending_unionid', res.data.unionid);
          wx.setStorageSync('pending_userInfo', e.detail.userInfo);

          // 跳转到手机验证页面
          wx.redirectTo({
            url: '/pages/auth/verify-phone/verify-phone'
          });
          return;
        }

        // 登录成功（微信已绑定）
        const normalized = this.normalizeUserPayload(user);
        const role = normalized.roleType;

        console.log('=== 登录成功 ===');
        console.log('后端返回user:', JSON.stringify(user));
        console.log('标准化后roleType:', normalized.roleType);
        console.log('最终保存的role:', role);

        // 检查账号状态
        const userStatus = user?.status || user?.role?.status || 'normal';
        if (userStatus === 'suspended') {
          wx.showModal({
            title: '账号已暂停',
            content: '您的账号已被暂停，请联系管理员',
            showCancel: false
          });
          this.setData({ loading: false });
          return;
        }

        if (user.role?.status !== 'normal') {
          wx.showModal({
            title: '账号状态异常',
            content: '账号状态异常，请联系管理员',
            showCancel: false
          });
          this.setData({ loading: false });
          return;
        }

        app.setUserInfo(token, normalized.user, role);

        // 验证存储是否成功
        const storedRole = wx.getStorageSync('role');
        const storedUserInfo = wx.getStorageSync('userInfo');
        console.log('验证存储 - role:', storedRole);
        console.log('验证存储 - userInfo:', storedUserInfo);

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

  // 长按万联标识触发测试登录面板
  onOpenTestLogin() {
    if (!this.data.enableTestLoginUi || this.data.loading || this.data.testLoading) return;

    // 震动反馈
    wx.vibrateShort();

    this.setData({ showTestLogin: true });
  },

  // 关闭测试登录面板
  onCloseTestLogin() {
    this.setData({ showTestLogin: false });
  },

  // 快速登录 - 点击测试账号直接登录
  async onQuickLogin(e) {
    const { account } = e.currentTarget.dataset;

    if (!this.data.enableTestLoginUi || this.data.testLoading) return;

    wx.showLoading({ title: '登录中...' });

    try {
      this.setData({ testLoading: true });

      // 调用测试登录接口
      const res = await request.post('/auth/test-login', {
        username: account.username,
        password: 'Test123456'
      });

      wx.hideLoading();

      if (!res.success || !res.data?.token || !res.data?.user) {
        throw new Error(res.message || '测试登录失败');
      }

      const normalized = this.normalizeUserPayload(res.data.user, '');
      const role = normalized.roleType || normalized.user?.role?.type || '';

      if (!role) {
        throw new Error('测试账号缺少角色信息');
      }

      // 保存用户信息
      app.setUserInfo(res.data.token, normalized.user, role);

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      this.setData({ showTestLogin: false });

      // 根据角色跳转到不同页面
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 800);
    } catch (error) {
      wx.hideLoading();
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
