// pages/report/report.js - 报修申请页面
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    vehicles: [],
    selectedVehicleIndex: -1,
    stores: [],
    selectedStoreIndex: -1,
    faultDescription: '',
    faultImages: [],
    appointmentTime: '',
    appointmentDate: '',
    remark: '',
    submitting: false
  },

  onLoad(options) {
    // 如果从车辆页面跳转过来，预选车辆
    if (options.vehicleId) {
      this.preselectedVehicleId = options.vehicleId;
    }

    // 设置今天日期
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.setData({
      today: `${year}-${month}-${day}`
    });

    this.loadVehicles();
    this.loadStores();
  },

  /**
   * 加载车辆列表
   */
  async loadVehicles() {
    try {
      const res = await request.get('/vehicles');

      const vehicles = res.data
        .filter(v => v.status === 'normal')
        .map(v => ({
          _id: v._id,
          label: `${v.plateNumber} - ${v.brand} ${v.model}`,
          ...v
        }));

      this.setData({ vehicles });

      // 如果有预选车辆，自动选中
      if (this.preselectedVehicleId) {
        const index = vehicles.findIndex(v => v._id === this.preselectedVehicleId);
        if (index !== -1) {
          this.setData({ selectedVehicleIndex: index });
        }
      }

    } catch (error) {
      console.error('加载车辆失败:', error);
      wx.showToast({
        title: error.message || '加载车辆失败',
        icon: 'none'
      });
    }
  },

  /**
   * 加载门店列表
   */
  async loadStores() {
    try {
      const res = await request.get('/stores?status=normal&limit=100');

      const stores = res.data.map(s => ({
        _id: s._id,
        label: `${s.name} - ${s.address.city}${s.address.district}`,
        ...s
      }));

      this.setData({ stores });

    } catch (error) {
      console.error('加载门店失败:', error);
      wx.showToast({
        title: error.message || '加载门店失败',
        icon: 'none'
      });
    }
  },

  /**
   * 选择车辆
   */
  onVehicleChange(e) {
    this.setData({
      selectedVehicleIndex: parseInt(e.detail.value)
    });
  },

  /**
   * 选择门店
   */
  onStoreChange(e) {
    this.setData({
      selectedStoreIndex: parseInt(e.detail.value)
    });
  },

  /**
   * 选择预约日期
   */
  onDateChange(e) {
    this.setData({
      appointmentDate: e.detail.value
    });
  },

  /**
   * 选择预约时间
   */
  onTimeChange(e) {
    this.setData({
      appointmentTime: e.detail.value
    });
  },

  /**
   * 输入备注
   */
  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value
    });
  },

  /**
   * 输入故障描述
   */
  onDescriptionInput(e) {
    this.setData({
      faultDescription: e.detail.value
    });
  },

  /**
   * 选择图片
   */
  onChooseImage() {
    const remainCount = 9 - this.data.faultImages.length;

    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        this.setData({
          faultImages: [...this.data.faultImages, ...tempFilePaths]
        });
      }
    });
  },

  /**
   * 预览图片
   */
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.faultImages
    });
  },

  /**
   * 删除图片
   */
  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.faultImages];
    images.splice(index, 1);
    this.setData({ faultImages: images });
  },

  /**
   * 提交报修申请
   */
  async onSubmit() {
    // 验证表单
    if (this.data.selectedVehicleIndex === -1) {
      wx.showToast({
        title: '请选择车辆',
        icon: 'none'
      });
      return;
    }

    if (this.data.selectedStoreIndex === -1) {
      wx.showToast({
        title: '请选择门店',
        icon: 'none'
      });
      return;
    }

    if (!this.data.faultDescription.trim()) {
      wx.showToast({
        title: '请输入故障描述',
        icon: 'none'
      });
      return;
    }

    if (this.data.faultDescription.length < 10) {
      wx.showToast({
        title: '故障描述至少10个字',
        icon: 'none'
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      // 上传图片
      const uploadedImages = [];
      for (let imagePath of this.data.faultImages) {
        try {
          const uploadRes = await this.uploadImage(imagePath);
          uploadedImages.push(uploadRes.url);
        } catch (error) {
          console.error('上传图片失败:', error);
        }
      }

      // 提交订单
      const vehicle = this.data.vehicles[this.data.selectedVehicleIndex];
      const store = this.data.stores[this.data.selectedStoreIndex];

      // 组装预约时间
      let appointmentAt = null;
      if (this.data.appointmentDate && this.data.appointmentTime) {
        appointmentAt = `${this.data.appointmentDate} ${this.data.appointmentTime}`;
      }

      await request.post('/orders', {
        vehicleId: vehicle._id,
        storeId: store._id,
        faultDescription: this.data.faultDescription,
        faultImages: uploadedImages,
        appointmentAt: appointmentAt,
        remark: this.data.remark || ''
      });

      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });

      // 延迟跳转到订单列表
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/orders/orders'
        });
      }, 1500);

    } catch (error) {
      console.error('提交申请失败:', error);
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 上传单张图片
   */
  uploadImage(filePath) {
    return new Promise((resolve, reject) => {
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
        fail: reject
      });
    });
  }
});
