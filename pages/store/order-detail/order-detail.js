// pages/store/order-detail/order-detail.js
const request = require('../../../utils/request');

Page({
  data: {
    orderId: '',
    order: null,
    loading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        orderId: options.id
      });
      this.loadOrderDetail();
    }
  },

  onPullDownRefresh() {
    this.loadOrderDetail().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载订单详情
  async loadOrderDetail() {
    try {
      this.setData({ loading: true });

      const order = await request.get(`/orders/${this.data.orderId}`);

      this.setData({
        order,
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

  // 复制订单号
  copyOrderNumber() {
    wx.setClipboardData({
      data: this.data.order.orderNumber,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        });
      }
    });
  },

  // 联系客服
  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-123-4567',
      showCancel: false
    });
  },

  // 填写报价
  quoteOrder() {
    wx.navigateTo({
      url: `/pages/store/quote/quote?id=${this.data.orderId}`
    });
  },

  // 取消订单
  cancelOrder() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消该订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });

            await request.put(`/orders/${this.data.orderId}`, {
              status: 'CANCELLED'
            });

            wx.hideLoading();

            wx.showToast({
              title: '已取消',
              icon: 'success'
            });

            // 刷新详情
            this.loadOrderDetail();

          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '操作失败',
              icon: 'none'
            });
          }
        }
      }
    });
  }
});
