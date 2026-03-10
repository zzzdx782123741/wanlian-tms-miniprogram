// pages/technician/home/home.js
const app = getApp();
const request = require('../../../utils/request');
const { formatFriendlyTime } = require('../../../utils/format');
const { getStatusConfig } = require('../../../utils/order-config');
const { updateTabBarRole } = require('../../../utils/tabbar-helper');
const { navigateToOrderDetail, standardPullRefresh } = require('../../../utils/page-helper');

Page({
  data: {
    userInfo: null,
    storeName: '',
    searchQuery: '',
    stats: {
      completedToday: 0,
      inRepair: 0,
      completedYesterday: 0
    },
    orderList: [],
    isFirstLoad: true  // 标志位：避免首次加载时重复请求
  },

  onLoad() {
    this.initPage();
    // 首次加载后设置标志
    this.setData({ isFirstLoad: false });
  },

  onShow() {
    // 只有非首次加载时才刷新数据
    if (!this.data.isFirstLoad) {
      this.loadData();
    }

    // 更新自定义 tabBar 选中状态（使用公共工具）
    updateTabBarRole(this, '技师工作台');
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

    this.setData({
      userInfo,
      storeName: app.globalData.storeInfo?.storeName || '门店'
    });

    this.loadData();
  },

  /**
   * 加载数据（并行加载优化）
   */
  async loadData() {
    try {
      // 并行获取技师工作台数据和订单列表
      const [dashboardRes, ordersRes] = await Promise.all([
        request.get('/technician/dashboard'),
        request.get('/orders', {
          params: {
            status: 'awaiting_time_confirmation,pending_assessment,in_repair,pending_confirmation',
            limit: 10,
            sort: 'appointmentTime,asc'
          }
        })
      ]);

      if (dashboardRes.success) {
        const dashboardData = dashboardRes.data;

        // 更新统计数据
        this.setData({
          stats: {
            completedToday: dashboardData.completedToday || 0,
            inRepair: dashboardData.inRepair || 0,
            completedYesterday: dashboardData.completedYesterday || 0
          }
        });
      }

      if (ordersRes.success) {
        const orders = ordersRes.data.list || [];
        this.setData({
          orderList: this.formatOrderList(orders),
          allOrders: orders  // 保存原始订单用于搜索
        });
      }
    } catch (error) {
      console.error('加载数据失败:', error);

      // 如果API调用失败，使用模拟数据
      this.loadMockData();
    }
  },

  /**
   * 加载订单列表（只显示最紧急的待处理订单）
   */
  async loadOrderList() {
    try {
      const res = await request.get('/orders', {
        params: {
          status: 'awaiting_time_confirmation,pending_assessment,in_repair,pending_confirmation',
          limit: 10,
          sort: 'appointmentTime,asc' // 按预约时间升序排序
        }
      });

      if (res.success) {
        const orders = (res.data.list || []).map(order => this.formatOrder(order));

        this.setData({
          orderList: orders
        });
      }
    } catch (error) {
      console.error('加载订单列表失败:', error);
    }
  },

  /**
   * 格式化订单列表
   */
  formatOrderList(orders) {
    return orders.map(order => this.formatOrder(order));
  },

  /**
   * 格式化单个订单数据
   */
  formatOrder(order) {
    const statusConfig = getStatusConfig(order.status);

    return {
      id: order._id,
      plateNumber: order.vehicle?.plateNumber || '未知',
      vehicleModel: order.vehicle?.model || '未知车型',
      driverName: order.driver?.name || '未知',
      driverPhone: order.driver?.phone || '未知',
      status: order.status,
      statusText: statusConfig.label,
      statusIcon: statusConfig.icon,
      faultDescription: order.faultDescription || order.type === 'maintenance' ? '定期保养' : '暂无描述',
      createTime: formatFriendlyTime(order.createdAt)
    };
  },

  /**
   * 加载模拟数据（用于测试）
   */
  loadMockData() {
    this.setData({
      stats: {
        completedToday: 12,
        inRepair: 5,
        completedYesterday: 10
      },
      orderList: [
        {
          id: '1',
          plateNumber: '粤A·88888',
          vehicleModel: '东风天龙 6x4',
          driverName: '张师傅',
          driverPhone: '138****8001',
          status: 'awaiting_time_confirmation',
          statusText: '待确认到店时间',
          statusIcon: '⏰',
          faultDescription: '刹车异响，制动距离变长',
          createTime: '今天 10:00'
        },
        {
          id: '2',
          plateNumber: '粤B·66666',
          vehicleModel: '解放J6P',
          driverName: '李师傅',
          driverPhone: '139****6666',
          status: 'pending_assessment',
          statusText: '待接车检查',
          statusIcon: '🔍',
          faultDescription: '离合器打滑，挂挡困难',
          createTime: '今天 11:30'
        },
        {
          id: '3',
          plateNumber: '粤C·12345',
          vehicleModel: '福田欧曼',
          driverName: '王师傅',
          driverPhone: '137****1234',
          status: 'in_repair',
          statusText: '维修中',
          statusIcon: '🔧',
          faultDescription: '定期保养（10万公里）',
          createTime: '今天 15:00'
        }
      ]
    });
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
    const query = this.data.searchQuery.trim();
    if (!query) {
      this.loadOrderList();
      return;
    }

    // 过滤本地订单列表
    const filteredList = this.data.orderList.filter(order => {
      return order.plateNumber.includes(query) ||
             order.id.includes(query) ||
             order.driverName.includes(query);
    });

    this.setData({
      orderList: filteredList
    });
  },

  /**
   * 扫码
   */
  scanCode() {
    wx.scanCode({
      success: (res) => {
        console.log('扫码结果:', res);
        // TODO: 解析二维码内容并跳转到对应订单
        const orderId = res.result;
        if (orderId) {
          navigateToOrderDetail(orderId);
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
   * 跳转到完工记录页面
   */
  goToCompletionRecords() {
    wx.navigateTo({
      url: '/pages/technician/completion/completion'
    });
  },

  /**
   * 跳转到订单详情（使用公共工具）
   */
  goToOrderDetail(e) {
    const { id } = e.currentTarget.dataset;
    navigateToOrderDetail(id);
  },

  /**
   * 切换底部Tab
   */
  switchTab(e) {
    const { tab } = e.currentTarget.dataset;

    switch (tab) {
      case 'home':
        // 当前页面，不做处理
        break;
      case 'orders':
        wx.navigateTo({
          url: '/pages/orders/orders'
        });
        break;
      case 'profile':
        wx.navigateTo({
          url: '/pages/account/account'
        });
        break;
    }
  },

  /**
   * 下拉刷新（使用公共工具）
   */
  onPullDownRefresh() {
    standardPullRefresh(this);
  }
});
