const app = getApp();
const request = require('../../../utils/request');
const { formatMoneyYuan, maskBankAccount } = require('../../../utils/store-finance');

function normalizeAmountInput(value) {
  const cleaned = String(value || '').replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
}

Page({
  data: {
    withdrawableBalance: '0.00',
    amount: '',
    bankAccount: {},
    maskedAccountNumber: '-',
    bankAccountReady: false,
    submitting: false
  },

  onLoad() {
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

    this.loadPageData();
  },

  async loadPageData() {
    try {
      const [accountRes, storeRes] = await Promise.all([
        request.get('/store/account', {}, { silentError: true }),
        request.get('/store/info', {}, { silentError: true })
      ]);

      if (!accountRes.success || !storeRes.success) {
        throw new Error('load_failed');
      }

      const bankAccount = storeRes.data?.bankAccount || {};
      const bankAccountReady = Boolean(
        bankAccount.bankName &&
        bankAccount.accountNumber &&
        bankAccount.accountName
      );

      this.setData({
        withdrawableBalance: formatMoneyYuan(accountRes.data?.account?.withdrawableBalance),
        bankAccount,
        bankAccountReady,
        maskedAccountNumber: maskBankAccount(bankAccount.accountNumber)
      });
    } catch (error) {
      console.error('加载提现页数据失败:', error);
      wx.showToast({
        title: '加载提现信息失败',
        icon: 'none'
      });
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  onAmountInput(e) {
    this.setData({
      amount: normalizeAmountInput(e.detail.value)
    });
  },

  fillAllAmount() {
    this.setData({
      amount: this.data.withdrawableBalance
    });
  },

  clearAmount() {
    this.setData({
      amount: ''
    });
  },

  goToStoreInfo() {
    wx.navigateTo({
      url: '/pages/manager/store/store'
    });
  },

  async submitWithdrawal() {
    if (this.data.submitting) {
      return;
    }

    if (!this.data.bankAccountReady) {
      wx.showToast({
        title: '请先完善收款账户',
        icon: 'none'
      });
      return;
    }

    const amount = Number(this.data.amount);
    const maxAmount = Number(this.data.withdrawableBalance);

    if (!Number.isFinite(amount) || amount <= 0) {
      wx.showToast({
        title: '请输入正确的提现金额',
        icon: 'none'
      });
      return;
    }

    if (amount > maxAmount) {
      wx.showToast({
        title: '提现金额不能超过可提现余额',
        icon: 'none'
      });
      return;
    }

    const modalResult = await wx.showModal({
      title: '确认提现',
      content: `确认申请提现 ¥${amount.toFixed(2)} 吗？`,
      confirmText: '确认提交'
    });

    if (!modalResult.confirm) {
      return;
    }

    this.setData({ submitting: true });

    try {
      const res = await request.post('/store/withdraw', {
        withdrawalAmount: Math.round(amount * 100)
      });

      if (!res.success) {
        throw new Error(res.message || 'submit_failed');
      }

      const withdrawalId = res.data?.withdrawal?._id;

      wx.showToast({
        title: '提现申请已提交',
        icon: 'success'
      });

      setTimeout(() => {
        if (withdrawalId) {
          wx.redirectTo({
            url: `/pages/manager/withdraw/detail?id=${withdrawalId}`
          });
          return;
        }

        wx.redirectTo({
          url: '/pages/manager/withdraw/list'
        });
      }, 600);
    } catch (error) {
      console.error('提交提现申请失败:', error);
      wx.showToast({
        title: error.message || '提交提现申请失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  onPullDownRefresh() {
    this.loadPageData();
  }
});
