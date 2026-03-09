// pages/store/order-detail/order-detail.js - 门店技师订单详情
const request = require('../../../utils/request');

Page({
  data: {
    orderId: '',
    order: null,
    loading: false
  },

  onLoad(options) {
    // 技师角色隐藏底部导航栏的"车辆"标签
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo?.role?.type === 'STORE_TECHNICIAN') {
      wx.hideTabBar({
        animation: false
      });
    }

    if (options.id) {
      this.setData({
        orderId: options.id
      });
      this.loadOrderDetail();
    }
  },

  onShow() {
    // 技师角色每次显示页面时隐藏底部导航栏
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo?.role?.type === 'STORE_TECHNICIAN') {
      wx.hideTabBar({
        animation: false
      });
    }
  },

  onPullDownRefresh() {
    this.loadOrderDetail().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载订单详情
  async loadOrderDetail() {
    try {
      this.setData({ loading: true });

      const res = await request.get(`/orders/${this.data.orderId}`);
      const order = this.formatOrderDetail(res.data);

      this.setData({
        order,
        loading: false
      });

    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  // 格式化订单详情数据
  formatOrderDetail(order) {
    // 格式化日期
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hour = String(d.getHours()).padStart(2, '0');
      const minute = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}`;
    };

    // 计算多久之前
    const getTimeAgo = (date) => {
      if (!date) return '';
      const now = new Date();
      const past = new Date(date);
      const diff = now - past;

      const minute = 60 * 1000;
      const hour = 60 * minute;
      const day = 24 * hour;

      if (diff < minute) {
        return '刚刚';
      } else if (diff < hour) {
        return `${Math.floor(diff / minute)}分钟前`;
      } else if (diff < day) {
        return `${Math.floor(diff / hour)}小时前`;
      } else if (diff < 7 * day) {
        return `${Math.floor(diff / day)}天前`;
      } else {
        return formatDate(date);
      }
    };

    // 获取状态文本和类型
    const statusInfo = this.getStatusInfo(order.status, order);

    // 获取时间偏好文本
    const preferredTimeText = this.getPreferredTimeText(order.preferredTime);

    // 格式化预约信息
    const formattedAppointment = order.appointment ? {
      ...order.appointment,
      expectedDate: formatDate(order.appointment.expectedDate),
      confirmedDate: formatDate(order.appointment.confirmedDate)
    } : null;

    return {
      ...order,
      statusText: statusInfo.text,
      statusType: statusInfo.type,
      statusTip: statusInfo.tip,
      createdAt: formatDate(order.createdAt),
      createdAtAgo: getTimeAgo(order.createdAt),
      appointmentTime: formatDate(order.appointmentAt),
      appointment: formattedAppointment,
      preferredTimeText: preferredTimeText,
      // 格式化日志
      logs: (order.logs || []).map(log => ({
        ...log,
        createdAt: formatDate(log.createdAt),
        createdAtAgo: getTimeAgo(log.createdAt)
      }))
    };
  },

  // 获取状态信息
  getStatusInfo(status, order) {
    const statusMap = {
      'awaiting_fleet_approval': {
        text: '待车队审批',
        type: 'warning',
        tip: '等待车队管理员审批分配门店'
      },
      'awaiting_time_confirmation': {
        text: '待确认时间',
        type: 'warning',
        tip: '技师确认到店时间后开始接车检查'
      },
      'pending_assessment': {
        text: '待评估',
        type: 'warning',
        tip: '等待技师接车并进行故障评估'
      },
      'received': {
        text: '已接单',
        type: 'info',
        tip: '技师已接单，准备进行接车检查'
      },
      'awaiting_approval': {
        text: '待审批报价',
        type: 'info',
        tip: '已提交报价，等待车队管理员审批'
      },
      'quoted': {
        text: '已报价',
        type: 'primary',
        tip: '门店已提交维修报价'
      },
      'approved': {
        text: '已审批',
        type: 'primary',
        tip: '报价已通过，可以开始维修'
      },
      'repairing': {
        text: '维修中',
        type: 'primary',
        tip: '车辆正在维修中'
      },
      'in_repair': {
        text: '维修中',
        type: 'primary',
        tip: '车辆正在维修中'
      },
      'awaiting_addon_approval': {
        text: '增项待审批',
        type: 'warning',
        tip: '维修增项等待车队管理员审批'
      },
      'pending_confirmation': {
        text: '待确认',
        type: 'warning',
        tip: '维修已完成，等待司机确认'
      },
      'completed': {
        text: '已完成',
        type: 'success',
        tip: '维修已完成，司机已确认'
      },
      'confirmed': {
        text: '已确认',
        type: 'success',
        tip: '订单已完成并确认'
      },
      'rejected': {
        text: '已拒绝',
        type: 'error',
        tip: '订单已被拒绝'
      },
      'refunded': {
        text: '已退款',
        type: 'error',
        tip: '订单已退款'
      }
    };

    return statusMap[status] || { text: status, type: '', tip: '' };
  },

  // 获取时间偏好文本
  getPreferredTimeText(preferredTime) {
    const timeMap = {
      'asap': '尽快安排',
      'this_afternoon': '今天下午 (14:00-18:00)',
      'tomorrow_morning': '明天上午 (08:00-12:00)',
      'tomorrow_afternoon': '明天下午 (14:00-18:00)',
      'this_weekend': '本周末',
      'next_week': '下周'
    };
    return timeMap[preferredTime] || preferredTime || '';
  },

  // 预览图片
  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: urls || [url]
    });
  },

  // 联系报修人
  contactReporter() {
    const phone = this.data.order.reporterId.phone;
    if (!phone) {
      wx.showToast({
        title: '暂无联系方式',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '联系报修人',
      content: `电话：${phone}`,
      confirmText: '拨打电话',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: phone
          });
        }
      }
    });
  },

  // 填写报价
  quoteOrder() {
    wx.navigateTo({
      url: `/pages/store/quote/quote?id=${this.data.orderId}`
    });
  },

  // 确认预约时间
  async confirmAppointmentTime() {
    const { order } = this.data;

    if (!order.appointment || !order.appointment.expectedDate) {
      wx.showToast({
        title: '预约信息不完整',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认到店时间',
      content: `司机期望时间：${order.appointment.expectedDate} ${order.appointment.expectedTimeSlot || ''}\n\n确认后将进入接车检查流程`,
      confirmText: '确认',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '确认中...' });

            // 调用后端API确认时间
            await request.put(`/orders/${order._id}/confirm-time`, {
              confirmedDate: order.appointment.expectedDate,
              confirmedTimeSlot: order.appointment.expectedTimeSlot || '08:00-10:00',
              adjusted: false
            });

            wx.hideLoading();
            wx.showToast({
              title: '已确认',
              icon: 'success'
            });

            // 延迟后刷新页面
            setTimeout(() => {
              this.loadOrderDetail();
            }, 1500);

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

  // 返回列表
  goBack() {
    wx.navigateBack();
  }
});
