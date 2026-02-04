// components/glass-button/index.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 按钮类型
    type: {
      type: String,
      value: 'primary' // primary, secondary, cta, text
    },
    // 按钮尺寸
    size: {
      type: String,
      value: 'md' // sm, md, lg
    },
    // 自定义类名
    className: {
      type: String,
      value: ''
    },
    // 自定义样式
    customStyle: {
      type: String,
      value: ''
    },
    // 图标
    icon: {
      type: String,
      value: ''
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 是否加载中
    isLoading: {
      type: Boolean,
      value: false
    },
    // 加载文字
    loadingText: {
      type: String,
      value: '加载中...'
    },
    // open-type
    openType: {
      type: String,
      value: ''
    },
    // app-parameter
    appParameter: {
      type: String,
      value: ''
    },
    // session-from
    sessionFrom: {
      type: String,
      value: ''
    },
    // send-message-title
    sendMessageTitle: {
      type: String,
      value: ''
    },
    // send-message-path
    sendMessagePath: {
      type: String,
      value: ''
    },
    // send-message-img
    sendMessageImg: {
      type: String,
      value: ''
    },
    // show-message-card
    showMessageCard: {
      type: Boolean,
      value: false
    },
    // lang
    lang: {
      type: String,
      value: 'en'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {},

  /**
   * 组件的方法列表
   */
  methods: {
    onTap(e) {
      if (!this.properties.disabled && !this.properties.isLoading) {
        this.triggerEvent('tap', e.detail);
      }
    },
    onGetUserInfo(e) {
      this.triggerEvent('getuserinfo', e.detail);
    },
    onContact(e) {
      this.triggerEvent('contact', e.detail);
    },
    onGetPhoneNumber(e) {
      this.triggerEvent('getphonenumber', e.detail);
    },
    onError(e) {
      this.triggerEvent('error', e.detail);
    }
  }
});
