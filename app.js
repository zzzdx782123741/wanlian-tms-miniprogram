// app.js - 万联驿站2.0
App({
  globalData: {
    baseUrl: '', // 将在 onLaunch 中根据环境设置
    token: '',
    userInfo: null,
    role: '', // DRIVER, FLEET_MANAGER, STORE_TECHNICIAN, PLATFORM_OPERATOR
  },

  onLaunch() {
    // 根据环境自动设置API地址
    const systemInfo = wx.getSystemInfoSync();
    const platform = systemInfo.platform;

    console.log('========== 启动信息 ==========');
    console.log('平台:', platform);
    console.log('系统信息:', systemInfo);

    // 开发工具：使用localhost
    // 真机（android/ios）：使用局域网IP
    if (platform === 'devtools') {
      this.globalData.baseUrl = 'http://localhost:3000/api';
      console.log('使用开发环境地址: localhost');
    } else {
      this.globalData.baseUrl = 'http://192.168.98.241:3000/api';
      console.log('使用真机调试地址: 192.168.98.241');
    }

    // 如果有存储的自定义地址，优先使用
    const storedBaseUrl = wx.getStorageSync('baseUrl');
    if (storedBaseUrl) {
      this.globalData.baseUrl = storedBaseUrl;
      console.log('使用存储的地址:', storedBaseUrl);
    }

    console.log('最终API地址:', this.globalData.baseUrl);
    console.log('============================');

    // 检查登录状态
    this.checkLoginStatus();
  },

  onShow() {
    // 小程序显示时刷新自定义 tabBar
    // 每个 tabBar 页面的 onShow 会自动调用 getTabBar().updateTabBar()
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    const role = wx.getStorageSync('role');

    if (token && userInfo && role) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
      this.globalData.role = role;
    }
  },

  /**
   * 设置用户信息
   */
  setUserInfo(token, userInfo, role) {
    this.globalData.token = token;
    this.globalData.userInfo = userInfo;
    this.globalData.role = role;

    // 持久化存储
    wx.setStorageSync('token', token);
    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync('role', role);

    // 保存到多账号管理器
    this.saveAccount(role, token, userInfo);
  },

  /**
   * 保存账号到多账号管理器
   */
  saveAccount(role, token, userInfo) {
    let savedAccounts = wx.getStorageSync('savedAccounts') || {};

    savedAccounts[role] = {
      token: token,
      userInfo: userInfo,
      loginTime: new Date().getTime()
    };

    wx.setStorageSync('savedAccounts', savedAccounts);

    console.log('账号已保存到管理器:', role, userInfo.nickname);
  },

  setBaseUrl(baseUrl) {
    this.globalData.baseUrl = baseUrl;
    wx.setStorageSync('baseUrl', baseUrl);
  },

  /**
   * 清除用户信息
   */
  clearUserInfo() {
    this.globalData.token = '';
    this.globalData.userInfo = null;
    this.globalData.role = '';

    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('role');
  }
});
