// pages/report/report.js - 报修申请页面
const app = getApp();
const request = require('../../utils/request');
const mapConfig = require('../../config/map.config');

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

    // 服务地址
    serviceLocation: {
      address: '',
      latitude: null,
      longitude: null
    },

    // 车队配置
    allowDriverSelectStore: false, // 是否允许司机选择门店

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

    // 显示选择器弹窗
    showVehiclePicker: false,
    showStorePicker: false,
    showDatePicker: false,
    showTimePicker: false,
    showDateTimePicker: false,
    showLocationPicker: false, // 服务地址选择弹窗

    // 时间选择列表（半小时为单位，7:00-22:00）
    timeSlots: [],

    // 显示媒体选择弹窗
    showMediaPicker: false
  },

  onLoad(options) {
    // 处理业务类型
    if (options.type === 'maintenance') {
      this.setData({ type: 'maintenance' });
      wx.setNavigationBarTitle({ title: '保养申请' });
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
      timeSlots: timeSlots
    });

    this.loadVehicles();
    this.getCurrentLocation();
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
        that.useDefaultLocation();
      }
    });
  },

  /**
   * 使用默认地址（降级方案）
   */
  useDefaultLocation() {
    const that = this;

    // 从配置中获取默认地址
    const defaultLocation = mapConfig.defaultLocations.find(loc => loc.isDefault) ||
                         mapConfig.defaultLocations[0];

    if (defaultLocation) {
      that.setData({
        'serviceLocation.address': defaultLocation.address,
        'serviceLocation.latitude': defaultLocation.latitude,
        'serviceLocation.longitude': defaultLocation.longitude
      });

      wx.showToast({
        title: '已使用默认地址',
        icon: 'none',
        duration: 2000
      });
    }

    // 仍需加载门店和车队配置
    that.loadStores();
    that.loadFleetConfig();
  },

  /**
   * 逆地理编码获取地址
   */
  loadAddress(latitude, longitude) {
    const that = this;

    // 如果腾讯地图SDK可用，使用逆地理编码
    if (qqmapsdk && mapConfig.tencentMap.key !== 'YOUR_TENCENT_MAP_KEY') {
      qqmapsdk.reverseGeocoder({
        location: { latitude, longitude },
        success: (res) => {
          const address = res.result.address;
          that.setData({
            'serviceLocation.address': address,
            'serviceLocation.latitude': latitude,
            'serviceLocation.longitude': longitude
          });
        },
        fail: () => {
          // 逆地理编码失败，使用坐标作为地址
          that.setData({
            'serviceLocation.address': `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            'serviceLocation.latitude': latitude,
            'serviceLocation.longitude': longitude
          });
        }
      });
    } else {
      // SDK未配置，使用默认地址或坐标
      const defaultLocation = mapConfig.defaultLocations.find(loc => loc.isDefault) ||
                           mapConfig.defaultLocations[0];

      if (defaultLocation) {
        that.setData({
          'serviceLocation.address': defaultLocation.address,
          'serviceLocation.latitude': defaultLocation.latitude,
          'serviceLocation.longitude': defaultLocation.longitude
        });
      } else {
        // 没有默认地址，使用坐标
        that.setData({
          'serviceLocation.address': `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          'serviceLocation.latitude': latitude,
          'serviceLocation.longitude': longitude
        });
      }
    }
  },

  /**
   * 加载车队配置
   */
  async loadFleetConfig() {
    try {
      // 获取司机所属车队ID
      const userRes = await request.get('/user/me');
      const fleetId = userRes.data.fleetInfo?.fleetId;
      if (!fleetId) {
        return;
      }

      // 获取车队配置
      const fleetRes = await request.get(`/fleet/${fleetId}`);
      const allowDriverSelectStore = fleetRes.data.allowDriverSelectStore || false;

      this.setData({ allowDriverSelectStore });

      // 如果不允许司机选择门店，清空门店选择
      if (!allowDriverSelectStore) {
        this.setData({ selectedStoreIndex: -1 });
      }
    } catch (error) {
      console.error('加载车队配置失败:', error);
    }
  },

  /**
   * 加载附近门店（推荐门店）
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
            businessHours: s.businessHours || '8:00-20:00',
            contactPhone: s.contact?.phone || '',
            contactName: s.contact?.name || '',
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
   * 加载所有门店（附近没有门店时的降级方案）
   */
  async loadAllStores() {
    try {
      const res = await request.get('/stores?status=normal&limit=100');

      const storeList = res.data.stores || [];

      const stores = storeList.map(s => ({
        _id: s._id,
        label: s.name,
        sublabel: `${s.address.city || ''} ${s.address.district || s.address || ''}`,
        businessHours: s.businessHours || '8:00-20:00',
        contactPhone: s.contact?.phone || '',
        contactName: s.contact?.name || '',
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
   * 打开服务地址选择器
   */
  openLocationPicker() {
    this.setData({ showLocationPicker: true });
  },

  /**
   * 关闭服务地址选择器
   */
  closeLocationPicker() {
    this.setData({ showLocationPicker: false });
  },

  /**
   * 选择服务地址
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
      selectedStoreIndex: index,
      showStorePicker: false
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
   * 日期时间选择器中的时间选择
   */
  onDateTimeTimeSelect(e) {
    const time = e.currentTarget.dataset.time;
    this.setData({
      appointmentTime: time,
      showDateTimePicker: false
    });
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
    this.setData({
      mileage: e.detail.value
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
   * 提交报修申请
   */
  async onSubmit() {
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
      wx.showToast({
        title: '请选择门店',
        icon: 'none'
      });
      return;
    }

    // 验证预约到店时间（仅司机选择门店时必填）
    if (this.data.allowDriverSelectStore && (!this.data.appointmentDate || !this.data.appointmentTime)) {
      wx.showToast({
        title: '请选择预约到店时间',
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

      // 上传图片
      const uploadedImages = [];
      for (let imagePath of this.data.faultImages) {
        try {
          const uploadRes = await this.uploadImage(imagePath);
          uploadedImages.push(uploadRes.url);
        } catch (error) {
          console.error('上传图片失败:', error);
        }
      }

      // 上传视频
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

      // 组装预约时间
      let appointmentAt = null;
      if (this.data.appointmentDate && this.data.appointmentTime) {
        appointmentAt = `${this.data.appointmentDate} ${this.data.appointmentTime}`;
      }

      // 构建订单数据
      const orderData = {
        type: this.data.type,
        vehicleId: vehicle._id,
        faultDescription: this.data.faultDescription,
        faultImages: uploadedImages,
        faultVideos: uploadedVideos,
        appointmentAt: appointmentAt,
        milestone: parseFloat(this.data.mileage),
        milestonePhotos: uploadedMileagePhotos,
        remark: this.data.remark || ''
      };

      // 添加服务地址
      if (this.data.serviceLocation.latitude && this.data.serviceLocation.longitude) {
        orderData.serviceLocation = this.data.serviceLocation;
      }

      // 如果允许司机选择门店且已选择，添加门店ID
      if (this.data.allowDriverSelectStore && this.data.selectedStoreIndex !== -1) {
        const store = this.data.stores[this.data.selectedStoreIndex];
        orderData.storeId = store._id;
      }

      const orderResult = await request.post('/orders', orderData);

      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });

      // 显示提示并跳转
      setTimeout(() => {
        const tipMessage = this.data.allowDriverSelectStore
          ? '订单已提交，请等待车队审批'
          : '订单已提交，车队管理员将为您选择门店并审批';

        wx.showModal({
          title: '温馨提示',
          content: tipMessage,
          showCancel: false,
          confirmText: '我知道了',
          success: () => {
            // 跳转到订单详情页
            const orderId = orderResult.data._id;
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
  }
});
