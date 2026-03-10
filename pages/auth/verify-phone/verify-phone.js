// pages/auth/verify-phone/verify-phone.js
const request = require('../../../utils/request');
const app = getApp();

Page({
  data: {
    phone: '',
    code: '',
    loading: false,
    countingDown: false,
    countdown: 60,
    countdownText: '重新发送'
  },

  onLoad() {
    // 检查是否有待验证的微信信息
    const openid = wx.getStorageSync('pending_openid');
    const unionid = wx.getStorageSync('pending_unionid');
    const userInfo = wx.getStorageSync('pending_userInfo');

    if (!openid) {
      wx.showModal({
        title: '登录已过期',
        content: '登录信息已过期，请重新登录',
        showCancel: false,
        success: () => {
          wx.redirectTo({
            url: '/pages/auth/login/login'
          });
        }
      });
      return;
    }

    this.setData({
      openid,
      unionid,
      userInfo
    });
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  // 验证码输入
  onCodeInput(e) {
    this.setData({
      code: e.detail.value
    });
  },

  // 发送验证码
  async onSendCode() {
    const { phone } = this.data;

    // 验证手机号
    if (!phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return;
    }

    if (this.data.countingDown) {
      return;
    }

    wx.showLoading({ title: '发送中...' });

    try {
      // 调用发送验证码接口（无需token）
      const res = await request.post('/auth/send-verification-code', {
        phone,
        purpose: 'bind_wechat'
      }, true); // true = 无需token

      wx.hideLoading();

      if (res.success) {
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        });

        // 开发环境显示验证码
        if (res.data && res.data.debugCode) {
          console.log('开发环境验证码:', res.data.debugCode);
          wx.showModal({
            title: '开发环境验证码',
            content: `验证码: ${res.data.debugCode}`,
            showCancel: false
          });
        }

        // 开始倒计时
        this.startCountdown();
      } else {
        wx.showToast({
          title: res.message || '验证码发送失败',
          icon: 'none'
        });
      }

    } catch (error) {
      wx.hideLoading();
      console.error('发送验证码失败:', error);
      wx.showToast({
        title: error.message || '验证码发送失败',
        icon: 'none'
      });
    }
  },

  // 开始倒计时
  startCountdown() {
    this.setData({
      countingDown: true,
      countdown: 60
    });

    const timer = setInterval(() => {
      const countdown = this.data.countdown - 1;

      if (countdown <= 0) {
        clearInterval(timer);
        this.setData({
          countingDown: false,
          countdownText: '重新发送'
        });
      } else {
        this.setData({
          countdown,
          countdownText: `${countdown}秒后重发`
        });
      }
    }, 1000);
  },

  // 确认绑定
  async onConfirm() {
    const { phone, code, openid, unionid, userInfo, loading } = this.data;

    if (loading) {
      return;
    }

    // 验证输入
    if (!phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return;
    }

    if (!code) {
      wx.showToast({
        title: '请输入验证码',
        icon: 'none'
      });
      return;
    }

    if (code.length !== 6) {
      wx.showToast({
        title: '验证码格式不正确',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '验证中...' });

    try {
      this.setData({ loading: true });

      // 调用验证并绑定接口
      const res = await request.post('/auth/wechat/verify-bind', {
        openid,
        unionid,
        phone,
        code,
        userInfo
      });

      wx.hideLoading();

      if (res.success) {
        const { token, user } = res.data;

        // 标准化用户数据
        const roleType = user?.role || (typeof user?.role === 'object' ? user.role?.type : user?.role);
        const normalizedUser = Object.assign({}, user, {
          role: typeof user?.role === 'string'
            ? { type: user.role, status: 'normal' }
            : (user.role || { type: roleType, status: 'normal' })
        });

        // 保存用户信息
        app.setUserInfo(token, normalizedUser, roleType);

        // 清除临时数据
        wx.removeStorageSync('pending_openid');
        wx.removeStorageSync('pending_unionid');
        wx.removeStorageSync('pending_userInfo');

        wx.showToast({
          title: '绑定成功',
          icon: 'success'
        });

        // 延迟跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);

      } else {
        wx.showToast({
          title: res.message || '绑定失败',
          icon: 'none',
          duration: 2000
        });
      }

    } catch (error) {
      wx.hideLoading();
      this.setData({ loading: false });

      console.error('绑定失败:', error);

      // 显示详细的错误信息
      let errorMsg = '绑定失败';
      if (error.message) {
        errorMsg = error.message;
      } else if (error.data && error.data.message) {
        errorMsg = error.data.message;
      }

      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
