// pages/maintenance/maintenance.js - 保养申请页面
const app = getApp();
const request = require('../../utils/request');
const { localizePackage, localizeProduct } = require('../../utils/maintenance-localizer');

Page({
  data: {
    // 车辆信息
    vehicle: null,

    // 我的位置
    serviceLocation: {
      address: '',
      latitude: null,
      longitude: null
    },

    // 当前里程
    milestone: '',

    // 里程照片
    milestonePhotos: [],

    // 保养类型
    maintenanceTypes: [],
    selectedTypeIndex: -1,

    // 智能推荐套餐（顶部）
    topRecommendations: [],

    // 按分类分组的套餐
    categorizedPackages: {
      minor: { name: '小保养', key: 'minor', packages: [], expanded: true },
      major: { name: '大保养', key: 'major', packages: [], expanded: false },
      special: { name: '专项保养', key: 'special', packages: [], expanded: false }
    },

    // 当前展开的分类
    expandedCategory: 'minor',

    // 推荐套餐（兼容旧版）
    recommendedPackages: [],
    selectedPackageIndex: -1,

    // 当前选中的套餐（新的选择方式）
    selectedPackageId: null,

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

    // 车队配置（保养订单默认允许司机选择门店）
    fleetConfig: {
      allowDriverSelectStore: true, // 保养订单默认允许司机选择门店
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
    showTierPicker: false,

    // ==================== 门店选择相关（保养订单默认司机选择门店） ====================
    stores: [],              // 门店列表
    selectedStoreIndex: -1,  // 已选择的门店索引
    showStorePicker: false,  // 显示门店选择弹窗
    storeDetail: null,       // 门店详情
    showStoreDetail: false   // 显示门店详情弹窗
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
    this.loadStores(); // 加载门店列表
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
      const fleet = res.data.fleet || {};

      // 保养订单使用 storeSelectionConfig.maintenance 配置
      let allowDriverSelectStore = true; // 默认允许
      if (fleet.storeSelectionConfig && typeof fleet.storeSelectionConfig.maintenance === 'boolean') {
        allowDriverSelectStore = fleet.storeSelectionConfig.maintenance;
      } else if (typeof fleet.allowDriverSelectStore === 'boolean') {
        // 兼容旧配置
        allowDriverSelectStore = fleet.allowDriverSelectStore;
      }

      this.setData({
        fleetConfig: {
          ...fleet,
          allowDriverSelectStore: allowDriverSelectStore,
          maintenanceProductPermission: fleet.maintenanceProductPermission || 'fleet_control',
          maintenanceBudgetThreshold: fleet.maintenanceBudgetThreshold || 5000
        }
      });

      console.log('保养订单门店选择权限:', allowDriverSelectStore);
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

      const res = await request.get('/maintenance/types?enabled=true');

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
        allProducts: (res.data.products || []).map(item => localizeProduct(item))
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

    // 先设置默认地址（使用经纬度）
    that.setData({
      'serviceLocation.address': `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      'serviceLocation.latitude': latitude,
      'serviceLocation.longitude': longitude
    });

    // 如果需要更精确的地址，可以使用微信的逆地理编码API
    // 这里简化处理，直接使用经纬度
    // 注意：真机环境下不支持对象属性简写语法
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
   * 注意：必须先选择门店才能加载套餐，因为套餐是门店专属的
   */
  async loadRecommendedPackages() {
    const vehicle = this.data.vehicle;

    if (!vehicle) {
      return;
    }

    // 【重要】必须先选择门店才能加载套餐
    if (this.data.selectedStoreIndex === -1) {
      // 未选择门店时，清空套餐列表
      this.setData({
        topRecommendations: [],
        categorizedPackages: {
          minor: { name: '小保养', key: 'minor', packages: [], expanded: true },
          major: { name: '大保养', key: 'major', packages: [], expanded: false },
          special: { name: '专项保养', key: 'special', packages: [], expanded: false }
        },
        recommendedPackages: []
      });
      return;
    }

    try {
      this.setData({ 'loading.packages': true });

      // 构建请求参数，必须包含门店ID
      const params = {
        vehicleGroupId: vehicle.groupId || vehicle.vehicleGroup || vehicle.vehicleType || vehicle.group || '牵引车',
        mileage: this.data.milestone || vehicle.mileage || 0,
        storeId: this.data.stores[this.data.selectedStoreIndex]._id // 必须传递门店ID
      };

      const res = await request.get('/maintenance/recommendations', params);

      const data = res.data || {};

      // 处理智能推荐套餐
      const topRecommendations = (data.topRecommendations || []).map(pkg => localizePackage(pkg));

      // 处理分类套餐
      const categorized = data.categorizedPackages || {
        minor: { name: '小保养', key: 'minor', packages: [] },
        major: { name: '大保养', key: 'major', packages: [] },
        special: { name: '专项保养', key: 'special', packages: [] }
      };

      // 本地化套餐数据
      const localizedCategorized = {};
      for (const key in categorized) {
        localizedCategorized[key] = {
          ...categorized[key],
          packages: (categorized[key].packages || []).map(pkg => localizePackage(pkg)),
          expanded: key === 'minor' // 默认展开小保养
        };
      }

      // 兼容旧版：将所有套餐合并到 recommendedPackages
      const allPackages = [];
      for (const key in localizedCategorized) {
        allPackages.push(...localizedCategorized[key].packages);
      }

      this.setData({
        topRecommendations,
        categorizedPackages: localizedCategorized,
        recommendedPackages: allPackages // 兼容旧版逻辑
      });
    } catch (error) {
      console.error('加载推荐套餐失败:', error);
    } finally {
      this.setData({ 'loading.packages': false });
    }
  },

  /**
   * 选择套餐
   * 必须先选择门店才能选择套餐
   */
  onSelectPackage(e) {
    // 验证是否已选择门店
    if (this.data.selectedStoreIndex === -1) {
      wx.showToast({
        title: '请先选择门店',
        icon: 'none'
      });
      return;
    }

    const { index, category } = e.currentTarget.dataset;
    const packages = this.data.categorizedPackages[category]?.packages || [];
    const pkg = packages[index];

    if (pkg) {
      this.setData({
        selectedPackageId: pkg._id,
        selectedPackageIndex: -1 // 重置旧版索引
      });
      wx.showToast({
        title: `已选择：${pkg.name}`,
        icon: 'success'
      });
    }
  },

  /**
   * 展开/收起套餐分类
   */
  onToggleCategory(e) {
    const { category } = e.currentTarget.dataset;
    const currentExpanded = this.data.categorizedPackages[category]?.expanded;

    // 手风琴效果：只允许展开一个分类
    const updatedCategories = { ...this.data.categorizedPackages };
    for (const key in updatedCategories) {
      updatedCategories[key].expanded = (key === category && !currentExpanded);
    }

    this.setData({
      categorizedPackages: updatedCategories,
      expandedCategory: updatedCategories[category].expanded ? category : null
    });
  },

  /**
   * 展开/收起套餐详情
   */
  onTogglePackageDetail(e) {
    const { index, category } = e.currentTarget.dataset;
    const packages = this.data.categorizedPackages[category]?.packages || [];
    const pkg = packages[index];

    if (pkg) {
      const updatedPackages = [...packages];
      updatedPackages[index] = {
        ...pkg,
        expanded: !pkg.expanded
      };

      const updatedCategories = { ...this.data.categorizedPackages };
      updatedCategories[category].packages = updatedPackages;

      this.setData({
        categorizedPackages: updatedCategories
      });
    }
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
   * 修改我的位置
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
   * 输入里程
   */
  onMilestoneInput(e) {
    this.setData({
      milestone: e.detail.value
    });
  },

  /**
   * 添加里程照片
   */
  onAddMilestonePhoto() {
    const that = this;
    wx.chooseMedia({
      count: 3 - that.data.milestonePhotos.length,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const photos = res.tempFiles.map(file => file.tempFilePath);
        that.setData({
          milestonePhotos: that.data.milestonePhotos.concat(photos)
        });
      }
    });
  },

  /**
   * 删除里程照片
   */
  onDeletePhoto(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const photos = this.data.milestonePhotos;
    photos.splice(index, 1);
    this.setData({
      milestonePhotos: photos
    });
  },

  /**
   * 预览照片
   */
  onPreviewPhoto(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.milestonePhotos
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

    // 验证里程
    if (!this.data.milestone || this.data.milestone <= 0) {
      wx.showToast({
        title: '请输入当前里程',
        icon: 'none'
      });
      return;
    }

    // 验证里程照片
    if (this.data.milestonePhotos.length === 0) {
      wx.showToast({
        title: '请拍摄里程照片',
        icon: 'none'
      });
      return;
    }

    // 验证套餐选择
    if (!this.data.selectedPackageId) {
      wx.showToast({
        title: '请选择保养套餐',
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

    // 先上传照片
    wx.showLoading({ title: '上传照片中...' });

    try {
      const uploadedPhotos = [];

      for (const photoPath of this.data.milestonePhotos) {
        const uploadRes = await new Promise((resolve, reject) => {
          wx.uploadFile({
            url: request.getServerUrl() + '/api/upload',
            filePath: photoPath,
            name: 'file',
            header: {
              'Authorization': 'Bearer ' + wx.getStorageSync('token')
            },
            success: resolve,
            fail: reject
          });
        });

        const data = JSON.parse(uploadRes.data);
        if (data.success && data.data.url) {
          uploadedPhotos.push(data.data.url);
        }
      }

      wx.hideLoading();

      // 构建请求数据
      const data = {
        vehicleId: this.data.vehicle._id,
        maintenanceTypeId: type._id,
        milestone: parseInt(this.data.milestone),
        milestonePhotos: uploadedPhotos,
        serviceLocation: this.data.serviceLocation,
        appointment: this.data.preferredDate && this.data.preferredTimeSlot
          ? {
              expectedDate: this.data.preferredDate,
              expectedTimeSlot: this.data.preferredTimeSlot
            }
          : undefined,
        driverRemark: this.data.driverRemark
      };

      // 添加套餐ID
      data.packageId = this.data.selectedPackageId;

      // 添加门店ID（保养订单司机必选门店）
      if (this.data.selectedStoreIndex !== -1) {
        const storeId = this.data.stores[this.data.selectedStoreIndex]._id;
        data.storeId = storeId;
      } else {
        wx.hideLoading();
        wx.showToast({
          title: '请选择门店',
          icon: 'none'
        });
        this.setData({ submitting: false });
        return;
      }

      this.setData({ submitting: true });

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
      wx.hideLoading();
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // ==================== 门店选择相关方法 ====================

  /**
   * 加载门店列表
   */
  async loadStores() {
    try {
      const res = await request.get('/stores', {
        status: 'normal',
        limit: 100
      });

      const stores = (res.data.stores || []).map(store => ({
        _id: store._id,
        name: store.name,
        label: store.name,
        address: store.address,
        phone: store.phone,
        // 计算距离（如果有位置信息）
        distance: this.calculateDistance(store)
      }));

      this.setData({ stores });
    } catch (error) {
      console.error('加载门店列表失败:', error);
    }
  },

  /**
   * 计算与门店的距离
   */
  calculateDistance(store) {
    if (!store.latitude || !store.longitude || !this.data.serviceLocation.latitude || !this.data.serviceLocation.longitude) {
      return null;
    }

    const R = 6371; // 地球半径，单位km
    const lat1 = this.data.serviceLocation.latitude * Math.PI / 180;
    const lat2 = store.latitude * Math.PI / 180;
    const deltaLat = (store.latitude - this.data.serviceLocation.latitude) * Math.PI / 180;
    const deltaLon = (store.longitude - this.data.serviceLocation.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return (R * c).toFixed(1);
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
   * 选择门店
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

    // 重新加载推荐套餐（基于选中的门店）
    const vehicle = this.data.vehicle;
    if (vehicle && this.data.selectedTypeIndex >= 0) {
      this.loadRecommendedPackages();
    }
  },

  /**
   * 查看门店详情
   */
  async onViewStoreDetail(e) {
    const store = e.currentTarget.dataset.store;

    // 获取门店评价
    try {
      const reviewsRes = await request.get('/store-reviews', {
        storeId: store._id,
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
   * 联系门店
   */
  onCallStore() {
    const store = this.data.storeDetail;
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
  }
});
