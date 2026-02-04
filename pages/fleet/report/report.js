// pages/fleet/report/report.js
const request = require('../../../utils/request');

Page({
  data: {
    stats: {
      totalOrders: 0,
      completedOrders: 0,
      inTransitOrders: 0,
      pendingOrders: 0
    },
    orders: [],
    loading: false
  },

  onLoad() {
    this.loadReport();
  },

  onPullDownRefresh() {
    this.loadReport().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载报表数据
  async loadReport() {
    try {
      this.setData({ loading: true });

      const [stats, orders] = await Promise.all([
        request.get('/fleet/stats'),
        request.get('/orders', { limit: 10 })
      ]);

      this.setData({
        stats,
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

  // 查看订单详情
  viewOrder(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/store/order-detail/order-detail?id=${id}`
    });
  }
});
