// pages/maintenance/maintenance.js - 保养申请页面
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    // 车辆信息
    vehicle: null,

    // 服务地址
    serviceLocation: {
      address: '',
      latitude: null,
      longitude: null
    },

    // 保养类型
    maintenanceTypes: [],
    selectedTypeIndex: -1,

    // 推荐套餐
    recommendedPackages: [],
    selectedPackageIndex: -1,

    // 商品选择（根据权限）
    allProducts: [],
    selectedProductIndices: [],

    // 选中档位（无商品权限时）
    selectedTierIndex: -1,

    // 到店时间偏好
    preferredDate: '',
    preferredTimeSlot: '',
    timeSlots: [],

    // 备注
    driverRemark: '',

    // 车队配置
    fleetConfig: {
      allowDriverSelectStore: false,
      maintenanceProductPermission: 'fleet_control',
      maintenanceBudgetThreshold: 5000
    },

    // 加载状态
    loading: {
      vehicle: false,
      types: false,
      packages: false,
      products: false,
      submitting: false
    },

    // 显示选择器
    showTimePicker: false,
    showTierPicker: false
  },

  onLoad(options) {
    // 如果从车辆页面进入
    if (options.vehicleId) {
      this.preloadVehicleId = options.vehicleId;
    }

    this.initTimeSlots();
    this.loadFleetConfig();
    this.loadMaintenanceTypes();
    this.loadProducts();
    this.loadVehicle();
    this.getCurrentLocation();
  },

  /**
   * 初始化时间列表
   */
  initTimeSlots() {
    const timeSlots = [];
    for (let hour = 8; hour <= 18; hour++) {
      timeSlots.push(`${String(hour).padStart(2, '0')}:00`);
      if (hour < 18) {
        timeSlots.push(`${String(hour).padStart(2, '0')}:30`);
      }
    }

    this.setData({ timeSlots });
  },

  /**
   * 加载车队配置
   */
  async loadFleetConfig() {
    try {
      // 获取当前用户信息，从中获取车队ID
      const userRes = await request.get('/user/me');
      const fleetId = userRes.data.fleetInfo?.fleetId;

      if (!fleetId) {
        console.warn('用户未关联车队');
        return;
      }

      const res = await request.get('/fleets/' + fleetId);
      this.setData({
        fleetConfig: res.data.fleet || {
          allowDriverSelectStore: false,
          maintenanceProductPermission: 'fleet_control',
          maintenanceBudgetThreshold: 5000
        }
      });
    } catch (error) {
      console.error('加载车队配置失败:', error);
    }
  },

  /**
   * 加载保养类型
   */
  async loadMaintenanceTypes() {
    try {
      this.setData({ 'loading.types': true });

      const res = await request.get('/maintenance/platform/types?enabled=true');

      this.setData({
        maintenanceTypes: res.data.types || [],
        selectedTypeIndex: -1
      });
    } catch (error) {
      console.error('加载保养类型失败:', error);
      wx.showToast({
        title: '加载保养类型失败',
        icon: 'none'
      });
    } finally {
      this.setData({ 'loading.types': false });
    }
  },

  /**
   * 加载所有商品
   */
  async loadProducts() {
    try {
      const res = await request.get('/products');

      this.setData({
        allProducts: res.data.products || []
      });
    } catch (error) {
      console.error('加载商品失败:', error);
    }
  },

  /**
   * 加载车辆信息
   */
  async loadVehicle() {
    try {
      let url = '/vehicles';

      if (this.preloadVehicleId) {
        url = `/vehicles/${this.preloadVehicleId}`;
      }

      this.setData({ 'loading.vehicle': true });

      const res = await request.get(url);

      this.setData({
        vehicle: res.data.vehicle || null
      });
    } catch (error) {
      console.error('加载车辆信息失败:', error);
      wx.showToast({
        title: error.message || '加载车辆信息失败',
        icon: 'none'
      });
    } finally {
      this.setData({ 'loading.vehicle': false });
    }
  },

  /**
   * 获取当前位置
   */
  getCurrentLocation() {
    const that = this;
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude } = res;

        // 获取地址
        that.loadAddress(latitude, longitude);
      },
      fail: () => {
        wx.showToast({
          title: '无法获取您的位置',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 加载地址
   */
  loadAddress(latitude, longitude) {
    const that = this;

    // 使用微信原生API获取地址（如果可用）或使用经纬度
    that.setData({
      'serviceLocation.address': `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      'serviceLocation.latitude': latitude,
      'serviceLocation.longitude': longitude
    });

    // 如果需要更精确的地址，可以使用微信的逆地理编码API
    // 这里简化处理，直接使用经纬度
      location: { latitude, longitude },
      success: (res) => {
        that.setData({
          'serviceLocation.address': res.result.address,
          'serviceLocation.latitude': latitude,
          'serviceLocation.longitude': longitude
        });
      },
      fail: () => {
        that.setData({
          'serviceLocation.address': `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          'serviceLocation.latitude': latitude,
          'serviceLocation.longitude': longitude
        });
      }
    });
  },

  /**
   * 选择保养类型
   */
  onSelectType(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      selectedTypeIndex: index
    });

    this.loadRecommendedPackages();
  },

  /**
   * 加载推荐套餐
   */
  async loadRecommendedPackages() {
    const vehicle = this.data.vehicle;
    const type = this.data.maintenanceTypes[this.data.selectedTypeIndex];

    if (!vehicle || !type) {
      return;
    }

    try {
      this.setData({ 'loading.packages': true });

      const res = await request.get('/maintenance/recommendations', {
        vehicleGroupId: vehicle.groupId,
        mileage: vehicle.mileage
      });

      this.setData({
        recommendedPackages: res.data.packages || []
      });
    } catch (error) {
      console.error('加载推荐套餐失败:', error);
    } finally {
      this.setData({ 'loading.packages': false });
    }
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
   * 选择档位
   */
  onTierChange(e) {
    const value = e.detail.value;
    this.setData({
      selectedTierIndex: value
    });
  },

  /**
   * 选择商品
   */
  onSelectProduct(e) {
    const value = e.detail.value;
    this.setData({
      selectedProductIndices: value
    });
  },

  /**
   * 修改服务地址
   */
  onChangeLocation() {
    const that = this;
    wx.chooseLocation({
      success: (res) => {
        const { name, address, latitude, longitude } = res;

        that.setData({
          'serviceLocation.address': address || name,
          'serviceLocation.latitude': latitude,
          'serviceLocation.longitude': longitude
        });
      }
    });
  },

  /**
   * 输入备注
   */
  onRemarkInput(e) {
    this.setData({
      driverRemark: e.detail.value
    });
  },

  /**
   * 选择到店日期
   */
  onDateChange(e) {
    this.setData({
      preferredDate: e.detail.value
    });
  },

  /**
   * 选择到店时间
   */
  onTimeSelect(e) {
    const time = e.currentTarget.dataset.time;
    this.setData({
      preferredTimeSlot: time,
      showTimePicker: false
    });
  },

  /**
   * 打开时间选择器
   */
  openTimePicker() {
    this.setData({
      showTimePicker: true
    });
  },

  /**
   * 计算套餐总价
   */
  calculatePackagePrice() {
    const pkg = this.data.recommendedPackages[this.data.selectedPackageIndex];

    if (!pkg) {
      return 0;
    }

    if (this.data.fleetConfig.maintenanceProductPermission === 'driver_select') {
      // 司机有权限，显示套餐价格
      return pkg.price;
    }

    // 司机无权限，返回0
    return 0;
  },

  /**
   * 计算商品总价
   */
  calculateProductsPrice() {
    const products = this.data.allProducts;
    const indices = this.data.selectedProductIndices;

    if (!products || indices.length === 0) {
      return 0;
    }

    let total = 0;
    indices.forEach(i => {
      const product = products[i];
      total += product.price;
    });

    return total;
  },

  /**
   * 提交保养申请
   */
  async onSubmit() {
    // 验证车辆
    if (!this.data.vehicle) {
      wx.showToast({
        title: '请选择车辆',
        icon: 'none'
      });
      return;
    }

    // 验证保养类型
    if (this.data.selectedTypeIndex === -1) {
      wx.showToast({
        title: '请选择保养类型',
        icon: 'none'
      });
      return;
    }

    // 验证到店时间
    if (!this.data.preferredDate || !this.data.preferredTimeSlot) {
      wx.showToast({
        title: '请选择到店时间',
        icon: 'none'
      });
      return;
    }

    const type = this.data.maintenanceTypes[this.data.selectedTypeIndex];
    const pkg = this.data.recommendedPackages[this.data.selectedPackageIndex];

    // 构建请求数据
    const data = {
      vehicleId: this.data.vehicle._id,
      maintenanceTypeId: type._id,
      serviceLocation: this.data.serviceLocation,
      preferredTime: this.data.preferredDate && this.data.preferredTimeSlot
        ? `${this.data.preferredDate} ${this.data.preferredTimeSlot}`
        : undefined,
      driverRemark: this.data.driverRemark
    };

    // 根据权限添加不同字段
    if (this.data.fleetConfig.maintenanceProductPermission === 'driver_select') {
      // 司机有商品选择权限
      if (pkg) {
        data.packageId = pkg._id;
      }
    } else {
      // 司机无权限，选择档位
      const tiers = ['基础', '标准', '高级', '尊享'];
      data.selectedTier = tiers[this.data.selectedTierIndex];
    }

    this.setData({ submitting: true });

    try {
      await request.post('/maintenance/driver/apply', data);

      wx.showToast({
        title: '提交成功，等待车队审批',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('提交失败:', error);
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
