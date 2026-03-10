// pages/manager/dashboard/dashboard.js
const app = getApp();
const request = require('../../../utils/request');
const { formatMoney, formatRelativeTime } = require('../../../utils/format');
const { ACTIVITY_CONFIG } = require('../../../utils/constants');
const { updateTabBarRole } = require('../../../utils/tabbar-helper');
const { navigateToOrderDetail, navigateToTechnicianPerformance, navigateToOrders, navigateToStockDetail, standardPullRefresh } = require('../../../utils/page-helper');
const { getStatusText } = require('../../../utils/order-config');

Page({
  data: {
    storeName: '',
    todayIncome: '0.00',
    pendingWithdraw: '0.00',
    stats: {
      pendingOrders: 0,
      processingOrders: 0,
      completedToday: 0
    },
    // 技师状态看板数据
    technicians: [],
    // 库存预警数据
    lowStockItems: [],
    // 最近动态数据
    recentActivities: [],
    // 技师详情弹窗
    showTechnicianModal: false,
    selectedTechnician: null,
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
    updateTabBarRole(this, '门店管理台');
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
      storeName: app.globalData.storeInfo?.storeName || '门店'
    });

    this.loadData();
  },

  /**
   * 加载数据
   */
  async loadData() {
    try {
      // 获取店长管理台数据
      const res = await request.get('/store/dashboard');

      if (res.success) {
        const data = res.data || {};
        const backendStats = data.stats || {};

        // 字段映射：后台字段 -> 前端字段
        const stats = {
          pendingOrders: backendStats.pendingOrders || 0,
          processingOrders: backendStats.inRepair || 0,  // 注意：后台返回 inRepair
          completedToday: backendStats.completedToday || 0
        };
        const lowStockItems = this.formatLowStockItems(data.lowStockItems || []);

        // 格式化数据
        this.setData({
          todayIncome: backendStats.todayIncome || '0.00',
          stats: stats,
          pendingWithdraw: backendStats.pendingBalance || '0.00',
          technicians: this.formatTechnicians(data.technicians || []),
          lowStockItems: lowStockItems,
          recentActivities: this.formatActivities(data.activities || [])
        });
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      // 加载失败时使用模拟数据
      this.loadMockData();
    }
  },

  /**
   * 格式化技师数据
   */
  formatTechnicians(technicians) {
    return technicians.map(tech => ({
      id: tech._id,
      name: tech.name,
      avatarChar: tech.name ? tech.name.substring(0, 1) : '',
      status: tech.status === 'busy' ? 'busy' : 'idle',
      statusText: tech.status === 'busy' ? '工作中' : '空闲',
      statusLabel: tech.status === 'busy' ? '工作中' : '空闲',
      currentTask: tech.currentOrder ? `${tech.currentOrder.plateNumber}` : '待命',
      currentTaskText: tech.currentOrder
        ? `${tech.currentOrder.plateNumber} ${tech.currentOrder.vehicleModel || ''}`.trim()
        : '待命中',
      load: tech.workload || 0,
      // 详情数据
      monthlyCompleted: tech.monthlyCompleted || 0,
      rating: tech.rating || 4.9,
      todayOrders: tech.todayOrders || [],
      todayCompleted: tech.todayCompleted || 0,
      todayIncome: formatMoney(tech.todayIncome || 0),
      avgOrderAmount: formatMoney(tech.avgOrderAmount || 0)
    }));
  },

  /**
   * 格式化库存预警数据
   */
  formatLowStockItems(items) {
    return items.slice(0, 3).map(item => ({
      id: item._id,
      name: item.name,
      stock: item.stock,
      minStock: item.minStock
    }));
  },

  /**
   * 格式化动态数据（使用常量配置）
   */
  formatActivities(activities) {
    return activities.slice(0, 5).map(act => {
      const config = ACTIVITY_CONFIG[act.type] || ACTIVITY_CONFIG.order;

      // 解析 description，格式："车牌号 - status"
      let description = act.description;
      let plateNumber = '';
      let statusText = '';

      if (description && description.includes('-')) {
        const parts = description.split('-');
        plateNumber = parts[0].trim();
        const status = parts[1].trim();
        // 将英文状态转换为中文
        statusText = getStatusText(status) || status;
        description = `${plateNumber} ${statusText}`;
      }

      return {
        id: act._id,
        type: act.type,
        icon: config.icon,
        title: '订单动态',  // 统一标题
        description: description,
        time: formatRelativeTime(act.createdAt),
        orderId: act.orderId
      };
    });
  },

  /**
   * 加载模拟数据（用于测试）
   */
  loadMockData() {
    const stats = {
      pendingOrders: 3,
      processingOrders: 8,
      completedToday: 24
    };
    const lowStockItems = [
      { id: 's1', name: '全合成机油 4L', stock: 5, minStock: 10 },
      { id: 's2', name: '重卡刹车片 (后轮)', stock: 2, minStock: 8 }
    ];

    this.setData({
      todayIncome: '12800.00',
      stats: stats,
      technicians: [
        {
          id: '1',
          name: '陈技师',
          avatarChar: '陈',
          status: 'busy',
          statusText: '工作中',
          statusLabel: '工作中',
          currentTask: '粤A·88888',
          currentTaskText: '粤A·88888 东风天龙 6x4',
          load: 80,
          monthlyCompleted: 85,
          rating: 4.9,
          todayOrders: [
            { id: 'o1', plateNumber: '粤A·88888', vehicleModel: '东风天龙 6x4', status: 'processing', amount: '1200' },
            { id: 'o2', plateNumber: '粤B·66666', vehicleModel: '解放J6P', status: 'completed', amount: '800' }
          ],
          todayCompleted: 2,
          todayIncome: '2000',
          avgOrderAmount: '1000'
        },
        {
          id: '2',
          name: '王技师',
          avatarChar: '王',
          status: 'idle',
          statusText: '空闲',
          statusLabel: '空闲',
          currentTask: '待命',
          currentTaskText: '待命中',
          load: 0,
          monthlyCompleted: 72,
          rating: 4.8,
          todayOrders: [],
          todayCompleted: 0,
          todayIncome: '0',
          avgOrderAmount: '0'
        },
        {
          id: '3',
          name: '李技师',
          avatarChar: '李',
          status: 'busy',
          statusText: '工作中',
          statusLabel: '工作中',
          currentTask: '粤B·66666',
          currentTaskText: '粤B·66666 解放J6P',
          load: 45,
          monthlyCompleted: 68,
          rating: 4.7,
          todayOrders: [
            { id: 'o3', plateNumber: '粤B·66666', vehicleModel: '解放J6P', status: 'processing', amount: '1500' }
          ],
          todayCompleted: 0,
          todayIncome: '0',
          avgOrderAmount: '1500'
        },
        {
          id: '4',
          name: '张技师',
          avatarChar: '张',
          status: 'busy',
          statusText: '工作中',
          statusLabel: '工作中',
          currentTask: '粤C·12345',
          currentTaskText: '粤C·12345 福田欧曼',
          load: 90,
          monthlyCompleted: 91,
          rating: 4.9,
          todayOrders: [
            { id: 'o4', plateNumber: '粤C·12345', vehicleModel: '福田欧曼', status: 'pending', amount: '0' }
          ],
          todayCompleted: 0,
          todayIncome: '0',
          avgOrderAmount: '0'
        }
      ],
      lowStockItems: lowStockItems,
      recentActivities: [
        { id: 'a1', type: 'order', icon: '📋', title: '新报修申请', description: '粤A·99999 待审批', time: '10分钟前', orderId: 'o5' },
        { id: 'a2', type: 'addon', icon: '⚠️', title: '待审批增项', description: '陈技师提交了 粤A·88888 增项', time: '25分钟前', orderId: 'o1' },
        { id: 'a3', type: 'completed', icon: '✅', title: '订单完成', description: '王技师完成了 粤D·11111 保养', time: '1小时前', orderId: 'o6' }
      ]
    });
  },

  /**
   * 显示技师详情
   */
  showTechnicianDetail(e) {
    const { technician } = e.currentTarget.dataset;
    this.setData({
      selectedTechnician: technician,
      showTechnicianModal: true
    });
  },

  /**
   * 隐藏技师详情
   */
  hideTechnicianDetail() {
    this.setData({
      showTechnicianModal: false,
      selectedTechnician: null
    });
  },

  /**
   * 查看技师绩效（使用公共工具）
   */
  viewTechnicianPerformance() {
    const technician = this.data.selectedTechnician;
    if (!technician) return;

    this.hideTechnicianDetail();
    navigateToTechnicianPerformance(technician.id);
  },

  /**
   * 跳转到订单详情（使用公共工具）
   */
  goToOrderDetail(e) {
    const { id } = e.currentTarget.dataset;
    this.hideTechnicianDetail();
    navigateToOrderDetail(id);
  },

  /**
   * 跳转到技师管理
   */
  goToTechnicians() {
    wx.showToast({
      title: '技师管理页暂未开放',
      icon: 'none'
    });
  },

  /**
   * 跳转到库存详情（使用公共工具）
   */
  goToStockDetail(e) {
    const { item } = e.currentTarget.dataset;
    navigateToStockDetail(item.id);
  },

  /**
   * 处理动态点击
   */
  handleActivity(e) {
    const { activity } = e.currentTarget.dataset;

    if (activity.orderId) {
      navigateToOrderDetail(activity.orderId);
    }
  },

  /**
   * 跳转到订单列表（使用公共工具）
   */
  goToOrders(e) {
    const { type } = e.currentTarget.dataset;
    navigateToOrders(type);
  },

  /**
   * 跳转到门店管理
   */
  goToStore() {
    wx.navigateTo({
      url: '/pages/manager/store/store'
    });
  },

  /**
   * 跳转到财务管理
   */
  goToFinance() {
    wx.navigateTo({
      url: '/pages/manager/finance/finance'
    });
  },

  /**
   * 跳转到数据报表
   */
  goToAnalytics() {
    wx.navigateTo({
      url: '/pages/manager/analytics/analytics'
    });
  },

  /**
   * 下拉刷新（使用公共工具）
   */
  onPullDownRefresh() {
    standardPullRefresh(this);
  }
});
