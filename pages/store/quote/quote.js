// pages/store/quote/quote.js - 门店技师填写报价
const request = require('../../../utils/request');

Page({
  data: {
    orderId: '',
    order: null,
    // 报价项目列表
    quoteItems: [
      { name: '工时费', price: '', quantity: 1 }
    ],
    // 报价图片
    quoteImages: [],
    // 预计完成时间
    estimatedDays: 1,
    // 备注说明
    description: '',
    totalAmount: '0.00',
    loading: false,
    submitting: false
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

      const res = await request.get(`/orders/${this.data.orderId}`);
      const order = res.data;

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

  // 添加报价项目
  addQuoteItem() {
    const quoteItems = [...this.data.quoteItems];
    quoteItems.push({
      name: '',
      price: '',
      quantity: 1
    });
    this.setData({ quoteItems });
    this.updateTotal(quoteItems);
  },

  // 删除报价项目
  deleteQuoteItem(e) {
    const { index } = e.currentTarget.dataset;
    const quoteItems = [...this.data.quoteItems];

    if (quoteItems.length <= 1) {
      wx.showToast({
        title: '至少保留一项',
        icon: 'none'
      });
      return;
    }

    quoteItems.splice(index, 1);
    this.setData({ quoteItems });
    this.updateTotal(quoteItems);
  },

  // 输入项目名称
  onItemNameInput(e) {
    const { index } = e.currentTarget.dataset;
    const quoteItems = [...this.data.quoteItems];
    quoteItems[index].name = e.detail.value;
    this.setData({ quoteItems });
  },

  // 输入单价
  onItemPriceInput(e) {
    const { index } = e.currentTarget.dataset;
    const quoteItems = [...this.data.quoteItems];
    quoteItems[index].price = e.detail.value;
    this.setData({ quoteItems });
    this.updateTotal(quoteItems);
  },

  // 输入数量
  onItemQuantityInput(e) {
    const { index } = e.currentTarget.dataset;
    const quoteItems = [...this.data.quoteItems];
    quoteItems[index].quantity = parseInt(e.detail.value) || 1;
    this.setData({ quoteItems });
    this.updateTotal(quoteItems);
  },

  // 选择预计天数
  onDaysChange(e) {
    this.setData({
      estimatedDays: parseInt(e.detail.value)
    });
  },

  // 输入说明
  onDescriptionInput(e) {
    this.setData({
      description: e.detail.value
    });
  },

  // 选择报价图片
  chooseImage() {
    wx.chooseImage({
      count: 9 - this.data.quoteImages.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const quoteImages = [...this.data.quoteImages, ...res.tempFilePaths];
        this.setData({ quoteImages });
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: this.data.quoteImages
    });
  },

  // 删除图片
  deleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const quoteImages = [...this.data.quoteImages];
    quoteImages.splice(index, 1);
    this.setData({ quoteImages });
  },

  // 计算并更新总价
  updateTotal(items) {
    const quoteItems = items || this.data.quoteItems;
    const total = quoteItems.reduce((total, item) => {
      return total + (parseFloat(item.price) || 0) * (item.quantity || 1);
    }, 0);
    this.setData({ totalAmount: total.toFixed(2) });
    return total;
  },

  // 计算总价
  calculateTotal() {
    return this.updateTotal();
  },

  // 提交报价
  async handleSubmit() {
    const { orderId, quoteItems, estimatedDays, description, quoteImages } = this.data;

    // 表单验证
    const validItems = quoteItems.filter(item => item.name && item.price);

    if (validItems.length === 0) {
      wx.showToast({
        title: '请至少填写一项报价',
        icon: 'none'
      });
      return;
    }

    // 检查所有项目是否填写完整
    const hasInvalidItem = quoteItems.some(item => {
      if (item.name && !item.price) return true;
      if (!item.name && item.price) return true;
      return false;
    });

    if (hasInvalidItem) {
      wx.showToast({
        title: '请完整填写报价项目',
        icon: 'none'
      });
      return;
    }

    const total = this.calculateTotal();

    if (total <= 0) {
      wx.showToast({
        title: '报价金额必须大于0',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({ submitting: true });
      wx.showLoading({ title: '提交中...' });

      // 构建报价数据
      const quoteData = {
        items: validItems.map(item => ({
          item: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity
        })),
        total: total,
        images: quoteImages,
        estimatedDays,
        description
      };

      await request.post(`/orders/${orderId}/quote`, quoteData);

      wx.hideLoading();

      wx.showToast({
        title: '报价提交成功',
        icon: 'success'
      });

      // 返回订单列表
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      this.setData({ submitting: false });
      wx.hideLoading();
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    }
  }
});
