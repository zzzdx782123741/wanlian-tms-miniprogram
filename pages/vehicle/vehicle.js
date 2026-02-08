// pages/vehicle/vehicle.js - 我的车辆页面
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    vehicles: [],
    loading: false
  },

  onLoad() {
    this.loadVehicles();
  },

  /**
   * 加载车辆列表
   */
  async loadVehicles() {
    this.setData({ loading: true });

    try {
      const res = await request.get('/vehicles');

      const vehicles = res.data.map(vehicle => {
        const statusMap = {
          'normal': { text: '正常', color: '#10B981' },
          'repairing': { text: '维修中', color: '#F59E0B' },
          'scrapped': { text: '已报废', color: '#EF4444' }
        };

        const statusInfo = statusMap[vehicle.status] || { text: '未知', color: '#A0AEC0' };

        return {
          ...vehicle,
          statusText: statusInfo.text,
          statusColor: statusInfo.color
        };
      });

      this.setData({ vehicles });

    } catch (error) {
      console.error('加载车辆失败:', error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 报修申请
   */
  onReport(e) {
    const vehicleId = e.currentTarget.dataset.vehicleId;
    wx.navigateTo({
      url: `/pages/report/report?vehicleId=${vehicleId}`
    });
  },

  /**
   * 查看维修记录
   */
  onViewOrders(e) {
    const vehicleId = e.currentTarget.dataset.vehicleId;
    wx.navigateTo({
      url: `/pages/orders/orders?vehicleId=${vehicleId}`
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadVehicles();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
