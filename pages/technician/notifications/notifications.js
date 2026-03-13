// pages/technician/notifications/notifications.js
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
    if (options.tab) {
      this.setData({ activeTab: options.tab });
    }
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      wx.showLoading({ title: '加载中...' });

      const res = await request.get('/technician/notifications');
      if (res.success) {
        const notifications = this.formatNotifications(res.data.list || []);

        this.setData({
          notifications,
          totalCount: notifications.length,
          orderCount: notifications.filter((n) => n.type === 'order').length,
          systemCount: notifications.filter((n) => n.type === 'system').length,
          hasUnread: notifications.some((n) => !n.read)
        });

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

  formatNotifications(list) {
    return list.map((item) => {
      const type = item.category || 'order';
      return {
        id: item._id,
        type,
        icon: this.getNotificationIcon(type, item.title || ''),
        title: item.title,
        description: item.content,
        time: this.formatTime(item.createdAt),
        read: item.read || false,
        orderNumber: item.orderNumber || '',
        orderId: item.orderId || ''
      };
    });
  },

  getNotificationIcon(type, title) {
    if (type === 'system') {
      return '/images/icons/bell.svg';
    }

    if (title.includes('新订单')) return '/images/icons/clipboard.svg';
    if (title.includes('审批')) return '/images/icons/check-circle.svg';
    if (title.includes('增项')) return '/images/icons/note.svg';
    if (title.includes('完工')) return '/images/icons/wrench.svg';
    if (title.includes('确认')) return '/images/icons/check-circle.svg';

    return '/images/icons/bell.svg';
  },

  filterNotifications() {
    const { activeTab } = this.data;
    let filtered = this.data.notifications;

    if (activeTab !== 'all') {
      filtered = filtered.filter((n) => n.type === activeTab);
    }

    this.setData({ notifications: filtered });
  },

  switchTab(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ activeTab: tab });
    this.loadData();
  },

  async handleNotification(e) {
    const { item } = e.currentTarget.dataset;

    if (!item.read) {
      try {
        await request.put(`/technician/notifications/${item.id}/read`);
        item.read = true;
        this.setData({ notifications: this.data.notifications });
      } catch (error) {
        console.error('标记已读失败:', error);
      }
    }

    if (item.type === 'order' && item.orderId) {
      wx.navigateTo({
        url: `/pages/order-detail/order-detail?id=${item.orderId}`
      });
    }
  },

  async markAllRead() {
    try {
      wx.showLoading({ title: '处理中...' });

      await request.put('/technician/notifications/read-all');

      const notifications = this.data.notifications.map((n) => ({ ...n, read: true }));
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

  formatTime(time) {
    if (!time) return '';

    const date = new Date(time);
    const now = new Date();
    const diff = now - date;

    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}分钟前`;
    }

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (targetDate.getTime() === today.getTime()) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `今天 ${hours}:${minutes}`;
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (targetDate.getTime() === yesterday.getTime()) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `昨天 ${hours}:${minutes}`;
    }

    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}-${day}`;
  },

  onPullDownRefresh() {
    this.loadData();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
