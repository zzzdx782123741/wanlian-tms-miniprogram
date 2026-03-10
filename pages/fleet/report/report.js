// pages/fleet/report/report.js
const request = require('../../../utils/request');

const DEFAULT_STATS = {
  totalOrders: 0,
  completedOrders: 0,
  inTransitOrders: 0,
  pendingOrders: 0
};

const STATUS_TEXT_MAP = {
  awaiting_fleet_approval: '待车队审批',
  awaiting_time_confirmation: '待确认到店时间',
  pending_assessment: '待接车检查',
  awaiting_approval: '待审批报价',
  in_repair: '维修中',
  awaiting_addon_approval: '待审批增项',
  pending_confirmation: '待确认完工',
  completed: '已完成',
  refunded: '已退款',
  rejected: '已拒绝'
};

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
}

function formatRecentOrders(orders) {
  if (!Array.isArray(orders)) return [];

  return orders.slice(0, 10).map(order => ({
    _id: order._id,
    orderNumber: order.orderNumber || '-',
    status: order.status || '',
    statusText: STATUS_TEXT_MAP[order.status] || order.status || '未知状态',
    origin: order.serviceLocation?.address || '-',
    destination: order.storeId?.name || order.storeId?.address?.detail || '-',
    price: order.quote?.actualTotal || order.quote?.total || order.addon?.total || 0,
    createdAt: formatDateTime(order.createdAt)
  }));
}

Page({
  data: {
    stats: { ...DEFAULT_STATS },
    orders: [],
    loading: false
  },

  onLoad() {
    this.loadReport();
  },

  onPullDownRefresh() {
    Promise.resolve(this.loadReport()).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadReport() {
    try {
      this.setData({ loading: true });

      const [statsRes, ordersRes] = await Promise.all([
        request.get('/fleets/current/stats'),
        request.get('/orders', { limit: 10 })
      ]);

      this.setData({
        stats: statsRes.data || { ...DEFAULT_STATS },
        orders: formatRecentOrders(ordersRes.data?.orders || []),
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

  viewOrder(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}`
    });
  }
});
