const app = getApp();
const request = require('../../../utils/request');
const { WITHDRAWAL_STATUS_MAP, normalizeWithdrawal, formatMoneyYuan } = require('../../../utils/store-finance');

Page({
  data: {
    todayIncome: '0.00',
    monthIncome: '0.00',
    withdrawableBalance: '0.00',
    settledIncome: '0.00',
    pendingSettlement: '0.00',
    withdrawRecords: [],
    loading: false,
    statusMap: WITHDRAWAL_STATUS_MAP
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
      this.loadData();
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
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1200);
      return;
    }

    this._initialized = true;
    this.loadData();
  },

  async loadData() {
    if (this.data.loading) {
      return;
    }

    this.setData({ loading: true });

    try {
      const [financeResult, accountResult, withdrawalResult] = await Promise.allSettled([
        request.get('/store/finance', {}, { silentError: true }),
        request.get('/store/account', {}, { silentError: true }),
        request.get('/store/withdrawals', { page: 1, limit: 5 }, { silentError: true })
      ]);

      const nextData = {};
      let hasSuccess = false;

      if (financeResult.status === 'fulfilled' && financeResult.value?.success) {
        hasSuccess = true;
        const financeData = financeResult.value.data || {};
        nextData.todayIncome = financeData.income?.today || '0.00';
        nextData.monthIncome = financeData.income?.month || '0.00';
      }

      if (accountResult.status === 'fulfilled' && accountResult.value?.success) {
        hasSuccess = true;
        const account = accountResult.value.data?.account || {};
        nextData.withdrawableBalance = formatMoneyYuan(account.withdrawableBalance);
        nextData.settledIncome = formatMoneyYuan(account.settledIncome);
        nextData.pendingSettlement = formatMoneyYuan(account.pendingSettlement);
      }

      if (withdrawalResult.status === 'fulfilled' && withdrawalResult.value?.success) {
        hasSuccess = true;
        nextData.withdrawRecords = (withdrawalResult.value.data?.list || [])
          .map(item => normalizeWithdrawal(item, { amountUnit: 'cent' }));
      }

      if (!hasSuccess) {
        throw new Error('load_failed');
      }

      this.setData(nextData);
    } catch (error) {
      console.error('加载财务数据失败:', error);
      wx.showToast({
        title: '加载财务数据失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goToWithdraw() {
    wx.navigateTo({
      url: '/pages/manager/withdraw/apply'
    });
  },

  goToWithdrawRecords() {
    wx.navigateTo({
      url: '/pages/manager/withdraw/list'
    });
  },

  viewWithdrawal(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) {
      return;
    }

    wx.navigateTo({
      url: `/pages/manager/withdraw/detail?id=${id}`
    });
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
