// pages/orders/orders.js - 订单列表页面（支持所有角色）
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    activeTab: 'all',
    orders: [],
    loading: false,
    role: '',
    // 标签配置（根据角色动态生成）
    tabs: []
  },

  onLoad(options) {
    const userInfo = wx.getStorageSync('userInfo');
    const role = userInfo?.role?.type || '';

    // 根据角色配置标签
    const tabs = this.getTabsByRole(role);

    this.setData({
      role,
      tabs
    });

    // 如果传入了状态参数，切换到对应标签
    if (options.status && tabs.some(t => t.key === options.status)) {
      this.setData({ activeTab: options.status });
    }

    this.loadOrders();
  },

  onShow() {
    // 从订单详情页返回时刷新列表
    if (this.data.orders.length > 0) {
      this.refreshOrders();
    }

    // 更新自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateTabBar();
    }
  },

  /**
   * 根据角色获取标签配置
   */
  getTabsByRole(role) {
    // 技师角色
    if (role === 'STORE_TECHNICIAN') {
      return [
        { key: 'all', label: '全部' },
        { key: 'pending', label: '待处理' },
        { key: 'processing', label: '处理中' },
        { key: 'completed', label: '已完成' }
      ];
    }

    // 其他角色（司机、车队管理员、平台运营）
    return [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待处理' },
      { key: 'processing', label: '处理中' },
      { key: 'completed', label: '已完成' }
    ];
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
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const { activeTab, role } = this.data;
      let status = '';

      // 根据角色和标签设置状态参数
      if (role === 'STORE_TECHNICIAN') {
        // 技师角色
        if (activeTab === 'pending') {
          status = 'pending_assessment';
        } else if (activeTab === 'processing') {
          status = 'awaiting_approval,in_repair,awaiting_addon_approval';
        } else if (activeTab === 'completed') {
          status = 'completed';
        }
      } else {
        // 其他角色
        if (activeTab === 'pending') {
          status = 'awaiting_fleet_approval,pending_assessment';
        } else if (activeTab === 'processing') {
          status = 'awaiting_approval,in_repair,awaiting_addon_approval';
        } else if (activeTab === 'completed') {
          status = 'completed';
        }
      }

      const res = await request.get('/orders', { status });

      // 修复：正确处理返回的数据格式
      // 后端返回格式：{ success: true, data: { orders: [...], total: N } }
      const ordersData = res.data?.orders || res.data || [];

      const orders = this.formatOrders(ordersData);

      this.setData({
        orders,
        loading: false
      });

    } catch (error) {
      console.error('加载订单失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 刷新订单列表
   */
  refreshOrders() {
    this.loadOrders();
  },

  /**
   * 格式化订单数据
   */
  formatOrders(orders) {
    if (!Array.isArray(orders)) return [];

    return orders.map(order => {
      // 判断是否已确认
      const isConfirmed = order.completion && order.completion.confirmedBy;

      // 判断是否已评价
      const isReviewed = !!order.reviewed;

      // 判断是否可以追评（15天内）
      const completedAt = order.completion?.completedAt || order.completedAt;
      let canReview = false;
      if (completedAt) {
        const daysDiff = (Date.now() - new Date(completedAt).getTime()) / (1000 * 60 * 60 * 24);
        canReview = daysDiff <= 15 && !isReviewed;
      }

      const statusMap = {
        'awaiting_fleet_approval': { text: '待车队审批', type: 'warning' },
        'pending_assessment': { text: '待评估', type: 'warning' },
        'awaiting_approval': { text: '待审批', type: 'info' },
        'in_repair': { text: '维修中', type: 'primary' },
        'awaiting_addon_approval': { text: '增项审批', type: 'warning' },
        'completed': { text: isConfirmed ? '已完成' : '待确认', type: 'success' },
        'confirmed': { text: '已完成', type: 'success' },
        'rejected': { text: '已拒绝', type: 'error' }
      };

      const statusInfo = statusMap[order.status] || { text: '未知', type: 'default' };

      return {
        ...order,
        statusText: statusInfo.text,
        statusType: statusInfo.type,
        isConfirmed,
        isReviewed,
        canReview,
        vehicleInfo: {
          plateNumber: order.vehicleId?.plateNumber || '未知车牌',
          brand: order.vehicleId?.brand || '',
          model: order.vehicleId?.model || ''
        },
        createdAtText: this.formatTime(order.createdAt),
        createdAt: this.formatDate(order.createdAt)
      };
    });
  },

  /**
   * 格式化时间（相对时间）
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
      return this.formatDate(timestamp);
    }
  },

  /**
   * 格式化日期（绝对时间）
   */
  formatDate(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  /**
   * 获取状态类型（用于样式）
   */
  getStatusType(status) {
    const typeMap = {
      'awaiting_fleet_approval': 'warning',
      'pending_assessment': 'warning',
      'awaiting_approval': 'info',
      'in_repair': 'primary',
      'awaiting_addon_approval': 'warning',
      'completed': 'success',
      'confirmed': 'success',
      'rejected': 'error'
    };
    return typeMap[status] || '';
  },

  /**
   * 点击订单
   */
  onOrderTap(e) {
    const id = e.currentTarget.dataset.id;
    const { role } = this.data;

    // 根据角色跳转到不同的详情页
    if (role === 'STORE_TECHNICIAN') {
      wx.navigateTo({
        url: `/pages/store/order-detail/order-detail?id=${id}`
      });
    } else {
      wx.navigateTo({
        url: `/pages/order-detail/order-detail?id=${id}`
      });
    }
  },

  /**
   * 点击去审批按钮（车队管理员、平台运营）
   */
  onApproveOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}&action=approve`
    });
  },

  /**
   * 点击去确认按钮（司机）
   */
  onConfirmOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}&action=confirm`
    });
  },

  /**
   * 点击去评价按钮（司机）
   */
  onReviewOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/driver/review/review?id=${id}`
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
  }
});
