// pages/auth/fleet-register/fleet-register.js
const request = require('../../../utils/request');

Page({
  data: {
    currentStep: 0,
    steps: ['基本信息', '法人信息', '资质材料', '管理员账号', '确认提交'],
    agreedToTerms: false,
    submitting: false,

    fleetTypeIndex: 0,
    fleetTypes: [
      { value: 'logistics_company', label: '物流公司' },
      { value: 'individual_operator', label: '运输个体户' },
      { value: 'other', label: '其他企业' }
    ],

    formData: {
      name: '',
      fleetType: 'logistics_company',
      creditCode: '',
      businessScope: '',
      contact: {
        name: '',
        phone: '',
        email: ''
      },
      address: {
        detail: ''
      },
      legalRepresentative: {
        name: '',
        idCard: '',
        phone: ''
      },
      businessLicense: {
        number: '',
        url: ''
      },
      transportLicense: {
        number: '',
        url: ''
      },
      adminPhone: '',
      adminName: ''
    }
  },

  // 车队类型选择
  onFleetTypeChange(e) {
    const index = e.detail.value;
    this.setData({
      fleetTypeIndex: index,
      'formData.fleetType': this.data.fleetTypes[index].value
    });
  },

  // 基本信息
  onNameInput(e) { this.setData({ 'formData.name': e.detail.value }); },
  onCreditCodeInput(e) { this.setData({ 'formData.creditCode': e.detail.value }); },
  onBusinessScopeInput(e) { this.setData({ 'formData.businessScope': e.detail.value }); },
  onContactNameInput(e) { this.setData({ 'formData.contact.name': e.detail.value }); },
  onContactPhoneInput(e) { this.setData({ 'formData.contact.phone': e.detail.value }); },
  onContactEmailInput(e) { this.setData({ 'formData.contact.email': e.detail.value }); },

  // 法人信息
  onLegalNameInput(e) { this.setData({ 'formData.legalRepresentative.name': e.detail.value }); },
  onLegalIdCardInput(e) { this.setData({ 'formData.legalRepresentative.idCard': e.detail.value }); },
  onLegalPhoneInput(e) { this.setData({ 'formData.legalRepresentative.phone': e.detail.value }); },

  // 资质材料
  onLicenseNumberInput(e) { this.setData({ 'formData.businessLicense.number': e.detail.value }); },
  onTransportNumberInput(e) { this.setData({ 'formData.transportLicense.number': e.detail.value }); },

  // 管理员账号
  onAdminPhoneInput(e) { this.setData({ 'formData.adminPhone': e.detail.value }); },
  onAdminNameInput(e) { this.setData({ 'formData.adminName': e.detail.value }); },
  onAddressInput(e) { this.setData({ 'formData.address.detail': e.detail.value }); },

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

  // 选择运输许可证
  chooseTransportLicense() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadImage(res.tempFilePaths[0], 'transportLicense');
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
          if (type === 'businessLicense') {
            this.setData({
              'formData.businessLicense.url': data.data.url
            });
          } else if (type === 'transportLicense') {
            this.setData({
              'formData.transportLicense.url': data.data.url
            });
          }
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

  // 移除运输许可证
  removeTransportLicense() {
    this.setData({
      'formData.transportLicense.url': ''
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
          wx.showToast({ title: '请输入车队名称', icon: 'none' });
          return false;
        }
        if (!formData.creditCode.trim()) {
          wx.showToast({ title: '请输入统一社会信用代码', icon: 'none' });
          return false;
        }
        if (formData.creditCode.length !== 18) {
          wx.showToast({ title: '统一社会信用代码应为18位', icon: 'none' });
          return false;
        }
        if (!formData.contact.name.trim()) {
          wx.showToast({ title: '请输入联系人姓名', icon: 'none' });
          return false;
        }
        if (!formData.contact.phone.trim()) {
          wx.showToast({ title: '请输入联系人电话', icon: 'none' });
          return false;
        }
        if (!/^1[3-9]\d{9}$/.test(formData.contact.phone)) {
          wx.showToast({ title: '联系人电话格式不正确', icon: 'none' });
          return false;
        }
        break;

      case 1: // 法人信息
        if (!formData.legalRepresentative.name.trim()) {
          wx.showToast({ title: '请输入法人代表姓名', icon: 'none' });
          return false;
        }
        if (!formData.legalRepresentative.idCard.trim()) {
          wx.showToast({ title: '请输入法人身份证号', icon: 'none' });
          return false;
        }
        if (!/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[0-9Xx]$/.test(formData.legalRepresentative.idCard)) {
          wx.showToast({ title: '法人身份证号格式不正确', icon: 'none' });
          return false;
        }
        if (!formData.legalRepresentative.phone.trim()) {
          wx.showToast({ title: '请输入法人手机号', icon: 'none' });
          return false;
        }
        if (!/^1[3-9]\d{9}$/.test(formData.legalRepresentative.phone)) {
          wx.showToast({ title: '法人手机号格式不正确', icon: 'none' });
          return false;
        }
        break;

      case 2: // 资质材料
        if (!formData.businessLicense.number.trim()) {
          wx.showToast({ title: '请输入营业执照号码', icon: 'none' });
          return false;
        }
        if (!formData.businessLicense.url) {
          wx.showToast({ title: '请上传营业执照照片', icon: 'none' });
          return false;
        }
        break;

      case 3: // 管理员账号
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

      case 4: // 确认提交
        if (!this.data.agreedToTerms) {
          wx.showToast({ title: '请阅读并同意注册协议', icon: 'none' });
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
    if (!this.validateStep(4)) {
      return;
    }

    const { formData, fleetTypes, fleetTypeIndex } = this.data;

    try {
      this.setData({ submitting: true });
      wx.showLoading({ title: '提交中...' });

      const res = await request.post('/fleets/register', {
        name: formData.name,
        fleetType: fleetTypes[fleetTypeIndex].value,
        creditCode: formData.creditCode,
        businessScope: formData.businessScope,
        contact: formData.contact,
        address: { detail: formData.address.detail },
        legalRepresentative: formData.legalRepresentative,
        businessLicense: formData.businessLicense,
        transportLicense: formData.transportLicense
      });

      wx.hideLoading();
      this.setData({ submitting: false });

      wx.showModal({
        title: '注册成功',
        content: '车队注册申请已提交，请等待平台审核。审核通过后，我们将使用管理员账号信息联系您。',
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
        title: error.message || '注册失败',
        icon: 'none'
      });
    }
  }
});
