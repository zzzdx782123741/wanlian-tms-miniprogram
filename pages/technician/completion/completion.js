// pages/technician/completion/completion.js
const app = getApp();
const request = require('../../../utils/request');
const { formatFriendlyTime } = require('../../../utils/format');
const { TIME_RANGE } = require('../../../utils/constants');
const { navigateToOrderDetail, standardPullRefresh } = require('../../../utils/page-helper');

Page({
  data: {
    activeTab: TIME_RANGE.TODAY,
    records: []
  },

  onLoad(options) {
    // 如果有传入的tab参数，切换到对应tab
    if (options.tab && Object.values(TIME_RANGE).includes(options.tab)) {
      this.setData({ activeTab: options.tab });
    }
  },

  onShow() {
    this.loadData();
  },

  /**
   * 加载数据
   */
  async loadData() {
    try {
      wx.showLoading({ title: '加载中...' });

      // 获取完工记录列表
      await this.loadRecords();
    } catch (error) {
      console.error('加载数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 加载完工记录列表
   */
  async loadRecords() {
    try {
      const { activeTab } = this.data;

      const res = await request.get('/technician/completion/records', {
        params: { timeRange: activeTab }
      });

      if (res.success) {
        const records = (res.data.list || []).map(record => this.formatRecord(record));
        this.setData({ records });
      }
    } catch (error) {
      console.error('加载完工记录失败:', error);

      // 如果API调用失败，使用模拟数据
      this.loadMockData();
    }
  },

  /**
   * 格式化完工记录数据
   */
  formatRecord(record) {
    return {
      id: record._id,
      type: record.type || 'repair',
      plateNumber: record.vehicle?.plateNumber || '未知',
      driverName: record.driver?.name || '未知',
      technicianName: record.technician?.name || '未知',
      completedAt: formatFriendlyTime(record.completion?.completedAt),
      description: record.completion?.description || '',
      images: record.completion?.images || []
    };
  },

  /**
   * 加载模拟数据（用于测试）
   */
  loadMockData() {
    const mockRecords = {
      [TIME_RANGE.TODAY]: [
        {
          id: '1',
          type: 'repair',
          plateNumber: '粤A·88888',
          driverName: '张师傅',
          technicianName: '陈技师',
          completedAt: '今天 14:30',
          description: '更换刹车片，调整刹车系统',
          images: []
        },
        {
          id: '2',
          type: 'maintenance',
          plateNumber: '粤B·66666',
          driverName: '李师傅',
          technicianName: '陈技师',
          completedAt: '今天 11:20',
          description: '定期保养，更换机油机滤',
          images: []
        }
      ],
      [TIME_RANGE.WEEK]: [
        {
          id: '3',
          type: 'repair',
          plateNumber: '粤C·12345',
          driverName: '王师傅',
          technicianName: '陈技师',
          completedAt: '03-05 16:00',
          description: '离合器更换',
          images: []
        },
        {
          id: '4',
          type: 'maintenance',
          plateNumber: '粤D·56789',
          driverName: '赵师傅',
          technicianName: '陈技师',
          completedAt: '03-04 10:30',
          description: '常规保养',
          images: []
        }
      ],
      [TIME_RANGE.MONTH]: [
        {
          id: '5',
          type: 'repair',
          plateNumber: '粤E·98765',
          driverName: '刘师傅',
          technicianName: '陈技师',
          completedAt: '03-01 15:00',
          description: '发动机检修',
          images: []
        }
      ],
      [TIME_RANGE.ALL]: [
        {
          id: '6',
          type: 'repair',
          plateNumber: '粤F·43210',
          driverName: '孙师傅',
          technicianName: '陈技师',
          completedAt: '02-28 09:00',
          description: '变速箱维修',
          images: []
        }
      ]
    };

    this.setData({
      records: mockRecords[this.data.activeTab] || []
    });
  },

  /**
   * 切换tab
   */
  switchTab(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ activeTab: tab });
    this.loadRecords();
  },

  /**
   * 返回上一页
   */
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  /**
   * 跳转到订单详情（使用公共工具）
   */
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    navigateToOrderDetail(id);
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({
      current,
      urls
    });
  },

  /**
   * 下拉刷新（使用公共工具）
   */
  onPullDownRefresh() {
    standardPullRefresh(this);
  }
});
