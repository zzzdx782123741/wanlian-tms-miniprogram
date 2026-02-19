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

      // 计算统计数据
      const activeCount = vehicles.filter(v => v.status === 'ACTIVE').length;
      const idleCount = vehicles.filter(v => v.status === 'IDLE').length;

      this.setData({
        vehicles,
        activeCount,
        idleCount,
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
      url: `/pages/driver/vehicles/detail?id=${id}`
    });
  },

  // 添加车辆
  addVehicle() {
    wx.navigateTo({
      url: '/pages/driver/vehicles/add'
    });
  }
});
