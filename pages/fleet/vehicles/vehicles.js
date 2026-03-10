const request = require('../../../utils/request');

function formatVehicle(item = {}) {
  const statusMap = {
    normal: '正常',
    repairing: '维修中',
    scrapped: '已报废',
    pending_inspection: '待年检'
  };

  return {
    ...item,
    statusText: statusMap[item.status] || item.status || '未知',
    vehicleTypeText: item.vehicleType || item.type || '待补充',
    brandModelText: item.brandModelText || [item.brand, item.model].filter(Boolean).join(' ') || '待补充',
    assignedDriverText: item.driverName || '未分配'
  };
}

Page({
  data: {
    vehicles: [],
    loading: false,
    normalCount: 0,
    repairingCount: 0
  },

  onLoad() {
    this.loadVehicles();
  },

  onShow() {
    this.loadVehicles();
  },

  onPullDownRefresh() {
    this.loadVehicles().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadVehicles() {
    try {
      this.setData({ loading: true });

      const res = await request.get('/vehicles');
      const vehicles = Array.isArray(res?.data) ? res.data.map(formatVehicle) : [];

      this.setData({
        vehicles,
        normalCount: vehicles.filter(v => v.status === 'normal').length,
        repairingCount: vehicles.filter(v => v.status === 'repairing').length,
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

  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/driver/vehicles/detail?id=${id}`
    });
  },

  addVehicle() {
    wx.navigateTo({
      url: '/pages/driver/vehicles/add'
    });
  }
});
