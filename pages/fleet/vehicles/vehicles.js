// pages/fleet/vehicles/vehicles.js
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
    this.loadVehicles();
  },

  onPullDownRefresh() {
    this.loadVehicles().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载车队所有车辆
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

  // 查看详情
  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/fleet/vehicles/detail?id=${id}`
    });
  },

  // 添加车辆
  addVehicle() {
    wx.navigateTo({
      url: '/pages/fleet/vehicles/add'
    });
  }
});
