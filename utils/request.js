// 根据环境自动选择API地址
// 开发工具：使用localhost
// 真机调试：自动使用局域网IP
const getDefaultBaseUrl = () => {
  const systemInfo = wx.getSystemInfoSync();
  const platform = systemInfo.platform;

  // 真机调试环境
  if (platform === 'devtools') {
    return 'http://localhost:3000/api';
  } else {
    // 真机环境，使用局域网IP
    return 'http://192.168.98.241:3000/api';
  }
};

const DEFAULT_BASE_URL = getDefaultBaseUrl();

const getBaseUrl = () => {
  try {
    const storedBaseUrl = wx.getStorageSync('baseUrl');
    if (storedBaseUrl) return storedBaseUrl;
  } catch (e) {}

  try {
    const app = getApp();
    if (app && app.globalData && app.globalData.baseUrl) return app.globalData.baseUrl;
  } catch (e) {}

  return DEFAULT_BASE_URL;
};

// 获取服务器基础URL（用于图片等资源）
const getServerUrl = () => {
  return getBaseUrl().replace('/api', '');
};

/**
 * 格式化图片URL - 将相对路径转换为完整URL
 * @param {string} url - 图片URL（可能是相对路径或完整URL）
 * @returns {string} 完整的图片URL
 */
const formatImageUrl = (url) => {
  if (!url) return '';
  // 如果已经是完整URL（http/https开头），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // 如果是相对路径，添加服务器地址
  if (url.startsWith('/')) {
    return getServerUrl() + url;
  }
  // 如果没有斜杠，添加斜杠和服务器地址
  return getServerUrl() + '/' + url;
};

// 封装请求方法
const request = (options) => {
  return new Promise((resolve, reject) => {
    // 获取token（如果options.noAuth为true，则不获取token）
    const token = options.noAuth ? null : wx.getStorageSync('token');

    const fullUrl = `${getBaseUrl()}${options.url}`;

    console.log('========== API请求 ==========');
    console.log('URL:', fullUrl);
    console.log('方法:', options.method || 'GET');
    console.log('参数:', options.data);
    console.log('Token:', token ? '已携带' : (options.noAuth ? '跳过认证' : '未携带'));

    wx.request({
      url: fullUrl,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        console.log('API响应状态码:', res.statusCode);
        console.log('API响应数据:', res.data);

        // 修复：接受所有2xx状态码，不只是200
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          console.error('API错误响应:', res.data);

          // 对于常用地址接口的403错误，静默处理（功能暂未实现）
          const isAddressApi = fullUrl.includes('/user/addresses');
          if (!isAddressApi) {
            wx.showToast({
              title: res.data.message || '请求失败',
              icon: 'none'
            });
          }

          reject(res.data);
        }
      },
      fail: (err) => {
        console.error('========== API请求失败 ==========');
        console.error('错误信息:', err);
        console.error('URL:', fullUrl);

        // 对于常用地址接口的403错误，静默处理（功能暂未实现）
        const isAddressApi = fullUrl.includes('/user/addresses');
        if (!isAddressApi) {
          wx.showToast({
            title: '网络请求失败',
            icon: 'none'
          });
        }

        reject(err);
      }
    });
  });
};

module.exports = {
  get: (url, data) => request({ url, method: 'GET', data }),
  post: (url, data, noAuth = false) => request({ url, method: 'POST', data, noAuth }),
  put: (url, data) => request({ url, method: 'PUT', data }),
  delete: (url, data) => request({ url, method: 'DELETE', data }),
  formatImageUrl,
  getServerUrl
};
