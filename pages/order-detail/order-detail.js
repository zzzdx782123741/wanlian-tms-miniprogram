// pages/order-detail/order-detail.js - 订单详情页面
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    orderId: '',
    order: null,
    loading: true,
    userRole: ''
  },

  onLoad(options) {
    if (!options.id) {
      wx.showToast({
        title: '订单ID不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      orderId: options.id,
      userRole: app.globalData.role
    });

    this.loadOrderDetail();
  },

  onShow() {
    // 从其他页面返回时刷新数据
    if (this.data.order) {
      this.loadOrderDetail();
    }
  },

  /**
   * 加载订单详情
   */
  async loadOrderDetail() {
    this.setData({ loading: true });

    try {
      const res = await request.get(`/orders/${this.data.orderId}`);
      const order = this.formatOrderDetail(res.data);

      this.setData({ order });

    } catch (error) {
      console.error('加载订单详情失败:', error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 格式化订单详情
   */
  formatOrderDetail(order) {
    const statusMap = {
      'pending': {
        text: '待接单',
        hint: '等待门店接单',
        icon: '⏳',
        timeline: [
          { title: '订单已创建', completed: true }
        ]
      },
      'received': {
        text: '已接单',
        hint: '门店正在检查车辆',
        icon: '🔧',
        timeline: [
          { title: '订单已创建', completed: true },
          { title: '门店已接单', completed: true }
        ]
      },
      'quoted': {
        text: '待审批',
        hint: '等待车队审批报价',
        icon: '💰',
        timeline: [
          { title: '订单已创建', completed: true },
          { title: '门店已接单', completed: true },
          { title: '已提交报价', completed: true }
        ]
      },
      'approved': {
        text: '维修中',
        hint: '门店正在维修车辆',
        icon: '🔧',
        timeline: [
          { title: '订单已创建', completed: true },
          { title: '门店已接单', completed: true },
          { title: '报价已批准', completed: true },
          { title: '正在维修', completed: true }
        ]
      },
      'completed': {
        text: '待确认',
        hint: '等待客户确认完工',
        icon: '✅',
        timeline: [
          { title: '订单已创建', completed: true },
          { title: '门店已接单', completed: true },
          { title: '报价已批准', completed: true },
          { title: '维修完成', completed: true },
          { title: '等待确认', completed: true }
        ]
      },
      'confirmed': {
        text: '已完成',
        hint: '订单已完成',
        icon: '✅',
        timeline: [
          { title: '订单已创建', completed: true },
          { title: '门店已接单', completed: true },
          { title: '报价已批准', completed: true },
          { title: '维修完成', completed: true },
          { title: '已确认', completed: true }
        ]
      }
    };

    const statusInfo = statusMap[order.status] || { text: '未知', hint: '', icon: '❓', timeline: [] };

    return {
      ...order,
      statusText: statusInfo.text,
      statusHint: statusInfo.hint,
      statusIcon: statusInfo.icon,
      timeline: statusInfo.timeline,
      createdAtText: this.formatTime(order.createdAt),
      logs: order.logs ? order.logs.map(log => ({
        ...log,
        createdAtText: this.formatTime(log.createdAt)
      })) : []
    };
  },

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  /**
   * 预览图片
   */
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = e.currentTarget.dataset.urls;
    wx.previewImage({
      current: url,
      urls: urls
    });
  },

  /**
   * 联系门店
   */
  onContactStore() {
    const store = this.data.order.storeId;
    if (!store || !store.phone) {
      wx.showToast({
        title: '暂无联系电话',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '联系门店',
      content: `电话：${store.phone}`,
      confirmText: '拨打电话',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: store.phone
          });
        }
      }
    });
  },

  /**
   * 门店接单
   */
  async onReceiveOrder() {
    try {
      wx.showLoading({ title: '接单中...' });

      await request.post(`/orders/${this.data.orderId}/receive`);

      wx.hideLoading();
      wx.showToast({
        title: '接单成功',
        icon: 'success'
      });

      this.loadOrderDetail();

    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '接单失败',
        icon: 'none'
      });
    }
  },

  /**
   * 提交报价
   */
  onSubmitQuote() {
    wx.navigateTo({
      url: `/pages/submit-quote/submit-quote?orderId=${this.data.orderId}`
    });
  },

  /**
   * 审批报价
   */
  async onApproveQuote(e) {
    const approved = e.currentTarget.dataset.approved;

    const title = approved ? '批准报价' : '拒绝报价';
    const content = approved
      ? '确认批准此报价？批准后将从账户扣款。'
      : '确认拒绝此报价？订单将返回待接单状态。';

    wx.showModal({
      title,
      content,
      confirmColor: approved ? '#10B981' : '#EF4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });

            await request.post(`/orders/${this.data.orderId}/approve`, { approved });

            wx.hideLoading();
            wx.showToast({
              title: approved ? '已批准' : '已拒绝',
              icon: 'success'
            });

            this.loadOrderDetail();

          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '操作失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 提交完工
   */
  onCompleteOrder() {
    wx.navigateTo({
      url: `/pages/complete-order/complete-order?orderId=${this.data.orderId}`
    });
  },

  /**
   * 确认完工
   */
  async onConfirmOrder() {
    wx.showModal({
      title: '确认完工',
      content: '确认车辆已维修完成？',
      confirmColor: '#10B981',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '确认中...' });

            await request.post(`/orders/${this.data.orderId}/confirm`);

            wx.hideLoading();
            wx.showToast({
              title: '确认成功',
              icon: 'success'
            });

            this.loadOrderDetail();

          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '确认失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 查看车辆详情
   */
  onVehicleDetail(e) {
    const vehicleId = e.currentTarget.dataset.vehicleId;
    wx.navigateTo({
      url: `/pages/vehicle-detail/vehicle-detail?id=${vehicleId}`
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadOrderDetail();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
