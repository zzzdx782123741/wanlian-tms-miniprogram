// pages/store/quote/quote.js - 门店技师填写报价（商品选择模式）
const request = require('../../../utils/request');

Page({
  data: {
    orderId: '',
    order: null,
    // 已选择的商品项目
    selectedItems: [],
    // 接车检查
    diagnosis: '',
    checkinPhotos: [],
    // 报价图片
    quoteImages: [],
    // 报价说明
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

      // 格式化预约时间
      if (order.appointmentAt) {
        order.appointmentAtText = this.formatAppointmentTime(order.appointmentAt);
      }

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

  // 格式化预约时间
  formatAppointmentTime(appointmentAt) {
    if (!appointmentAt) return '';
    const date = new Date(appointmentAt);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  },

  // 输入故障诊断
  onDiagnosisInput(e) {
    this.setData({
      diagnosis: e.detail.value
    });
  },

  // 选择接车照片
  chooseCheckinPhoto() {
    const remainCount = 9 - this.data.checkinPhotos.length;
    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const checkinPhotos = [...this.data.checkinPhotos, ...res.tempFilePaths];
        this.setData({ checkinPhotos });
      }
    });
  },

  // 删除接车照片
  deleteCheckinPhoto(e) {
    const { index } = e.currentTarget.dataset;
    const checkinPhotos = [...this.data.checkinPhotos];
    checkinPhotos.splice(index, 1);
    this.setData({ checkinPhotos });
  },

  // 输入报价说明
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
    const urls = e.currentTarget.dataset.urls || [url];
    wx.previewImage({
      current: url,
      urls: urls
    });
  },

  // 删除图片
  deleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const quoteImages = [...this.data.quoteImages];
    quoteImages.splice(index, 1);
    this.setData({ quoteImages });
  },

  // 跳转到商品选择页面
  addProduct() {
    wx.navigateTo({
      url: `/pages/store/product-select/product-select?orderId=${this.data.orderId}`
    });
  },

  // 从商品选择页面添加商品（回调方法）
  addProductFromSelect(product) {
    // 检查是否已添加相同商品
    const existingIndex = this.data.selectedItems.findIndex(item => item.id === product.id);

    if (existingIndex >= 0) {
      // 已存在，数量+1
      const selectedItems = [...this.data.selectedItems];
      selectedItems[existingIndex].quantity += 1;
      this.setData({ selectedItems });
    } else {
      // 不存在，添加新商品
      const selectedItems = [...this.data.selectedItems, {
        ...product,
        quantity: 1
      }];
      this.setData({ selectedItems });
    }

    // 更新总价
    this.updateTotal();
  },

  // 输入数量
  onQuantityInput(e) {
    const { index } = e.currentTarget.dataset;
    const value = parseInt(e.detail.value) || 1;

    const selectedItems = [...this.data.selectedItems];
    selectedItems[index].quantity = value;

    this.setData({ selectedItems });
    this.updateTotal();
  },

  // 删除项目
  deleteItem(e) {
    const { index } = e.currentTarget.dataset;
    const selectedItems = [...this.data.selectedItems];
    selectedItems.splice(index, 1);
    this.setData({ selectedItems });
    this.updateTotal();
  },

  // 计算并更新总价
  updateTotal() {
    const total = this.data.selectedItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) || 0) * (item.quantity || 1);
    }, 0);
    this.setData({ totalAmount: total.toFixed(2) });
  },

  // 计算总价
  calculateTotal() {
    return this.updateTotal();
  },

  // 提交报价
  async handleSubmit() {
    const { orderId, selectedItems, diagnosis, checkinPhotos, description, quoteImages } = this.data;

    // 表单验证
    if (selectedItems.length === 0) {
      wx.showToast({
        title: '请至少选择一个商品',
        icon: 'none'
      });
      return;
    }

    // 验证接车照片（必填）
    if (checkinPhotos.length === 0) {
      wx.showToast({
        title: '请至少上传一张接车照片',
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

      // 上传报价图片
      const uploadedQuoteImages = [];
      for (let i = 0; i < quoteImages.length; i++) {
        try {
          const uploadRes = await this.uploadImage(quoteImages[i]);
          uploadedQuoteImages.push(uploadRes.url);
        } catch (error) {
          console.error(`上传报价图片 ${i + 1} 失败:`, error);
          wx.showToast({
            title: `报价图片${i + 1}上传失败`,
            icon: 'none'
          });
        }
      }

      // 上传接车照片
      const uploadedCheckinPhotos = [];
      for (let i = 0; i < checkinPhotos.length; i++) {
        try {
          const uploadRes = await this.uploadImage(checkinPhotos[i]);
          uploadedCheckinPhotos.push(uploadRes.url);
        } catch (error) {
          console.error(`上传接车照片 ${i + 1} 失败:`, error);
          // 接车照片是必填的，如果上传失败应该终止提交
          throw error;
        }
      }

      // 构建报价数据
      const quoteData = {
        diagnosis: diagnosis || '',
        checkinPhotos: uploadedCheckinPhotos,
        quoteItems: selectedItems.map(item => ({
          item: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          productId: item.id,
          category: item.category
        })),
        quoteImages: uploadedQuoteImages
      };

      const response = await request.post(`/orders/${orderId}/quote`, quoteData);

      wx.hideLoading();

      wx.showToast({
        title: '报价提交成功',
        icon: 'success',
        duration: 2000
      });

      // 返回订单列表
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);

    } catch (error) {
      console.error('提交报价失败:', error);
      this.setData({ submitting: false });
      wx.hideLoading();
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none',
        duration: 3000
      });
    }
  },

  // 上传图片
  uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      const app = getApp();

      wx.uploadFile({
        url: `${app.globalData.baseUrl}/upload`,
        filePath: filePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${app.globalData.token}`
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.success) {
              resolve(data.data);
            } else {
              reject(new Error(data.message));
            }
          } catch (error) {
            reject(error);
          }
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  }
});
