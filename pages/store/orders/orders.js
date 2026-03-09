// pages/store/orders/orders.js - 门店技师接单大厅
const request = require('../../../utils/request');

Page({
  data: {
    orders: [],
    loading: false,
    activeTab: 'all', // all(全部), processing(处理中), completed(已完成)
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'processing', label: '处理中' },
      { key: 'completed', label: '已完成' }
    ],
    // 时间调整弹窗相关
    showTimeAdjuster: false,
    currentOrderId: null,
    selectedTimeSlot: null,
    selectedTimeDisplayText: '',
    availableTimeSlots: []
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 切换标签
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    this.loadOrders();
  },

  // 加载订单列表
  async loadOrders() {
    try {
      this.setData({ loading: true });

      const { activeTab } = this.data;
      let params = {};

      // 根据标签筛选订单
      if (activeTab === 'all') {
        // 全部：显示所有分配给该门店的订单
        params.status = ''; // 不过滤状态
      } else if (activeTab === 'processing') {
        // 处理中：待确认时间、待评估、待审批、维修中、增项待审批
        params.status = 'awaiting_time_confirmation,pending_assessment,awaiting_approval,in_repair,awaiting_addon_approval';
      } else if (activeTab === 'completed') {
        // 待确认 + 已完成
        params.status = 'pending_confirmation,completed';
      }

      const res = await request.get('/orders', params);
      console.log('========== API响应调试 ==========');
      console.log('完整响应对象:', res);
      console.log('响应success:', res.success);
      console.log('响应data:', res.data);
      console.log('API返回的订单数量:', res.data.orders?.length || 0);

      if (res.data.orders && res.data.orders.length > 0) {
        res.data.orders.forEach((order, index) => {
          console.log(`\n订单${index + 1} 原始数据:`);
          console.log('  _id:', order._id);
          console.log('  orderNumber:', order.orderNumber);
          console.log('  status:', order.status);
          console.log('  status类型:', typeof order.status);
          console.log('  storeId:', order.storeId);
          console.log('  appointment:', order.appointment);
        });
      } else {
        console.log('⚠️ 订单列表为空！');
      }
      console.log('====================================\n');

      let orders = this.formatOrders(res.data.orders || []);

      // 调试日志：检查订单状态
      console.log('========== 订单状态调试 ==========');
      orders.forEach((order, index) => {
        console.log(`\n格式化后订单${index + 1}:`);
        console.log('  ID:', order._id);
        console.log('  原始状态:', order.status);
        console.log('  状态类型:', typeof order.status);
        console.log('  状态文本:', order.statusText);
        console.log('  状态类型(样式):', order.statusType);
      });
      console.log('====================================\n');

      // 过滤技师自己的订单（对于进行中的订单）
      const userInfo = wx.getStorageSync('userInfo');
      const myOrders = orders.filter(order => {
        // 所有分配到该门店的订单都显示
        return true;
      });

      // 排序：按创建时间倒序（最新的在最上面）
      myOrders.sort((a, b) => b.sortTime - a.sortTime);

      console.log('最终设置到data的订单数量:', myOrders.length);

      this.setData({
        orders: myOrders,
        loading: false
      });

    } catch (error) {
      this.setData({ loading: false });
      console.error('加载订单失败:', error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      })
    }
  },

  // 填写报价（接车检查）
  quoteOrder(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/store/quote/quote?id=${id}`
    });
  },

  // 提交完工
  submitComplete(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/store/complete/complete?id=${id}`
    });
  },

  // 查看订单详情
  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/store/order-detail/order-detail?id=${id}`
    });
  },

  // 格式化订单数据
  formatOrders(orders) {
    console.log('========== formatOrders 调试 ==========');
    console.log('原始订单数量:', orders.length);

    return orders.map(order => {
      console.log(`订单 ${order.orderNumber}:`);
      console.log('  - 原始状态:', order.status);
      console.log('  - appointment:', JSON.stringify(order.appointment));

      // 判断是否已确认
      const isConfirmed = order.completion && order.completion.confirmedBy;

      // 获取状态文本
      let statusText = this.getStatusText(order.status, order);
      console.log('  - 状态文本:', statusText);

      // 获取状态类型
      let statusType = this.getStatusType(order.status);
      console.log('  - 状态类型:', statusType);

      // 计算相对时间
      const createdAtAgo = this.getTimeAgo(order.createdAt);

      // 格式化日期
      const createdAt = this.formatDate(order.createdAt);

      // 确保 vehicleId 和 reporterId 存在
      const vehicleId = order.vehicleId || {};
      const reporterId = order.reporterId || {};

      // 格式化预约信息
      const formattedAppointment = order.appointment ? {
        ...order.appointment,
        expectedDate: this.formatDate(order.appointment.expectedDate),
        confirmedDate: this.formatDate(order.appointment.confirmedDate)
      } : null;

      const formattedOrder = {
        ...order,
        vehicleId: vehicleId,
        reporterId: reporterId,
        statusText: statusText,
        statusType: statusType,
        createdAtAgo: createdAtAgo,
        createdAt: createdAt,
        appointment: formattedAppointment,
        appointmentAt: this.formatDate(order.appointmentAt),
        showConfirmTime: false, // 确认时间模块默认收起
        // 用于排序的时间戳
        sortTime: new Date(order.createdAt).getTime()
      };

      console.log('  - 格式化后状态:', formattedOrder.status);
      console.log('  - 格式化后状态文本:', formattedOrder.statusText);
      console.log('====================================');

      return formattedOrder;
    });
  },

  // 计算相对时间
  getTimeAgo(date) {
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
      return this.formatDate(date);
    }
  },

  // 格式化日期
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  // 获取状态文本
  getStatusText(status, order) {
    console.log('getStatusText 调用 - 原始状态:', status);
    console.log('getStatusText 调用 - 订单对象:', order);

    // 判断是否已确认
    const isConfirmed = order && order.completion && order.completion.confirmedBy;

    const statusMap = {
      'awaiting_fleet_approval': '待车队审批',
      'awaiting_time_confirmation': '待确认时间',
      'pending_assessment': '待接车检查',
      'received': '已接单',
      'awaiting_approval': '待审批报价',
      'quoted': '已报价',
      'approved': '已审批',
      'repairing': '维修中',
      'in_repair': '维修中',
      'awaiting_addon_approval': '增项待审批',
      'pending_confirmation': '待确认',
      'completed': '已完成',
      'confirmed': '已确认',
      'rejected': '已拒绝',
      'refunded': '已退款'
    };

    const result = statusMap[status] || status || '未知状态';
    console.log('getStatusText 返回:', result);
    return result;
  },

  // 检查对象属性是否存在
  safeGet(obj, path, defaultValue = '') {
    if (!obj) return defaultValue;
    const keys = path.split('.');
    let result = obj;
    for (let key of keys) {
      if (result && result[key] !== undefined) {
        result = result[key];
      } else {
        return defaultValue;
      }
    }
    return result || defaultValue;
  },

  // 获取状态类型（用于样式）
  getStatusType(status) {
    const typeMap = {
      'awaiting_fleet_approval': 'warning',
      'awaiting_time_confirmation': 'warning',
      'pending_assessment': 'warning',
      'received': 'info',
      'awaiting_approval': 'info',
      'quoted': 'primary',
      'approved': 'primary',
      'repairing': 'primary',
      'in_repair': 'primary',
      'awaiting_addon_approval': 'warning',
      'pending_confirmation': 'warning',
      'completed': 'success',
      'confirmed': 'success',
      'rejected': 'error',
      'refunded': 'error'
    };
    return typeMap[status] || '';
  },

  // 预览图片
  onPreviewImage(e) {
    const { url } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: [url]
    });
  },

  // 切换确认时间模块的展开/收起
  toggleConfirmTime(e) {
    const { id } = e.currentTarget.dataset;
    const orders = this.data.orders.map(order => {
      if (order._id === id) {
        return {
          ...order,
          showConfirmTime: !order.showConfirmTime
        };
      }
      return order;
    });
    this.setData({ orders });
  },

  // 确认预约时间
  async onConfirmAppointmentTime(e) {
    const { id, date, slot } = e.currentTarget.dataset;

    console.log('========== 确认时间调试 ==========');
    console.log('订单ID:', id);
    console.log('日期:', date);
    console.log('时间段:', slot);

    const order = this.data.orders.find(o => o._id === id);

    console.log('找到的订单:', order);
    console.log('订单状态:', order?.status);
    console.log('预约信息:', order?.appointment);

    if (!order) {
      wx.showToast({
        title: '订单不存在',
        icon: 'none'
      });
      return;
    }

    if (!order.appointment || !order.appointment.expectedDate) {
      console.error('预约信息不完整:', order.appointment);
      wx.showToast({
        title: '预约信息不完整',
        icon: 'none'
      });
      return;
    }

    const request = require('../../../utils/request');

    // 使用格式化后的日期（如果有的话），否则使用原始日期
    let confirmedDate = date;
    if (!confirmedDate && order.appointment.expectedDate) {
      confirmedDate = this.formatDate(order.appointment.expectedDate);
    }

    const confirmedTimeSlot = slot || order.appointment.expectedTimeSlot || '08:00-10:00';

    console.log('确认日期:', confirmedDate);
    console.log('确认时间段:', confirmedTimeSlot);
    console.log('====================================');

    wx.showModal({
      title: '确认到店时间',
      content: `司机期望时间：${confirmedDate} ${confirmedTimeSlot}\n\n确认后将进入接车检查流程`,
      confirmText: '确认',
      confirmColor: '#10B981',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '确认中...' });

            await request.put(`/orders/${id}/confirm-time`, {
              confirmedDate,
              confirmedTimeSlot,
              adjusted: false
            });

            wx.hideLoading();
            wx.showToast({
              title: '已确认',
              icon: 'success'
            });

            // 刷新订单列表
            setTimeout(() => {
              this.loadOrders();
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

  // 打开时间调整弹窗
  onOpenTimeAdjuster(e) {
    const { id } = e.currentTarget.dataset;
    const order = this.data.orders.find(o => o._id === id);

    if (!order) return;

    // 生成可用时间段（今天和明天的时段）
    const availableTimeSlots = this.generateAvailableTimeSlots();

    this.setData({
      currentOrderId: id,
      showTimeAdjuster: true,
      selectedTimeSlot: null,
      selectedTimeDisplayText: '',
      availableTimeSlots
    });
  },

  // 关闭时间调整弹窗
  onCloseTimeAdjuster() {
    this.setData({
      showTimeAdjuster: false,
      currentOrderId: null,
      selectedTimeSlot: null,
      selectedTimeDisplayText: ''
    });
  },

  // 选择时间段
  onSelectTimeSlot(e) {
    const { time } = e.currentTarget.dataset;
    const selectedSlot = this.data.availableTimeSlots.find(slot => slot.time === time);

    if (selectedSlot) {
      this.setData({
        selectedTimeSlot: time,
        selectedTimeDisplayText: selectedSlot.displayText
      });
    }
  },

  // 确认调整时间
  // 注意：系统会自动检测时间是否被调整，如果调整了会自动通知司机
  async onConfirmAdjustTime() {
    if (!this.data.selectedTimeSlot) {
      wx.showToast({
        title: '请选择时间',
        icon: 'none'
      });
      return;
    }

    const request = require('../../../utils/request');
    const selectedSlot = this.data.availableTimeSlots.find(
      slot => slot.time === this.data.selectedTimeSlot
    );

    try {
      wx.showLoading({ title: '确认中...' });

      const response = await request.put(`/orders/${this.data.currentOrderId}/confirm-time`, {
        confirmedDate: selectedSlot.date,
        confirmedTimeSlot: selectedSlot.timeSlot
      });

      wx.hideLoading();

      // 根据后端响应显示不同提示
      if (response.data && response.data.timeAdjusted) {
        wx.showToast({
          title: '已调整时间并通知司机',
          icon: 'success',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: '已确认到店时间',
          icon: 'success'
        });
      }

      // 关闭弹窗
      this.onCloseTimeAdjuster();

      // 刷新订单列表
      setTimeout(() => {
        this.loadOrders();
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '确认失败',
        icon: 'none'
      });
    }
  },

  // 生成可用时间段
  generateAvailableTimeSlots() {
    const slots = [];
    const now = new Date();
    const timeOptions = [
      { timeSlot: '08:00-10:00', label: '上午 08:00-10:00', description: '早班' },
      { timeSlot: '10:00-12:00', label: '上午 10:00-12:00', description: '上午' },
      { timeSlot: '14:00-16:00', label: '下午 14:00-16:00', description: '下午' },
      { timeSlot: '16:00-18:00', label: '下午 16:00-18:00', description: '晚班前' },
      { timeSlot: '18:00-20:00', label: '晚上 18:00-20:00', description: '晚班' }
    ];

    // 今天的时间段
    const today = now;
    const todayStr = this.formatDate(today);

    // 明天的时间段
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = this.formatDate(tomorrow);

    // 生成今天的时间段（只保留未过时的）
    timeOptions.forEach(option => {
      const [startHour] = option.timeSlot.split('-').map(t => parseInt(t.split(':')[0]));
      const slotDate = new Date(today);
      slotDate.setHours(startHour, 0, 0, 0);

      if (slotDate > now) {
        slots.push({
          time: `today_${option.timeSlot}`,
          date: todayStr,
          timeSlot: option.timeSlot,
          displayTime: option.label,
          displayText: `今天 ${option.timeSlot}`,
          description: option.description
        });
      }
    });

    // 生成明天的所有时间段
    timeOptions.forEach(option => {
      slots.push({
        time: `tomorrow_${option.timeSlot}`,
        date: tomorrowStr,
        timeSlot: option.timeSlot,
        displayTime: option.label,
        displayText: `明天 ${option.timeSlot}`,
        description: option.description
      });
    });

    return slots;
  }
});
