// pages/fleet-vehicles/fleet-vehicles.js - 车队车辆管理页面
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    vehicles: [],
    loading: false,
    stats: {
      total: 0,
      normal: 0,
      repairing: 0
    }
  },

  onLoad() {
    this.loadVehicles();
  },

  onShow() {
    // 返回时刷新列表
    if (this.data.vehicles.length > 0) {
      this.loadVehicles();
    }
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

      // 计算统计
      const stats = {
        total: vehicles.length,
        normal: vehicles.filter(v => v.status === 'normal').length,
        repairing: vehicles.filter(v => v.status === 'repairing').length
      };

      this.setData({ vehicles, stats });

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
   * 查看车辆详情
   */
  onVehicleDetail(e) {
    const vehicleId = e.currentTarget.dataset.vehicleId;
    wx.navigateTo({
      url: `/pages/driver/vehicles/detail?id=${vehicleId}`
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
   * 联系司机
   */
  onCallDriver(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) {
      wx.showToast({
        title: '暂无联系电话',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '拨打电话',
      content: `确定拨打 ${phone}？`,
      confirmColor: '#667eea',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: phone
          });
        }
      }
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
