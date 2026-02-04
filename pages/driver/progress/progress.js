// pages/driver/progress/progress.js
const request = require('../../../utils/request');

Page({
  data: {
    orderId: '',
    order: null,
    timeline: [],
    loading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        orderId: options.id
      });
      this.loadProgress();
    }
  },

  onPullDownRefresh() {
    this.loadProgress().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载运输进度
  async loadProgress() {
    try {
      this.setData({ loading: true });

      const order = await request.get(`/orders/${this.data.orderId}`);

      this.setData({
        order,
        timeline: order.timeline || [],
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

  // 查看地图
  viewMap() {
    wx.openLocation({
      latitude: this.data.order.currentLocation.latitude,
      longitude: this.data.order.currentLocation.longitude,
      scale: 15
    });
  }
});
