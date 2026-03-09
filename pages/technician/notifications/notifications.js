// pages/technician/notifications/notifications.js
const app = getApp();
const request = require('../../../utils/request');

Page({
  data: {
    activeTab: 'all',
    notifications: [],
    totalCount: 0,
    orderCount: 0,
    systemCount: 0,
    hasUnread: false
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

      const res = await request.get('/technician/notifications');
      if (res.success) {
        const notifications = this.formatNotifications(res.data.list || []);

        this.setData({
          notifications,
          totalCount: notifications.length,
          orderCount: notifications.filter(n => n.type === 'order').length,
          systemCount: notifications.filter(n => n.type === 'system').length,
          hasUnread: notifications.some(n => !n.read)
        });

        // 根据tab过滤
        this.filterNotifications();
      }
    } catch (error) {
      console.error('加载通知失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 格式化通知数据
   */
  formatNotifications(list) {
    return list.map(item => {
      const type = item.category || 'order';
      return {
        id: item._id,
        type,
        icon: this.getNotificationIcon(type, item.title),
        title: item.title,
        description: item.content,
        time: this.formatTime(item.createdAt),
        read: item.read || false,
        orderNumber: item.orderNumber || '',
        orderId: item.orderId || ''
      };
    });
  },

  /**
   * 获取通知图标
   */
  getNotificationIcon(type, title) {
    if (type === 'system') {
      return '📢';
    }

    // 根据标题判断订单通知类型
    if (title.includes('新订单')) return '📋';
    if (title.includes('审批')) return '✅';
    if (title.includes('增项')) return '📝';
    if (title.includes('完工')) return '🔧';
    if (title.includes('确认')) return '✓';

    return '🔔';
  },

  /**
   * 过滤通知
   */
  filterNotifications() {
    const { activeTab } = this.data;
    let filtered = this.data.notifications;

    if (activeTab !== 'all') {
      filtered = filtered.filter(n => n.type === activeTab);
    }

    this.setData({ notifications: filtered });
  },

  /**
   * 切换tab
   */
  switchTab(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ activeTab: tab });
    this.loadData();
  },

  /**
   * 处理通知点击
   */
  async handleNotification(e) {
    const { item } = e.currentTarget.dataset;

    // 标记为已读
    if (!item.read) {
      try {
        await request.put(`/technician/notifications/${item.id}/read`);
        item.read = true;
        this.setData({ notifications: this.data.notifications });
      } catch (error) {
        console.error('标记已读失败:', error);
      }
    }

    // 如果是订单通知，跳转到订单详情
    if (item.type === 'order' && item.orderId) {
      wx.navigateTo({
        url: `/pages/order-detail/order-detail?id=${item.orderId}`
      });
    }
  },

  /**
   * 全部标记为已读
   */
  async markAllRead() {
    try {
      wx.showLoading({ title: '处理中...' });

      await request.put('/technician/notifications/read-all');

      // 更新本地数据
      const notifications = this.data.notifications.map(n => ({ ...n, read: true }));
      this.setData({
        notifications,
        hasUnread: false
      });

      wx.showToast({
        title: '已全部标记为已读',
        icon: 'success'
      });
    } catch (error) {
      console.error('标记全部已读失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 格式化时间
   */
  formatTime(time) {
    if (!time) return '';

    const date = new Date(time);
    const now = new Date();
    const diff = now - date;

    // 1小时内
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}分钟前`;
    }

    // 今天
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (targetDate.getTime() === today.getTime()) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `今天 ${hours}:${minutes}`;
    }

    // 昨天
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (targetDate.getTime() === yesterday.getTime()) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `昨天 ${hours}:${minutes}`;
    }

    // 更早
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}-${day}`;
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
