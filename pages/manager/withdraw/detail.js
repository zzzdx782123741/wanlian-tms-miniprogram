const app = getApp();
const request = require('../../../utils/request');
const { normalizeWithdrawal } = require('../../../utils/store-finance');

Page({
  data: {
    id: '',
    detail: null,
    loading: false,
    cancelling: false
  },

  onLoad(options) {
    this.setData({
      id: options.id || ''
    });
    this.initPage();
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

    if (!this.data.id) {
      wx.showToast({
        title: '缺少提现记录ID',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack({
          delta: 1
        });
      }, 1200);
      return;
    }

    this.loadDetail();
  },

  async loadDetail() {
    if (this.data.loading) {
      return;
    }

    this.setData({ loading: true });

    try {
      const res = await request.get(`/store/withdrawals/${this.data.id}`, {}, { silentError: true });
      if (!res.success || !res.data?.withdrawal) {
        throw new Error(res.message || 'load_failed');
      }

      const withdrawal = res.data.withdrawal || {};
      const paymentProofs = (withdrawal.paymentProofs || [])
        .filter(Boolean)
        .map(item => request.formatImageUrl(item));

      this.setData({
        detail: normalizeWithdrawal({
          ...withdrawal,
          paymentProofs
        }, { amountUnit: 'cent' })
      });
    } catch (error) {
      console.error('加载提现详情失败:', error);
      wx.showToast({
        title: '加载提现详情失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  async cancelWithdrawal() {
    if (!this.data.detail?.canCancel || this.data.cancelling) {
      return;
    }

    const modalResult = await wx.showModal({
      title: '撤回申请',
      content: '确认撤回这笔提现申请吗？',
      confirmColor: '#f5222d'
    });

    if (!modalResult.confirm) {
      return;
    }

    this.setData({ cancelling: true });

    try {
      const res = await request.post(`/store/withdrawals/${this.data.id}/cancel`, {});
      if (!res.success) {
        throw new Error(res.message || 'cancel_failed');
      }

      wx.showToast({
        title: '已撤回提现申请',
        icon: 'success'
      });

      this.loadDetail();
    } catch (error) {
      console.error('撤回提现申请失败:', error);
      wx.showToast({
        title: error.message || '撤回提现申请失败',
        icon: 'none'
      });
    } finally {
      this.setData({ cancelling: false });
    }
  },

  previewProof(e) {
    const { index } = e.currentTarget.dataset;
    const proofs = (this.data.detail?.paymentProofs || []).filter(Boolean);
    if (!proofs.length) {
      return;
    }

    wx.previewImage({
      current: proofs[index] || proofs[0],
      urls: proofs
    });
  },

  onPullDownRefresh() {
    this.loadDetail();
  }
});
