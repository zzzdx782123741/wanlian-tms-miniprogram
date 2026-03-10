// pages/manager/finance/finance.js
const app = getApp();
const request = require('../../../utils/request');

Page({
  data: {
    todayIncome: '0.00',
    monthIncome: '0.00',
    pendingBalance: '0.00',
    settledBalance: '0.00',
    withdrawRecords: [],
    statusMap: {
      'pending': '审核中',
      'processing': '处理中',
      'completed': '已完成',
      'rejected': '已拒绝'
    }
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadData();
  },

  /**
   * 初始化页面
   */
  initPage() {
    const userInfo = app.globalData.userInfo;

    if (!userInfo) {
      wx.redirectTo({
        url: '/pages/auth/login/login'
      });
      return;
    }

    // 检查是否为店长或技师
    const role = app.globalData.role;
    if (role !== 'STORE_MANAGER' && role !== 'STORE_TECHNICIAN') {
      wx.showToast({
        title: '权限不足',
        icon: 'none'
      });
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);
      return;
    }

    this.loadData();
  },

  /**
   * 加载数据
   */
  async loadData() {
    try {
      // 获取门店财务数据
      const res = await request.get('/store/finance');

      if (res.success) {
        const data = res.data || {};
        this.setData({
          todayIncome: data.income?.today || '0.00',
          monthIncome: data.income?.month || '0.00',
          pendingBalance: data.balance?.pending || '0.00',
          settledBalance: data.balance?.settled || '0.00',
          withdrawRecords: (data.withdrawRecords || []).map(record => {
            // 预先格式化金额
            const amount = record.withdrawalAmount || 0;
            const formattedAmount = typeof amount === 'number'
              ? (amount / 100).toFixed(2)
              : '0.00';

            return {
              ...record,
              withdrawalAmountText: formattedAmount,
              appliedAtText: this.formatTime(record.appliedAt || record.createdAt)
            };
          })
        });
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      wx.showToast({
        title: '加载财务数据失败',
        icon: 'none'
      });
    }
  },

  /**
   * 申请提现
   */
  goToWithdraw() {
    wx.showToast({
      title: '提现页面暂未开放',
      icon: 'none'
    });
  },

  /**
   * 查看提现记录
   */
  goToWithdrawRecords() {
    wx.showToast({
      title: '提现记录页暂未开放',
      icon: 'none'
    });
  },

  /**
   * 查看提现详情
   */
  viewWithdrawal(e) {
    wx.showToast({
      title: '提现详情页暂未开放',
      icon: 'none'
    });
  },

  /**
   * 格式化时间
   */
  formatTime(time) {
    if (!time) return '-';
    const date = new Date(time);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadData();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
