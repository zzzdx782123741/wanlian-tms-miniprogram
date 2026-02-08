// pages/orders/orders.js - 订单列表页面
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    activeTab: 'all',
    orders: [],
    loading: false,
    counts: {
      all: 0,
      pending: 0,
      processing: 0,
      completed: 0
    },
    page: 1,
    hasMore: true
  },

  onLoad(options) {
    // 如果传入了状态参数，切换到对应标签
    if (options.status) {
      this.setData({ activeTab: options.status });
    }
    this.loadOrders();
  },

  onShow() {
    // 从订单详情页返回时刷新列表
    if (this.data.orders.length > 0) {
      this.refreshOrders();
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
      orders: [],
      page: 1,
      hasMore: true
    });

    this.loadOrders();
  },

  /**
   * 加载订单列表
   */
  async loadOrders() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const status = this.data.activeTab === 'all' ? '' : this.getStatusParam(this.data.activeTab);

      const res = await request.get('/orders', {
        status,
        page: this.data.page,
        limit: 10
      });

      const orders = this.formatOrders(res.data);

      this.setData({
        orders: this.data.page === 1 ? orders : [...this.data.orders, ...orders],
        hasMore: orders.length >= 10,
        page: this.data.page + 1
      });

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
   * 刷新订单列表
   */
  refreshOrders() {
    this.setData({
      orders: [],
      page: 1,
      hasMore: true
    });
    this.loadOrders();
  },

  /**
   * 格式化订单数据
   */
  formatOrders(orders) {
    return orders.map(order => {
      const statusMap = {
        'pending': { text: '待接单', showProgress: false },
        'received': { text: '已接单', showProgress: true, progress: 25, progressText: '门店已接单' },
        'quoted': { text: '待审批', showProgress: true, progress: 50, progressText: '等待审批报价' },
        'approved': { text: '维修中', showProgress: true, progress: 75, progressText: '正在维修' },
        'completed': { text: '待确认', showProgress: true, progress: 90, progressText: '维修完成' },
        'confirmed': { text: '已完成', showProgress: false }
      };

      const statusInfo = statusMap[order.status] || { text: '未知', showProgress: false };

      return {
        ...order,
        statusText: statusInfo.text,
        showProgress: statusInfo.showProgress,
        progress: statusInfo.progress || 0,
        progressText: statusInfo.progressText || '',
        vehicleInfo: {
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
   * 获取状态参数
   */
  getStatusParam(tab) {
    const statusMap = {
      'pending': 'pending',
      'processing': 'received,quoted,approved,completed',
      'completed': 'confirmed'
    };
    return statusMap[tab] || '';
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
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.refreshOrders();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  /**
   * 触底加载更多
   */
  onReachBottom() {
    this.loadOrders();
  }
});
