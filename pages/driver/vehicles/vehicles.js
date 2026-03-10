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
    yearText: item.year ? `${item.year}年` : '待补充'
  };
}

Page({
  data: {
    vehicles: [],
    loading: false,
    canManageVehicle: false
  },

  onLoad() {
    this.initPermissions();
    this.loadVehicles();
  },

  onShow() {
    this.initPermissions();
    this.loadVehicles();
  },

  onPullDownRefresh() {
    this.loadVehicles().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  initPermissions() {
    const userInfo = wx.getStorageSync('userInfo');
    const role = userInfo?.role?.type;

    this.setData({
      canManageVehicle: role === 'FLEET_MANAGER'
    });
  },

  async loadVehicles() {
    try {
      this.setData({ loading: true });

      const res = await request.get('/vehicles');
      const vehicles = Array.isArray(res?.data) ? res.data.map(formatVehicle) : [];

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

  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/driver/vehicles/detail?id=${id}`
    });
  },

  addVehicle() {
    if (!this.data.canManageVehicle) {
      wx.showToast({
        title: '仅车队管理员可新增车辆',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/driver/vehicles/add'
    });
  },

  applyMaintenance(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/maintenance/maintenance?vehicleId=${id}`
    });
  }
});
