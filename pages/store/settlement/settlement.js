// pages/store/settlement/settlement.js
Page({
  data: {
    loading: false,
    // 统计信息
    stats: {
      totalSettledAmount: 0,
      totalPlatformFee: 0,
      pendingSettlements: 0,
      pendingAmount: 0
    },
    // 结算记录列表
    settlements: [],
    currentPage: 1,
    hasMore: true
  },

  onLoad() {
    this.loadStatistics();
    this.loadSettlements();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadStatistics();
  },

  onPullDownRefresh() {
    this.loadStatistics().then(() => {
      this.setData({ currentPage: 1, settlements: [], hasMore: true });
      return this.loadSettlements();
    }).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadSettlements(this.data.currentPage + 1);
    }
  },

  // 加载统计信息
  loadStatistics() {
    return wx.request({
      url: `${getApp().config.apiBase}/api/settlements/statistics`,
      method: 'GET',
      header: {
        'Authorization': wx.getStorageSync('token')
      },
      success: (res) => {
        if (res.data.success) {
          this.setData({
            stats: res.data.data
          });
        }
      },
      fail: (err) => {
        console.error('获取统计信息失败:', err);
        wx.showToast({
          title: '获取统计信息失败',
          icon: 'none'
        });
      }
    });
  },

  // 加载结算记录
  loadSettlements(page = 1) {
    if (this.data.loading) return;

    this.setData({ loading: true });

    return wx.request({
      url: `${getApp().config.apiBase}/api/settlements`,
      method: 'GET',
      data: {
        page,
        limit: 20
      },
      header: {
        'Authorization': wx.getStorageSync('token')
      },
      success: (res) => {
        if (res.data.success) {
          const newSettlements = page === 1
            ? res.data.data.settlements
            : [...this.data.settlements, ...res.data.data.settlements];

          this.setData({
            settlements: newSettlements,
            currentPage: page,
            hasMore: page < res.data.data.totalPages,
            loading: false
          });
        }
      },
      fail: (err) => {
        console.error('获取结算记录失败:', err);
        wx.showToast({
          title: '获取结算记录失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    });
  },

  // 查看结算详情
  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/store/settlement-detail/settlement-detail?id=${id}`
    });
  },

  // 格式化金额
  formatAmount(amount) {
    return (amount / 100).toFixed(2);
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'pending': '待结算',
      'processing': '结算中',
      'success': '已结算',
      'failed': '结算失败'
    };
    return statusMap[status] || status;
  },

  // 获取状态颜色
  getStatusColor(status) {
    const colorMap = {
      'pending': '#ff9500',
      'processing': '#1989fa',
      'success': '#07c160',
      'failed': '#ee0a24'
    };
    return colorMap[status] || '#666';
  }
});
