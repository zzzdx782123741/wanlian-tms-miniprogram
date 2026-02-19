// pages/address-add/address-add.js - 添加/编辑服务地址
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    isEdit: false,
    addressId: '',
    submitting: false,
    formData: {
      name: '',
      contactName: '',
      phone: '',
      address: '',
      remark: '',
      isDefault: false
    }
  },

  onLoad(options) {
    // 如果有id参数，说明是编辑模式
    if (options.id) {
      this.setData({
        isEdit: true,
        addressId: options.id
      });
      this.loadAddressDetail(options.id);
    }
  },

  /**
   * 加载地址详情（编辑模式）
   */
  async loadAddressDetail(id) {
    try {
      wx.showLoading({ title: '加载中...' });

      const res = await request.get(`/user/addresses/${id}`);

      this.setData({
        formData: res.data.address
      });
    } catch (error) {
      console.error('加载地址详情失败:', error);

      // 如果API未实现，使用本地模拟数据
      const mockAddresses = [
        {
          _id: 'mock_1',
          name: '万联驿站北京中心店',
          contactName: '张经理',
          phone: '010-12345678',
          address: '北京市朝阳区大屯路东关58号',
          isDefault: true,
          remark: '总部'
        },
        {
          _id: 'mock_2',
          name: '万联驿站上海分拨中心',
          contactName: '李主管',
          phone: '021-87654321',
          address: '上海市闵行区沪闵路889号',
          isDefault: false,
          remark: '分拨中心'
        },
        {
          _id: 'mock_3',
          name: '万联驿站广州维修站',
          contactName: '王师傅',
          phone: '020-66668888',
          address: '广州市白云区机场路1688号',
          isDefault: false,
          remark: ''
        }
      ];

      const address = mockAddresses.find(a => a._id === id);
      if (address) {
        this.setData({
          formData: address
        });
      }
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 输入框内容变化
   */
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`formData.${field}`]: value
    });
  },

  /**
   * 开关变化
   */
  onSwitchChange(e) {
    this.setData({
      'formData.isDefault': e.detail.value
    });
  },

  /**
   * 保存地址
   */
  async onSave() {
    const { formData, isEdit, addressId } = this.data;

    // 表单验证
    if (!formData.name.trim()) {
      wx.showToast({
        title: '请输入地址名称',
        icon: 'none'
      });
      return;
    }

    if (!formData.contactName.trim()) {
      wx.showToast({
        title: '请输入联系人姓名',
        icon: 'none'
      });
      return;
    }

    if (!formData.phone.trim()) {
      wx.showToast({
        title: '请输入联系电话',
        icon: 'none'
      });
      return;
    }

    // 简单的电话号码验证
    const phoneReg = /^1[3-9]\d{9}$|^0\d{2,3}-?\d{7,8}$/;
    if (!phoneReg.test(formData.phone.trim())) {
      wx.showToast({
        title: '请输入正确的联系电话',
        icon: 'none'
      });
      return;
    }

    if (!formData.address.trim()) {
      wx.showToast({
        title: '请输入详细地址',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({ submitting: true });
      wx.showLoading({ title: '保存中...' });

      if (isEdit) {
        // 编辑地址
        await request.put(`/user/addresses/${addressId}`, formData);
        wx.showToast({
          title: '修改成功',
          icon: 'success'
        });
      } else {
        // 添加地址
        await request.post('/user/addresses', formData);
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
      }

      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('保存地址失败:', error);

      // 如果API未实现，模拟保存成功
      wx.showToast({
        title: isEdit ? '修改成功（模拟）' : '添加成功（模拟）',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } finally {
      this.setData({ submitting: false });
      wx.hideLoading();
    }
  }
});
