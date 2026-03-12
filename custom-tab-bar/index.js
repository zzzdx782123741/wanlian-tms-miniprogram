const app = getApp();

const BASE_TABS = [
  {
    pagePath: '/pages/index/index',
    text: '\u5de5\u4f5c\u53f0',
    iconPath: '/images/icons/home.png',
    selectedIconPath: '/images/icons/home-active.png'
  },
  {
    pagePath: '/pages/orders/orders',
    text: '\u8ba2\u5355',
    iconPath: '/images/icons/goods.png',
    selectedIconPath: '/images/icons/goods-active.png'
  },
  {
    pagePath: '/pages/vehicle/vehicle',
    text: '\u8f66\u8f86',
    iconPath: '/images/icons/business.png',
    selectedIconPath: '/images/icons/business-active.png'
  },
  {
    pagePath: '/pages/account/account',
    text: '\u6211\u7684',
    iconPath: '/images/icons/usercenter.png',
    selectedIconPath: '/images/icons/usercenter-active.png'
  }
];

const VEHICLE_TAB_ROLES = ['DRIVER', 'FLEET_MANAGER', 'PLATFORM_OPERATOR'];

Component({
  data: {
    selected: 0,
    color: '#8C8C8C',
    selectedColor: '#667eea',
    list: [],
    role: ''
  },

  lifetimes: {
    attached() {
      this.loadUserRole();
    }
  },

  observers: {
    role(role) {
      if (role) {
        this.updateTabBar();
      }
    }
  },

  methods: {
    loadUserRole() {
      let role = app.globalData.role || '';

      if (!role) {
        const storedRole = wx.getStorageSync('role');
        if (storedRole) {
          role = typeof storedRole === 'object'
            ? (storedRole.type || storedRole.role?.type || '')
            : storedRole;
          if (role) {
            app.globalData.role = role;
          }
        }
      }

      if (!role) {
        const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
        if (userInfo?.role) {
          role = typeof userInfo.role === 'object' ? userInfo.role.type : userInfo.role;
          if (role) {
            app.globalData.role = role;
            wx.setStorageSync('role', role);
          }
        }
      }

      console.log('[TabBar] role:', role);
      this.setData({ role });
      this.updateTabBar();
    },

    updateTabBar() {
      const role = this.data.role;
      const list = this.getTabsByRole(role);

      this.setData({ list });
      this.setCurrentSelected();
    },

    getTabsByRole(role) {
      if (!role || role === 'undefined' || role === 'null') {
        return BASE_TABS;
      }

      if (!VEHICLE_TAB_ROLES.includes(role)) {
        return BASE_TABS.filter((tab) => tab.pagePath !== '/pages/vehicle/vehicle');
      }

      return BASE_TABS;
    },

    setCurrentSelected() {
      const pages = getCurrentPages();
      if (pages.length === 0) {
        return;
      }

      const currentRoute = `/${pages[pages.length - 1].route}`;
      const selectedIndex = this.data.list.findIndex((tab) => tab.pagePath === currentRoute);

      if (selectedIndex !== -1) {
        this.setData({ selected: selectedIndex });
      }
    },

    switchTab(e) {
      const url = e.currentTarget.dataset.path;
      const pages = getCurrentPages();
      const currentRoute = pages.length > 0 ? `/${pages[pages.length - 1].route}` : '';

      if (!url || currentRoute === url) {
        return;
      }

      wx.switchTab({
        url,
        fail: (error) => {
          console.error('[TabBar] switchTab failed:', url, error);
          wx.reLaunch({
            url,
            fail: (relaunchError) => {
              console.error('[TabBar] reLaunch failed:', url, relaunchError);
              wx.showToast({
                title: '\u9875\u9762\u8df3\u8f6c\u5931\u8d25',
                icon: 'none'
              });
            }
          });
        }
      });
    }
  }
});
