/**
 * 微信小程序配置文件
 * 请根据实际情况填写相应的API Key
 */

module.exports = {
  /**
   * 腾讯地图配置
   * 申请地址: https://lbs.qq.com/console/key.html
   */
  tencentMap: {
    // 是否启用地图功能
    enabled: true,
    // 腾讯地图Key（必填）
    key: '2MVBZ-RGN6Q-T775M-2BUXC-6VRTQ-UWFDJ',
    // 地图坐标系：gcj02（国测局坐标）、bd09ll（百度坐标）
    coordType: 'gcj02'
  },

  /**
   * 默认服务地址（测试用）
   * 当无法获取位置时使用
   */
  defaultLocations: [
    {
      id: 1,
      name: '深圳总部',
      address: '广东省深圳市南山区科技园南区深圳湾科技生态园',
      latitude: 22.531721,
      longitude: 113.943526,
      isDefault: true
    },
    {
      id: 2,
      name: '南山仓库',
      address: '广东省深圳市南山区西丽街道留仙洞',
      latitude: 22.580231,
      longitude: 113.967271,
      isDefault: false
    },
    {
      id: 3,
      name: '宝安物流园',
      address: '广东省深圳市宝安区福永街道凤凰山物流园',
      latitude: 22.672548,
      longitude: 113.832457,
      isDefault: false
    },
    {
      id: 4,
      name: '龙岗配送中心',
      address: '广东省深圳市龙岗区坂田街道五和大道',
      latitude: 22.623987,
      longitude: 114.063745,
      isDefault: false
    }
  ],

  /**
   * 常用维修门店地址
   */
  defaultStores: [
    {
      id: 1,
      name: '万联维修中心-南山店',
      address: '广东省深圳市南山区工业一路100号',
      latitude: 22.537068,
      longitude: 113.924713
    },
    {
      id: 2,
      name: '万联维修中心-宝安店',
      address: '广东省深圳市宝安区新安街道宝民一路',
      latitude: 22.549834,
      longitude: 113.895267
    },
    {
      id: 3,
      name: '万联维修中心-龙岗店',
      address: '广东省深圳市龙岗区中心城清林路',
      latitude: 22.724823,
      longitude: 114.273432
    }
  ]
};
