// pages/address-list/address-list.js
const STORAGE_KEY = 'savedAddresses';

function getMockAddresses() {
  return [
    {
      _id: 'mock_1',
      name: '宝安物流园',
      contactName: '张三',
      phone: '0755-12345678',
      address: '深圳市宝安区福永街道物流园路88号',
      latitude: 22.6543,
      longitude: 113.8234,
      isDefault: true,
      remark: '目的地'
    },
    {
      _id: 'mock_2',
      name: '龙岗配送中心',
      contactName: '李四',
      phone: '0755-87654321',
      address: '深圳市龙岗区坂田街道云里智能园',
      latitude: 22.6234,
      longitude: 114.0789,
      isDefault: false,
      remark: '常用地址'
    },
    {
      _id: 'mock_3',
      name: '盐田港仓库',
      contactName: '王五',
      phone: '0755-66668888',
      address: '深圳市盐田区盐田港大道西168号',
      latitude: 22.5432,
      longitude: 114.2567,
      isDefault: false,
      remark: ''
    }
  ];
}

function getSavedAddresses() {
  const saved = wx.getStorageSync(STORAGE_KEY);
  if (Array.isArray(saved) && saved.length > 0) {
    return saved;
  }

  const mock = getMockAddresses();
  wx.setStorageSync(STORAGE_KEY, mock);
  return mock;
}

function saveAddresses(addresses) {
  wx.setStorageSync(STORAGE_KEY, addresses);
}

Page({
  data: {
    addressList: []
  },

  onLoad() {
    this.loadAddressList();
  },

  onShow() {
    this.loadAddressList();
  },

  async loadAddressList() {
    try {
      wx.showLoading({ title: '加载中...' });
      this.setData({
        addressList: getSavedAddresses()
      });
    } catch (error) {
      console.error('加载地址列表失败:', error);
      this.loadMockAddresses();
    } finally {
      wx.hideLoading();
    }
  },

  loadMockAddresses() {
    const mockAddresses = getMockAddresses();
    saveAddresses(mockAddresses);
    this.setData({
      addressList: mockAddresses
    });
    wx.showToast({
      title: '已加载本地测试数据',
      icon: 'none'
    });
  },

  onAddAddress() {
    wx.navigateTo({
      url: '/pages/address-add/address-add'
    });
  },

  onEditAddress(e) {
    const { address } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/address-add/address-add?id=${address._id}`
    });
  },

  onDeleteAddress(e) {
    const { id } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      confirmColor: '#f56c6c',
      success: (res) => {
        if (!res.confirm) return;

        try {
          const nextAddresses = getSavedAddresses().filter(item => item._id !== id);
          saveAddresses(nextAddresses);
          this.setData({ addressList: nextAddresses });
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        } catch (error) {
          console.error('删除地址失败:', error);
          wx.showToast({
            title: '删除失败',
            icon: 'none'
          });
        }
      }
    });
  }
});
