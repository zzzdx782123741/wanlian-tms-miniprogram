// pages/store/quote/quote.js
const request = require('../../../utils/request');

Page({
  data: {
    orderId: '',
    order: null,
    price: '',
    estimatedTime: '',
    notes: '',
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

  // 输入报价
  onPriceInput(e) {
    this.setData({
      price: e.detail.value
    });
  },

  // 选择预计时间
  onTimeChange(e) {
    this.setData({
      estimatedTime: e.detail.value
    });
  },

  // 输入备注
  onNotesInput(e) {
    this.setData({
      notes: e.detail.value
    });
  },

  // 提交报价
  async handleSubmit() {
    const { orderId, price, estimatedTime, notes } = this.data;

    // 表单验证
    if (!price) {
      wx.showToast({
        title: '请输入报价',
        icon: 'none'
      });
      return;
    }

    if (Number(price) <= 0) {
      wx.showToast({
        title: '报价必须大于0',
        icon: 'none'
      });
      return;
    }

    if (!estimatedTime) {
      wx.showToast({
        title: '请选择预计时间',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '提交中...' });

      await request.post(`/orders/${orderId}/quote`, {
        price: Number(price),
        estimatedTime,
        notes
      });

      wx.hideLoading();

      wx.showToast({
        title: '报价成功',
        icon: 'success'
      });

      // 返回订单列表
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    }
  }
});
