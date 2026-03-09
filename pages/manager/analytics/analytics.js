// pages/manager/analytics/analytics.js
const app = getApp();
const request = require('../../../utils/request');

Page({
  data: {
    timeRange: 'week',
    stats: {
      totalOrders: 0,
      totalIncome: '0.00',
      avgOrderValue: '0.00',
      completionRate: '0%'
    },
    orderTrend: [],
    serviceDistribution: [],
    technicianRanking: [],
    loading: false
  },

  onLoad() {
    this.loadAnalyticsData();
  },

  onShow() {
    this.loadAnalyticsData();
  },

  // 选择时间范围
  selectTimeRange(e) {
    const range = e.currentTarget.dataset.range;
    this.setData({ timeRange: range });
    this.loadAnalyticsData();
  },

  // 加载统计数据
  async loadAnalyticsData() {
    this.setData({ loading: true });

    try {
      // 调用实际的API
      const res = await request.get('/store/analytics', {
        timeRange: this.data.timeRange
      });

      if (res.success) {
        const data = res.data || {};
        this.setData({
          stats: data.stats || {},
          serviceDistribution: data.serviceDistribution || [],
          technicianRanking: data.technicianRanking || [],
          loading: false
        });
      } else {
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadAnalyticsData().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});