// pages/vehicle/vehicle.js - 我的车辆页面
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    vehicles: [],
    loading: false,
    hasPermission: true // 权限标志
  },

  onLoad() {
    // 检查用户权限（保留安全检查）
    const userInfo = wx.getStorageSync('userInfo');
    const role = userInfo?.role?.type;

    // 技师角色无权访问车辆管理（理论上不可能通过 tabBar 进入，保留检查以防万一）
    if (role === 'STORE_TECHNICIAN') {
      wx.switchTab({
        url: '/pages/index/index'
      });
      return;
    }

    this.loadVehicles();
  },

  onShow() {
    // 安全检查（理论上不可能通过 tabBar 进入，保留检查以防万一）
    const userInfo = wx.getStorageSync('userInfo');
    const role = userInfo?.role?.type;

    if (role === 'STORE_TECHNICIAN') {
      wx.switchTab({
        url: '/pages/index/index'
      });
      return;
    }

    // 更新自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateTabBar();
    }
  },

  /**
   * 加载车辆列表
   */
  async loadVehicles() {
    // 再次检查权限
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo?.role?.type === 'STORE_TECHNICIAN') {
      this.setData({ hasPermission: false });
      return;
    }

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
    const vehiclePlate = e.currentTarget.dataset.vehiclePlate || '';
    wx.setStorageSync('ordersVehicleFilter', {
      vehicleId,
      vehiclePlate,
      from: 'vehicle',
      ts: Date.now()
    });

    wx.switchTab({
      url: '/pages/orders/orders',
      fail: (err) => {
        console.error('跳转订单页失败:', err);
        wx.showToast({
          title: '打开维修记录失败',
          icon: 'none'
        });
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
  },

  /**
   * 返回首页
   */
  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
