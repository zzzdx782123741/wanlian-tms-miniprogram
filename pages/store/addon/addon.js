// pages/store/addon/addon.js - 门店技师提交增项
const request = require('../../../utils/request');

Page({
  data: {
    orderId: '',
    order: null,
    // 已选择的商品项目
    selectedItems: [],
    // 增项图片
    addonImages: [],
    // 增项原因
    reason: '',
    totalAmount: '0.00',
    loading: false,
    submitting: false
  },

  onLoad(options) {
    // 技师角色隐藏底部导航栏的"车辆"标签
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo?.role?.type === 'STORE_TECHNICIAN') {
      wx.hideTabBar({
        animation: false
      });
    }

    if (options.id) {
      this.setData({
        orderId: options.id
      });
      this.loadOrderDetail();
    }
  },

  onShow() {
    // 技师角色每次显示页面时隐藏底部导航栏
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo?.role?.type === 'STORE_TECHNICIAN') {
      wx.hideTabBar({
        animation: false
      });
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

  // 跳转到商品选择页面
  addProduct() {
    wx.navigateTo({
      url: `/pages/store/product-select/product-select?orderId=${this.data.orderId}&from=addon`
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
    let value = parseInt(e.detail.value) || 1;
    if (value < 1) value = 1;

    const selectedItems = [...this.data.selectedItems];
    if (!selectedItems[index]) {
      return;
    }
    selectedItems[index].quantity = value;

    this.setData({ selectedItems });
    this.updateTotal();
  },

  // 减少数量
  onDecreaseQuantity(e) {
    const { index } = e.currentTarget.dataset;

    const selectedItems = [...this.data.selectedItems];
    if (!selectedItems[index]) {
      return;
    }

    if (selectedItems[index].quantity > 1) {
      selectedItems[index].quantity -= 1;
      this.setData({ selectedItems });
      this.updateTotal();
    }
  },

  // 增加数量
  onIncreaseQuantity(e) {
    const { index } = e.currentTarget.dataset;

    const selectedItems = [...this.data.selectedItems];
    if (!selectedItems[index]) {
      return;
    }

    selectedItems[index].quantity += 1;

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

  // 输入增项原因
  onReasonInput(e) {
    this.setData({
      reason: e.detail.value
    });
  },

  // 选择图片
  chooseImage() {
    const remainCount = 9 - this.data.addonImages.length;
    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const addonImages = [...this.data.addonImages, ...res.tempFilePaths];
        this.setData({ addonImages });
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
    const addonImages = [...this.data.addonImages];
    addonImages.splice(index, 1);
    this.setData({ addonImages });
  },

  // 提交增项
  async handleSubmit() {
    const { orderId, selectedItems, reason, addonImages } = this.data;

    // 表单验证
    if (selectedItems.length === 0) {
      wx.showToast({
        title: '请至少选择一个增项项目',
        icon: 'none'
      });
      return;
    }

    if (!reason || reason.trim().length === 0) {
      wx.showToast({
        title: '请填写增项原因',
        icon: 'none'
      });
      return;
    }

    const total = parseFloat(this.data.totalAmount);
    if (total <= 0) {
      wx.showToast({
        title: '增项金额必须大于0',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({ submitting: true });
      wx.showLoading({ title: '提交中...' });

      // 上传增项图片
      const uploadedImages = [];
      for (let i = 0; i < addonImages.length; i++) {
        try {
          const uploadRes = await this.uploadImage(addonImages[i]);
          uploadedImages.push(uploadRes.url);
        } catch (error) {
          console.error(`上传增项图片 ${i + 1} 失败:`, error);
        }
      }

      // 构建增项数据
      const addonData = {
        addonItems: selectedItems.map(item => ({
          item: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          productId: item.id,
          category: item.category
        })),
        reason: reason.trim(),
        addonImages: uploadedImages
      };

      // 调用后端API提交增项
      await request.post(`/orders/${orderId}/addon`, addonData);

      wx.hideLoading();

      wx.showToast({
        title: '增项提交成功',
        icon: 'success',
        duration: 2000
      });

      // 延迟后返回订单详情
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);

    } catch (error) {
      console.error('提交增项失败:', error);
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
