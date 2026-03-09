// pages/report/report.js - 报修申请页面
const app = getApp();
const request = require('../../utils/request');
const mapConfig = require('../../config/map.config');
const { localizePackage } = require('../../utils/maintenance-localizer');

// 引入腾讯地图SDK（如果SDK文件存在）
let qqmapsdk = null;
try {
  const QQMapWX = require('../../utils/qqmap-wx-jssdk.min.js');
  qqmapsdk = new QQMapWX({
    key: mapConfig.tencentMap.key
  });
} catch (e) {
  console.warn('腾讯地图SDK未加载，将使用默认地址');
}

Page({
  data: {
    vehicles: [],
    selectedVehicleIndex: -1,
    stores: [],
    selectedStoreIndex: -1,
    nearbyStores: [], // 推荐的附近门店
    faultDescription: '',
    faultImages: [],
    faultVideos: [],
    appointmentDate: '',
    appointmentTime: '',
    mileage: '',
    mileagePhotos: [], // 里程照片
    remark: '',
    submitting: false,
    type: 'repair', // repair 或 maintenance

    // 我的位置
    serviceLocation: {
      address: '',
      latitude: null,
      longitude: null
    },

    // 车队配置
    allowDriverSelectStore: undefined, // 是否允许司机选择门店（从车队配置加载，不设置默认值）

    // 故障标签
    faultTags: [
      '发动机异响',
      '滤芯更换',
      '轮胎磨损',
      '机油更换',
      '常规保养',
      '刹车问题',
      '空调故障',
      '转向异响',
      '变速箱',
      '电路问题'
    ],
    selectedTags: [],

    // ===== 保养相关字段 =====
    // 保养类型
    maintenanceTypes: [],
    selectedMaintenanceTypeIndex: -1,

    // 推荐套餐
    recommendedPackages: [],
    selectedPackageIndex: -1,
    expandedPackageIds: [], // 已展开商品详情的套餐ID列表

    // 车队配置（保养）
    fleetConfig: {
      allowDriverSelectStore: false,
      maintenanceProductPermission: 'fleet_control',
      showMaintenancePrice: true
    },

    // 司机备注（保养专用）
    driverRemark: '',

    // 显示选择器弹窗
    showVehiclePicker: false,
    showStorePicker: false,
    showDatePicker: false,
    showTimePicker: false,
    showDateTimePicker: false,
    showLocationPicker: false, // 位置选择弹窗

    // 期望到店时间（新字段：日期+时间段）
    expectedDate: '', // 期望日期 YYYY-MM-DD
    expectedTimeSlot: '', // 期望时间段 08:00-10:00, 10:00-12:00, 14:00-16:00, 16:00-18:00, 18:00-20:00
    expectedTimeSlotIndex: -1, // 选中的时间段索引，-1表示未选择
    showExpectedDatePicker: false,
    showExpectedTimeSlotPicker: false,

    // 时间段选项
    timeSlotOptions: [
      { label: '上午 08:00-10:00', value: '08:00-10:00' },
      { label: '上午 10:00-12:00', value: '10:00-12:00' },
      { label: '下午 14:00-16:00', value: '14:00-16:00' },
      { label: '下午 16:00-18:00', value: '16:00-18:00' },
      { label: '晚上 18:00-20:00', value: '18:00-20:00' }
    ],

    // 时间选择列表（半小时为单位，7:00-22:00）
    timeSlots: [],

    // 显示媒体选择弹窗
    showMediaPicker: false,

    // 常用地址列表
    savedAddresses: [],

    // 默认地址列表（从配置加载）
    defaultLocations: mapConfig.defaultLocations || [],

    // 门店详情相关（复用订单详情页功能）
    showStoreDetail: false,
    storeDetail: null,
    storeDetailReviews: []
  },

  onLoad(options) {
    // 处理业务类型，确保type被正确设置
    const requestType = options.type || 'repair'; // 默认为报修
    this.setData({ type: requestType });

    // 统一规则：报修和保养都根据车队配置决定，不再设置默认值
    // 默认值将在 loadFleetConfig() 中根据车队配置设置
    if (requestType === 'maintenance') {
      wx.setNavigationBarTitle({ title: '保养申请' });
    } else {
      wx.setNavigationBarTitle({ title: '报修申请' });
    }

    // 如果从车辆页面跳转过来，预选车辆
    if (options.vehicleId) {
      this.preselectedVehicleId = options.vehicleId;
    }

    // 设置今天日期
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    // 生成时间列表（半小时为单位，7:00-22:00）
    const timeSlots = [];
    for (let hour = 7; hour <= 22; hour++) {
      timeSlots.push(`${String(hour).padStart(2, '0')}:00`);
      if (hour < 22) {
        timeSlots.push(`${String(hour).padStart(2, '0')}:30`);
      }
    }

    this.setData({
      today: `${year}-${month}-${day}`,
      appointmentDate: `${year}-${month}-${day}`, // 默认选中今天
      expectedDate: `${year}-${month}-${day}`, // 默认期望日期为今天
      expectedTimeSlot: '09:00-11:00', // 默认时间段
      expectedTimeSlotIndex: -1, // 默认不选中任何卡片
      timeSlots: timeSlots
    });

    this.loadVehicles();
    this.getCurrentLocation();
    this.loadSavedAddresses(); // 加载常用地址

    // 如果是保养申请，加载保养相关数据（使用已设置的type）
    if (requestType === 'maintenance') {
      this.loadFleetConfig();
      // 优化：直接加载推荐套餐，不显示保养类型选择
      // this.loadMaintenanceTypes(); // 移除保养类型选择
    }
  },

  onShow() {
    // 从地址管理页面返回时，重新加载常用地址
    this.loadSavedAddresses();
  },

  /**
   * 获取当前位置
   */
  getCurrentLocation() {
    const that = this;

    // 首先尝试获取位置
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude } = res;
        // 获取地址
        that.loadAddress(latitude, longitude);
        // 加载附近门店
        that.loadNearbyStores(latitude, longitude);
        // 加载车队配置
        that.loadFleetConfig();
      },
      fail: (err) => {
        console.error('获取位置失败:', err);
        // 使用默认地址作为降级方案
        that.useDefaultLocation('无法获取当前位置');
      }
    });
  },

  /**
   * 逆地理编码获取地址
   */
  loadAddress(latitude, longitude) {
    const that = this;

    console.log('========== 开始地址解析 ==========');
    console.log('SDK状态:', qqmapsdk ? '已加载' : '未加载');
    console.log('API Key:', mapConfig.tencentMap.key ? '已配置' : '未配置');
    console.log('获取到的坐标:', { latitude: latitude, longitude: longitude });

    // 检查SDK是否加载
    if (!qqmapsdk) {
      console.error('❌ 腾讯地图SDK未加载');
      this.useDefaultLocation('SDK未加载');
      return;
    }

    // 检查API Key是否配置
    if (mapConfig.tencentMap.key === 'YOUR_TENCENT_MAP_KEY') {
      console.error('❌ API Key未配置');
      this.useDefaultLocation('API Key未配置');
      return;
    }

    // 调用逆地理编码
    console.log('正在调用腾讯地图逆地理编码API...');
    qqmapsdk.reverseGeocoder({
      location: { latitude: latitude, longitude: longitude },
      get_poi: 1, // 获取周边POI信息
      success: (res) => {
        console.log('✅ 地址解析成功');
        console.log('=== SDK完整响应结构 ===');
        console.log('res:', res);
        console.log('res.status:', res.status);
        console.log('res.message:', res.message);
        console.log('res.result:', res.result);

        // 尝试多种方式获取地址
        let address = '';

        // 方式1：直接访问res的属性
        if (res.formatted_addresses && res.formatted_addresses.recommend) {
          address = res.formatted_addresses.recommend;
          console.log('方式1成功 - res.formatted_addresses.recommend');
        } else if (res.formatted_addresses && res.formatted_addresses.standard_address) {
          address = res.formatted_addresses.standard_address;
          console.log('方式1成功 - res.formatted_addresses.standard_address');
        } else if (res.address) {
          address = res.address;
          console.log('方式2成功 - res.address:', address);
        } else if (res.result) {
          // 方式3：从result中获取
          console.log('res.result存在，检查其属性');
          console.log('res.result.formatted_addresses:', res.result.formatted_addresses);
          console.log('res.result.address:', res.result.address);
          console.log('res.result.address_component:', res.result.address_component);

          if (res.result.formatted_addresses && res.result.formatted_addresses.recommend) {
            address = res.result.formatted_addresses.recommend;
            console.log('方式3成功 - result.formatted_addresses.recommend');
          } else if (res.result.formatted_addresses && res.result.formatted_addresses.standard_address) {
            address = res.result.formatted_addresses.standard_address;
            console.log('方式3成功 - result.formatted_addresses.standard_address');
          } else if (res.result.address) {
            address = res.result.address;
            console.log('方式3成功 - result.address:', address);
            // 检查是否还是坐标
            if (address.includes('.') && address.includes(',')) {
              console.warn('⚠️ result.address仍然是坐标格式，尝试其他方式');
              address = ''; // 清空，尝试下一个方式
            }
          }
        }

        // 最后降级：使用地址组件组合
        if (!address) {
          console.log('尝试使用地址组件组合...');
          const components = res.result ? res.result.address_component : res.address_component;
          if (components) {
            address = `${components.province || ''}${components.city || ''}${components.district || ''}${components.street || ''}`;
            console.log('方式4成功 - 组件组合:', address);
          }
        }

        // 如果所有方式都失败，使用默认地址
        if (!address || (address.includes('.') && address.includes(','))) {
          console.error('❌ 所有方式都失败，使用默认地址');
          that.useDefaultLocation('无法解析详细地址');
          return;
        }

        console.log('✅ 最终解析出的地址:', address);

        that.setData({
          'serviceLocation.address': address,
          'serviceLocation.latitude': latitude,
          'serviceLocation.longitude': longitude
        });
      },
      fail: (err) => {
        console.error('❌ 地址解析失败');
        console.error('错误类型:', err.constructor.name);
        console.error('错误信息:', err.message);
        console.error('错误详情:', JSON.stringify(err));

        // 显示友好的错误提示
        const errorMsg = err.message || '未知错误';
        wx.showModal({
          title: '地址解析失败',
          content: `无法获取详细地址：${errorMsg}\n\n可能原因：\n1. API Key未开通逆地理编码权限\n2. 网络连接问题\n\n已使用默认地址，您可以点击"修改"重新选择`,
          confirmText: '我知道了',
          showCancel: false,
          success: () => {
            that.useDefaultLocation('地址解析失败');
          }
        });
      }
    });
  },

  /**
   * 使用默认地址（统一降级方案）
   */
  useDefaultLocation(reason) {
    const defaultLocation = this.data.defaultLocations?.find(loc => loc.isDefault) ||
                         this.data.defaultLocations?.[0] ||
                         mapConfig.defaultLocations.find(loc => loc.isDefault) ||
                         mapConfig.defaultLocations[0];

    if (defaultLocation) {
      console.log(`📍 使用默认地址: ${defaultLocation.address}`);
      this.setData({
        'serviceLocation.address': defaultLocation.address,
        'serviceLocation.latitude': defaultLocation.latitude,
        'serviceLocation.longitude': defaultLocation.longitude
      });

      // 降级成功时不需要显示错误提示，地址已正确显示
      // 记录日志用于调试
      if (reason) {
        console.log(`降级原因: ${reason}`);
      }
    } else {
      // 如果连默认地址都没有
      console.warn('⚠️ 没有可用的默认地址');
      this.setData({
        'serviceLocation.address': '请在地图上选择服务地址',
        'serviceLocation.latitude': this.data.serviceLocation.latitude || 22.531721,
        'serviceLocation.longitude': this.data.serviceLocation.longitude || 113.943526
      });
    }

    // 仍需加载门店和车队配置
    this.loadNearbyStores(
      this.data.serviceLocation.latitude,
      this.data.serviceLocation.longitude
    );
    this.loadFleetConfig();
  },

  /**
   * 加载附近门店（推荐门店）- 复用订单详情页的丰富UI数据
   */
  async loadNearbyStores(latitude, longitude) {
    const radii = [10, 20, 30, 50]; // 逐级扩展半径

    for (let radius of radii) {
      try {
        const res = await request.get('/stores/nearby', {
          latitude,
          longitude,
          radius
        });

        if (res.data.stores && res.data.stores.length > 0) {
          const stores = res.data.stores.map(s => ({
            _id: s._id,
            label: s.name,
            sublabel: `${s.address.city || ''} ${s.address.district || s.address || ''}`,
            distance: s.distance,
            address: s.address,
            businessHours: s.businessHours || '8:00-20:00',
            contactPhone: s.contact?.phone || '',
            contactName: s.contact?.name || '',
            ratingStats: s.ratingStats || { overallRating: 0, reviewCount: 0 },
            ...s
          }));

          this.setData({
            nearbyStores: stores,
            stores: stores // 同时更新门店列表
          });
          return; // 找到门店后返回
        }
      } catch (error) {
        console.error(`加载${radius}km内门店失败:`, error);
      }
    }

    // 如果都没有找到，加载所有门店
    this.loadAllStores();
  },

  /**
   * 加载所有门店（附近没有门店时的降级方案）- 复用订单详情页的丰富UI数据
   */
  async loadAllStores() {
    try {
      const res = await request.get('/stores?status=normal&limit=100');

      const storeList = res.data.stores || [];

      const stores = storeList.map(s => ({
        _id: s._id,
        label: s.name,
        sublabel: `${s.address.city || ''} ${s.address.district || s.address || ''}`,
        address: s.address,
        businessHours: s.businessHours || '8:00-20:00',
        contactPhone: s.contact?.phone || '',
        contactName: s.contact?.name || '',
        ratingStats: s.ratingStats || { overallRating: 0, reviewCount: 0 },
        ...s
      }));

      this.setData({ stores });
    } catch (error) {
      console.error('加载门店失败:', error);
    }
  },

  /**
   * 加载车辆列表
   */
  async loadVehicles() {
    try {
      const res = await request.get('/vehicles');

      // 修复：后端返回 { success: true, data: [...] }
      const vehicles = (res.data || [])
        .filter(v => v.status === 'normal')
        .map(v => ({
          _id: v._id,
          label: `${v.plateNumber}`,
          sublabel: `${v.brand} ${v.model}`,
          ...v
        }));

      this.setData({ vehicles });

      // 如果有预选车辆，自动选中
      if (this.preselectedVehicleId) {
        const index = vehicles.findIndex(v => v._id === this.preselectedVehicleId);
        if (index !== -1) {
          this.setData({ selectedVehicleIndex: index });
        }
      }

    } catch (error) {
      console.error('加载车辆失败:', error);
      wx.showToast({
        title: error.message || '加载车辆失败',
        icon: 'none'
      });
    }
  },

  /**
   * 加载门店列表（保留原有方法作为备用）
   */
  async loadStores() {
    if (this.data.stores.length > 0) {
      return; // 如果已经通过附近门店加载，则跳过
    }
    await this.loadAllStores();
  },

  /**
   * 打开位置选择器
   */
  openLocationPicker() {
    this.setData({ showLocationPicker: true });
  },

  /**
   * 关闭位置选择器
   */
  closeLocationPicker() {
    this.setData({ showLocationPicker: false });
  },

  /**
   * 选择位置
   */
  onLocationSelect() {
    const that = this;
    wx.chooseLocation({
      success: (res) => {
        const { name, address, latitude, longitude } = res;
        that.setData({
          'serviceLocation.address': address || name,
          'serviceLocation.latitude': latitude,
          'serviceLocation.longitude': longitude
        });
        // 重新加载附近门店
        that.loadNearbyStores(latitude, longitude);
        that.setData({ showLocationPicker: false });
      }
    });
  },

  /**
   * 手动输入地址
   */
  onLocationInput(e) {
    this.setData({
      'serviceLocation.address': e.detail.value
    });
  },

  /**
   * 加载常用地址列表
   */
  async loadSavedAddresses() {
    // 注意：后端暂未实现 /user/addresses 接口，暂时只使用本地缓存
    // const cachedAddresses = wx.getStorageSync('savedAddresses') || [];
    // this.setData({
    //   savedAddresses: cachedAddresses
    // });

    // TODO: 等后端实现接口后，取消下面的注释
    // try {
    //   const res = await request.get('/user/addresses');
    //   this.setData({
    //     savedAddresses: res.data.addresses || []
    //   });
    // } catch (error) {
    //   const cachedAddresses = wx.getStorageSync('savedAddresses') || [];
    //   this.setData({
    //     savedAddresses: cachedAddresses
    //   });
    // }
  },

  /**
   * 选择常用地址
   */
  onSelectSavedAddress(e) {
    const { address } = e.currentTarget.dataset;

    this.setData({
      'serviceLocation.address': address.address,
      'serviceLocation.latitude': address.latitude,
      'serviceLocation.longitude': address.longitude,
      showLocationPicker: false
    });

    // 重新加载附近门店（基于选中的地址）
    if (address.latitude && address.longitude) {
      this.loadNearbyStores(address.latitude, address.longitude);
    }

    wx.showToast({
      title: '已选择服务地址',
      icon: 'success',
      duration: 1500
    });
  },

  /**
   * 跳转到地址管理页面
   */
  onManageAddresses() {
    this.setData({ showLocationPicker: false });

    wx.navigateTo({
      url: '/pages/address-list/address-list'
    });
  },

  /**
   * 打开车辆选择器
   */
  openVehiclePicker() {
    if (this.data.vehicles.length === 0) {
      wx.showToast({
        title: '暂无可用车辆',
        icon: 'none'
      });
      return;
    }
    this.setData({ showVehiclePicker: true });
  },

  /**
   * 关闭车辆选择器
   */
  closeVehiclePicker() {
    this.setData({ showVehiclePicker: false });
  },

  /**
   * 选择车辆
   */
  onVehicleSelect(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      selectedVehicleIndex: index,
      showVehiclePicker: false
    });

    // 如果是保养申请，自动加载推荐套餐
    if (this.data.type === 'maintenance') {
      this.loadRecommendedPackages();
    }
  },

  /**
   * 打开门店选择器
   */
  openStorePicker() {
    if (this.data.stores.length === 0) {
      wx.showToast({
        title: '暂无可用门店',
        icon: 'none'
      });
      return;
    }
    this.setData({ showStorePicker: true });
  },

  /**
   * 关闭门店选择器
   */
  closeStorePicker() {
    this.setData({ showStorePicker: false });
  },

  /**
   * 选择门店（选中但不关闭弹窗，需要点击确认按钮）
   */
  onStoreSelect(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      selectedStoreIndex: index
    });
  },

  /**
   * 确认选择门店
   */
  onConfirmStoreSelect() {
    if (this.data.selectedStoreIndex === -1) {
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
    const storeName = this.data.stores[this.data.selectedStoreIndex]?.label || '';
    wx.showToast({
      title: `已选择：${storeName}`,
      icon: 'success'
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
      console.error('获取门店评价失败:', error);
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
   * 拨打电话
   */
  makePhoneCall(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) {
      wx.showToast({
        title: '暂无电话',
        icon: 'none'
      });
      return;
    }
    wx.makePhoneCall({
      phoneNumber: phone
    });
  },

  /**
   * 选择预约日期（picker组件）
   */
  onDateChange(e) {
    this.setData({
      appointmentDate: e.detail.value
    });
  },

  /**
   * 打开日期时间统一选择器
   */
  openDateTimePicker() {
    this.setData({ showDateTimePicker: true });
  },

  /**
   * 关闭日期时间选择器
   */
  closeDateTimePicker() {
    this.setData({ showDateTimePicker: false });
  },

  /**
   * 日期时间选择器中的日期选择
   */
  onDateTimeDateChange(e) {
    this.setData({
      appointmentDate: e.detail.value
    });
  },

  /**
   * 选择期望到店时间（简化版）
   */
  onSelectTime(e) {
    const time = e.currentTarget.dataset.time;
    this.setData({
      preferredTime: time
    });
    console.log('选择期望到店时间:', time);
  },

  /**
   * 选择期望时间段（点击卡片）
   */
  onSelectTimeSlot(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const timeSlot = this.data.timeSlotOptions[index];
    this.setData({
      expectedTimeSlot: timeSlot.value,
      expectedTimeSlotIndex: index
    });
    console.log('选择期望时间段:', timeSlot);
  },

  /**
   * 打开期望日期选择器
   */
  openExpectedDatePicker() {
    this.setData({ showExpectedDatePicker: true });
  },

  /**
   * 关闭期望日期选择器
   */
  closeExpectedDatePicker() {
    this.setData({ showExpectedDatePicker: false });
  },

  /**
   * 选择期望日期
   */
  onExpectedDateChange(e) {
    this.setData({
      expectedDate: e.detail.value
    });
    console.log('选择期望日期:', e.detail.value);
  },

  /**
   * 打开时间选择器
   */
  openTimePicker() {
    this.setData({ showTimePicker: true });
  },

  /**
   * 关闭时间选择器
   */
  closeTimePicker() {
    this.setData({ showTimePicker: false });
  },

  /**
   * 选择时间
   */
  onTimeSelect(e) {
    const time = e.currentTarget.dataset.time;
    this.setData({
      appointmentTime: time,
      showTimePicker: false
    });
  },

  /**
   * 选择故障标签
   */
  onTagSelect(e) {
    const tag = e.currentTarget.dataset.tag;
    let selectedTags = [...this.data.selectedTags];

    const index = selectedTags.indexOf(tag);
    if (index > -1) {
      // 取消选择
      selectedTags.splice(index, 1);
    } else {
      // 添加选择
      selectedTags.push(tag);
    }

    this.setData({ selectedTags });

    // 更新故障描述
    this.updateFaultDescription();
  },

  /**
   * 更新故障描述
   */
  updateFaultDescription() {
    const desc = this.data.selectedTags.join('、');
    this.setData({ faultDescription: desc });
  },

  /**
   * 输入备注
   */
  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value
    });
  },

  /**
   * 输入当前里程
   */
  onMileageInput(e) {
    // 只允许输入数字，过滤掉非数字字符
    let value = e.detail.value;
    value = value.replace(/[^\d]/g, ''); // 移除所有非数字字符

    this.setData({
      mileage: value
    });
  },

  /**
   * 输入故障描述（手动编辑）
   */
  onDescriptionInput(e) {
    this.setData({
      faultDescription: e.detail.value
    });
  },

  /**
   * 开始语音输入
   */
  startVoiceInput() {
    const that = this;
    wx.showModal({
      title: '语音输入',
      content: '请说话，系统将自动转换为文字',
      confirmText: '开始录音',
      cancelText: '取消',
      success(res) {
        if (res.confirm) {
          wx.startRecord({
            success() {
              wx.showToast({
                title: '录音中...',
                icon: 'loading',
                duration: 1000
              });

              // 3秒后自动停止并识别
              setTimeout(() => {
                wx.stopRecord({
                  success(res) {
                    const tempFilePath = res.tempFilePath;
                    // 识别语音
                    wx.translateVoice({
                      localId: tempFilePath,
                      isShowProgressTips: 1,
                      success(translateRes) {
                        const text = translateRes.translateResult;
                        if (text) {
                          // 追加到现有描述
                          const currentDesc = that.data.faultDescription || '';
                          const newDesc = currentDesc ? (currentDesc + '，' + text) : text;
                          that.setData({
                            faultDescription: newDesc
                          });
                          wx.showToast({
                            title: '识别成功',
                            icon: 'success'
                          });
                        }
                      },
                      fail() {
                        wx.showToast({
                          title: '语音识别失败，请重试或手动输入',
                          icon: 'none'
                        });
                      }
                    });
                  },
                  fail() {
                    wx.showToast({
                      title: '录音失败',
                      icon: 'none'
                    });
                  }
                });
              }, 3000);
            }
          });
        }
      }
    });
  },

  /**
   * 打开媒体选择弹窗
   */
  openMediaPicker() {
    const canUploadImage = this.data.faultImages.length < 9;
    const canUploadVideo = this.data.faultVideos.length < 3;

    if (!canUploadImage && !canUploadVideo) {
      wx.showToast({
        title: '已达到上传上限',
        icon: 'none'
      });
      return;
    }

    this.setData({ showMediaPicker: true });
  },

  /**
   * 关闭媒体选择弹窗
   */
  closeMediaPicker() {
    this.setData({ showMediaPicker: false });
  },

  /**
   * 选择拍照
   */
  onChooseImage() {
    this.setData({ showMediaPicker: false });

    const remainCount = 9 - this.data.faultImages.length;

    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        this.setData({
          faultImages: [...this.data.faultImages, ...tempFilePaths]
        });
      }
    });
  },

  /**
   * 选择视频
   */
  onChooseVideo() {
    this.setData({ showMediaPicker: false });

    if (this.data.faultVideos.length >= 3) {
      wx.showToast({
        title: '最多上传3个视频',
        icon: 'none'
      });
      return;
    }

    wx.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: (res) => {
        this.setData({
          faultVideos: [...this.data.faultVideos, res.tempFilePath]
        });
      }
    });
  },

  /**
   * 预览图片
   */
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.faultImages
    });
  },

  /**
   * 删除图片
   */
  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.faultImages];
    images.splice(index, 1);
    this.setData({ faultImages: images });
  },

  /**
   * 删除视频
   */
  onDeleteVideo(e) {
    const index = e.currentTarget.dataset.index;
    const videos = [...this.data.faultVideos];
    videos.splice(index, 1);
    this.setData({ faultVideos: videos });
  },

  /**
   * 拍摄里程照片
   */
  onChooseMileagePhoto() {
    const remainCount = 3 - this.data.mileagePhotos.length;

    if (remainCount <= 0) {
      wx.showToast({
        title: '最多上传3张里程照片',
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['camera'], // 只允许拍照
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        this.setData({
          mileagePhotos: [...this.data.mileagePhotos, ...tempFilePaths]
        });
      }
    });
  },

  /**
   * 预览里程照片
   */
  onPreviewMileagePhoto(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.mileagePhotos
    });
  },

  /**
   * 删除里程照片
   */
  onDeleteMileagePhoto(e) {
    const index = e.currentTarget.dataset.index;
    const photos = [...this.data.mileagePhotos];
    photos.splice(index, 1);
    this.setData({ mileagePhotos: photos });
  },

  /**
   * 提交报修/保养申请
   */
  async onSubmit() {
    console.log('========== 用户提交表单 ==========');
    console.log('当前车队配置 allowDriverSelectStore =', this.data.allowDriverSelectStore);
    console.log('已选择门店索引 =', this.data.selectedStoreIndex);
    console.log('订单类型 =', this.data.type);

    // 验证表单
    if (this.data.selectedVehicleIndex === -1) {
      wx.showToast({
        title: '请选择车辆',
        icon: 'none'
      });
      return;
    }

    // 根据车队配置验证门店选择
    if (this.data.allowDriverSelectStore && this.data.selectedStoreIndex === -1) {
      console.error('❌ 车队配置要求司机必须选择门店，但用户未选择');
      wx.showModal({
        title: '请选择门店',
        content: '根据车队配置，您需要选择一个维修门店',
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }

    // 验证期望到店时间（必填）
    if (!this.data.expectedDate) {
      wx.showToast({
        title: '请选择期望到店日期',
        icon: 'none'
      });
      return;
    }

    if (!this.data.expectedTimeSlot) {
      wx.showToast({
        title: '请选择期望到店时间段',
        icon: 'none'
      });
      return;
    }

    // 验证当前里程（必填）
    if (!this.data.mileage) {
      wx.showToast({
        title: '请输入当前里程',
        icon: 'none'
      });
      return;
    }

    // 验证里程照片（必填）
    if (this.data.mileagePhotos.length === 0) {
      wx.showToast({
        title: '请拍摄里程表照片',
        icon: 'none'
      });
      return;
    }

    // ===== 保养订单特殊验证 =====
    if (this.data.type === 'maintenance') {
      // 验证保养套餐（必选）
      if (this.data.selectedPackageIndex === -1) {
        wx.showToast({
          title: '请选择保养套餐',
          icon: 'none'
        });
        return;
      }
    } else {
      // ===== 维修订单特殊验证 =====
      // 故障描述验证：如果有标签，或者手动输入超过3个字
      const hasTags = this.data.selectedTags.length > 0;
      const hasEnoughText = this.data.faultDescription.trim().length >= 3;

      if (!hasTags && !hasEnoughText) {
        wx.showToast({
          title: '请选择标签或输入至少3个字',
          icon: 'none'
        });
        return;
      }

      // 必须上传图片或视频
      if (this.data.faultImages.length === 0 && this.data.faultVideos.length === 0) {
        wx.showToast({
          title: '请至少上传一张图片或视频',
          icon: 'none'
        });
        return;
      }
    }

    this.setData({ submitting: true });

    try {
      // 上传里程照片
      const uploadedMileagePhotos = [];
      for (let photoPath of this.data.mileagePhotos) {
        try {
          const uploadRes = await this.uploadImage(photoPath);
          uploadedMileagePhotos.push(uploadRes.url);
        } catch (error) {
          console.error('上传里程照片失败:', error);
        }
      }

      // 上传图片（维修专用）
      const uploadedImages = [];
      for (let imagePath of this.data.faultImages) {
        try {
          const uploadRes = await this.uploadImage(imagePath);
          uploadedImages.push(uploadRes.url);
        } catch (error) {
          console.error('上传图片失败:', error);
        }
      }

      // 上传视频（维修专用）
      const uploadedVideos = [];
      for (let videoPath of this.data.faultVideos) {
        try {
          const uploadRes = await this.uploadImage(videoPath);
          uploadedVideos.push(uploadRes.url);
        } catch (error) {
          console.error('上传视频失败:', error);
        }
      }

      // 提交订单
      const vehicle = this.data.vehicles[this.data.selectedVehicleIndex];

      let orderData, apiUrl, successMessage;

      if (this.data.type === 'maintenance') {
        // ===== 保养订单提交 =====
        apiUrl = '/maintenance/driver/apply';

        const selectedPackage = this.data.recommendedPackages[this.data.selectedPackageIndex];

        orderData = {
          vehicleId: vehicle._id,
          packageId: selectedPackage._id,
          milestone: parseFloat(this.data.mileage),
          milestonePhotos: uploadedMileagePhotos,
          appointment: {
            expectedDate: this.data.expectedDate,
            expectedTimeSlot: this.data.expectedTimeSlot
          },
          driverRemark: this.data.driverRemark || ''
        };

        // 如果司机选择了门店，添加门店ID
        if (this.data.allowDriverSelectStore && this.data.selectedStoreIndex !== -1) {
          const store = this.data.stores[this.data.selectedStoreIndex];
          orderData.storeId = store._id;
        }

        successMessage = '保养申请已提交，等待车队审批';
      } else {
        // ===== 维修订单提交 =====
        apiUrl = '/orders';
        successMessage = '报修申请已提交，等待车队审批';

        orderData = {
          type: 'repair',
          vehicleId: vehicle._id,
          faultDescription: this.data.faultDescription,
          faultImages: uploadedImages,
          faultVideos: uploadedVideos,
          appointment: {
            expectedDate: this.data.expectedDate,
            expectedTimeSlot: this.data.expectedTimeSlot
          },
          milestone: parseFloat(this.data.mileage),
          milestonePhotos: uploadedMileagePhotos,
          remark: this.data.remark || ''
        };
      }

      // 添加位置信息
      if (this.data.serviceLocation.latitude && this.data.serviceLocation.longitude) {
        orderData.serviceLocation = this.data.serviceLocation;
      }

      // 如果允许司机选择门店且已选择，添加门店ID
      if (this.data.allowDriverSelectStore && this.data.selectedStoreIndex !== -1) {
        const store = this.data.stores[this.data.selectedStoreIndex];
        orderData.storeId = store._id;
      }

      const orderResult = await request.post(apiUrl, orderData);

      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });

      // 显示提示并跳转
      setTimeout(() => {
        const tipMessage = this.data.allowDriverSelectStore
          ? successMessage
          : successMessage + '，车队管理员将为您选择门店';

        wx.showModal({
          title: '温馨提示',
          content: tipMessage,
          showCancel: false,
          confirmText: '我知道了',
          success: () => {
            // 跳转到订单详情页
            const orderId = orderResult.data.order?._id || orderResult.data._id;
            wx.redirectTo({
              url: `/pages/order-detail/order-detail?id=${orderId}`
            });
          }
        });
      }, 500);

    } catch (error) {
      console.error('提交申请失败:', error);
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 上传单张图片/视频
   */
  uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${app.globalData.baseUrl}/upload`,
        filePath: filePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${app.globalData.token}`
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.success) {
              resolve(data.data);
            } else {
              reject(new Error(data.message));
            }
          } catch (error) {
            reject(error);
          }
        },
        fail: reject
      });
    });
  },

  // ===== 保养相关函数 =====

  /**
   * 加载车队配置
   */
  async loadFleetConfig() {
    console.log('========== 开始加载车队配置 ==========');
    try {
      // 获取用户信息
      const meRes = await request.get('/user/me');
      const meData = meRes.data;

      console.log('🔍 /user/me 响应数据:', meData);
      console.log('🔍 fleets 字段:', meData.fleets);
      console.log('🔍 fleetInfo 字段:', meData.fleetInfo);

      // 司机使用 fleets 数组，车队管理员使用 fleetInfo
      let fleetId = null;

      if (meData.fleets && meData.fleets.length > 0) {
        // 司机：从 fleets 数组获取第一个正常状态的车队
        const normalFleet = meData.fleets.find(f => f.status === 'normal');
        if (normalFleet) {
          fleetId = normalFleet.fleetId;
          console.log('✅ 从 fleets 数组找到车队:', fleetId);
        }
      } else if (meData.fleetInfo?.fleetId) {
        // 车队管理员：从 fleetInfo 获取
        fleetId = meData.fleetInfo.fleetId;
        console.log('✅ 从 fleetInfo 找到车队:', fleetId);
      }

      if (!fleetId) {
        console.warn('⚠️ 用户未关联车队，使用默认配置');
        wx.showToast({
          title: '未找到车队信息',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      // 获取车队配置
      console.log('📡 请求车队配置: /fleets/' + fleetId);
      const fleetRes = await request.get('/fleets/' + fleetId);
      console.log('📡 车队配置响应:', fleetRes);

      const fleet = fleetRes.data?.fleet || {};
      console.log('✅ 车队配置对象:', fleet);
      console.log('🔑 allowDriverSelectStore 原始值:', fleet.allowDriverSelectStore);

      // 统一规则：报修和保养都根据车队配置决定门店选择权限
      // 不再有例外情况（修复2026-03-03错误的硬编码逻辑）
      const allowDriverSelectStore = fleet.allowDriverSelectStore || false;
      console.log('📋 根据车队配置，allowDriverSelectStore =', allowDriverSelectStore);

      // 更新界面
      this.setData({
        allowDriverSelectStore: allowDriverSelectStore,
        'fleetConfig.allowDriverSelectStore': allowDriverSelectStore,
        'fleetConfig.maintenanceProductPermission': fleet.maintenanceProductPermission || 'fleet_control',
        'fleetConfig.showMaintenancePrice': fleet.showMaintenancePrice !== false
      });

      // 如果不允许司机选择门店，清空门店选择
      if (!allowDriverSelectStore) {
        console.log('🗑️ 清空已选择的门店（车队配置不允许司机选择）');
        this.setData({ selectedStoreIndex: -1 });
      }

      console.log('✅ 车队配置加载成功！');
      console.log('   allowDriverSelectStore =', allowDriverSelectStore);
      console.log('   订单类型 =', this.data.type);
      console.log('====================================');

    } catch (error) {
      console.error('❌ 加载车队配置失败:', error);
      console.error('   错误信息:', error.message);
      console.error('   错误堆栈:', error.stack);

      // 显示错误提示
      wx.showToast({
        title: '加载车队配置失败',
        icon: 'none',
        duration: 2000
      });

      // 保持初始配置不变（报修：不允许选门店，保养：允许选门店）
      console.log('⚠️ 使用初始配置（从 onLoad 设置的值）');
    }
  },

  /**
   * 加载保养类型
   */
  async loadMaintenanceTypes() {
    try {
      const res = await request.get('/maintenance/types?enabled=true');

      this.setData({
        maintenanceTypes: res.data.types || [],
        selectedMaintenanceTypeIndex: -1
      });
    } catch (error) {
      console.error('加载保养类型失败:', error);
    }
  },

  /**
   * 加载推荐套餐（根据车辆里程智能推荐）
   */
  async loadRecommendedPackages() {
    const vehicle = this.data.vehicles[this.data.selectedVehicleIndex];

    if (!vehicle) {
      return;
    }

    try {
      const res = await request.get('/maintenance/recommendations', {
        vehicleGroupId: vehicle.group || '牵引车',
        mileage: vehicle.mileage || 50000
      });

      // 预处理套餐数据，添加格式化后的价格字段
      const packages = (res.data.packages || []).map(pkg => {
        const localizedPkg = localizePackage(pkg);
        const price = Number(localizedPkg.price || 0);
        const originalPrice = Number(localizedPkg.originalPrice || localizedPkg.price || 0);

        return {
          ...localizedPkg,
          formattedPrice: (price / 100).toFixed(2),
          formattedOriginalPrice: (originalPrice / 100).toFixed(2),
          formattedSavePrice: ((originalPrice - price) / 100).toFixed(2)
        };
      });

      this.setData({
        recommendedPackages: packages
      });

      console.log('✅ 已加载推荐套餐:', packages.length, '个');
    } catch (error) {
      console.error('加载推荐套餐失败:', error);
      wx.showToast({
        title: '加载套餐失败',
        icon: 'none'
      });
    }
  },

  /**
   * 选择保养类型
   */
  onSelectMaintenanceType(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      selectedMaintenanceTypeIndex: index
    });

    this.loadRecommendedPackages();
  },

  /**
   * 选择套餐
   */
  onSelectPackage(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      selectedPackageIndex: index
    });
  },

  /**
   * 切换商品详情展开/收起
   */
  toggleProductDetail(e) {
    const packageId = e.currentTarget.dataset.id;
    const expandedList = this.data.expandedPackageIds || [];
    const index = expandedList.indexOf(packageId);

    if (index !== -1) {
      // 已展开，收起
      expandedList.splice(index, 1);
    } else {
      // 未展开，展开
      expandedList.push(packageId);
    }

    this.setData({
      expandedPackageIds: expandedList
    });
  },

  /**
   * 输入保养备注
   */
  onDriverRemarkInput(e) {
    this.setData({
      driverRemark: e.detail.value
    });
  }
});
