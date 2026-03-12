// pages/technician/order-center/order-center.js
const app = getApp();
const request = require('../../../utils/request');
const format = require('../../../utils/format');

Page({
  data: {
    searchQuery: '',
    activeTab: 'all',
    allOrders: [], // 保存所有订单数据用于搜索
    stats: {
      todayOrders: 0,
      weekOrders: 0,
      monthOrders: 0
    },
    orders: []
  },

  onLoad(options) {
    // 如果有传入的tab参数，切换到对应tab
    if (options.tab) {
      this.setData({ activeTab: options.tab });
    }
  },

  onShow() {
    this.loadData();
  },

  /**
   * 加载数据
   */
  async loadData() {
    try {
      wx.showLoading({ title: '加载中...' });

      // 获取统计数据
      const statsRes = await request.get('/technician/order-center/stats');
      if (statsRes.success) {
        this.setData({
          stats: {
            todayOrders: statsRes.data.today || 0,
            weekOrders: statsRes.data.week || 0,
            monthOrders: statsRes.data.month || 0
          }
        });
      }

      // 获取订单列表
      await this.loadOrders();
    } catch (error) {
      console.error('加载数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 加载订单列表
   */
  async loadOrders() {
    try {
      const { activeTab } = this.data;
      let status = '';

      // 根据tab设置状态筛选
      switch (activeTab) {
        case 'pending':
          status = 'pending_assessment,awaiting_time_confirmation';
          break;
        case 'in_repair':
          status = 'in_repair,awaiting_addon_approval';
          break;
        case 'completed':
          status = 'pending_confirmation,completed';
          break;
      }

      const res = await request.get('/technician/order-center/orders', {
        params: { status }
      });

      if (res.success) {
        const orders = (res.data.list || []).map(order => this.formatOrder(order));

        // 保存所有订单用于搜索
        this.setData({
          allOrders: orders,
          orders: orders
        });

        // 如果有搜索关键词，执行搜索
        if (this.data.searchQuery) {
          this.performSearch();
        }
      }
    } catch (error) {
      console.error('加载订单列表失败:', error);
    }
  },

  /**
   * 格式化订单数据
   */
  formatOrder(order) {
    // 调试：打印原始数据
    console.log('=== 原始订单数据 ===');
    console.log('车牌号原始值:', order.vehicleId?.plateNumber);
    console.log('司机姓名原始值:', order.reporterId?.name || order.reporterId?.nickname);
    console.log('订单号原始值:', order.orderNumber);

    const formatted = {
      id: order._id,
      type: order.type || 'repair',
      plateNumber: format.decodeHTMLEntities(order.vehicleId?.plateNumber) || '未知',
      statusText: this.getStatusText(order.status),
      statusClass: this.getStatusClass(order.status),
      driverName: format.decodeHTMLEntities(order.reporterId?.name || order.reporterId?.nickname) || '未知',
      technicianName: format.decodeHTMLEntities(order.technicianId?.name || order.technicianId?.nickname) || '',
      appointmentTime: this.formatTime(order.appointment?.confirmedDate || order.appointment?.expectedDate),
      orderNumber: format.decodeHTMLEntities(order.orderNumber) || ''
    };

    // 调试：打印格式化后的数据
    console.log('=== 格式化后数据 ===');
    console.log('车牌号:', formatted.plateNumber);
    console.log('司机姓名:', formatted.driverName);

    return formatted;
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    this.setData({
      searchQuery: e.detail.value
    });
  },

  /**
   * 执行搜索
   */
  onSearch() {
    this.performSearch();
  },

  /**
   * 执行搜索逻辑
   */
  performSearch() {
    const query = this.data.searchQuery.trim().toLowerCase();

    if (!query) {
      // 搜索框为空，显示所有订单
      this.setData({
        orders: this.data.allOrders
      });
      return;
    }

    // 过滤订单
    const filteredOrders = this.data.allOrders.filter(order => {
      return order.plateNumber.toLowerCase().includes(query) ||
             order.orderNumber.toLowerCase().includes(query) ||
             order.driverName.toLowerCase().includes(query);
    });

    this.setData({
      orders: filteredOrders
    });

    // 提示用户搜索结果
    if (filteredOrders.length === 0) {
      wx.showToast({
        title: '未找到匹配的订单',
        icon: 'none',
        duration: 1500
      });
    }
  },

  /**
   * 扫码
   */
  scanCode() {
    wx.scanCode({
      success: (res) => {
        console.log('扫码结果:', res);
        const orderId = res.result;
        if (orderId) {
          wx.navigateTo({
            url: `/pages/order-detail/order-detail?id=${orderId}`
          });
        }
      },
      fail: (err) => {
        console.error('扫码失败:', err);
        wx.showToast({
          title: '扫码失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 返回上一页
   */
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  /**
   * 切换tab
   */
  switchTab(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ activeTab: tab });
    this.loadOrders();
  },

  /**
   * 跳转到订单详情
   */
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}`
    });
  },

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const statusMap = {
      'awaiting_fleet_approval': '待车队审批',
      'awaiting_time_confirmation': '待确认到店时间',
      'pending_assessment': '待接车检查',
      'awaiting_approval': '待审批报价',
      'in_repair': '维修中',
      'awaiting_addon_approval': '待审批增项',
      'pending_confirmation': '待确认完工',
      'completed': '已完成',
      'refunded': '已退款',
      'rejected': '已拒绝'
    };
    return statusMap[status] || '未知状态';
  },

  /**
   * 获取状态样式类
   */
  getStatusClass(status) {
    if (status === 'completed') return 'completed';
    if (status === 'pending_confirmation') return 'pending';
    if (status === 'in_repair' || status === 'awaiting_addon_approval') return 'in_repair';
    return 'pending';
  },

  /**
   * 格式化时间
   */
  formatTime(time) {
    if (!time) return '待确认到店时间';

    const date = new Date(time);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${month}-${day} ${hours}:${minutes}`;
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
