const request = require('../../../utils/request');

Page({
  data: {
    plateNumber: '',
    type: '',
    canManageVehicle: false,
    typeList: ['货车', '厢式车', '冷藏车', '罐车', '平板车']
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    const role = userInfo?.role?.type;
    const canManageVehicle = role === 'FLEET_MANAGER';

    this.setData({ canManageVehicle });

    if (!canManageVehicle) {
      wx.showToast({
        title: '仅车队管理员可新增车辆',
        icon: 'none'
      });

      setTimeout(() => {
        wx.navigateBack({
          fail: () => {}
        });
      }, 1200);
    }
  },

  onTypeChange(e) {
    this.setData({
      type: this.data.typeList[e.detail.value]
    });
  },

  onPlateNumberInput(e) {
    this.setData({
      plateNumber: e.detail.value.toUpperCase()
    });
  },

  async handleSubmit() {
    const { plateNumber, type, canManageVehicle } = this.data;

    if (!canManageVehicle) {
      return;
    }

    if (!plateNumber) {
      wx.showToast({
        title: '请输入车牌号',
        icon: 'none'
      });
      return;
    }

    if (!/^[\u4e00-\u9fa5][A-Z][A-Z0-9]{5,6}$/.test(plateNumber)) {
      wx.showToast({
        title: '车牌号格式不正确',
        icon: 'none'
      });
      return;
    }

    if (!type) {
      wx.showToast({
        title: '请选择车辆类型',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '提交中...' });

      await request.post('/vehicles', {
        plateNumber,
        type
      });

      wx.hideLoading();
      wx.showToast({
        title: '新增成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '新增失败',
        icon: 'none'
      });
    }
  }
});
