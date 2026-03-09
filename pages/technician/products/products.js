// pages/technician/products/products.js
const app = getApp();
const request = require('../../../utils/request');

Page({
  data: {
    keyword: '',
    selectedCategory: '',
    categories: ['机油', '滤芯', '刹车片', '火花塞', '轮胎', '配件'],
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
    },
    products: [],
    loading: false,
    page: 1,
    hasMore: true
  },

  /**
   * 获取分类中文名
   */
  getCategoryText(category) {
    return this.data.categoryMap[category] || category;
  },

  onLoad() {
    this.loadProducts();
  },

  /**
   * 输入关键词
   */
  onKeywordInput(e) {
    this.setData({
      keyword: e.detail.value
    });
  },

  /**
   * 清除搜索
   */
  clearSearch() {
    this.setData({
      keyword: '',
      page: 1,
      products: [],
      hasMore: true
    });
    this.loadProducts();
  },

  /**
   * 搜索商品
   */
  searchProducts() {
    this.setData({
      page: 1,
      products: [],
      hasMore: true
    });
    this.loadProducts();
  },

  /**
   * 选择分类
   */
  selectCategory(e) {
    const { category } = e.currentTarget.dataset;
    this.setData({
      selectedCategory: category,
      page: 1,
      products: [],
      hasMore: true
    });
    this.loadProducts();
  },

  /**
   * 加载商品列表
   */
  async loadProducts() {
    if (this.data.loading || !this.data.hasMore) {
      return;
    }

    this.setData({ loading: true });

    try {
      const params = {
        page: this.data.page,
        limit: 20,
        keyword: this.data.keyword,
        category: this.data.selectedCategory
      };

      // 使用技师端商品API
      const res = await request.get('/store/products', params);

      if (res.success) {
        const rawList = res.data.list || [];
        // 预先格式化价格和分类
        const formattedList = rawList.map(product => {
          const price = product.price || 0;
          const priceText = typeof price === 'number'
            ? (price / 100).toFixed(2)
            : '0.00';
          // 将英文 category 转换为中文
          const categoryText = this.data.categoryMap[product.category] || product.category;
          // 将英文 spec 转换为中文
          const specText = this.data.specMap[product.spec] || product.spec;
          return {
            ...product,
            priceText,
            categoryText,
            specText
          };
        });

        const newProducts = this.data.page === 1 ? formattedList : [...this.data.products, ...formattedList];

        // 将后端返回的英文分类转换为中文
        const categoryMap = this.data.categoryMap;
        const chineseCategories = (res.data.categories || [])
          .map(cat => categoryMap[cat] || cat)
          .filter(cat => cat); // 过滤掉空值

        this.setData({
          products: newProducts,
          hasMore: res.data.page < res.data.totalPages,
          page: this.data.page + 1,
          categories: chineseCategories.length > 0 ? chineseCategories : this.data.categories
        });
      }
    } catch (error) {
      console.error('加载商品失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 查看商品详情
   */
  viewProduct(e) {
    const { product } = e.currentTarget.dataset;
    console.log('查看商品:', product);

    // TODO: 跳转到商品详情页
    wx.showToast({
      title: '商品详情',
      icon: 'none'
    });
  },

  /**
   * 扫码搜索商品
   */
  scanProduct() {
    wx.scanCode({
      success: (res) => {
        const code = res.result;
        console.log('扫码结果:', code);

        // 根据条码搜索商品
        this.setData({
          keyword: code,
          page: 1,
          products: [],
          hasMore: true
        });
        this.loadProducts();
      },
      fail: () => {
        wx.showToast({
          title: '扫码失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadProducts();
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.setData({
      page: 1,
      products: [],
      hasMore: true
    });
    this.loadProducts();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
