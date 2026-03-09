// pages/store/product-select/product-select.js
const request = require('../../../utils/request');

Page({
  data: {
    orderId: '',
    keyword: '',
    activeCategory: '',
    products: [],
    loading: false,
    searchTimer: null,
    // 分类英文映射
    categoryMap: {
      'parts': '配件类',
      'labor': '工时类',
      'service': '服务类',
      'material': '材料类'
    },
    // 规格英文映射
    specMap: {
      'standard': '标准工时',
      'premium': '高级工时',
      'basic': '基础工时',
      'diagnosis': '诊断工时',
      'installation': '安装工时',
      'maintenance': '保养工时',
      'repair': '维修工时',
      'replacement': '更换工时',
      'inspection': '检查工时'
    }
  },

  onLoad(options) {
    // 技师角色隐藏底部导航栏的"车辆"标签
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo?.role?.type === 'STORE_TECHNICIAN') {
      wx.hideTabBar({
        animation: false
      });
    }

    this.setData({
      orderId: options.orderId
    });
    this.loadProducts();
  },

  onShow() {
    // 技师角色每次显示页面时隐藏底部导航栏
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo?.role?.type === 'STORE_TECHNICIAN') {
      wx.hideTabBar({
        animation: false
      });
    }
  },

  // 搜索输入（带防抖）
  onSearchInput(e) {
    this.setData({
      keyword: e.detail.value
    });

    // 清除之前的定时器
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer);
    }

    // 设置新的定时器（500ms后执行搜索）
    this.data.searchTimer = setTimeout(() => {
      this.loadProducts();
    }, 500);
  },

  // 确认搜索
  onSearchConfirm() {
    this.loadProducts();
  },

  // 分类切换
  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      activeCategory: category
    });
    this.loadProducts();
  },

  // 加载商品列表
  async loadProducts() {
    this.setData({ loading: true });

    try {
      const params = {
        limit: 50
      };

      if (this.data.keyword) {
        params.keyword = this.data.keyword;
      }

      if (this.data.activeCategory) {
        params.category = this.data.activeCategory;
      }

      const res = await request.get('/products/search', params);

      // 预处理数据：转换英文分类和规格为中文
      const processedProducts = (res.data || []).map(product => {
        const categoryText = this.data.categoryMap[product.category] || product.category;
        const specText = this.data.specMap[product.spec] || product.spec;
        return {
          ...product,
          categoryText,
          specText
        };
      });

      this.setData({
        products: processedProducts
      });

    } catch (error) {
      console.error('加载商品失败:', error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 选择商品
  onSelectProduct(e) {
    const product = e.currentTarget.dataset.product;

    // 返回上一页，并传递选中的商品信息
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];

    if (prevPage) {
      // 调用上一页的添加商品方法
      prevPage.addProductFromSelect && prevPage.addProductFromSelect({
        id: product._id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        category: product.category,
        categoryText: product.categoryText
      });

      wx.navigateBack();
    }
  },

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    const urls = e.currentTarget.dataset.urls || [];

    if (!url) {
      wx.showToast({
        title: '暂无图片',
        icon: 'none'
      });
      return;
    }

    wx.previewImage({
      current: url,
      urls: urls.length > 0 ? urls : [url]
    });
  }
});
