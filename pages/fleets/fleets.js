// pages/fleets/fleets.js - 平台运营-车队管理
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    fleets: [],
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
    this.loadFleets();
  },

  /**
   * 加载车队列表
   */
  async loadFleets() {
    this.setData({ loading: true });

    try {
      const params = {};
      if (this.data.statusFilter) {
        params.status = this.data.statusFilter;
      }
      if (this.data.keyword) {
        params.keyword = this.data.keyword;
      }

      const res = await request.get('/fleets', params);
      this.setData({ fleets: res.data });

    } catch (error) {
      console.error('加载车队列表失败:', error);
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
    this.loadFleets();
  },

  /**
   * 搜索
   */
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    this.loadFleets();
  },

  /**
   * 查看车队详情
   */
  onViewDetail(e) {
    const fleetId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '车队详情',
      content: `车队详情页开发中（ID：${fleetId}）`,
      showCancel: false
    });
  },

  /**
   * 审核车队
   */
  onApprove(e) {
    const fleetId = e.currentTarget.dataset.id;
    const fleet = this.data.fleets.find(f => f._id === fleetId);

    wx.showModal({
      title: '审核车队',
      content: `确定通过${fleet.name}的审核吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await request.post(`/fleets/${fleetId}/approve`);
            wx.showToast({
              title: '审核通过',
              icon: 'success'
            });
            this.loadFleets();
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

    const statusMap = {
      'normal': '正常',
      'suspended': '停用'
    };

    const actionText = status === 'normal' ? '启用' : '停用';

    wx.showModal({
      title: '确认操作',
      content: `确定要${actionText}该车队吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await request.put(`/fleets/${id}/status`, { status });
            wx.showToast({
              title: '操作成功',
              icon: 'success'
            });
            this.loadFleets();
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
   * 删除车队
   */
  onDelete(e) {
    const fleetId = e.currentTarget.dataset.id;
    const fleet = this.data.fleets.find(f => f._id === fleetId);

    wx.showModal({
      title: '删除确认',
      content: `确定要删除${fleet.name}吗？此操作不可恢复！`,
      confirmColor: '#EF4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            await request.delete(`/fleets/${fleetId}`);
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            this.loadFleets();
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
    this.loadFleets();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
