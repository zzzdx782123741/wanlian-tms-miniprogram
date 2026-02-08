// pages/account/account.js - 账户余额页面
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    account: {
      balance: 0
    },
    stats: {
      totalOrders: 0,
      totalSpent: 0,
      pendingOrders: 0
    },
    transactions: [],
    loading: false,
    filterType: 'all', // all, recharge, payment, refund
    filterText: '全部'
  },

  onLoad() {
    this.loadAccount();
    this.loadTransactions();
  },

  /**
   * 加载账户信息
   */
  async loadAccount() {
    try {
      const res = await request.get('/account/balance');

      this.setData({
        account: res.data
      });

    } catch (error) {
      console.error('加载账户失败:', error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 加载交易记录
   */
  async loadTransactions() {
    this.setData({ loading: true });

    try {
      const res = await request.get('/account/transactions');

      let transactions = res.data || [];

      // 筛选
      if (this.data.filterType !== 'all') {
        transactions = transactions.filter(t => t.type === this.data.filterType);
      }

      // 格式化
      transactions = transactions.map(t => ({
        ...t,
        createdAtText: this.formatTime(t.createdAt)
      }));

      // 计算统计
      const stats = this.calculateStats(transactions);

      this.setData({
        transactions,
        stats
      });

    } catch (error) {
      console.error('加载交易记录失败:', error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 计算统计数据
   */
  calculateStats(transactions) {
    let totalOrders = 0;
    let totalSpent = 0;
    let pendingOrders = 0;

    transactions.forEach(t => {
      if (t.type === 'payment') {
        totalOrders++;
        totalSpent += Math.abs(t.amount);
      }
    });

    return {
      totalOrders,
      totalSpent,
      pendingOrders
    };
  },

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  /**
   * 充值
   */
  onRecharge() {
    wx.showModal({
      title: '充值提示',
      content: '请联系客服进行充值操作',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  /**
   * 筛选交易记录
   */
  onFilter() {
    const types = ['all', 'recharge', 'payment', 'refund'];
    const typeNames = ['全部', '充值', '支付', '退款'];

    wx.showActionSheet({
      itemList: typeNames,
      success: (res) => {
        const index = res.tapIndex;
        this.setData({
          filterType: types[index],
          filterText: typeNames[index]
        });
        this.loadTransactions();
      }
    });
  },

  /**
   * 查看交易详情
   */
  onTransactionDetail(e) {
    const item = e.currentTarget.dataset.item;
    wx.showModal({
      title: '交易详情',
      content: `类型：${item.typeText}\n金额：${item.type === 'recharge' ? '+' : '-'}¥${item.amount}\n时间：${item.createdAtText}\n说明：${item.description}`,
      showCancel: false
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadAccount();
    this.loadTransactions();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
