// custom-tab-bar/index.js - 自定义 tabBar 入口
const app = getApp();

Component({
  data: {
    selected: 0,
    color: "#8C8C8C",
    selectedColor: "#667eea",
    list: [],
    role: ''
  },

  lifetimes: {
    attached() {
      // 组件加载时获取当前角色
      this.loadUserRole();
    }
  },

  observers: {
    'role': function(role) {
      if (role) {
        this.updateTabBar();
      }
    }
  },

  methods: {
    /**
     * 加载用户角色（增强版，支持多种数据格式）
     */
    loadUserRole() {
      let role = app.globalData.role || '';

      // 如果globalData为空，尝试从storage读取
      if (!role) {
        const storedRole = wx.getStorageSync('role');
        if (storedRole) {
          // 处理role可能是对象的情况
          role = typeof storedRole === 'object' ? (storedRole.type || storedRole.role?.type || '') : storedRole;
          if (role) {
            app.globalData.role = role;
          }
        }
      }

      // 如果还是为空，尝试从userInfo中提取
      if (!role) {
        const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
        if (userInfo && userInfo.role) {
          role = typeof userInfo.role === 'object' ? userInfo.role.type : userInfo.role;
          if (role) {
            app.globalData.role = role;
            wx.setStorageSync('role', role);
          }
        }
      }

      console.log('[TabBar] 加载用户角色:', role);
      this.setData({ role });
      this.updateTabBar();
    },

    /**
     * 更新 tabBar 配置
     */
    updateTabBar() {
      const role = this.data.role;
      console.log('[TabBar] 更新TabBar，当前角色:', role);

      const list = this.getTabsByRole(role);
      console.log('[TabBar] 过滤后的Tab列表:', list);

      this.setData({ list });

      // 获取当前页面路径，设置选中状态
      this.setCurrentSelected();
    },

    /**
     * 根据角色获取 tab 列表
     */
    getTabsByRole(role) {
      console.log('[TabBar] getTabsByRole 输入角色:', role, '类型:', typeof role);

      // 所有可用的 tab 配置
      const allTabs = [
        {
          pagePath: "/pages/index/index",
          text: "首页",
          iconPath: "/images/icons/home.png",
          selectedIconPath: "/images/icons/home-active.png",
          roles: ['DRIVER', 'FLEET_MANAGER']
        },
        {
          pagePath: "/pages/technician/home/home",
          text: "今日工作台",
          iconPath: "/images/icons/home.png",
          selectedIconPath: "/images/icons/home-active.png",
          roles: ['STORE_TECHNICIAN']
        },
        {
          pagePath: "/pages/manager/dashboard/dashboard",
          text: "工作台",
          iconPath: "/images/icons/home.png",
          selectedIconPath: "/images/icons/home-active.png",
          roles: ['STORE_MANAGER']
        },
        {
          pagePath: "/pages/orders/orders",
          text: "订单",
          iconPath: "/images/icons/goods.png",
          selectedIconPath: "/images/icons/goods-active.png",
          roles: ['DRIVER', 'FLEET_MANAGER', 'STORE_TECHNICIAN', 'STORE_MANAGER', 'PLATFORM_OPERATOR']
        },
        {
          pagePath: "/pages/vehicle/vehicle",
          text: "车辆",
          iconPath: "/images/icons/business.png",
          selectedIconPath: "/images/icons/business-active.png",
          roles: ['DRIVER', 'FLEET_MANAGER', 'PLATFORM_OPERATOR']
        },
        {
          pagePath: "/pages/technician/products/products",
          text: "商品库",
          iconPath: "/images/icons/goods.png",
          selectedIconPath: "/images/icons/goods-active.png",
          roles: ['STORE_TECHNICIAN']
        },
        {
          pagePath: "/pages/account/account",
          text: "我的",
          iconPath: "/images/icons/usercenter.png",
          selectedIconPath: "/images/icons/usercenter-active.png",
          roles: ['all']
        }
      ];

      // 如果角色为空，只显示"我的"
      if (!role || role === '' || role === 'undefined' || role === 'null') {
        console.warn('[TabBar] 角色为空，只显示"我的"菜单');
        return allTabs.filter(tab => tab.roles.includes('all'));
      }

      // 过滤出当前角色可见的 tab
      return allTabs.filter(tab => {
        return tab.roles.includes('all') || tab.roles.includes(role);
      });
    },

    /**
     * 设置当前选中的 tab
     */
    setCurrentSelected() {
      const pages = getCurrentPages();
      if (pages.length === 0) return;

      const currentPage = pages[pages.length - 1];
      const currentRoute = '/' + currentPage.route;

      // 找到匹配的 tab 索引
      const selectedIndex = this.data.list.findIndex(tab => {
        return tab.pagePath === currentRoute;
      });

      if (selectedIndex !== -1) {
        this.setData({
          selected: selectedIndex
        });
      }
    },

    /**
     * 切换 tab
     */
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;

      wx.switchTab({
        url
      });
    }
  }
});
