// pages/address-list/address-list.js - 服务地址列表
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    addressList: []
  },

  onLoad() {
    this.loadAddressList();
  },

  onShow() {
    // 从添加/编辑页面返回时刷新列表
    this.loadAddressList();
  },

  /**
   * 加载地址列表
   */
  async loadAddressList() {
    try {
      wx.showLoading({ title: '加载中...' });

      const res = await request.get('/user/addresses');

      this.setData({
        addressList: res.data.addresses || []
      });
    } catch (error) {
      console.error('加载地址列表失败:', error);

      // 如果API未实现，使用本地模拟数据
      this.loadMockAddresses();
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 加载模拟地址数据（用于测试）
   */
  loadMockAddresses() {
    // 优先从本地存储加载
    const localAddresses = wx.getStorageSync('savedAddresses');
    if (localAddresses && localAddresses.length > 0) {
      this.setData({
        addressList: localAddresses
      });
      return;
    }

    // 如果本地没有，使用默认模拟数据
    const mockAddresses = [
      {
        _id: 'mock_1',
        name: '宝安物流园',
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
        phone: '0755-66668888',
        address: '深圳市盐田区盐田港大道西168号',
        latitude: 22.5432,
        longitude: 114.2567,
        isDefault: false,
        remark: ''
      }
    ];

    // 保存到本地存储
    wx.setStorageSync('savedAddresses', mockAddresses);

    this.setData({
      addressList: mockAddresses
    });

    wx.showToast({
      title: '使用测试数据',
      icon: 'none'
    });
  },

  /**
   * 添加新地址
   */
  onAddAddress() {
    wx.navigateTo({
      url: '/pages/address-add/address-add'
    });
  },

  /**
   * 编辑地址
   */
  onEditAddress(e) {
    const { address } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/address-add/address-add?id=${address._id}`
    });
  },

  /**
   * 删除地址
   */
  onDeleteAddress(e) {
    const { id } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      confirmColor: '#f56c6c',
      success: async (res) => {
        if (res.confirm) {
          try {
            await request.delete(`/user/addresses/${id}`);
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            this.loadAddressList();
          } catch (error) {
            console.error('删除地址失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  }
});
