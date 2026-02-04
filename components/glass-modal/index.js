// components/glass-modal/index.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示
    visible: {
      type: Boolean,
      value: false
    },
    // 标题
    title: {
      type: String,
      value: ''
    },
    // 弹窗尺寸
    size: {
      type: String,
      value: 'md' // sm, md, lg, full
    },
    // 是否显示关闭按钮
    showClose: {
      type: Boolean,
      value: true
    },
    // 是否显示底部操作栏
    showFooter: {
      type: Boolean,
      value: false
    },
    // 是否显示取消按钮
    showCancel: {
      type: Boolean,
      value: true
    },
    // 确认按钮文字
    confirmText: {
      type: String,
      value: '确定'
    },
    // 取消按钮文字
    cancelText: {
      type: String,
      value: '取消'
    },
    // 点击遮罩是否关闭
    closeOnClickMask: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    maskAnimation: null,
    modalAnimation: null
  },

  observers: {
    'visible': function(visible) {
      if (visible) {
        this.enter();
      } else {
        this.leave();
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 进入动画
    enter() {
      // 微信小程序动画
      const maskAnimation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease-out'
      });
      maskAnimation.opacity(1).step();

      const modalAnimation = wx.createAnimation({
        duration: 300,
        timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
      });
      modalAnimation.scale(1).opacity(1).step();

      this.setData({
        maskAnimation: maskAnimation.export(),
        modalAnimation: modalAnimation.export()
      });
    },

    // 离开动画
    leave() {
      const maskAnimation = wx.createAnimation({
        duration: 200,
        timingFunction: 'ease-in'
      });
      maskAnimation.opacity(0).step();

      const modalAnimation = wx.createAnimation({
        duration: 200,
        timingFunction: 'ease-in'
      });
      modalAnimation.scale(0.9).opacity(0).step();

      this.setData({
        maskAnimation: maskAnimation.export(),
        modalAnimation: modalAnimation.export()
      });
    },

    // 点击遮罩
    onMaskTap() {
      if (this.properties.closeOnClickMask) {
        this.onClose();
      }
    },

    // 阻止冒泡
    stopPropagation() {
      // 阻止事件冒泡
    },

    // 关闭弹窗
    onClose() {
      this.triggerEvent('close');
    },

    // 确认
    onConfirm() {
      this.triggerEvent('confirm');
    },

    // 取消
    onCancel() {
      this.triggerEvent('cancel');
      this.onClose();
    }
  }
});
