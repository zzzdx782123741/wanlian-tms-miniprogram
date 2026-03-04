// index.js - 万联驿站2.0首页 - 现代化设计
const app = getApp();

Page({
  data: {
    userInfo: null,
    role: '',
    roleText: '',
    roleShortText: '',
    menuList: []
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    // 每次显示页面时刷新用户信息
    this.initPage();

    // 更新自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateTabBar();
    }
  },

  /**
   * 初始化页面
   */
  initPage() {
    const userInfo = app.globalData.userInfo;
    const role = app.globalData.role;

    if (!userInfo || !role) {
      // 未登录，跳转到登录页
      wx.redirectTo({
        url: '/pages/auth/login/login'
      });
      return;
    }

    this.setData({
      userInfo,
      role,
      roleText: this.getRoleText(role),
      roleShortText: this.getRoleShortText(role)
    });

    // 根据角色设置菜单
    this.setupMenu(role);
  },

  /**
   * 获取角色文本
   */
  getRoleText(role) {
    const roleMap = {
      'DRIVER': '司机',
      'FLEET_MANAGER': '车队管理员',
      'STORE_TECHNICIAN': '门店技师',
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
      'PLATFORM_OPERATOR': '运营'
    };
    return roleMap[role] || '';
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
            icon: '🔧',
            description: '快速提交车辆维修申请',
            url: '/pages/report/report',
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
          },
          {
            id: 'maintenance',
            title: '保养申请',
            icon: '🧰',
            description: '预约车辆定期保养',
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
            icon: '🚛',
            description: '管理车队所有车辆',
            url: '/pages/fleet-vehicles/fleet-vehicles',
            color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          },
          {
            id: 'orders',
            title: '维修订单',
            icon: '📋',
            description: '查看和管理所有订单',
            url: '/pages/orders/orders',
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
          },
          {
            id: 'account',
            title: '账户余额',
            icon: '💰',
            description: '查看账户余额和交易',
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
            icon: '🔧',
            description: '查看和管理维修订单',
            url: '/pages/orders/orders',
            color: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
          }
        ];
        break;

      case 'PLATFORM_OPERATOR':
        menuList = [
          {
            id: 'fleets',
            title: '车队管理',
            icon: '🏢',
            description: '管理平台所有车队',
            url: '/pages/fleets/fleets',
            color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          },
          {
            id: 'stores',
            title: '门店管理',
            icon: '🏪',
            description: '管理合作维修门店',
            url: '/pages/stores/stores',
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
          },
          {
            id: 'orders',
            title: '订单监控',
            icon: '📊',
            description: '监控全平台订单',
            url: '/pages/orders/orders',
            color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
          },
          {
            id: 'users',
            title: '用户管理',
            icon: '👥',
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
   * 退出登录
   */
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      confirmColor: '#667eea',
      success: (res) => {
        if (res.confirm) {
          app.clearUserInfo();
          wx.redirectTo({
            url: '/pages/auth/login/login'
          });
        }
      }
    });
  }
});
