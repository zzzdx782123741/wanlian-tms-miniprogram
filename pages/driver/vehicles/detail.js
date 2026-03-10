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
    yearText: item.year ? `${item.year}年` : '待补充',
    vinText: item.vin || '待补充'
  };
}

Page({
  data: {
    vehicleId: '',
    vehicle: null,
    repairRecords: [],
    loading: false,
    canManageVehicle: false
  },

  onLoad(options) {
    const userInfo = wx.getStorageSync('userInfo');
    const role = userInfo?.role?.type;

    this.setData({
      canManageVehicle: role === 'FLEET_MANAGER'
    });

    if (options.id) {
      this.setData({
        vehicleId: options.id
      });
      this.loadVehicleDetail();
      this.loadRepairRecords();
    }
  },

  async loadVehicleDetail() {
    try {
      this.setData({ loading: true });

      const res = await request.get(`/vehicles/${this.data.vehicleId}`);

      this.setData({
        vehicle: formatVehicle(res?.data || {}),
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

  async loadRepairRecords() {
    try {
      const res = await request.get('/orders', { vehicleId: this.data.vehicleId });
      const repairRecords = res.data?.orders || [];

      this.setData({
        repairRecords: this.formatRepairRecords(repairRecords)
      });
    } catch (error) {
      console.error('加载维修记录失败:', error);
    }
  },

  formatRepairRecords(records) {
    const statusMap = {
      awaiting_fleet_approval: '待车队审批',
      pending_assessment: '待接车检查',
      awaiting_approval: '待审核报价',
      in_repair: '维修中',
      awaiting_addon_approval: '待审核增项',
      pending_confirmation: '待确认完工',
      completed: '已完成',
      rejected: '已拒绝'
    };

    return records.map(record => ({
      ...record,
      statusText: statusMap[record.status] || record.status,
      createdAtText: this.formatDate(record.createdAt),
      typeText: record.type === 'maintenance' ? '保养' : '维修'
    }));
  },

  formatDate(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  viewOrderDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}`
    });
  },

  editVehicle() {
    wx.showToast({
      title: '请前往车队管理端完善档案',
      icon: 'none'
    });
  },

  applyMaintenance() {
    wx.navigateTo({
      url: `/pages/maintenance/maintenance?vehicleId=${this.data.vehicleId}`
    });
  },

  async deleteVehicle() {
    if (!this.data.canManageVehicle) {
      wx.showToast({
        title: '仅车队管理员可删除车辆',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这辆车吗？',
      success: async (res) => {
        if (!res.confirm) {
          return;
        }

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
    });
  }
});
