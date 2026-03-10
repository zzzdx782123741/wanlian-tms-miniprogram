// pages/auth/store-register/store-register.js
const request = require('../../../utils/request');

Page({
  data: {
    currentStep: 0,
    steps: ['基本信息', '资质信息', '服务能力', '定价信息', '结算信息', '管理员账号', '确认提交'],
    agreedToTerms: false,
    submitting: false,

    storeTypeIndex: 0,
    storeTypes: [
      { value: 'comprehensive', label: '综合维修厂' },
      { value: 'specialized', label: '专修店' },
      { value: 'authorized_4s', label: '4S店授权店' },
      { value: 'quick_service', label: '快修店' },
      { value: 'chain', label: '连锁门店' }
    ],

    serviceTypes: [
      { value: '维修服务', label: '维修服务' },
      { value: '保养服务', label: '保养服务' }
    ],

    settlementCycles: [
      { value: 'monthly', label: '月结' },
      { value: 'quarterly', label: '季结' },
      { value: 'per_order', label: '单笔结算' }
    ],

    brandSpecialtiesText: '',
    mainModelsText: '',

    formData: {
      name: '',
      storeType: 'comprehensive',
      contact: {
        name: '',
        phone: '',
        backupPhone: ''
      },
      address: {
        detail: ''
      },
      businessHours: '8:00-18:00',
      serviceRange: 50,
      businessLicense: {
        number: '',
        url: ''
      },
      organizationCode: {
        number: '',
        url: ''
      },
      transportLicense: {
        number: '',
        url: ''
      },
      repairLicense: {
        number: '',
        url: ''
      },
      serviceCapabilities: {
        serviceTypes: [],
        brandSpecialties: [],
        mainModels: [],
        staffing: {
          seniorTechnicians: 0,
          technicians: 0,
          workers: 0,
          apprentices: 0
        },
        dailyCapacity: {
          maxOrders: 10,
          averageDuration: 120
        }
      },
      pricingInfo: {
        laborRates: {
          minorRepair: 0,
          mediumRepair: 0,
          majorRepair: 0
        },
        serviceFee: 0,
        additionalFeeNote: ''
      },
      bankAccount: {
        bankName: '',
        accountNumber: '',
        accountName: '',
        settlementCycle: 'monthly'
      },
      adminPhone: '',
      adminName: ''
    }
  },

  // 门店类型选择
  onStoreTypeChange(e) {
    const index = e.detail.value;
    this.setData({
      storeTypeIndex: index,
      'formData.storeType': this.data.storeTypes[index].value
    });
  },

  // 基本信息
  onNameInput(e) { this.setData({ 'formData.name': e.detail.value }); },
  onContactNameInput(e) { this.setData({ 'formData.contact.name': e.detail.value }); },
  onContactPhoneInput(e) { this.setData({ 'formData.contact.phone': e.detail.value }); },
  onBackupPhoneInput(e) { this.setData({ 'formData.contact.backupPhone': e.detail.value }); },
  onAddressInput(e) { this.setData({ 'formData.address.detail': e.detail.value }); },
  onBusinessHoursInput(e) { this.setData({ 'formData.businessHours': e.detail.value }); },
  onServiceRangeInput(e) { this.setData({ 'formData.serviceRange': e.detail.value }); },

  // 资质信息
  onLicenseNumberInput(e) { this.setData({ 'formData.businessLicense.number': e.detail.value }); },
  onOrgCodeNumberInput(e) { this.setData({ 'formData.organizationCode.number': e.detail.value }); },
  onTransportNumberInput(e) { this.setData({ 'formData.transportLicense.number': e.detail.value }); },
  onRepairLicenseNumberInput(e) { this.setData({ 'formData.repairLicense.number': e.detail.value }); },

  // 服务能力
  onServiceTypeChange(e) {
    this.setData({
      'formData.serviceCapabilities.serviceTypes': e.detail.value
    });
  },
  onBrandSpecialtiesInput(e) {
    const text = e.detail.value;
    const array = text.split(',').filter(s => s.trim());
    this.setData({
      brandSpecialtiesText: text,
      'formData.serviceCapabilities.brandSpecialties': array
    });
  },
  onMainModelsInput(e) {
    const text = e.detail.value;
    const array = text.split(',').filter(s => s.trim());
    this.setData({
      mainModelsText: text,
      'formData.serviceCapabilities.mainModels': array
    });
  },
  onSeniorTechniciansInput(e) { this.setData({ 'formData.serviceCapabilities.staffing.seniorTechnicians': e.detail.value }); },
  onTechniciansInput(e) { this.setData({ 'formData.serviceCapabilities.staffing.technicians': e.detail.value }); },
  onWorkersInput(e) { this.setData({ 'formData.serviceCapabilities.staffing.workers': e.detail.value }); },
  onApprenticesInput(e) { this.setData({ 'formData.serviceCapabilities.staffing.apprentices': e.detail.value }); },
  onMaxOrdersInput(e) { this.setData({ 'formData.serviceCapabilities.dailyCapacity.maxOrders': e.detail.value }); },

  // 定价信息
  onMinorRepairInput(e) { this.setData({ 'formData.pricingInfo.laborRates.minorRepair': e.detail.value }); },
  onMediumRepairInput(e) { this.setData({ 'formData.pricingInfo.laborRates.mediumRepair': e.detail.value }); },
  onMajorRepairInput(e) { this.setData({ 'formData.pricingInfo.laborRates.majorRepair': e.detail.value }); },
  onServiceFeeInput(e) { this.setData({ 'formData.pricingInfo.serviceFee': e.detail.value }); },
  onAdditionalFeeNoteInput(e) { this.setData({ 'formData.pricingInfo.additionalFeeNote': e.detail.value }); },

  // 结算信息
  onBankNameInput(e) { this.setData({ 'formData.bankAccount.bankName': e.detail.value }); },
  onAccountNumberInput(e) { this.setData({ 'formData.bankAccount.accountNumber': e.detail.value }); },
  onAccountNameInput(e) { this.setData({ 'formData.bankAccount.accountName': e.detail.value }); },
  onSettlementCycleChange(e) { this.setData({ 'formData.bankAccount.settlementCycle': e.detail.value[0] }); },

  // 管理员账号
  onAdminPhoneInput(e) { this.setData({ 'formData.adminPhone': e.detail.value }); },
  onAdminNameInput(e) { this.setData({ 'formData.adminName': e.detail.value }); },

  // 选择营业执照
  chooseBusinessLicense() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadImage(res.tempFilePaths[0], 'businessLicense');
      }
    });
  },

  // 上传图片
  uploadImage(filePath, type) {
    const token = wx.getStorageSync('token');

    wx.uploadFile({
      url: getApp().globalData.apiUrl + '/upload',
      filePath: filePath,
      name: 'file',
      header: {
        'Authorization': 'Bearer ' + token
      },
      success: (res) => {
        const data = JSON.parse(res.data);
        if (data.success) {
          this.setData({
            [`formData.${type}.url`]: data.data.url
          });
          wx.showToast({ title: '上传成功', icon: 'success' });
        } else {
          wx.showToast({ title: data.message || '上传失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: [url]
    });
  },

  // 移除营业执照
  removeBusinessLicense() {
    this.setData({
      'formData.businessLicense.url': ''
    });
  },

  // 协议勾选
  onAgreementChange(e) {
    this.setData({
      agreedToTerms: e.detail.value.includes('agree')
    });
  },

  // 验证步骤
  validateStep(step) {
    const { formData } = this.data;

    switch (step) {
      case 0: // 基本信息
        if (!formData.name.trim()) {
          wx.showToast({ title: '请输入门店名称', icon: 'none' });
          return false;
        }
        if (!formData.contact.name.trim()) {
          wx.showToast({ title: '请输入联系人姓名', icon: 'none' });
          return false;
        }
        if (!formData.contact.phone.trim()) {
          wx.showToast({ title: '请输入联系电话', icon: 'none' });
          return false;
        }
        if (!/^1[3-9]\d{9}$/.test(formData.contact.phone)) {
          wx.showToast({ title: '联系电话格式不正确', icon: 'none' });
          return false;
        }
        if (!formData.address.detail.trim()) {
          wx.showToast({ title: '请输入详细地址', icon: 'none' });
          return false;
        }
        if (!formData.businessHours.trim()) {
          wx.showToast({ title: '请输入营业时间', icon: 'none' });
          return false;
        }
        break;

      case 1: // 资质信息
        if (!formData.businessLicense.number.trim()) {
          wx.showToast({ title: '请输入营业执照号码', icon: 'none' });
          return false;
        }
        if (!formData.businessLicense.url) {
          wx.showToast({ title: '请上传营业执照照片', icon: 'none' });
          return false;
        }
        break;

      case 4: // 结算信息
        if (!formData.bankAccount.bankName.trim()) {
          wx.showToast({ title: '请输入开户银行', icon: 'none' });
          return false;
        }
        if (!formData.bankAccount.accountNumber.trim()) {
          wx.showToast({ title: '请输入银行账号', icon: 'none' });
          return false;
        }
        if (!formData.bankAccount.accountName.trim()) {
          wx.showToast({ title: '请输入开户名称', icon: 'none' });
          return false;
        }
        break;

      case 5: // 管理员账号
        if (!formData.adminPhone.trim()) {
          wx.showToast({ title: '请输入登录账号', icon: 'none' });
          return false;
        }
        if (!/^1[3-9]\d{9}$/.test(formData.adminPhone)) {
          wx.showToast({ title: '登录账号必须是手机号', icon: 'none' });
          return false;
        }
        if (!formData.adminName.trim()) {
          wx.showToast({ title: '请输入管理员姓名', icon: 'none' });
          return false;
        }
        break;

      case 6: // 确认提交
        if (!this.data.agreedToTerms) {
          wx.showToast({ title: '请先阅读并同意入驻协议', icon: 'none' });
          return false;
        }
        break;
    }

    return true;
  },

  // 下一步
  handleNext() {
    if (!this.validateStep(this.data.currentStep)) {
      return;
    }

    this.setData({
      currentStep: this.data.currentStep + 1
    });
  },

  // 上一步
  handlePrev() {
    if (this.data.currentStep > 0) {
      this.setData({
        currentStep: this.data.currentStep - 1
      });
    }
  },

  // 提交注册
  async handleSubmit() {
    if (!this.validateStep(6)) {
      return;
    }

    const { formData } = this.data;

    try {
      this.setData({ submitting: true });
      wx.showLoading({ title: '提交中...' });

      const res = await request.post('/stores/register', {
        ...formData,
        serviceCapabilities: {
          ...formData.serviceCapabilities,
          brandSpecialties: formData.serviceCapabilities.brandSpecialties,
          mainModels: formData.serviceCapabilities.mainModels
        }
      });

      wx.hideLoading();
      this.setData({ submitting: false });

      wx.showModal({
        title: '申请已提交',
        content: '门店入驻申请已提交，请等待平台审核。审核通过后，我们将使用管理员账号信息联系您。',
        showCancel: false,
        success: () => {
          // 返回登录页
          wx.navigateBack({
            delta: 2
          });
        }
      });

    } catch (error) {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({
        title: error.message || '提交申请失败',
        icon: 'none'
      });
    }
  }
});
