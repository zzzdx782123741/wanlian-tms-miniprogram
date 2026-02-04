// pages/driver/report/report.js
const request = require('../../../utils/request');

Page({
  data: {
    orders: [],
    loading: false
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载可上报的订单
  async loadOrders() {
    try {
      this.setData({ loading: true });

      const orders = await request.get('/orders', {
        status: 'IN_TRANSIT'
      });

      this.setData({
        orders,
        loading: false
      });

    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  // 上报位置
  reportLocation(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/driver/report/location?id=${id}`
    });
  },

  // 更新状态
  updateStatus(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/driver/report/status?id=${id}`
    });
  }
});
