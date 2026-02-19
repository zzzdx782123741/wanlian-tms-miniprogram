// app.js - 万联驿站TMS
const DEFAULT_BASE_URL = 'http://localhost:3000/api';

App({
  globalData: {
    baseUrl: DEFAULT_BASE_URL,
    token: '',
    userInfo: null,
    role: '', // DRIVER, FLEET_MANAGER, STORE_TECHNICIAN, PLATFORM_OPERATOR
  },

  onLaunch() {
    const storedBaseUrl = wx.getStorageSync('baseUrl');
    if (storedBaseUrl) {
      this.globalData.baseUrl = storedBaseUrl;
    }
    // 检查登录状态
    this.checkLoginStatus();
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
