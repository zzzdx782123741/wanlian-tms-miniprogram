const LOCAL_API_BASE_URL = 'http://192.168.98.241:3000/api';

// 根据环境自动选择 API 地址
const getDefaultBaseUrl = () => {
  try {
    const systemInfo = wx.getSystemInfoSync();
    const platform = systemInfo.platform;

    // 小程序里 localhost 很容易被合法域名校验直接拦截，开发工具也统一走局域网地址。
    if (platform === 'devtools') {
      return LOCAL_API_BASE_URL;
    }
  } catch (error) {
    console.warn('获取系统信息失败，使用默认 API 地址', error);
  }

  return LOCAL_API_BASE_URL;
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

// 获取服务器基础 URL（用于图片等资源）
const getServerUrl = () => {
  return getBaseUrl().replace('/api', '');
};

/**
  * 格式化图片 URL - 将相对路径转换为完整 URL
  * @param {string} url - 图片 URL（可能是相对路径或完整 URL）
  * @returns {string} 完整的图片 URL
 */
const formatImageUrl = (url) => {
  if (!url) return '';
  // 如果已经是完整 URL（http/https 开头），直接返回
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

    console.log('========== API 请求 ==========');
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
        console.log('API 响应状态码:', res.statusCode);
        console.log('API 响应数据:', res.data);

        // 修复：接受所有2xx状态码，不只是200
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          console.error('API 错误响应:', res.data);

          // 对于常用地址接口的403错误，静默处理（功能暂未实现）
          const isAddressApi = fullUrl.includes('/user/addresses');
          if (!isAddressApi && !options.silentError) {
            wx.showToast({
              title: res.data.message || '请求失败',
              icon: 'none'
            });
          }

          reject(res.data);
        }
      },
      fail: (err) => {
        console.error('========== API 请求失败 ==========');
        console.error('错误信息:', err);
        console.error('URL:', fullUrl);

        // 对于常用地址接口的403错误，静默处理（功能暂未实现）
        const isAddressApi = fullUrl.includes('/user/addresses');
        const errMsg = err?.errMsg || '';
        const isDomainBlocked = errMsg.includes('url not in domain list');
        if (!isAddressApi && !options.silentError) {
          wx.showToast({
            title: isDomainBlocked ? '域名未配置' : '网络请求失败',
            icon: 'none'
          });
        }

        if (isDomainBlocked) {
          wx.showModal({
            title: '请求被微信拦截',
            content: '当前接口域名未加入小程序白名单。开发调试请确认已关闭“合法域名校验”，或将 baseUrl 改成已配置的 HTTPS 域名。',
            showCancel: false
          });
        }

        reject(err);
      }
    });
  });
};

module.exports = {
  get: (url, data, options = {}) => request({ url, method: 'GET', data, ...options }),
  post: (url, data, noAuthOrOptions = false) => {
    const options = typeof noAuthOrOptions === 'boolean'
      ? { noAuth: noAuthOrOptions }
      : (noAuthOrOptions || {});
    return request({ url, method: 'POST', data, ...options });
  },
  put: (url, data, options = {}) => request({ url, method: 'PUT', data, ...options }),
  delete: (url, data, options = {}) => request({ url, method: 'DELETE', data, ...options }),
  getBaseUrl,
  formatImageUrl,
  getServerUrl
};
