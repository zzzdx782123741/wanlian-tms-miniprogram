// pages/address-add/address-add.js
const STORAGE_KEY = 'savedAddresses';

function getSavedAddresses() {
  const saved = wx.getStorageSync(STORAGE_KEY);
  return Array.isArray(saved) ? saved : [];
}

function saveAddresses(addresses) {
  wx.setStorageSync(STORAGE_KEY, addresses);
}

function withDefaultFlag(addresses, currentId, isDefault) {
  if (!isDefault) return addresses;
  return addresses.map(item => ({
    ...item,
    isDefault: item._id === currentId
  }));
}

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
    if (options.id) {
      this.setData({
        isEdit: true,
        addressId: options.id
      });
      this.loadAddressDetail(options.id);
    }
  },

  async loadAddressDetail(id) {
    try {
      wx.showLoading({ title: '加载中...' });
      const address = getSavedAddresses().find(item => item._id === id);
      if (address) {
        this.setData({
          formData: address
        });
      }
    } catch (error) {
      console.error('加载地址详情失败:', error);
    } finally {
      wx.hideLoading();
    }
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`formData.${field}`]: value
    });
  },

  onSwitchChange(e) {
    this.setData({
      'formData.isDefault': e.detail.value
    });
  },

  async onSave() {
    const { formData, isEdit, addressId } = this.data;

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

      const addresses = getSavedAddresses();

      if (isEdit) {
        const nextAddresses = addresses.map(item => {
          if (item._id !== addressId) return item;
          return { ...item, ...formData };
        });
        saveAddresses(withDefaultFlag(nextAddresses, addressId, formData.isDefault));
        wx.showToast({
          title: '修改成功',
          icon: 'success'
        });
      } else {
        const nextId = `addr_${Date.now()}`;
        const nextAddresses = addresses.concat([{ ...formData, _id: nextId }]);
        saveAddresses(withDefaultFlag(nextAddresses, nextId, formData.isDefault));
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
      }

      setTimeout(() => {
        wx.navigateBack();
      }, 1200);
    } catch (error) {
      console.error('保存地址失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
      wx.hideLoading();
    }
  }
});
