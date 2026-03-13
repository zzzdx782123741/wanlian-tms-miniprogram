// index.js - 万联驿站2.0首页
const app = getApp();
const request = require('../../utils/request');
const { getStatusText, normalizeOrderStatus } = require('../../utils/order-config');

Page({
  data: {
    userInfo: null,
    role: '',
    roleText: '',
    roleShortText: '',
    menuList: [],
    // 车队管理员首页数据
    stats: {
      totalVehicles: 0,
      pendingApprovals: 0,
      pendingAddons: 0,
      pendingCompletion: 0,
      inRepairOrders: 0,
      accountBalance: 0
    },
    todo: {
      pendingApprovalOrders: [],
      pendingAddonOrders: [],
      pendingCompletionOrders: []
    },
    recentActivities: [],
    hasTodo: false
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    // 每次显示页面时刷新用户信息
    this.initPage();

    // 更新自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const tabBar = this.getTabBar();

      // 重新加载角色（增强容错性）
      const role = app.globalData.role || wx.getStorageSync('role') || '';
      console.log('[首页] onShow - 当前角色:', role);

      // 如果角色为空，尝试从userInfo中提取
      if (!role) {
        const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
        if (userInfo && userInfo.role) {
          const extractedRole = typeof userInfo.role === 'object' ? userInfo.role.type : userInfo.role;
          if (extractedRole) {
            app.globalData.role = extractedRole;
            wx.setStorageSync('role', extractedRole);
            console.log('[首页] 从userInfo提取角色:', extractedRole);
            tabBar.setData({ role: extractedRole });
          }
        }
      } else {
        tabBar.setData({ role });
      }

      tabBar.updateTabBar();
    }
  },

  /**
   * 初始化页面
   */
  initPage() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    const role = app.globalData.role || wx.getStorageSync('role') || userInfo?.role?.type;

    if (!userInfo || !role) {
      // 未登录，跳转到登录页
      wx.redirectTo({
        url: '/pages/auth/login/login'
      });
      return;
    }

    // 技师角色自动跳转到技师工作台
    app.globalData.userInfo = userInfo;
    app.globalData.role = role;

    if (role === 'STORE_TECHNICIAN' || role === 'STORE_MANAGER') {
      this.setData({
        userInfo,
        role,
        roleText: this.getRoleText(role),
        roleShortText: this.getRoleShortText(role)
      });
      this.setupMenu(role);
      return;
    }

    if (role === 'STORE_TECHNICIAN') {
      wx.switchTab({
        url: '/pages/technician/home/home'
      });
      return;
    }

    // 门店管理员自动跳转到管理后台
    if (role === 'STORE_MANAGER') {
      wx.switchTab({
        url: '/pages/manager/dashboard/dashboard'
      });
      return;
    }

    this.setData({
      userInfo,
      role,
      roleText: this.getRoleText(role),
      roleShortText: this.getRoleShortText(role)
    });

    // 根据角色设置菜单或加载首页数据
    if (role === 'FLEET_MANAGER') {
      this.loadFleetDashboard();
    } else {
      this.setupMenu(role);
    }
  },

  /**
   * 获取角色文本
   */
  getRoleText(role) {
    const roleMap = {
      'DRIVER': '司机',
      'FLEET_MANAGER': '车队管理员',
      'STORE_TECHNICIAN': '门店技师',
      'STORE_MANAGER': '门店管理员',
      'PLATFORM_OPERATOR': '平台运营'
    };
    return roleMap[role] || '未知角色';
  },

  /**
   * 获取角色简称
   */
  getRoleShortText(role) {
    const roleMap = {
      'DRIVER': '司机',
      'FLEET_MANAGER': '车队',
      'STORE_TECHNICIAN': '技师',
      'STORE_MANAGER': '店长',
      'PLATFORM_OPERATOR': '运营'
    };
    return roleMap[role] || '';
  },

  /**
   * 加载车队管理员首页数据
   */
  async loadFleetDashboard() {
    try {
      const res = await request.get('/order-center/dashboard');

      if (res.success) {
        const data = res.data || {};
        const stats = data.stats || {};
        const todo = data.todo || {};
        const recentActivities = (data.recentActivities || []).map(item => {
          const title = this.localizeActivityText(item.title, '订单动态');
          const description = this.localizeActivityText(item.description, '');
          return {
            ...item,
            title,
            description,
            icon: this.getActivityIcon(title, description)
          };
        });

        // 计算是否有待办事项
        const hasTodo =
          (todo.pendingApprovalOrders?.length || 0) > 0 ||
          (todo.pendingAddonOrders?.length || 0) > 0 ||
          (todo.pendingCompletionOrders?.length || 0) > 0;

        this.setData({
          stats: {
            totalVehicles: stats.totalVehicles || 0,
            pendingApprovals: stats.pendingApprovals || 0,
            pendingAddons: stats.pendingAddons || 0,
            pendingCompletion: stats.pendingCompletion || 0,
            inRepairOrders: stats.inRepairOrders || 0,
            accountBalance: this.formatMoney(stats.accountBalance || 0)
          },
          todo: {
            pendingApprovalOrders: todo.pendingApprovalOrders || [],
            pendingAddonOrders: todo.pendingAddonOrders || [],
            pendingCompletionOrders: todo.pendingCompletionOrders || []
          },
          recentActivities,
          hasTodo
        });
      }
    } catch (error) {
      console.error('加载车队首页数据失败:', error);
      // 加载失败时显示空状态，不使用模拟数据
      this.setData({
        hasTodo: false
      });
    }
  },

  /**
   * 格式化金额
   */
  formatMoney(amount) {
    if (typeof amount !== 'number') {
      amount = parseFloat(amount) || 0;
    }
    return amount.toFixed(2);
  },

  localizeActivityText(text, fallback = '') {
    if (!text || typeof text !== 'string') {
      return fallback;
    }

    const trimmed = text.trim();
    const localizedStatus = getStatusText(normalizeOrderStatus(trimmed));
    if (localizedStatus && localizedStatus !== '未知状态') {
      return localizedStatus;
    }

    if (trimmed.includes('-')) {
      const [prefix, ...rest] = trimmed.split('-');
      const suffix = rest.join('-').trim();
      const localizedSuffix = getStatusText(normalizeOrderStatus(suffix));
      if (localizedSuffix && localizedSuffix !== '未知状态') {
        return `${prefix.trim()} ${localizedSuffix}`;
      }
    }

    return /[a-z]{3,}/i.test(trimmed) ? fallback : trimmed;
  },

  getActivityIcon(title = '', description = '') {
    const text = `${title} ${description}`;
    if (text.includes('增项')) return '/images/icons/warning-triangle.svg';
    if (text.includes('完成') || text.includes('完工')) return '/images/icons/check-circle.svg';
    if (text.includes('保养') || text.includes('维修')) return '/images/icons/wrench.svg';
    if (text.includes('门店')) return '/images/icons/store.svg';
    return '/images/icons/clipboard.svg';
  },

  /**
   * 根据角色设置菜单
   */
  setupMenu(role) {
    let menuList = [];

    switch (role) {
      case 'DRIVER':
        menuList = [
          {
            id: 'report',
            title: '报修申请',
            icon: '/images/icons/warning-triangle.svg',
            description: '提交车辆报修申请',
            url: '/pages/report/report',
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
          },
          {
            id: 'maintenance',
            title: '保养申请',
            icon: '/images/icons/oil-drop.svg',
            description: '提交车辆保养申请',
            url: '/pages/report/report?type=maintenance',
            color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
          }
        ];
        break;

      case 'FLEET_MANAGER':
        menuList = [
          {
            id: 'vehicles',
            title: '车队车辆',
            icon: '/images/icons/truck.svg',
            description: '查看车队全部车辆',
            url: '/pages/fleet-vehicles/fleet-vehicles',
            color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          },
          {
            id: 'orders',
            title: '维修订单',
            icon: '/images/icons/clipboard.svg',
            description: '查看并处理维修订单',
            url: '/pages/orders/orders',
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
          },
          {
            id: 'account',
            title: '账户余额',
            icon: '/images/icons/money.svg',
            description: '查看余额与交易记录',
            url: '/pages/account/account',
            color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
          }
        ];
        break;

      case 'STORE_TECHNICIAN':
        menuList = [
          {
            id: 'store-orders',
            title: '门店订单',
            icon: '/images/icons/wrench.svg',
            description: '查看和管理维修订单',
            url: '/pages/orders/orders',
            color: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
          }
        ];
        break;

      case 'STORE_MANAGER':
        menuList = [
          {
            id: 'store-orders',
            title: '门店订单',
            icon: '/images/icons/clipboard.svg',
            description: '查看和管理门店订单',
            url: '/pages/orders/orders',
            color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          },
          {
            id: 'store-settings',
            title: '门店设置',
            icon: '/images/icons/settings.svg',
            description: '管理门店信息和设置',
            url: '/pages/manager/store/store',
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
          },
          {
            id: 'finance',
            title: '财务管理',
            icon: '/images/icons/money.svg',
            description: '查看财务数据和提现',
            url: '/pages/manager/finance/finance',
            color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
          },
          {
            id: 'analytics',
            title: '数据报表',
            icon: '/images/icons/chart-bar.svg',
            description: '查看经营数据分析',
            url: '/pages/manager/analytics/analytics',
            color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
          }
        ];
        break;

      case 'PLATFORM_OPERATOR':
        menuList = [
          {
            id: 'fleets',
            title: '车队管理',
            icon: '/images/icons/building.svg',
            description: '管理平台所有车队',
            url: '/pages/fleets/fleets',
            color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          },
          {
            id: 'stores',
            title: '门店管理',
            icon: '/images/icons/store.svg',
            description: '管理合作维修门店',
            url: '/pages/stores/stores',
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
          },
          {
            id: 'orders',
            title: '订单监控',
            icon: '/images/icons/chart-bar.svg',
            description: '监控全平台订单',
            url: '/pages/orders/orders',
            color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
          },
          {
            id: 'users',
            title: '用户管理',
            icon: '/images/icons/users-group.svg',
            description: '管理系统用户权限',
            url: '/pages/users/users',
            color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
          }
        ];
        break;
    }

    this.setData({ menuList });
  },

  /**
   * 跳转到订单详情
   */
  goToOrderDetail(e) {
    const { id, action } = e.currentTarget.dataset;
    const actionQuery = action ? `&action=${action}` : '';
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}${actionQuery}`
    });
  },

  /**
   * 跳转到车辆管理
   */
  goToVehicles() {
    wx.navigateTo({
      url: '/pages/fleet-vehicles/fleet-vehicles'
    });
  },

  /**
   * 跳转到订单列表
   */
  goToOrders(e) {
    const { type } = e.currentTarget.dataset;
    // tabBar 页面必须使用 switchTab，不支持传参
    // 如果需要筛选，使用全局变量
    if (type) {
      app.globalData.orderFilterStatus = type;
    }
    wx.switchTab({
      url: '/pages/orders/orders',
      fail: () => {
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 跳转到账户页面
   */
  goToAccount() {
    // tabBar 页面必须使用 switchTab
    wx.switchTab({
      url: '/pages/account/account',
      fail: () => {
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 跳转到车队车辆管理
   */
  goToFleetVehicles() {
    wx.navigateTo({
      url: '/pages/fleet-vehicles/fleet-vehicles'
    });
  },

  /**
   * 跳转到维保记录
   */
  goToReports() {
    wx.navigateTo({
      url: '/pages/fleet/report/report'
    });
  },

  /**
   * 点击菜单项
   */
  onMenuTap(e) {
    const { url } = e.currentTarget.dataset;

    if (url) {
      // tabBar 页面列表
      const tabBarPages = [
        '/pages/index/index',
        '/pages/orders/orders',
        '/pages/vehicle/vehicle',
        '/pages/account/account'
      ];

      // 判断是否为 tabBar 页面（精确匹配）
      const isTabBarPage = tabBarPages.includes(url);

      if (isTabBarPage) {
        // tabBar 页面使用 switchTab
        wx.switchTab({
          url,
          fail: () => {
            wx.showToast({
              title: '页面跳转失败',
              icon: 'none'
            });
          }
        });
      } else {
        // 普通页面使用 navigateTo
        wx.navigateTo({
          url,
          fail: () => {
            wx.showToast({
              title: '页面开发中',
              icon: 'none'
            });
          }
        });
      }
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    if (this.data.role === 'FLEET_MANAGER') {
      this.loadFleetDashboard();
    } else {
      this.setupMenu(this.data.role);
    }
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
