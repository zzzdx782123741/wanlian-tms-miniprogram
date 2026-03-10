// pages/orders/orders.js - 订单列表页面（支持所有角色）
const app = getApp();
const request = require('../../utils/request');
const format = require('../../utils/format');
const VEHICLE_FILTER_TTL = 30 * 1000;

Page({
  data: {
    activeTab: 'all',
    orders: [],
    allOrders: [], // 保存所有订单用于搜索
    loading: false,
    role: '',
    filterVehicleId: '',
    filterVehiclePlate: '',
    searchQuery: '', // 搜索关键词
    // 标签配置（根据角色动态生成）
    tabs: [],
    // 时间调整弹窗相关
    showTimeAdjuster: false,
    currentOrderId: null,
    selectedTimeSlot: null,
    selectedTimeDisplayText: '',
    availableTimeSlots: []
  },

  onLoad(options) {
    const userInfo = wx.getStorageSync('userInfo');
    const role = userInfo?.role?.type || '';

    // 根据角色配置标签
    const tabs = this.getTabsByRole(role);

    this.setData({
      role,
      tabs,
      filterVehicleId: options?.vehicleId || '',
      filterVehiclePlate: options?.vehiclePlate || ''
    });

    // 如果传入了状态参数，切换到对应标签
    if (options.status && tabs.some(t => t.key === options.status)) {
      this.setData({ activeTab: options.status });
    } else if (options.vehicleId) {
      // 从车辆维度进入时，默认展示历史记录视图
      this.setData({ activeTab: 'completed' });
    }

    // 兼容从 tabBar 页面切换带来的”缓存传参”
    this.consumeVehicleFilter();
    this.consumeOrderStatusFilter();
    this.loadOrders();
  },

  onShow() {
    // 检查用户角色是否发生变化
    const userInfo = wx.getStorageSync('userInfo');
    const currentRole = userInfo?.role?.type || '';

    console.log('========== onShow 角色检查 ==========');
    console.log('页面中的角色:', this.data.role);
    console.log('当前用户角色:', currentRole);
    const vehicleFilterChanged = this.consumeVehicleFilter();
    const statusFilterChanged = this.consumeOrderStatusFilter();

    // 如果角色发生变化，重新初始化页面
    if (currentRole !== this.data.role) {
      console.log('角色发生变化，重新加载页面');

      const tabs = this.getTabsByRole(currentRole);
      this.setData({
        role: currentRole,
        tabs: tabs,
        activeTab: 'all',
        orders: []
      });

      this.loadOrders();
    } else {
      // 角色未变化，从订单详情页返回时刷新列表
      if (vehicleFilterChanged || statusFilterChanged || this.data.orders.length > 0) {
        this.refreshOrders();
      }
    }

    console.log('====================================');

    // 更新自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const tabBar = this.getTabBar();

      // 重新加载角色（增强容错性）
      const role = app.globalData.role || wx.getStorageSync('role') || '';
      console.log('[订单页] onShow - 当前角色:', role);

      // 如果角色为空，尝试从userInfo中提取
      if (!role) {
        const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
        if (userInfo && userInfo.role) {
          const extractedRole = typeof userInfo.role === 'object' ? userInfo.role.type : userInfo.role;
          if (extractedRole) {
            app.globalData.role = extractedRole;
            wx.setStorageSync('role', extractedRole);
            console.log('[订单页] 从userInfo提取角色:', extractedRole);
            tabBar.setData({ role: extractedRole });
          }
        }
      } else {
        tabBar.setData({ role });
      }

      tabBar.updateTabBar();
    }
  },

  /**
   * 根据角色获取标签配置
   */
  getTabsByRole(role) {
    // 技师角色
    if (role === 'STORE_TECHNICIAN') {
      return [
        { key: 'all', label: '全部' },
        { key: 'pending', label: '待处理' },
        { key: 'processing', label: '处理中' },
        { key: 'completed', label: '已完成' }
      ];
    }

    // 其他角色（司机、车队管理员、平台运营）
    return [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待处理' },
      { key: 'processing', label: '处理中' },
      { key: 'completed', label: '已完成' }
    ];
  },

  /**
   * 切换标签
   */
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;

    this.setData({
      activeTab: tab,
      orders: [],
      page: 1,
      hasMore: true
    });

    this.loadOrders();
  },

  /**
   * 清除车辆筛选
   */
  onClearVehicleFilter() {
    this.setData({
      filterVehicleId: '',
      filterVehiclePlate: '',
      activeTab: 'all',
      orders: []
    });
    wx.removeStorageSync('ordersVehicleFilter');
    this.loadOrders();
  },

  /**
   * 加载订单列表
   */
  async loadOrders() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const { activeTab, role, filterVehicleId } = this.data;
      let status = '';

      // 根据角色和标签设置状态参数
      if (role === 'STORE_TECHNICIAN') {
        // 技师角色
        if (activeTab === 'pending') {
          status = 'pending_assessment';
        } else if (activeTab === 'processing') {
          status = 'awaiting_approval,in_repair,awaiting_addon_approval';
        } else if (activeTab === 'completed') {
          status = 'pending_confirmation,completed';
        }
      } else {
        // 其他角色
        if (activeTab === 'pending') {
          status = 'awaiting_fleet_approval,pending_assessment';
        } else if (activeTab === 'processing') {
          status = 'awaiting_approval,in_repair,awaiting_addon_approval';
        } else if (activeTab === 'completed') {
          status = 'pending_confirmation,completed';
        }
      }

      const query = { status };
      if (filterVehicleId) {
        query.vehicleId = filterVehicleId;
      }

      const res = await request.get('/orders', query);

      // 修复：正确处理返回的数据格式
      // 后端返回格式：{ success: true, data: { orders: [...], total: N } }
      const ordersData = res.data?.orders || res.data || [];

      const orders = this.formatOrders(ordersData);

      this.setData({
        orders,
        allOrders: orders, // 保存所有订单用于搜索
        loading: false
      });

      // 如果有搜索关键词，执行搜索
      if (this.data.searchQuery) {
        this.performSearch();
      }

    } catch (error) {
      console.error('加载订单失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 刷新订单列表
   */
  refreshOrders() {
    this.loadOrders();
  },

  /**
   * 消费来自其他页面的车辆筛选参数（一次性）
   */
  consumeVehicleFilter() {
    const payload = wx.getStorageSync('ordersVehicleFilter');
    if (!payload || !payload.vehicleId) return false;

    wx.removeStorageSync('ordersVehicleFilter');

    // 过期参数不再应用，避免旧筛选污染页面
    if (payload.ts && (Date.now() - payload.ts > VEHICLE_FILTER_TTL)) {
      return false;
    }

    if (
      payload.vehicleId === this.data.filterVehicleId &&
      (payload.vehiclePlate || '') === (this.data.filterVehiclePlate || '') &&
      this.data.activeTab === 'completed'
    ) {
      return false;
    }

    this.setData({
      filterVehicleId: payload.vehicleId,
      filterVehiclePlate: payload.vehiclePlate || '',
      activeTab: 'completed'
    });
    return true;
  },

  /**
   * 消费订单状态筛选参数（从全局变量传递）
   */
  consumeOrderStatusFilter() {
    const status = app.globalData.orderFilterStatus;
    if (!status) return false;

    // 清除全局变量
    app.globalData.orderFilterStatus = null;

    // 检查状态是否有效
    const tabs = this.data.tabs || [];
    const isValidTab = tabs.some(t => t.key === status);

    if (!isValidTab) {
      return false;
    }

    // 如果当前已经是该状态，不需要切换
    if (this.data.activeTab === status) {
      return false;
    }

    this.setData({ activeTab: status });
    return true;
  },

  /**
   * 格式化订单数据
   */
  formatOrders(orders) {
    if (!Array.isArray(orders)) return [];

    console.log('========== formatOrders 调试 ==========');
    console.log('原始订单数量:', orders.length);

    // 测试解码函数
    console.log('=== 测试解码函数 ===');
    console.log('"A &gt; B" → ', format.decodeHTMLEntities('A &gt; B'));
    console.log('"A &amp;gt; B" → ', format.decodeHTMLEntities('A &amp;gt; B'));

    return orders.map(order => {
      // 调试：打印每个订单的原始数据
      console.log('--- 单个订单 ---');
      const originalBrand = order.vehicleId?.brand;
      const originalModel = order.vehicleId?.model;
      console.log('品牌原始值:', originalBrand);
      console.log('型号原始值:', originalModel);

      // 测试解码
      if (originalBrand) {
        console.log('品牌解码后:', format.decodeHTMLEntities(originalBrand));
      }

      // 判断是否已确认
      const isConfirmed = order.completion && order.completion.confirmedBy;

      // 判断是否已评价
      const isReviewed = !!order.reviewed;

      // 判断是否可以评价（15天内且已确认且未评价）
      const completedAt = order.completion?.completedAt || order.completedAt;
      let canReview = false;
      if (completedAt) {
        const daysDiff = (Date.now() - new Date(completedAt).getTime()) / (1000 * 60 * 60 * 24);
        canReview = daysDiff <= 15 && isConfirmed && !isReviewed;
      }

      const statusMap = {
        'awaiting_fleet_approval': { text: '待车队审批', type: 'warning' },
        'awaiting_time_confirmation': { text: '待确认到店时间', type: 'warning' },
        'pending_assessment': { text: '待接车检查', type: 'warning' },
        'awaiting_approval': { text: '待审批报价', type: 'info' },
        'in_repair': { text: '维修中', type: 'primary' },
        'awaiting_addon_approval': { text: '待审批增项', type: 'warning' },
        'pending_confirmation': { text: '待确认完工', type: 'warning' },
        'completed': { text: '已完成', type: 'success' },
        'confirmed': { text: '已完成', type: 'success' },
        'rejected': { text: '已拒绝', type: 'error' }
      };

      const statusInfo = statusMap[order.status] || { text: '未知', type: 'default' };

      // 格式化预约时间
      let formattedAppointment = null;
      if (order.appointment) {
        const dateText = this.formatFriendlyDate(order.appointment.expectedDate);
        const slotText = this.formatTimeSlot(order.appointment.expectedTimeSlot);
        formattedAppointment = {
          ...order.appointment,
          // 保留原始值用于API调用
          expectedDateOriginal: order.appointment.expectedDate,
          expectedTimeSlotOriginal: order.appointment.expectedTimeSlot,
          // 格式化后的值用于显示
          expectedDate: dateText,
          expectedTimeSlot: slotText,
          displayText: `${dateText} ${slotText}`
        };
      }

      const vehicleInfo = {
        plateNumber: format.decodeHTMLEntities(order.vehicleId?.plateNumber) || '未知车牌',
        brand: format.decodeHTMLEntities(order.vehicleId?.brand) || '',
        model: format.decodeHTMLEntities(order.vehicleId?.model) || ''
      };

      // 调试：打印格式化后的车辆信息
      console.log('=== 格式化后 vehicleInfo ===', vehicleInfo);

      return {
        ...order,
        statusText: statusInfo.text,
        statusType: statusInfo.type,
        isConfirmed,
        isReviewed,
        canReview,
        vehicleInfo,
        createdAtText: this.formatTime(order.createdAt),
        createdAt: this.formatDate(order.createdAt),
        appointment: formattedAppointment,
        showConfirmTime: false // 确认时间模块默认收起
      };
    });
  },

  /**
   * 格式化时间（相对时间）
   */
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

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
      return this.formatDate(timestamp);
    }
  },

  /**
   * 格式化日期（绝对时间）
   */
  formatDate(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  /**
   * 获取状态类型（用于样式）
   */
  getStatusType(status) {
    const typeMap = {
      'awaiting_fleet_approval': 'warning',
      'pending_assessment': 'warning',
      'awaiting_approval': 'info',
      'in_repair': 'primary',
      'awaiting_addon_approval': 'warning',
      'pending_confirmation': 'warning',
      'completed': 'success',
      'confirmed': 'success',
      'rejected': 'error'
    };
    return typeMap[status] || '';
  },

  /**
   * 点击订单
   */
  onOrderTap(e) {
    const id = e.currentTarget.dataset.id;
    const { role } = this.data;

    // 根据角色跳转到不同的详情页
    if (role === 'STORE_TECHNICIAN') {
      wx.navigateTo({
        url: `/pages/store/order-detail/order-detail?id=${id}`
      });
    } else {
      wx.navigateTo({
        url: `/pages/order-detail/order-detail?id=${id}`
      });
    }
  },

  /**
   * 点击去审批按钮（车队管理员、平台运营）
   */
  onApproveOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}&action=approve`
    });
  },

  /**
   * 点击去确认按钮（司机）
   */
  onConfirmOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}&action=confirm`
    });
  },

  /**
   * 点击去评价按钮（司机）
   */
  onReviewOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/driver/review/review?id=${id}`
    });
  },

  /**
   * 技师：确认到店时间
   */
  async onConfirmAppointmentTime(e) {
    const id = e.currentTarget.dataset.id;

    // 获取订单详情
    const order = this.data.orders.find(o => o._id === id);
    if (!order) {
      wx.showToast({
        title: '订单不存在',
        icon: 'none'
      });
      return;
    }

    // 检查预约信息
    if (!order.appointment || !order.appointment.expectedDate) {
      wx.showToast({
        title: '预约信息不完整',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认到店时间',
      content: `司机期望时间：${order.appointment.displayText}\n\n确认后将进入接车检查流程`,
      confirmText: '确认',
      confirmColor: '#10B981',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '确认中...' });

            // 调用后端API确认时间（使用原始值）
            // 注意：系统会自动检测时间是否被调整，如果调整了会自动通知司机
            await request.put(`/orders/${id}/confirm-time`, {
              confirmedDate: order.appointment.expectedDateOriginal,
              confirmedTimeSlot: order.appointment.expectedTimeSlotOriginal || '08:00-10:00'
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

  /**
   * 技师：去接车检查（填写报价）
   */
  onQuoteOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/store/quote/quote?id=${id}`
    });
  },

  /**
   * 技师：提交完工
   */
  onCompleteOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/store/complete/complete?id=${id}`
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.refreshOrders();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  /**
   * 切换确认时间模块的展开/收起
   */
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

  /**
   * 打开时间调整弹窗
   */
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

  /**
   * 关闭时间调整弹窗
   */
  onCloseTimeAdjuster() {
    this.setData({
      showTimeAdjuster: false,
      currentOrderId: null,
      selectedTimeSlot: null,
      selectedTimeDisplayText: ''
    });
  },

  /**
   * 选择时间段
   */
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

  /**
   * 确认调整时间
   */
  async onConfirmAdjustTime() {
    if (!this.data.selectedTimeSlot) {
      wx.showToast({
        title: '请选择时间',
        icon: 'none'
      });
      return;
    }

    const selectedSlot = this.data.availableTimeSlots.find(
      slot => slot.time === this.data.selectedTimeSlot
    );

    try {
      wx.showLoading({ title: '确认中...' });

      // 注意：系统会自动检测时间是否被调整，如果调整了会自动通知司机
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
          title: '已调整时间',
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
        title: error.message || '调整失败',
        icon: 'none'
      });
    }
  },

  /**
   * 生成可用时间段
   */
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

    // 辅助函数：格式化日期
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // 今天的时间段
    const today = now;
    const todayStr = formatDate(today);

    // 明天的时间段
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow);

    // 生成今天的时间段（只保留未过时的）
    timeOptions.forEach(option => {
      const hourParts = option.timeSlot.split('-').map(t => parseInt(t.split(':')[0]));
      const startHour = hourParts[0];
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
  },

  /**
   * 格式化友好日期（今天、明天、或具体日期）
   */
  formatFriendlyDate(timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 重置时间为0点，只比较日期
    const resetTime = (d) => {
      const newDate = new Date(d);
      newDate.setHours(0, 0, 0, 0);
      return newDate;
    };

    const dateOnly = resetTime(date);
    const todayOnly = resetTime(today);
    const tomorrowOnly = resetTime(tomorrow);

    // 判断是否是今天
    if (dateOnly.getTime() === todayOnly.getTime()) {
      return '今天';
    }

    // 判断是否是明天
    if (dateOnly.getTime() === tomorrowOnly.getTime()) {
      return '明天';
    }

    // 其他日期：显示月日
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  /**
   * 格式化时间段（带时段描述）
   */
  formatTimeSlot(timeSlot) {
    if (!timeSlot) return '';

    const timeSlotMap = {
      '08:00-10:00': '上午 08:00-10:00',
      '10:00-12:00': '上午 10:00-12:00',
      '14:00-16:00': '下午 14:00-16:00',
      '16:00-18:00': '下午 16:00-18:00',
      '18:00-20:00': '晚上 18:00-20:00'
    };

    return timeSlotMap[timeSlot] || timeSlot;
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    const searchQuery = e.detail.value;
    this.setData({ searchQuery });
    this.performSearch(searchQuery);
  },

  /**
   * 执行搜索（按回车）
   */
  onSearch() {
    this.performSearch(this.data.searchQuery);
  },

  /**
   * 清除搜索
   */
  onClearSearch() {
    this.setData({
      searchQuery: '',
      orders: this.data.allOrders
    });
  },

  /**
   * 执行搜索逻辑
   */
  performSearch(query) {
    const trimmedQuery = (query || this.data.searchQuery || '').trim().toLowerCase();

    if (!trimmedQuery) {
      // 搜索框为空，显示所有订单
      this.setData({
        orders: this.data.allOrders
      });
      return;
    }

    // 过滤订单（支持车牌号、订单号搜索）
    const filteredOrders = this.data.allOrders.filter(order => {
      const plateNumber = (order.vehicleInfo?.plateNumber || '').toLowerCase();
      const orderNumber = (order.orderNumber || '').toLowerCase();

      return plateNumber.includes(trimmedQuery) || orderNumber.includes(trimmedQuery);
    });

    this.setData({
      orders: filteredOrders
    });

    // 提示用户搜索结果
    if (filteredOrders.length === 0) {
      wx.showToast({
        title: '未找到匹配的订单',
        icon: 'none',
        duration: 1500
      });
    }
  }
});
