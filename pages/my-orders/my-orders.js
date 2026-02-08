// pages/my-orders/my-orders.js - 我的订单页面（门店技师）
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    activeTab: 'all',
    orders: [],
    loading: false
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    // 从订单详情返回时刷新
    if (this.data.orders.length > 0) {
      this.loadOrders();
    }
  },

  /**
   * 切换标签
   */
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;

    this.setData({
      activeTab: tab,
      orders: []
    });

    this.loadOrders();
  },

  /**
   * 加载订单列表
   */
  async loadOrders() {
    this.setData({ loading: true });

    try {
      const status = this.data.activeTab === 'all' ? '' : this.data.activeTab;

      const res = await request.get('/orders', {
        status,
        myOrders: true // 只看自己接的订单
      });

      const orders = this.formatOrders(res.data);

      this.setData({ orders });

    } catch (error) {
      console.error('加载订单失败:', error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 格式化订单数据
   */
  formatOrders(orders) {
    return orders.map(order => {
      const statusMap = {
        'received': {
          text: '已接单',
          nextAction: '请检查车辆并提交报价'
        },
        'approved': {
          text: '维修中',
          nextAction: '请尽快完成维修并提交完工'
        }
      };

      const statusInfo = statusMap[order.status] || { text: '未知', nextAction: '' };

      return {
        ...order,
        statusText: statusInfo.text,
        nextAction: statusInfo.nextAction,
        vehicleId: {
          plateNumber: order.vehicleId?.plateNumber || '未知车牌',
          brand: order.vehicleId?.brand || '',
          model: order.vehicleId?.model || ''
        },
        createdAtText: this.formatTime(order.createdAt)
      };
    });
  },

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) {
      return '刚刚';
    } else if (diff < hour) {
      return `${Math.floor(diff / minute)}分钟前`;
    } else if (diff < day) {
      return `${Math.floor(diff / hour)}小时前`;
    } else if (diff < 7 * day) {
      return `${Math.floor(diff / day)}天前`;
    } else {
      return `${date.getMonth() + 1}-${date.getDate()}`;
    }
  },

  /**
   * 点击订单
   */
  onOrderTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}`
    });
  },

  /**
   * 前往接单大厅
   */
  onGoToHall() {
    wx.navigateTo({
      url: '/pages/orders/orders'
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadOrders();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
