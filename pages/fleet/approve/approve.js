// pages/fleet/approve/approve.js
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

  // 加载待审核订单
  async loadOrders() {
    try {
      this.setData({ loading: true });

      const orders = await request.get('/orders', {
        status: 'PENDING_APPROVAL'
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

  // 审核通过
  approveOrder(e) {
    const { id } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认通过',
      content: '确定要通过该订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });

            await request.put(`/orders/${id}/approve`, {
              action: 'approve'
            });

            wx.hideLoading();

            wx.showToast({
              title: '已通过',
              icon: 'success'
            });

            // 刷新列表
            this.loadOrders();

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
  },

  // 审核拒绝
  rejectOrder(e) {
    const { id } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认拒绝',
      content: '确定要拒绝该订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });

            await request.put(`/orders/${id}/approve`, {
              action: 'reject'
            });

            wx.hideLoading();

            wx.showToast({
              title: '已拒绝',
              icon: 'success'
            });

            // 刷新列表
            this.loadOrders();

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
  },

  // 查看详情
  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/store/order-detail/order-detail?id=${id}`
    });
  }
});
