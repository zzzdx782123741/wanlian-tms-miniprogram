// pages/order-detail/order-detail.js - 订单详情页面
const app = getApp();
const request = require('../../utils/request');
const format = require('../../utils/format');

// 导入图片URL格式化函数
const { formatImageUrl } = request;

Page({
  data: {
    orderId: '',
    order: null,
    loading: true,
    userRole: '',
    action: '', // 操作类型：confirm-确认完工
    // 门店选择相关
    showStorePicker: false,
    showStoreDetail: false,
    storeList: [],
    selectedStoreId: '',
    selectedStoreName: '',
    storeDetail: null,
    storeDetailReviews: []
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
      userRole: app.globalData.role,
      action: options.action || '' // 记录操作类型
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

      // 如果是从"去确认"按钮进入的，自动弹出确认对话框
      if (this.data.action === 'confirm') {
        // 延迟一下让用户看到页面
        setTimeout(() => {
          this.onConfirmOrder();
          // 清除 action，避免返回时再次触发
          this.setData({ action: '' });
        }, 500);
      }

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
    // 处理图片URL - 将相对路径转换为完整URL
    const processImages = (images) => {
      if (!images || !Array.isArray(images)) return [];
      return images.map(img => formatImageUrl(img));
    };

    // 格式化日期为 YYYY-MM-DD
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // 处理appointment字段 - 将Date对象转为字符串
    const processAppointment = (appointment) => {
      if (!appointment) return null;
      return {
        ...appointment,
        expectedDate: formatDate(appointment.expectedDate),
        confirmedDate: formatDate(appointment.confirmedDate)
      };
    };

    // 处理订单中的所有图片URL和HTML实体解码
    const formattedOrder = {
      ...order,
      // 解码HTML实体编码
      orderNumber: format.decodeHTMLEntities(order.orderNumber) || '',
      faultDescription: format.decodeHTMLEntities(order.faultDescription) || '',
      rejectReason: format.decodeHTMLEntities(order.rejectReason) || '',
      // 处理车辆信息
      vehicleId: order.vehicleId ? {
        ...order.vehicleId,
        plateNumber: format.decodeHTMLEntities(order.vehicleId.plateNumber) || '',
        brand: format.decodeHTMLEntities(order.vehicleId.brand) || '',
        model: format.decodeHTMLEntities(order.vehicleId.model) || ''
      } : null,
      // 处理司机信息
      reporterId: order.reporterId ? {
        ...order.reporterId,
        nickname: format.decodeHTMLEntities(order.reporterId.nickname) || '',
        name: format.decodeHTMLEntities(order.reporterId.name) || ''
      } : null,
      // 处理门店信息
      storeId: order.storeId ? {
        ...order.storeId,
        name: format.decodeHTMLEntities(order.storeId.name) || ''
      } : null,
      // 处理车队信息
      fleetId: order.fleetId ? {
        ...order.fleetId,
        name: format.decodeHTMLEntities(order.fleetId.name) || ''
      } : null,
      // 处理预约时间
      appointment: processAppointment(order.appointment),
      faultImages: processImages(order.faultImages),
      // 处理接车检查照片
      receiveCheck: order.receiveCheck ? {
        ...order.receiveCheck,
        diagnosis: format.decodeHTMLEntities(order.receiveCheck.diagnosis) || '',
        checkinPhotos: processImages(order.receiveCheck.checkinPhotos)
      } : null,
      // 处理报价图片和项目
      quote: order.quote ? {
        ...order.quote,
        items: order.quote.items?.map(item => ({
          ...item,
          item: format.decodeHTMLEntities(item.item) || ''
        })) || [],
        images: processImages(order.quote.images)
      } : null,
      // 处理完工图片
      completion: order.completion ? {
        ...order.completion,
        description: format.decodeHTMLEntities(order.completion.description) || '',
        images: processImages(order.completion.images),
        videos: processImages(order.completion.videos)
      } : null,
      // 处理日志图片
      logs: order.logs ? order.logs.map(log => ({
        ...log,
        content: format.decodeHTMLEntities(log.content) || '',
        details: format.decodeHTMLEntities(log.details) || '',
        images: processImages(log.images),
        videos: processImages(log.videos)
      })) : []
    };

    // 判断是否已确认 - 添加更详细的日志
    const hasCompletion = !!formattedOrder.completion;
    const hasConfirmedBy = hasCompletion && !!formattedOrder.completion.confirmedBy;
    const isConfirmed = hasConfirmedBy;

    // 调试日志
    console.log('========== 订单详情格式化 ==========');
    console.log('订单ID:', formattedOrder._id);
    console.log('订单状态:', formattedOrder.status);
    console.log('appointment 原始对象:', order.appointment);
    console.log('appointment 格式化后:', formattedOrder.appointment);
    console.log('completion 对象:', formattedOrder.completion);
    console.log('hasCompletion:', hasCompletion);
    console.log('hasConfirmedBy:', hasConfirmedBy);
    console.log('isConfirmed:', isConfirmed);
    console.log('====================================');

    // 获取订单类型（repair或maintenance）
    const orderType = order.type || 'repair';
    const isMaintenance = orderType === 'maintenance';

    const statusMap = {
      'awaiting_fleet_approval': {
        text: '待车队审批',
        hint: `等待车队管理员审批${isMaintenance ? '保养' : '维修'}订单`,
        icon: '⏳',
        timeline: [
          { title: '订单已提交', completed: true },
          { title: '等待车队审批', completed: false }
        ]
      },
      'awaiting_time_confirmation': {
        text: '待门店确认时间',
        hint: '门店将确认您的到店时间',
        icon: '⏰',
        timeline: [
          { title: '订单已提交', completed: true },
          { title: '车队已审批', completed: true },
          { title: '等待门店确认时间', completed: false }
        ]
      },
      'pending_assessment': {
        // 维修订单专属状态
        text: '待接车检查',
        hint: '门店正在进行接车检查和评估',
        icon: '🔍',
        timeline: [
          { title: '订单已提交', completed: true },
          { title: '车队已审批', completed: true },
          { title: '时间已确认', completed: true },
          { title: '等待接车检查', completed: false }
        ]
      },
      'awaiting_approval': {
        // 维修订单专属状态
        text: '待审批',
        hint: '等待车队管理员审批报价',
        icon: '💰',
        timeline: [
          { title: '订单已提交', completed: true },
          { title: '接车检查完成', completed: true },
          { title: '已提交报价', completed: true }
        ]
      },
      'in_repair': {
        // 根据订单类型显示不同文本
        text: isMaintenance ? '服务进行中' : '维修中',
        hint: isMaintenance ? '门店正在进行保养服务' : '门店正在维修车辆',
        icon: isMaintenance ? '🛠️' : '🔧',
        timeline: isMaintenance ? [
          // 保养订单时间线
          { title: '订单已提交', completed: true },
          { title: '车队已审批', completed: true },
          { title: '时间已确认', completed: true },
          { title: '正在进行保养', completed: true }
        ] : [
          // 维修订单时间线
          { title: '订单已提交', completed: true },
          { title: '接车检查完成', completed: true },
          { title: '报价已批准', completed: true },
          { title: '正在维修', completed: true }
        ]
      },
      'awaiting_addon_approval': {
        text: '增项待审批',
        hint: isMaintenance ? '保养增项等待车队管理员审批' : '维修增项等待车队管理员审批',
        icon: '📋',
        timeline: isMaintenance ? [
          // 保养订单增项时间线
          { title: '订单已提交', completed: true },
          { title: '车队已审批', completed: true },
          { title: '时间已确认', completed: true },
          { title: '保养进行中', completed: true },
          { title: '增项待审批', completed: true }
        ] : [
          // 维修订单增项时间线
          { title: '订单已提交', completed: true },
          { title: '接车检查完成', completed: true },
          { title: '报价已批准', completed: true },
          { title: '维修中', completed: true },
          { title: '增项待审批', completed: true }
        ]
      },
      'pending_confirmation': {
        text: '待确认',
        hint: `等待司机确认${isMaintenance ? '保养' : '维修'}完工`,
        icon: '✅',
        timeline: isMaintenance ? [
          // 保养订单时间线
          { title: '订单已提交', completed: true },
          { title: '车队已审批', completed: true },
          { title: '时间已确认', completed: true },
          { title: '保养完成', completed: true },
          { title: '等待确认', completed: true }
        ] : [
          // 维修订单时间线
          { title: '订单已提交', completed: true },
          { title: '接车检查完成', completed: true },
          { title: '报价已批准', completed: true },
          { title: '维修完成', completed: true },
          { title: '等待确认', completed: true }
        ]
      },
      'completed': {
        text: '已完成',
        hint: `${isMaintenance ? '保养' : '维修'}已完成，车辆状态已恢复正常`,
        icon: '✅',
        timeline: isMaintenance ? [
          // 保养订单时间线
          { title: '订单已提交', completed: true },
          { title: '车队已审批', completed: true },
          { title: '时间已确认', completed: true },
          { title: '保养完成', completed: true },
          { title: '已确认', completed: true }
        ] : [
          // 维修订单时间线
          { title: '订单已提交', completed: true },
          { title: '接车检查完成', completed: true },
          { title: '报价已批准', completed: true },
          { title: '维修完成', completed: true },
          { title: '已确认', completed: true }
        ]
      },
      'refunded': {
        text: '已退款',
        hint: '订单已退款',
        icon: '💸',
        timeline: [
          { title: '订单已提交', completed: true },
          { title: '已退款', completed: true }
        ]
      },
      'rejected': {
        text: '已拒绝',
        hint: order.rejectReason ? `拒绝原因：${order.rejectReason}` : '订单已被拒绝',
        icon: '❌',
        timeline: [
          { title: '订单已提交', completed: true },
          { title: '订单已拒绝', completed: true }
        ],
        canResubmit: true // 可以重新提交
      }
    };

    const statusInfo = statusMap[order.status] || { text: '未知状态', hint: '', icon: '❓', timeline: [] };

    // 判断是否已评价
    const isReviewed = !!order.reviewed;

    // 判断是否可以追评（15天内，从完工时间开始计算）
    const completedAt = order.completion?.completedAt || order.completedAt;
    let canReview = false;
    if (completedAt && !isReviewed) {
      const daysDiff = (Date.now() - new Date(completedAt).getTime()) / (1000 * 60 * 60 * 24);
      canReview = daysDiff <= 15;
    }

    return {
      ...formattedOrder,
      statusText: statusInfo.text,
      statusHint: statusInfo.hint,
      statusIcon: statusInfo.icon,
      timeline: statusInfo.timeline,
      isReviewed,
      canReview,
      createdAtText: this.formatTime(formattedOrder.createdAt),
      logs: formattedOrder.logs.map(log => ({
        ...log,
        createdAtText: this.formatTime(log.createdAt)
      })),
      // 格式化确认时间
      completion: formattedOrder.completion ? {
        ...formattedOrder.completion,
        confirmedAtText: formattedOrder.completion.confirmedAt ? this.formatTime(formattedOrder.completion.confirmedAt) : ''
      } : null,
      // 保养订单字段
      maintenanceOrder: formattedOrder.maintenanceOrder ? {
        ...formattedOrder.maintenanceOrder,
        maintenanceTypeName: formattedOrder.maintenanceOrder.maintenanceTypeName || '',
        packageName: formattedOrder.maintenanceOrder.packageName || '',
        selectedTier: formattedOrder.maintenanceOrder.selectedTier || '',
        finalAmount: formattedOrder.maintenanceOrder.finalAmount || 0,
        fleetRemark: formattedOrder.maintenanceOrder.fleetRemark || '',
        serviceLocation: formattedOrder.maintenanceOrder.serviceLocation || { address: '' },
        preferredTime: formattedOrder.maintenanceOrder.preferredTime || '',
        driverRemark: formattedOrder.maintenanceOrder.driverRemark || '',
        confirmedStoreName: formattedOrder.maintenanceOrder.confirmedStoreName || ''
      } : null
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
   * 提交报价（包含接车检查）
   */
  onSubmitQuote() {
    wx.navigateTo({
      url: `/pages/store/quote/quote?id=${this.data.orderId}`
    });
  },

  /**
   * 车队审批订单
   */
  async onFleetApproveOrder(e) {
    const approved = e.currentTarget.dataset.approved;
    const order = this.data.order;

    if (approved) {
      // 审批通过
      // 检查是否需要选择门店
      if (!order.storeId) {
        // 没有门店，需要先选择门店
        try {
          wx.showLoading({ title: '加载门店列表...' });

          // 获取门店列表
          const res = await request.get('/stores', {
            status: 'normal'
          });

          wx.hideLoading();

          const stores = res.data.stores || [];
          if (stores.length === 0) {
            wx.showToast({
              title: '暂无可用门店',
              icon: 'none'
            });
            return;
          }

          // 显示门店选择列表
          const itemList = stores.map(store =>
            `${store.name} - ${store.address?.city || ''}${store.address?.district || ''}`
          );

          wx.showActionSheet({
            itemList: itemList,
            success: async (res) => {
              const selectedStore = stores[res.tapIndex];
              const storeId = selectedStore._id;

              // 确认审批
              wx.showModal({
                title: '确认审批',
                content: `确认审批通过此订单？\n门店：${selectedStore.name}`,
                confirmColor: '#10B981',
                success: async (res) => {
                  if (res.confirm) {
                    try {
                      wx.showLoading({ title: '处理中...' });

                      await request.post(`/orders/${this.data.orderId}/fleet-approve`, {
                        storeId: storeId,
                        remark: ''
                      });

                      wx.hideLoading();
                      wx.showToast({
                        title: '审批成功',
                        icon: 'success'
                      });

                      this.loadOrderDetail();

                    } catch (error) {
                      wx.hideLoading();
                      wx.showToast({
                        title: error.message || '审批失败',
                        icon: 'none'
                      });
                    }
                  }
                }
              });
            }
          });

        } catch (error) {
          wx.hideLoading();
          wx.showToast({
            title: error.message || '获取门店列表失败',
            icon: 'none'
          });
        }
      } else {
        // 有门店，确认审批
        wx.showModal({
          title: '确认审批',
          content: `确认审批通过此订单？\n门店：${order.storeId.name || '未知'}`,
          confirmColor: '#10B981',
          success: async (res) => {
            if (res.confirm) {
              try {
                wx.showLoading({ title: '处理中...' });

                await request.post(`/orders/${this.data.orderId}/fleet-approve`, {
                  storeId: order.storeId._id,
                  remark: ''
                });

                wx.hideLoading();
                wx.showToast({
                  title: '审批成功',
                  icon: 'success'
                });

                this.loadOrderDetail();

              } catch (error) {
                wx.hideLoading();
                wx.showToast({
                  title: error.message || '审批失败',
                  icon: 'none'
                });
              }
            }
          }
        });
      }
    } else {
      // 审批拒绝
      // 拒绝时无需选择门店，直接提示输入拒绝原因
      wx.showModal({
        title: '拒绝订单',
        content: '请输入拒绝原因',
        editable: true,
        placeholderText: '请输入拒绝原因',
        confirmColor: '#EF4444',
        success: async (res) => {
          if (res.confirm) {
            const reason = res.content;

            if (!reason || reason.trim() === '') {
              wx.showToast({
                title: '请输入拒绝原因',
                icon: 'none'
              });
              return;
            }

            try {
              wx.showLoading({ title: '处理中...' });

              await request.post(`/orders/${this.data.orderId}/fleet-reject`, {
                reason: reason
              });

              wx.hideLoading();
              wx.showToast({
                title: '已拒绝订单',
                icon: 'success'
              });

              this.loadOrderDetail();

            } catch (error) {
              wx.hideLoading();
              wx.showToast({
                title: error.message || '拒绝失败',
                icon: 'none'
              });
            }
          }
        }
      });
    }
  },

  /**
   * 审批报价
   */
  async onApproveQuote(e) {
    const approved = e.currentTarget.dataset.approved;

    const title = approved ? '批准报价' : '拒绝报价';
    const content = approved
      ? '确认批准此报价？批准后将从账户扣款。'
      : '确认拒绝此报价？订单将返回待评估状态。';

    wx.showModal({
      title,
      content,
      confirmColor: approved ? '#10B981' : '#EF4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });

            await request.post(`/orders/${this.data.orderId}/approve-quote`, { approved });

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
      url: `/pages/store/complete/complete?id=${this.data.orderId}`
    });
  },

  /**
   * 确认完工
   */
  onConfirmOrder() {
    console.log('========== 确认完工方法被调用 ==========');
    console.log('订单ID:', this.data.orderId);
    console.log('当前页面栈长度:', getCurrentPages().length);

    // 先显示一个toast确认方法被调用
    wx.showToast({
      title: '正在打开确认对话框...',
      icon: 'loading',
      duration: 1000
    });

    // 延迟一点显示modal，避免被toast打断
    setTimeout(() => {
      console.log('准备显示 showModal');
      wx.showModal({
        title: '确认完工',
        content: '确认车辆已维修完成？确认后将跳转到评价页面。',
        confirmText: '确认',
        cancelText: '取消',
        confirmColor: '#10B981',
        success: (res) => {
          console.log('========== 用户选择 ==========');
          console.log('用户选择:', res);
          console.log('res.confirm:', res.confirm);
          console.log('res.cancel:', res.cancel);
          console.log('====================================');
          if (res.confirm) {
            this.doConfirm();
          }
        },
        fail: (err) => {
          console.error('========== showModal 失败 ==========');
          console.error(err);
          console.error('====================================');
          wx.showToast({
            title: '对话框显示失败',
            icon: 'none'
          });
        }
      });
    }, 500);
  },

  /**
   * 执行确认操作
   */
  async doConfirm() {
    try {
      wx.showLoading({ title: '确认中...' });

      console.log('========== 开始确认完工 ==========');
      console.log('订单ID:', this.data.orderId);

      const response = await request.post(`/orders/${this.data.orderId}/confirm`);

      console.log('确认完工响应:', response);
      console.log('================================');

      wx.hideLoading();
      wx.showToast({
        title: '确认成功',
        icon: 'success'
      });

      // 确认成功后跳转到评价页面
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/driver/review/review?id=${this.data.orderId}`
        });
      }, 1500);

    } catch (error) {
      console.error('确认完工失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.message || '确认失败',
        icon: 'none'
      });
    }
  },

  /**
   * 查看车辆详情
   */
  onVehicleDetail(e) {
    const vehicleId = e.currentTarget.dataset.vehicleId;
    wx.navigateTo({
      url: `/pages/driver/vehicles/detail?id=${vehicleId}`
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
  },

  /**
   * 重新提交订单（被拒绝后）
   */
  async onResubmitOrder() {
    const order = this.data.order;

    // 确认对话框
    wx.showModal({
      title: '重新提交订单',
      content: `订单被拒绝原因：${order.rejectReason || '未填写'}\n\n请根据拒绝原因修改订单信息后重新提交。`,
      confirmText: '去修改',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 直接调用重新提交API
          this.resubmitOrder();
        }
      }
    });
  },

  /**
   * 调用重新提交API
   */
  async resubmitOrder() {
    try {
      wx.showLoading({ title: '提交中...' });

      await request.put(`/orders/${this.data.orderId}/resubmit`);

      wx.hideLoading();
      wx.showToast({
        title: '订单已重新提交，等待车队审批',
        icon: 'success'
      });

      // 刷新订单详情
      this.loadOrderDetail();

    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '重新提交失败',
        icon: 'none'
      });
    }
  },

  /**
   * 查看拒绝原因详情
   */
  onViewRejectReason() {
    const order = this.data.order;
    wx.showModal({
      title: '拒绝原因',
      content: order.rejectReason || '未填写拒绝原因',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  /**
   * 跳转评价页面
   */
  onReviewOrder() {
    wx.navigateTo({
      url: `/pages/driver/review/review?id=${this.data.orderId}`
    });
  },

  /**
   * 打开门店选择弹窗
   */
  async onSelectStore() {
    try {
      wx.showLoading({ title: '加载门店列表...' });

      const res = await request.get('/stores', {
        status: 'normal',
        limit: 100
      });

      wx.hideLoading();

      const stores = res.data.stores || [];
      if (stores.length === 0) {
        wx.showToast({
          title: '暂无可用门店',
          icon: 'none'
        });
        return;
      }

      this.setData({
        storeList: stores,
        showStorePicker: true,
        selectedStoreId: this.data.selectedStoreId || this.data.order?.storeId?._id || '',
        selectedStoreName: this.data.selectedStoreName || this.data.order?.storeId?.name || ''
      });

    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '获取门店列表失败',
        icon: 'none'
      });
    }
  },

  /**
   * 关闭门店选择弹窗
   */
  onCloseStorePicker() {
    this.setData({
      showStorePicker: false
    });
  },

  /**
   * 选择某个门店
   */
  onSelectStoreItem(e) {
    const { storeId, storeName } = e.currentTarget.dataset;
    this.setData({
      selectedStoreId: storeId,
      selectedStoreName: storeName
    });
  },

  /**
   * 确认选择门店
   */
  onConfirmStoreSelect() {
    if (!this.data.selectedStoreId) {
      wx.showToast({
        title: '请选择门店',
        icon: 'none'
      });
      return;
    }

    this.setData({
      showStorePicker: false
    });

    // 选择成功提示
    wx.showToast({
      title: `已选择：${this.data.selectedStoreName}`,
      icon: 'success'
    });
  },

  /**
   * 使用选择的门店进行审批
   */
  async onFleetApproveWithStore() {
    const storeId = this.data.selectedStoreId || this.data.order?.storeId?._id;

    if (!storeId) {
      wx.showToast({
        title: '请先选择门店',
        icon: 'none'
      });
      return;
    }

    const storeName = this.data.selectedStoreName || this.data.order?.storeId?.name || '未知门店';

    wx.showModal({
      title: '确认审批',
      content: `确认审批通过此订单？\n门店：${storeName}`,
      confirmColor: '#10B981',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });

            await request.post(`/orders/${this.data.orderId}/fleet-approve`, {
              storeId: storeId,
              remark: ''
            });

            wx.hideLoading();
            wx.showToast({
              title: '审批成功',
              icon: 'success'
            });

            // 清除选择的门店
            this.setData({
              selectedStoreId: '',
              selectedStoreName: ''
            });

            this.loadOrderDetail();

          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '审批失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 车队拒绝订单
   */
  onFleetRejectOrder() {
    wx.showModal({
      title: '拒绝订单',
      content: '请输入拒绝原因',
      editable: true,
      placeholderText: '请输入拒绝原因',
      confirmColor: '#EF4444',
      success: async (res) => {
        if (res.confirm) {
          const reason = res.content;

          if (!reason || reason.trim() === '') {
            wx.showToast({
              title: '请输入拒绝原因',
              icon: 'none'
            });
            return;
          }

          try {
            wx.showLoading({ title: '处理中...' });

            await request.post(`/orders/${this.data.orderId}/fleet-reject`, {
              reason: reason
            });

            wx.hideLoading();
            wx.showToast({
              title: '已拒绝订单',
              icon: 'success'
            });

            this.loadOrderDetail();

          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '拒绝失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 查看门店详情
   */
  async onViewStoreDetail(e) {
    const store = e.currentTarget.dataset.store;

    // 获取门店评价
    try {
      const reviewsRes = await request.get(`/store-reviews/store/${store._id}`, {
        limit: 5
      });

      this.setData({
        storeDetail: store,
        storeDetailReviews: reviewsRes.data.reviews || [],
        showStoreDetail: true
      });

    } catch (error) {
      // 获取评价失败不影响显示门店详情
      this.setData({
        storeDetail: store,
        storeDetailReviews: [],
        showStoreDetail: true
      });
    }
  },

  /**
   * 关闭门店详情弹窗
   */
  onCloseStoreDetail() {
    this.setData({
      showStoreDetail: false
    });
  },

  /**
   * 联系提交人（司机）
   */
  onContactReporter() {
    const reporter = this.data.order?.reporterId;
    if (!reporter || !reporter.phone) {
      wx.showToast({
        title: '暂无联系电话',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '联系司机',
      content: `司机：${reporter.nickname}\n电话：${reporter.phone}`,
      confirmText: '拨打电话',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: reporter.phone
          });
        }
      }
    });
  }
});
