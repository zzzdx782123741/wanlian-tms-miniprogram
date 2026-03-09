// pages/manager/store/store.js
const app = getApp();
const request = require('../../../utils/request');

Page({
  data: {
    storeInfo: {},
    bankAccount: {}
  },

  onLoad() {
    this.initPage();
  },

  /**
   * 初始化页面
   */
  initPage() {
    const userInfo = app.globalData.userInfo;

    if (!userInfo) {
      wx.redirectTo({
        url: '/pages/auth/login/login'
      });
      return;
    }

    // 检查是否为店长或技师
    const role = app.globalData.role;
    if (role !== 'STORE_MANAGER' && role !== 'STORE_TECHNICIAN') {
      wx.showToast({
        title: '权限不足',
        icon: 'none'
      });
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);
      return;
    }

    this.loadStoreInfo();
  },

  /**
   * 加载门店信息
   */
  async loadStoreInfo() {
    try {
      // 获取门店信息
      const res = await request.get('/store/info');

      if (res.success) {
        this.setData({
          storeInfo: res.data || {}
        });
      }
    } catch (error) {
      console.error('加载门店信息失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 编辑收款账户
   */
  editBankAccount() {
    wx.showToast({
      title: '编辑功能开发中',
      icon: 'none'
    });
    // TODO: 跳转到编辑收款账户页面
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    const urls = this.data.storeInfo.photos || [];

    wx.previewImage({
      current: url,
      urls
    });
  },

  /**
   * 编辑门店信息
   */
  editStore() {
    wx.showToast({
      title: '编辑功能开发中',
      icon: 'none'
    });
    // TODO: 跳转到编辑门店信息页面
  }
});
