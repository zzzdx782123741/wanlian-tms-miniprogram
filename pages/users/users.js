// pages/users/users.js - 平台运营-用户管理
const app = getApp();
const request = require('../../utils/request');

Page({
  data: {
    users: [],
    loading: false,
    roleFilter: '',
    roleIndex: 0,
    statusFilter: '',
    statusIndex: 0,
    keyword: '',
    roleOptions: [
      { value: '', label: '全部角色' },
      { value: 'DRIVER', label: '司机' },
      { value: 'FLEET_MANAGER', label: '车队管理员' },
      { value: 'STORE_TECHNICIAN', label: '门店技师' },
      { value: 'PLATFORM_OPERATOR', label: '平台运营' }
    ],
    statusOptions: [
      { value: '', label: '全部状态' },
      { value: 'normal', label: '正常' },
      { value: 'pending_audit', label: '待审核' },
      { value: 'suspended', label: '已停用' }
    ]
  },

  onLoad() {
    this.loadUsers();
  },

  /**
   * 加载用户列表
   */
  async loadUsers() {
    this.setData({ loading: true });

    try {
      const params = {};
      if (this.data.roleFilter) {
        params.role = this.data.roleFilter;
      }
      if (this.data.statusFilter) {
        params.status = this.data.statusFilter;
      }
      if (this.data.keyword) {
        params.keyword = this.data.keyword;
      }

      const res = await request.get('/users', params);
      this.setData({ users: res.data });

    } catch (error) {
      console.error('加载用户列表失败:', error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 角色筛选
   */
  onRoleChange(e) {
    const index = e.detail.value;
    this.setData({
      roleIndex: index,
      roleFilter: this.data.roleOptions[index].value
    });
    this.loadUsers();
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
    this.loadUsers();
  },

  /**
   * 搜索
   */
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    this.loadUsers();
  },

  /**
   * 获取角色文本
   */
  getRoleText(role) {
    const roleMap = {
      'DRIVER': '司机',
      'FLEET_MANAGER': '车队管理员',
      'STORE_TECHNICIAN': '门店技师',
      'PLATFORM_OPERATOR': '平台运营'
    };
    return roleMap[role] || '未知';
  },

  /**
   * 获取角色所属信息
   */
  getBelongsTo(user) {
    if (user.role?.type === 'FLEET_MANAGER' && user.fleetInfo?.fleetName) {
      return user.fleetInfo.fleetName;
    }
    if (user.role?.type === 'STORE_TECHNICIAN' && user.storeInfo?.storeName) {
      return user.storeInfo.storeName;
    }
    return '-';
  },

  /**
   * 查看用户详情
   */
  onViewDetail(e) {
    const userId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '用户详情',
      content: '用户详情功能开发中',
      showCancel: false
    });
  },

  /**
   * 更新用户状态
   */
  onUpdateStatus(e) {
    const { id, status } = e.currentTarget.dataset;

    const actionText = status === 'normal' ? '启用' : '停用';

    wx.showModal({
      title: '确认操作',
      content: `确定要${actionText}该用户吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await request.put(`/users/${id}/status`, { status });
            wx.showToast({
              title: '操作成功',
              icon: 'success'
            });
            this.loadUsers();
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
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadUsers();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
