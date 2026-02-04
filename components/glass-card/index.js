// components/glass-card/index.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
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
    // 卡片尺寸
    size: {
      type: String,
      value: 'md' // sm, md, lg
    },
    // 是否可点击
    clickable: {
      type: Boolean,
      value: false
    },
    // 是否无内边距
    noPadding: {
      type: Boolean,
      value: false
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
      if (this.properties.clickable) {
        this.triggerEvent('tap', e.detail);
      }
    }
  }
});
