// pages/order-detail/order-detail.js - 订单详情页面
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    orderId: '',
    order: null,
    loading: true,
    userRole: '',
    action: '' // 操作类型：confirm-确认完工
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
    // 判断是否已确认 - 添加更详细的日志
    const hasCompletion = !!order.completion;
    const hasConfirmedBy = hasCompletion && !!order.completion.confirmedBy;
    const isConfirmed = hasConfirmedBy;

    // 调试日志
    console.log('========== 订单详情格式化 ==========');
    console.log('订单ID:', order._id);
    console.log('订单状态:', order.status);
    console.log('completion 对象:', order.completion);
    console.log('hasCompletion:', hasCompletion);
    console.log('hasConfirmedBy:', hasConfirmedBy);
    console.log('isConfirmed:', isConfirmed);
    console.log('====================================');

    const statusMap = {
      'awaiting_fleet_approval': {
        text: '待车队审批',
        hint: '等待车队管理员审批订单',
        icon: '⏳',
        timeline: [
          { title: '订单已提交', completed: true },
          { title: '等待车队审批', completed: false }
        ]
      },
      'pending_assessment': {
        text: '待评估',
        hint: '门店正在进行接车检查和评估',
        icon: '🔍',
        timeline: [
          { title: '订单已提交', completed: true },
          { title: '车队已审批', completed: true },
          { title: '等待接车评估', completed: false }
        ]
      },
      'awaiting_approval': {
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
        text: '维修中',
        hint: '门店正在维修车辆',
        icon: '🔧',
        timeline: [
          { title: '订单已提交', completed: true },
          { title: '接车检查完成', completed: true },
          { title: '报价已批准', completed: true },
          { title: '正在维修', completed: true }
        ]
      },
      'awaiting_addon_approval': {
        text: '增项待审批',
        hint: '维修增项等待车队管理员审批',
        icon: '📋',
        timeline: [
          { title: '订单已提交', completed: true },
          { title: '接车检查完成', completed: true },
          { title: '报价已批准', completed: true },
          { title: '维修中', completed: true },
          { title: '增项待审批', completed: true }
        ]
      },
      'completed': {
        text: isConfirmed ? '已完成' : '待确认',
        hint: isConfirmed ? '订单已完成，车辆状态已恢复正常' : '等待司机确认完工',
        icon: '✅',
        timeline: isConfirmed ? [
          { title: '订单已提交', completed: true },
          { title: '接车检查完成', completed: true },
          { title: '报价已批准', completed: true },
          { title: '维修完成', completed: true },
          { title: '已确认', completed: true }
        ] : [
          { title: '订单已提交', completed: true },
          { title: '接车检查完成', completed: true },
          { title: '报价已批准', completed: true },
          { title: '维修完成', completed: true },
          { title: '等待确认', completed: true }
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
      })) : [],
      // 格式化确认时间
      completion: order.completion ? {
        ...order.completion,
        confirmedAtText: order.completion.confirmedAt ? this.formatTime(order.completion.confirmedAt) : ''
      } : null,
      // 保养订单字段
      maintenanceOrder: order.maintenanceOrder ? {
        ...order.maintenanceOrder,
        maintenanceTypeName: order.maintenanceOrder.maintenanceTypeName || '',
        packageName: order.maintenanceOrder.packageName || '',
        selectedTier: order.maintenanceOrder.selectedTier || '',
        finalAmount: order.maintenanceOrder.finalAmount || 0,
        fleetRemark: order.maintenanceOrder.fleetRemark || '',
        serviceLocation: order.maintenanceOrder.serviceLocation || { address: '' },
        preferredTime: order.maintenanceOrder.preferredTime || '',
        driverRemark: order.maintenanceOrder.driverRemark || '',
        confirmedStoreName: order.maintenanceOrder.confirmedStoreName || ''
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
  async onConfirmOrder() {
    wx.showModal({
      title: '确认完工',
      content: '确认车辆已维修完成？确认后将返回订单列表。',
      confirmColor: '#10B981',
      success: async (res) => {
        if (res.confirm) {
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

            // 确认成功后返回订单列表
            setTimeout(() => {
              wx.navigateBack({
                delta: 1,
                fail: () => {
                  // 如果返回失败（比如没有上一页），跳转到订单列表
                  wx.switchTab({
                    url: '/pages/orders/orders'
                  });
                }
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
  }
});
