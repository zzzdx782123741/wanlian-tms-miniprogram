// index.js - 万联驿站TMS首页 - 现代化设计
const app = getApp();

Page({
  data: {
    userInfo: null,
    role: '',
    roleText: '',
    roleShortText: '',
    menuList: [],
    isDevMode: false, // 开发模式标识
    showRoleSwitcher: false // 角色切换弹窗显示状态
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    // 每次显示页面时刷新用户信息
    this.initPage();
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

    // 检测开发模式（根据API地址或版本号判断）
    const isDevMode = this.checkDevMode();

    this.setData({
      userInfo,
      role,
      roleText: this.getRoleText(role),
      roleShortText: this.getRoleShortText(role),
      isDevMode
    });

    // 根据角色设置菜单
    this.setupMenu(role);
  },

  /**
   * 检查是否为开发模式
   */
  checkDevMode() {
    // 方式1: 检查API地址
    const apiHost = app.globalData.baseUrl;
    if (apiHost.includes('localhost') || apiHost.includes('127.0.0.1')) {
      return true;
    }

    // 方式2: 检查小程序版本（开发版/体验版）
    const accountInfo = wx.getAccountInfoSync();
    if (accountInfo.miniProgram.envVersion === 'develop' ||
        accountInfo.miniProgram.envVersion === 'trial') {
      return true;
    }

    return false;
  },

  /**
   * 显示角色切换弹窗
   */
  onShowRoleSwitcher() {
    this.setData({
      showRoleSwitcher: true
    });
  },

  /**
   * 关闭角色切换弹窗
   */
  onHideRoleSwitcher() {
    this.setData({
      showRoleSwitcher: false
    });
  },

  /**
   * 切换角色（开发环境专用）
   */
  onSwitchRole(e) {
    const { role } = e.currentTarget.dataset;

    wx.showModal({
      title: '切换角色',
      content: `确定要切换到${this.getRoleText(role)}吗？`,
      confirmColor: '#667eea',
      success: (res) => {
        if (res.confirm) {
          // 临时切换角色（仅修改前端状态）
          app.globalData.role = role;
          wx.setStorageSync('role', role);

          // 关闭弹窗并刷新页面
          this.setData({
            showRoleSwitcher: false
          });

          // 重新初始化页面
          this.initPage();

          wx.showToast({
            title: `已切换到${this.getRoleText(role)}`,
            icon: 'success'
          });
        }
      }
    });
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
            id: 'vehicle',
            title: '我的车辆',
            icon: '🚚',
            description: '查看和管理我的车辆信息',
            url: '/pages/vehicle/vehicle',
            color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          },
          {
            id: 'report',
            title: '报修申请',
            icon: '🔧',
            description: '快速提交车辆维修申请',
            url: '/pages/report/report',
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
          },
          {
            id: 'orders',
            title: '我的订单',
            icon: '📋',
            description: '查看维修订单进度',
            url: '/pages/orders/orders',
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
            id: 'orders',
            title: '接单大厅',
            icon: '📋',
            description: '查看和接收维修订单',
            url: '/pages/orders/orders',
            color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
          },
          {
            id: 'my-orders',
            title: '我的订单',
            icon: '🔧',
            description: '进行中的维修任务',
            url: '/pages/my-orders/my-orders',
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
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 空函数，仅用于阻止事件冒泡
  }
});
