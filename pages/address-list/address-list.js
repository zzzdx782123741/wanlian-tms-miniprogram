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
    const mockAddresses = [
      {
        _id: 'mock_1',
        name: '万联驿站北京中心店',
        phone: '010-12345678',
        address: '北京市朝阳区大屯路东关号58号',
        isDefault: true,
        remark: '总部'
      },
      {
        _id: 'mock_2',
        name: '万联驿站上海分拨中心',
        phone: '021-87654321',
        address: '上海市闵行区沪闵路号889号',
        isDefault: false,
        remark: '分拨中心'
      },
      {
        _id: 'mock_3',
        name: '万联驿站广州维修站',
        phone: '020-66668888',
        address: '广州市白云区机场路号1688号',
        isDefault: false,
        remark: ''
      }
    ];

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
