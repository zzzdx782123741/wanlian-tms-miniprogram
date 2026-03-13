const app = getApp();
const request = require('../../../utils/request');
const { normalizeWithdrawal } = require('../../../utils/store-finance');

Page({
  data: {
    tabs: [
      { label: '全部', value: '' },
      { label: '审核中', value: 'pending' },
      { label: '处理中', value: 'processing' },
      { label: '已完成', value: 'completed' },
      { label: '已拒绝', value: 'rejected' },
      { label: '已取消', value: 'cancelled' }
    ],
    activeStatus: '',
    records: [],
    page: 1,
    limit: 20,
    total: 0,
    loading: false,
    hasMore: true
  },

  onLoad() {
    this._skipNextOnShow = true;
    this.initPage();
  },

  onShow() {
    if (this._skipNextOnShow) {
      this._skipNextOnShow = false;
      return;
    }

    if (this._initialized) {
      this.loadRecords(true);
    }
  },

  initPage() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    const role = app.globalData.role || wx.getStorageSync('role');

    if (!userInfo) {
      wx.redirectTo({
        url: '/pages/auth/login/login'
      });
      return;
    }

    if (role !== 'STORE_MANAGER') {
      wx.showToast({
        title: '仅门店管理员可访问',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack({
          delta: 1
        });
      }, 1200);
      return;
    }

    this._initialized = true;
    this.loadRecords(true);
  },

  async loadRecords(reset = false) {
    if (this.data.loading) {
      return;
    }

    if (!reset && !this.data.hasMore) {
      return;
    }

    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    try {
      const res = await request.get('/store/withdrawals', {
        page,
        limit: this.data.limit,
        status: this.data.activeStatus || undefined
      }, { silentError: true });

      if (!res.success) {
        throw new Error(res.message || 'load_failed');
      }

      const list = (res.data?.list || []).map(item => normalizeWithdrawal(item, { amountUnit: 'cent' }));
      const records = reset ? list : this.data.records.concat(list);
      const total = Number(res.data?.total || 0);

      this.setData({
        records,
        total,
        page: page + 1,
        hasMore: records.length < total
      });
    } catch (error) {
      console.error('加载提现记录失败:', error);
      if (reset) {
        this.setData({
          records: [],
          total: 0,
          hasMore: false
        });
      }

      wx.showToast({
        title: '加载提现记录失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  onTabChange(e) {
    const { status } = e.currentTarget.dataset;
    if (status === this.data.activeStatus) {
      return;
    }

    this.setData({
      activeStatus: status
    });
    this.loadRecords(true);
  },

  goDetail(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) {
      return;
    }

    wx.navigateTo({
      url: `/pages/manager/withdraw/detail?id=${id}`
    });
  },

  onPullDownRefresh() {
    this.loadRecords(true);
  },

  onReachBottom() {
    this.loadRecords(false);
  }
});
