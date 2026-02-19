// pages/driver/vehicles/vehicles.js
const request = require('../../../utils/request');

Page({
  data: {
    vehicles: [],
    loading: false
  },

  onLoad() {
    this.loadVehicles();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadVehicles();
  },

  onPullDownRefresh() {
    this.loadVehicles().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载车辆列表
  async loadVehicles() {
    try {
      this.setData({ loading: true });

      const vehicles = await request.get('/vehicles');

      this.setData({
        vehicles,
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

  // 查看车辆详情
  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/driver/vehicles/detail?id=${id}`
    });
  },

  // 添加车辆
  addVehicle() {
    wx.navigateTo({
      url: '/pages/driver/vehicles/add'
    });
  },

  // 保养申请
  applyMaintenance(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/maintenance/maintenance?vehicleId=${id}`
    });
  }
});
