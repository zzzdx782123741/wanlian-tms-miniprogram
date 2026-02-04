// pages/store/orders/orders.js
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

  // 加载订单列表
  async loadOrders() {
    try {
      this.setData({ loading: true });

      const orders = await request.get('/orders');

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

  // 填写报价（第103行对应的按钮事件）
  quoteOrder(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/store/quote/quote?id=${id}`
    });
  },

  // 查看订单详情
  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/store/order-detail/order-detail?id=${id}`
    });
  },

  // 状态文本
  getStatusText(status) {
    const statusMap = {
      'PENDING': '待报价',
      'QUOTED': '已报价',
      'PENDING_APPROVAL': '待审核',
      'APPROVED': '已审核',
      'IN_TRANSIT': '运输中',
      'COMPLETED': '已完成',
      'CANCELLED': '已取消'
    };
    return statusMap[status] || status;
  }
});
