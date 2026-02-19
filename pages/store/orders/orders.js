// pages/store/orders/orders.js - 门店技师接单大厅
const request = require('../../../utils/request');

Page({
  data: {
    orders: [],
    loading: false,
    activeTab: 'pending', // pending(待接单), received(已接单), all(全部)
    tabs: [
      { key: 'pending', label: '待接单' },
      { key: 'received', label: '进行中' },
      { key: 'all', label: '全部' }
    ]
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 切换标签
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    this.loadOrders();
  },

  // 加载订单列表
  async loadOrders() {
    try {
      this.setData({ loading: true });

      const { activeTab } = this.data;
      let params = {};

      // 根据标签筛选订单
      if (activeTab === 'pending') {
        params.status = 'pending'; // 待接单
      } else if (activeTab === 'received') {
        // 已接单的状态包括：received, quoted, repairing
        params.status = 'received,quoted,repairing';
      }

      const res = await request.get('/orders', params);
      const orders = this.formatOrders(res.data.orders || []);

      // 过滤技师自己的订单
      const userInfo = wx.getStorageSync('userInfo');
      const myOrders = orders.filter(order => {
        if (activeTab === 'pending') {
          // 待接单：显示所有待接订单
          return order.status === 'pending';
        } else if (activeTab === 'received') {
          // 进行中：显示该技师接单的订单
          return order.technicianId &&
                 order.technicianId._id === userInfo.id &&
                 ['received', 'quoted', 'repairing'].includes(order.status);
        }
        return true;
      });

      this.setData({
        orders: myOrders,
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

  // 接单
  async receiveOrder(e) {
    const { id } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认接单',
      content: '确定要接取这个订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '接单中...' });

            await request.post(`/orders/${id}/receive`, {
              status: 'received'
            });

            wx.hideLoading();

            wx.showToast({
              title: '接单成功',
              icon: 'success'
            });

            // 刷新列表
            this.loadOrders();

          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '接单失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 填写报价
  quoteOrder(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/store/quote/quote?id=${id}`
    });
  },

  // 查看订单详情
  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/store/order-detail/order-detail?id=${id}`
    });
  },

  // 格式化订单数据
  formatOrders(orders) {
    return orders.map(order => {
      // 判断是否已确认
      const isConfirmed = order.completion && order.completion.confirmedBy;

      // 获取状态文本
      let statusText = this.getStatusText(order.status, order);

      return {
        ...order,
        statusText: statusText
      };
    });
  },

  // 获取状态文本
  getStatusText(status, order) {
    // 判断是否已确认
    const isConfirmed = order && order.completion && order.completion.confirmedBy;

    const statusMap = {
      'pending': '待接单',
      'pending_assessment': '待评估',
      'received': '已接单',
      'awaiting_approval': '待审批',
      'quoted': '已报价',
      'approved': '已审批',
      'repairing': '维修中',
      'in_repair': '维修中',
      'completed': isConfirmed ? '已完成' : '待确认',
      'confirmed': '已确认'
    };
    return statusMap[status] || status;
  },

  // 获取状态类型（用于样式）
  getStatusType(status) {
    const typeMap = {
      'pending': 'warning',
      'pending_assessment': 'warning',
      'received': 'info',
      'awaiting_approval': 'info',
      'quoted': 'primary',
      'approved': 'primary',
      'repairing': 'primary',
      'in_repair': 'primary',
      'completed': 'success',
      'confirmed': 'success'
    };
    return typeMap[status] || '';
  }
});
