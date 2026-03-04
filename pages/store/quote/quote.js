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
    submitting: false,
    // 预约时间确认
    appointmentConfirmed: false,
    finalAppointmentTime: '',
    showTimeAdjuster: false,
    selectedTimeSlot: '',
    availableTimeSlots: []
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

      // 格式化预约时间
      if (order.appointmentAt) {
        order.appointmentAtText = this.formatAppointmentTime(order.appointmentAt);
      }

      // 处理司机的期望时间偏好
      if (order.preferredTime) {
        order.preferredTimeText = this.getPreferredTimeText(order.preferredTime);
      }

      // 生成可选时间段列表
      this.generateTimeSlots();

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

  // 获取期望时间文本
  getPreferredTimeText(preferredTime) {
    const map = {
      'asap': '尽快安排',
      'this_afternoon': '今天下午',
      'tomorrow_morning': '明天上午'
    };
    return map[preferredTime] || '尽快安排';
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
    let value = parseInt(e.detail.value) || 1;
    if (value < 1) value = 1;

    console.log('输入数量:', { index, value, selectedItems: this.data.selectedItems });

    const selectedItems = [...this.data.selectedItems];
    if (!selectedItems[index]) {
      console.error('项目不存在:', index);
      return;
    }
    selectedItems[index].quantity = value;

    this.setData({ selectedItems });
    this.updateTotal();
  },

  // 减少数量
  onDecreaseQuantity(e) {
    const { index } = e.currentTarget.dataset;
    console.log('减少数量:', { index, selectedItems: this.data.selectedItems });

    const selectedItems = [...this.data.selectedItems];
    if (!selectedItems[index]) {
      console.error('项目不存在:', index);
      wx.showToast({
        title: '项目不存在',
        icon: 'none'
      });
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
    console.log('增加数量:', { index, selectedItems: this.data.selectedItems });

    const selectedItems = [...this.data.selectedItems];
    if (!selectedItems[index]) {
      console.error('项目不存在:', index);
      wx.showToast({
        title: '项目不存在',
        icon: 'none'
      });
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

      // 如果确认了预约时间，则包含在报价数据中
      if (this.data.appointmentConfirmed && this.data.order.appointmentAt) {
        quoteData.confirmedAppointmentAt = this.data.order.appointmentAt;
        console.log('========== 提交报价 ==========');
        console.log('确认的预约时间:', this.data.order.appointmentAt);
        console.log('预约时间文本:', this.data.order.appointmentAtText);
        console.log('提交的数据:', quoteData);
        console.log('============================');
      }

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
  },

  // 生成可选时间段
  generateTimeSlots() {
    const now = new Date();
    const slots = [];

    // 今天下午（如果当前时间早于15点）
    const thisAfternoon = new Date(now);
    thisAfternoon.setHours(15, 0, 0, 0);
    if (now.getHours() < 15) {
      slots.push({
        time: thisAfternoon.toISOString(),
        displayTime: '今天 15:00',
        description: '今天下午'
      });
    }

    // 明天上午
    const tomorrowMorning = new Date(now);
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    tomorrowMorning.setHours(10, 0, 0, 0);
    slots.push({
      time: tomorrowMorning.toISOString(),
      displayTime: '明天 10:00',
      description: '明天上午'
    });

    // 明天下午
    const tomorrowAfternoon = new Date(now);
    tomorrowAfternoon.setDate(tomorrowAfternoon.getDate() + 1);
    tomorrowAfternoon.setHours(15, 0, 0, 0);
    slots.push({
      time: tomorrowAfternoon.toISOString(),
      displayTime: '明天 15:00',
      description: '明天下午'
    });

    // 后天上午
    const dayAfterMorning = new Date(now);
    dayAfterMorning.setDate(dayAfterMorning.getDate() + 2);
    dayAfterMorning.setHours(10, 0, 0, 0);
    slots.push({
      time: dayAfterMorning.toISOString(),
      displayTime: '后天 10:00',
      description: '后天上午'
    });

    // 后天下午
    const dayAfterAfternoon = new Date(now);
    dayAfterAfternoon.setDate(dayAfterAfternoon.getDate() + 2);
    dayAfterAfternoon.setHours(15, 0, 0, 0);
    slots.push({
      time: dayAfterAfternoon.toISOString(),
      displayTime: '后天 15:00',
      description: '后天下午'
    });

    this.setData({
      availableTimeSlots: slots
    });
  },

  // 确认预约时间（使用系统建议时间）
  onConfirmAppointment() {
    const appointmentAt = this.data.order.appointmentAt;
    const appointmentAtText = this.formatAppointmentTime(appointmentAt);

    this.setData({
      appointmentConfirmed: true,
      finalAppointmentTime: appointmentAtText
    });

    wx.showToast({
      title: '已确认预约时间',
      icon: 'success'
    });
  },

  // 打开时间调整器
  onOpenTimeAdjuster() {
    console.log('打开时间调整器');
    console.log('当前订单时间:', this.data.order.appointmentAt);
    console.log('当前订单时间类型:', typeof this.data.order.appointmentAt);

    // 将当前时间转换为 ISO 字符串格式（与 generateTimeSlots 生成的格式一致）
    let currentTimeSlot = '';
    if (this.data.order.appointmentAt) {
      const currentDate = new Date(this.data.order.appointmentAt);
      currentTimeSlot = currentDate.toISOString();
      console.log('转换后的ISO时间:', currentTimeSlot);
    }

    this.setData({
      showTimeAdjuster: true,
      selectedTimeSlot: currentTimeSlot
    });

    console.log('初始选择的时间段:', this.data.selectedTimeSlot);
  },

  // 关闭时间调整器
  onCloseTimeAdjuster() {
    console.log('关闭时间调整器');
    this.setData({
      showTimeAdjuster: false
    });
  },

  // 选择时间段
  onSelectTimeSlot(e) {
    const { time } = e.currentTarget.dataset;
    console.log('选择时间段:', time);

    // 找到对应的时间段信息，用于显示
    const timeSlot = this.data.availableTimeSlots.find(slot => slot.time === time);
    const displayText = timeSlot ? timeSlot.displayTime : '';

    this.setData({
      selectedTimeSlot: time,
      selectedTimeDisplayText: displayText
    });

    // 给用户一个提示，知道已经选中了
    wx.showToast({
      title: '已选择，请点击确定',
      icon: 'success',
      duration: 1000
    });
  },

  // 确认调整时间
  onConfirmAdjustTime() {
    console.log('===== 点击了确定按钮 =====');

    if (!this.data.selectedTimeSlot) {
      console.log('错误：没有选择时间');
      wx.showToast({
        title: '请选择时间',
        icon: 'none'
      });
      return;
    }

    console.log('========== 确认调整时间 ==========');
    console.log('当前选择的时间段:', this.data.selectedTimeSlot);
    console.log('当前选择的时间段类型:', typeof this.data.selectedTimeSlot);
    console.log('当前的订单对象:', this.data.order);

    if (!this.data.selectedTimeSlot) {
      wx.showToast({
        title: '请选择时间',
        icon: 'none'
      });
      return;
    }

    const appointmentAtText = this.formatAppointmentTime(this.data.selectedTimeSlot);

    console.log('格式化后的时间文本:', appointmentAtText);

    // 更新订单数据和界面显示
    const order = { ...this.data.order };
    order.appointmentAt = this.data.selectedTimeSlot;  // 保存 ISO 字符串格式
    order.appointmentAtText = appointmentAtText;

    console.log('准备更新的订单对象:', order);

    this.setData({
      appointmentConfirmed: true,
      finalAppointmentTime: appointmentAtText,
      showTimeAdjuster: false,
      order: order
    }, () => {
      // setData 回调中验证更新
      console.log('setData成功，验证数据:');
      console.log('更新后的order.appointmentAt:', this.data.order.appointmentAt);
      console.log('更新后的order.appointmentAtText:', this.data.order.appointmentAtText);
      console.log('==================================');
    });

    wx.showToast({
      title: '预约时间已调整',
      icon: 'success'
    });
  }
});
