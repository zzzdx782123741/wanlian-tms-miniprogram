// pages/auth/login.js
const request = require('../../../utils/request');
const app = getApp();

// 测试账号配置（与seed-test-data.js保持一致）
const TEST_ACCOUNTS = [
  {
    nickname: '司机小王',
    openid: 'driver_openid_001',
    role: 'DRIVER',
    avatar: '/images/avatars/driver.jpg'
  },
  {
    nickname: '张经理(车队)',
    openid: 'fleet_openid_001',
    role: 'FLEET_MANAGER',
    avatar: '/images/avatars/fleet.jpg'
  },
  {
    nickname: '李师傅(技师)',
    openid: 'tech_openid_001',
    role: 'STORE_TECHNICIAN',
    avatar: '/images/avatars/tech.jpg'
  },
  {
    nickname: '平台运营-小周',
    openid: 'operator_openid_001',
    role: 'PLATFORM_OPERATOR',
    avatar: '/images/avatars/operator.jpg'
  }
];

Page({
  data: {
    loading: false,
    devMode: false, // 开发模式
    selectedAccountIndex: 0, // 选中的测试账号索引
    accountList: TEST_ACCOUNTS.map(acc => acc.nickname) // 账号名称列表
  },

  onLoad() {
    // 检查是否是开发环境
    const devMode = wx.getStorageSync('devMode') || false;
    const savedAccountIndex = wx.getStorageSync('selectedAccountIndex') || 0;

    this.setData({
      devMode,
      selectedAccountIndex: savedAccountIndex
    });
  },

  // 切换开发模式
  toggleDevMode() {
    const devMode = !this.data.devMode;
    this.setData({ devMode });
    wx.setStorageSync('devMode', devMode);

    wx.showToast({
      title: devMode ? '开发模式已开启' : '开发模式已关闭',
      icon: 'none'
    });
  },

  // 选择测试账号
  onAccountChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({ selectedAccountIndex: index });
    wx.setStorageSync('selectedAccountIndex', index);
  },

  // 测试账号登录
  async testLogin() {
    if (this.data.loading) return;

    const account = TEST_ACCOUNTS[this.data.selectedAccountIndex];

    wx.showLoading({ title: '登录中...' });

    try {
      this.setData({ loading: true });

      // 调用测试登录接口
      const res = await request.post('/auth/test-login', {
        openid: account.openid
      });

      // 保存token和用户信息
      const role = res.user.role?.type || account.role;
      app.setUserInfo(res.token, res.user, role);

      wx.hideLoading();

      wx.showToast({
        title: `登录成功: ${account.nickname}`,
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
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      });
    }
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
