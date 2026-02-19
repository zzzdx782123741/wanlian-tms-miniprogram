// pages/driver/vehicles/detail.js
const request = require('../../../utils/request');

Page({
  data: {
    vehicleId: '',
    vehicle: null,
    loading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        vehicleId: options.id
      });
      this.loadVehicleDetail();
    }
  },

  // 加载车辆详情
  async loadVehicleDetail() {
    try {
      this.setData({ loading: true });

      const vehicle = await request.get(`/vehicles/${this.data.vehicleId}`);

      this.setData({
        vehicle,
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

  // 编辑车辆
  editVehicle() {
    wx.showToast({
      title: '编辑功能开发中',
      icon: 'none'
    });
  },

  // 保养申请
  applyMaintenance() {
    wx.navigateTo({
      url: `/pages/maintenance/maintenance?vehicleId=${this.data.vehicleId}`
    });
  },

  // 删除车辆
  async deleteVehicle() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这辆车吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' });

            await request.delete(`/vehicles/${this.data.vehicleId}`);

            wx.hideLoading();

            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });

            setTimeout(() => {
              wx.navigateBack();
            }, 1500);

          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  }
});
