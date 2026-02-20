// pages/driver/review/review.js - 门店评价页面
const request = require('../../../utils/request');

Page({
  data: {
    orderId: '',
    order: null,
    store: null,
    loading: true,

    // 评分数据
    ratings: {
      technicalSkill: 5,    // 技术专业度
      serviceEfficiency: 5,  // 服务效率
      pricingTransparency: 5 // 收费透明度
    },

    // 评分文字描述
    ratingTexts: {
      1: '非常不满意',
      1.5: '不满意',
      2: '不满意',
      2.5: '一般',
      3: '一般',
      3.5: '满意',
      4: '满意',
      4.5: '非常满意',
      5: '非常满意'
    },

    // 评价内容
    comment: '',
    selectedTags: [], // 选中的标签
    anonymous: false // 是否匿名
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
      orderId: options.id
    });

    this.loadData();
  },

  /**
   * 加载数据
   */
  async loadData() {
    this.setData({ loading: true });

    try {
      // 获取订单详情
      const orderRes = await request.get(`/orders/${this.data.orderId}`);
      const order = orderRes.data;

      // 验证订单状态
      if (order.status !== 'completed') {
        wx.showModal({
          title: '提示',
          content: '只能评价已完成的订单',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
        return;
      }

      // 检查是否已评价过
      // TODO: 调用评价检查API

      // 使用订单中的门店信息（司机角色没有权限访问门店详情API）
      if (order.storeId) {
        this.setData({
          store: order.storeId  // 直接使用订单中的门店信息
        });
      }

      this.setData({
        order,
        loading: false
      });

    } catch (error) {
      console.error('加载数据失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 点击星星评分
   */
  onRateStar(e) {
    const { field, value } = e.currentTarget.dataset;

    // 计算评分：如果点击当前分数，则减0.5（支持半星），否则设置为点击的分数
    const currentRating = this.data.ratings[field];
    let newRating;

    if (Math.abs(currentRating - value) < 0.1) {
      // 点击当前分数，减半星
      newRating = Math.max(1, value - 0.5);
    } else if (currentRating === value - 0.5) {
      // 当前是半星，设置为整星
      newRating = value;
    } else {
      // 点击其他分数，直接设置
      newRating = value;
    }

    this.setData({
      [`ratings.${field}`]: newRating
    });
  },

  /**
   * 评价内容输入
   */
  onCommentInput(e) {
    this.setData({
      comment: e.detail.value
    });
  },

  /**
   * 切换标签选择
   */
  onToggleTag(e) {
    const tag = e.currentTarget.dataset.tag;
    const { selectedTags } = this.data;

    if (selectedTags.includes(tag)) {
      // 取消选择
      this.setData({
        selectedTags: selectedTags.filter(t => t !== tag)
      });
    } else {
      // 添加选择（最多选5个）
      if (selectedTags.length < 5) {
        this.setData({
          selectedTags: [...selectedTags, tag]
        });
      } else {
        wx.showToast({
          title: '最多选择5个标签',
          icon: 'none'
        });
      }
    }
  },

  /**
   * 切换匿名选项
   */
  toggleAnonymous() {
    this.setData({
      anonymous: !this.data.anonymous
    });
  },

  /**
   * 提交评价
   */
  async onSubmit() {
    const { orderId, ratings, comment, selectedTags, anonymous } = this.data;

    // 验证评分
    if (!ratings.technicalSkill || !ratings.serviceEfficiency || !ratings.pricingTransparency) {
      wx.showToast({
        title: '请完成所有评分',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '提交中...' });

      await request.post('/store-reviews', {
        orderId,
        ratings,
        comment: comment.trim(),
        tags: selectedTags, // 添加标签
        anonymous
      });

      wx.hideLoading();

      wx.showToast({
        title: '评价成功',
        icon: 'success'
      });

      // 延迟返回
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    }
  },

  /**
   * 跳过评价
   */
  onSkip() {
    wx.showModal({
      title: '确认跳过',
      content: '跳过后将无法评价此订单，确认跳过吗？',
      confirmText: '确认跳过',
      cancelText: '继续评价',
      confirmColor: '#666',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack();
        }
      }
    });
  }
});
