// components/custom-tab-bar/index.js - 自定义 tabBar 组件
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
      const role = app.globalData.role || '';
      this.setData({ role });
      this.updateTabBar();
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
     * 更新 tabBar 配置
     */
    updateTabBar() {
      const role = this.data.role;
      const list = this.getTabsByRole(role);
      this.setData({ list });

      // 获取当前页面路径，设置选中状态
      this.setCurrentSelected();
    },

    /**
     * 根据角色获取 tab 列表
     */
    getTabsByRole(role) {
      // 所有可用的 tab 配置
      const allTabs = [
        {
          pagePath: "/pages/index/index",
          text: "首页",
          iconPath: "/images/icons/home.png",
          selectedIconPath: "/images/icons/home-active.png",
          roles: ['all'] // all 表示所有角色都显示
        },
        {
          pagePath: "/pages/orders/orders",
          text: "订单",
          iconPath: "/images/icons/goods.png",
          selectedIconPath: "/images/icons/goods-active.png",
          roles: ['DRIVER', 'FLEET_MANAGER', 'PLATFORM_OPERATOR']
        },
        {
          pagePath: "/pages/store/orders/orders",
          text: "工单",
          iconPath: "/images/icons/goods.png",
          selectedIconPath: "/images/icons/goods-active.png",
          roles: ['STORE_TECHNICIAN']
        },
        {
          pagePath: "/pages/vehicle/vehicle",
          text: "车辆",
          iconPath: "/images/icons/business.png",
          selectedIconPath: "/images/icons/business-active.png",
          roles: ['DRIVER', 'FLEET_MANAGER', 'PLATFORM_OPERATOR']
        },
        {
          pagePath: "/pages/account/account",
          text: "我的",
          iconPath: "/images/icons/usercenter.png",
          selectedIconPath: "/images/icons/usercenter-active.png",
          roles: ['all']
        }
      ];

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
