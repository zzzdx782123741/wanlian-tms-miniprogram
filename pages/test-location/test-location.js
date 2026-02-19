// pages/test-location/test-location.js - 位置功能测试页面
const QQMapWX = require('../../utils/qqmap-wx-jssdk.min.js');
const mapConfig = require('../../config/map.config');

Page({
  data: {
    location: {
      latitude: null,
      longitude: null,
      address: '正在获取位置...'
    },
    mapKey: mapConfig.tencentMap.key,
    mapEnabled: mapConfig.tencentMap.enabled,
    testResult: []
  },

  onLoad() {
    console.log('腾讯地图Key:', this.data.mapKey);
    console.log('地图功能启用状态:', this.data.mapEnabled);
    this.addTestResult('系统信息', `地图Key: ${this.data.mapKey.substring(0, 10)}...`);
    this.addTestResult('配置状态', this.data.mapEnabled ? '✅ 地图功能已启用' : '❌ 地图功能未启用');
  },

  /**
   * 测试获取位置
   */
  testGetLocation() {
    this.addTestResult('开始测试', '正在调用 wx.getLocation()...');

    const that = this;
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude, speed, accuracy } = res;
        that.addTestResult('✅ 位置获取成功', `
          纬度: ${latitude}
          经度: ${longitude}
          精度: ${accuracy}米
          速度: ${speed}m/s
        `);

        that.setData({
          'location.latitude': latitude,
          'location.longitude': longitude,
          'location.address': '获取成功，正在解析地址...'
        });

        // 测试逆地理编码
        that.testReverseGeocode(latitude, longitude);
      },
      fail: (err) => {
        console.error('获取位置失败:', err);
        that.addTestResult('❌ 位置获取失败', `错误码: ${err.errMsg}`);
        that.setData({
          'location.address': '位置获取失败'
        });
      }
    });
  },

  /**
   * 测试逆地理编码
   */
  testReverseGeocode(latitude, longitude) {
    this.addTestResult('逆地理编码', '正在将坐标转换为地址...');

    const qqmapsdk = new QQMapWX({
      key: mapConfig.tencentMap.key
    });

    const that = this;
    qqmapsdk.reverseGeocoder({
      location: { latitude, longitude },
      success: (res) => {
        console.log('逆地理编码成功:', res);
        const address = res.result.address;
        const formattedAddress = res.result.formatted_addresses ?
          res.result.formatted_addresses.recommend : address;

        that.addTestResult('✅ 逆地理编码成功', `
          详细地址: ${formattedAddress}
          省份: ${res.result.address_component.province}
          城市: ${res.result.address_component.city}
          区县: ${res.result.address_component.district}
        `);

        that.setData({
          'location.address': formattedAddress
        });
      },
      fail: (err) => {
        console.error('逆地理编码失败:', err);
        that.addTestResult('❌ 逆地理编码失败', `错误: ${err.message || err}`);
        that.setData({
          'location.address': `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        });
      }
    });
  },

  /**
   * 测试使用默认地址
   */
  testDefaultLocation() {
    const defaultLocation = mapConfig.defaultLocations.find(loc => loc.isDefault) ||
                         mapConfig.defaultLocations[0];

    if (defaultLocation) {
      this.addTestResult('✅ 默认地址', `
        名称: ${defaultLocation.name}
        地址: ${defaultLocation.address}
        坐标: ${defaultLocation.latitude}, ${defaultLocation.longitude}
      `);

      this.setData({
        'location.address': defaultLocation.address,
        'location.latitude': defaultLocation.latitude,
        'location.longitude': defaultLocation.longitude
      });
    }
  },

  /**
   * 测试地图选择位置
   */
  testChooseLocation() {
    this.addTestResult('地图选择', '正在打开地图选择器...');

    const that = this;
    wx.chooseLocation({
      success: (res) => {
        that.addTestResult('✅ 地图选择成功', `
          名称: ${res.name}
          地址: ${res.address}
          坐标: ${res.latitude}, ${res.longitude}
        `);

        that.setData({
          'location.address': res.address,
          'location.latitude': res.latitude,
          'location.longitude': res.longitude
        });
      },
      fail: (err) => {
        console.error('地图选择失败:', err);
        that.addTestResult('❌ 地图选择失败', `错误: ${err.errMsg}`);
      }
    });
  },

  /**
   * 添加测试结果
   */
  addTestResult(title, message) {
    const testResult = this.data.testResult || [];
    const timestamp = new Date().toLocaleTimeString();

    testResult.unshift({
      timestamp,
      title,
      message: typeof message === 'string' ? message.trim() : JSON.stringify(message)
    });

    this.setData({ testResult });
  },

  /**
   * 清空测试结果
   */
  clearResults() {
    this.setData({ testResult: [] });
  }
});
