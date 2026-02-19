// pages/store/complete/complete.js - 门店技师提交完工
const request = require('../../../utils/request');

Page({
  data: {
    orderId: '',
    order: null,
    // 完工图片
    completionImages: [],
    // 完工视频
    completionVideos: [],
    // 完工描述
    description: '',
    loading: false,
    submitting: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        orderId: options.id
      });
      this.loadOrderDetail();
    }
  },

  // 加载订单详情
  async loadOrderDetail() {
    try {
      this.setData({ loading: true });

      const res = await request.get(`/orders/${this.data.orderId}`);
      const order = res.data;

      // 检查订单状态
      if (order.status !== 'in_repair') {
        wx.showModal({
          title: '提示',
          content: '当前订单状态不允许提交完工',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
        return;
      }

      this.setData({
        order,
        loading: false
      });

    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  // 输入完工描述
  onDescriptionInput(e) {
    this.setData({
      description: e.detail.value
    });
  },

  // 选择完工图片
  chooseImage() {
    const remainCount = 9 - this.data.completionImages.length;
    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const completionImages = [...this.data.completionImages, ...res.tempFilePaths];
        this.setData({ completionImages });
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    const urls = e.currentTarget.dataset.urls || [url];
    wx.previewImage({
      current: url,
      urls: urls
    });
  },

  // 删除图片
  deleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const completionImages = [...this.data.completionImages];
    completionImages.splice(index, 1);
    this.setData({ completionImages });
  },

  // 选择完工视频
  chooseVideo() {
    const remainCount = 3 - this.data.completionVideos.length;
    wx.chooseVideo({
      count: remainCount,
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: (res) => {
        const completionVideos = [...this.data.completionVideos, res.tempFilePath];
        this.setData({ completionVideos });
      }
    });
  },

  // 删除视频
  deleteVideo(e) {
    const { index } = e.currentTarget.dataset;
    const completionVideos = [...this.data.completionVideos];
    completionVideos.splice(index, 1);
    this.setData({ completionVideos });
  },

  // 提交完工
  async handleSubmit() {
    const { orderId, completionImages, completionVideos, description } = this.data;

    // 验证完工图片（必填）
    if (completionImages.length === 0) {
      wx.showToast({
        title: '请至少上传一张完工照片',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({ submitting: true });
      wx.showLoading({ title: '提交中...' });

      // 上传完工图片
      console.log('开始上传完工图片...');
      const uploadedImages = [];
      for (let i = 0; i < completionImages.length; i++) {
        try {
          console.log(`上传完工图片 ${i + 1}/${completionImages.length}`);
          const uploadRes = await this.uploadImage(completionImages[i]);
          uploadedImages.push(uploadRes.url);
        } catch (error) {
          console.error(`上传完工图片 ${i + 1} 失败:`, error);
          wx.showToast({
            title: `完工图片${i + 1}上传失败`,
            icon: 'none'
          });
          throw error;
        }
      }
      console.log('完工图片上传完成:', uploadedImages);

      // 上传完工视频（如果有）
      let uploadedVideos = [];
      if (completionVideos.length > 0) {
        console.log('开始上传完工视频...');
        for (let i = 0; i < completionVideos.length; i++) {
          try {
            console.log(`上传完工视频 ${i + 1}/${completionVideos.length}`);
            const uploadRes = await this.uploadVideo(completionVideos[i]);
            uploadedVideos.push(uploadRes.url);
          } catch (error) {
            console.error(`上传完工视频 ${i + 1} 失败:`, error);
            // 视频上传失败不影响整体提交流程，记录警告即可
            wx.showToast({
              title: `视频${i + 1}上传失败，已跳过`,
              icon: 'none',
              duration: 2000
            });
          }
        }
        console.log('完工视频上传完成:', uploadedVideos);
      }

      // 构建完工数据
      const completionData = {
        images: uploadedImages,
        videos: uploadedVideos,
        description: description || ''
      };

      console.log('提交完工数据:', completionData);

      const response = await request.post(`/orders/${orderId}/complete`, completionData);

      console.log('✓ 完工提交成功:', response);

      wx.hideLoading();

      wx.showToast({
        title: '完工提交成功',
        icon: 'success',
        duration: 2000
      });

      // 返回订单详情页
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);

    } catch (error) {
      console.error('✗ 提交完工失败:', error);
      this.setData({ submitting: false });
      wx.hideLoading();
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none',
        duration: 3000
      });
    }
  },

  // 上传图片
  uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      const app = getApp();

      console.log('开始上传图片:', filePath);

      wx.uploadFile({
        url: `${app.globalData.baseUrl}/upload`,
        filePath: filePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${app.globalData.token}`
        },
        success: (res) => {
          console.log('上传响应状态码:', res.statusCode);
          try {
            const data = JSON.parse(res.data);
            if (data.success) {
              console.log('✓ 图片上传成功:', data.data.url);
              resolve(data.data);
            } else {
              console.error('✗ 上传失败:', data.message);
              reject(new Error(data.message));
            }
          } catch (error) {
            console.error('✗ 解析响应失败:', error);
            reject(error);
          }
        },
        fail: (error) => {
          console.error('✗ 上传请求失败:', error);
          reject(error);
        }
      });
    });
  },

  // 上传视频
  uploadVideo(filePath) {
    return new Promise((resolve, reject) => {
      const app = getApp();

      console.log('开始上传视频:', filePath);

      wx.uploadFile({
        url: `${app.globalData.baseUrl}/upload`,
        filePath: filePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${app.globalData.token}`
        },
        success: (res) => {
          console.log('上传响应状态码:', res.statusCode);
          try {
            const data = JSON.parse(res.data);
            if (data.success) {
              console.log('✓ 视频上传成功:', data.data.url);
              resolve(data.data);
            } else {
              console.error('✗ 上传失败:', data.message);
              reject(new Error(data.message));
            }
          } catch (error) {
            console.error('✗ 解析响应失败:', error);
            reject(error);
          }
        },
        fail: (error) => {
          console.error('✗ 上传请求失败:', error);
          reject(error);
        }
      });
    });
  }
});
