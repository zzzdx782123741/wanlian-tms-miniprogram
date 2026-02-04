// pages/driver/vehicles/add.js
const request = require('../../../utils/request');

Page({
  data: {
    plateNumber: '',
    type: '',
    loadCapacity: '',
    length: '',
    typeList: ['货车', '厢式车', '冷藏车', '罐车', '平板车']
  },

  // 选择车型
  onTypeChange(e) {
    this.setData({
      type: this.data.typeList[e.detail.value]
    });
  },

  // 输入车牌号
  onPlateNumberInput(e) {
    this.setData({
      plateNumber: e.detail.value.toUpperCase()
    });
  },

  // 输入载重
  onLoadCapacityInput(e) {
    this.setData({
      loadCapacity: e.detail.value
    });
  },

  // 输入长度
  onLengthInput(e) {
    this.setData({
      length: e.detail.value
    });
  },

  // 提交添加
  async handleSubmit() {
    const { plateNumber, type, loadCapacity, length } = this.data;

    // 表单验证
    if (!plateNumber) {
      wx.showToast({
        title: '请输入车牌号',
        icon: 'none'
      });
      return;
    }

    if (!/^[\u4e00-\u9fa5][A-Z][A-Z0-9]{5}$/.test(plateNumber)) {
      wx.showToast({
        title: '车牌号格式不正确',
        icon: 'none'
      });
      return;
    }

    if (!type) {
      wx.showToast({
        title: '请选择车型',
        icon: 'none'
      });
      return;
    }

    if (!loadCapacity) {
      wx.showToast({
        title: '请输入载重',
        icon: 'none'
      });
      return;
    }

    if (!length) {
      wx.showToast({
        title: '请输入车辆长度',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '添加中...' });

      await request.post('/vehicles', {
        plateNumber,
        type,
        loadCapacity: Number(loadCapacity),
        length: Number(length),
        status: 'IDLE'
      });

      wx.hideLoading();

      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '添加失败',
        icon: 'none'
      });
    }
  }
});
