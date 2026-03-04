// pages/driver/vehicles/detail.js
const request = require('../../../utils/request');

Page({
  data: {
    vehicleId: '',
    vehicle: null,
    repairRecords: [],
    loading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        vehicleId: options.id
      });
      this.loadVehicleDetail();
      this.loadRepairRecords();
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

  // 加载维修记录
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

  // 格式化维修记录
  formatRepairRecords(records) {
    const statusMap = {
      'awaiting_fleet_approval': '待车队审批',
      'pending_assessment': '待评估',
      'awaiting_approval': '待审批报价',
      'in_repair': '维修中',
      'awaiting_addon_approval': '增项审批中',
      'completed': '待确认',
      'confirmed': '已完成',
      'rejected': '已拒绝'
    };

    return records.map(record => ({
      ...record,
      statusText: statusMap[record.status] || record.status,
      createdAtText: this.formatDate(record.createdAt),
      typeText: record.type === 'maintenance' ? '保养' : '维修'
    }));
  },

  // 格式化日期
  formatDate(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 查看订单详情
  viewOrderDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}`
    });
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
