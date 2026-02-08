// pages/stores/stores.js - 平台运营-门店管理
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    stores: [],
    loading: false,
    statusFilter: '',
    statusIndex: 0,
    keyword: '',
    statusOptions: [
      { value: '', label: '全部状态' },
      { value: 'pending_audit', label: '待审核' },
      { value: 'normal', label: '正常' },
      { value: 'suspended', label: '已停用' }
    ]
  },

  onLoad() {
    this.loadStores();
  },

  /**
   * 加载门店列表
   */
  async loadStores() {
    this.setData({ loading: true });

    try {
      const params = {};
      if (this.data.statusFilter) {
        params.status = this.data.statusFilter;
      }
      if (this.data.keyword) {
        params.keyword = this.data.keyword;
      }

      const res = await request.get('/stores', params);
      this.setData({ stores: res.data });

    } catch (error) {
      console.error('加载门店列表失败:', error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 状态筛选
   */
  onStatusChange(e) {
    const index = e.detail.value;
    this.setData({
      statusIndex: index,
      statusFilter: this.data.statusOptions[index].value
    });
    this.loadStores();
  },

  /**
   * 搜索
   */
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    this.loadStores();
  },

  /**
   * 查看门店详情
   */
  onViewDetail(e) {
    const storeId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/stores/detail/detail?id=${storeId}`,
      fail: () => {
        wx.showToast({
          title: '详情页开发中',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 审核门店
   */
  onApprove(e) {
    const storeId = e.currentTarget.dataset.id;
    const store = this.data.stores.find(s => s._id === storeId);

    wx.showModal({
      title: '审核门店',
      content: `确定通过${store.name}的审核吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await request.post(`/stores/${storeId}/approve`);
            wx.showToast({
              title: '审核通过',
              icon: 'success'
            });
            this.loadStores();
          } catch (error) {
            wx.showToast({
              title: error.message || '操作失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 更新状态
   */
  onUpdateStatus(e) {
    const { id, status } = e.currentTarget.dataset;

    const actionText = status === 'normal' ? '启用' : '停用';

    wx.showModal({
      title: '确认操作',
      content: `确定要${actionText}该门店吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await request.put(`/stores/${id}/status`, { status });
            wx.showToast({
              title: '操作成功',
              icon: 'success'
            });
            this.loadStores();
          } catch (error) {
            wx.showToast({
              title: error.message || '操作失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 删除门店
   */
  onDelete(e) {
    const storeId = e.currentTarget.dataset.id;
    const store = this.data.stores.find(s => s._id === storeId);

    wx.showModal({
      title: '删除确认',
      content: `确定要删除${store.name}吗？此操作不可恢复！`,
      confirmColor: '#EF4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            await request.delete(`/stores/${storeId}`);
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            this.loadStores();
          } catch (error) {
            wx.showToast({
              title: error.message || '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadStores();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
