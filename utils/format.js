/**
 * 格式化工具函数
 * 统一时间、金额等格式化逻辑
 */

/**
 * 解码 HTML 实体编码
 * 用于处理数据库中存储的 &gt; &lt; &amp; 等实体编码
 * 支持双重转义（如 &amp;gt;）
 * @param {string} str - 可能包含HTML实体编码的字符串
 * @returns {string} 解码后的字符串
 */
function decodeHTMLEntities(str) {
  if (!str || typeof str !== 'string') return str;

  const htmlEntities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&#34;': '"',
    '&#38;': '&',
    '&#60;': '<',
    '&#62;': '>'
  };

  // 第一次解码
  let decoded = str.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    return htmlEntities[entity] || entity;
  });

  // 如果结果中仍然包含 HTML 实体，进行第二次解码（处理双重转义）
  if (decoded.includes('&') && decoded !== str) {
    decoded = decoded.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
      return htmlEntities[entity] || entity;
    });
  }

  return decoded;
}

/**
 * 格式化相对时间（刚刚、X分钟前、X小时前、X天前）
 * @param {string|Date} timestamp - 时间戳或日期对象
 * @returns {string} 格式化后的相对时间
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return '';

  const now = new Date().getTime();
  const time = new Date(timestamp).getTime();
  const diff = now - time;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return Math.floor(diff / minute) + '分钟前';
  } else if (diff < day) {
    return Math.floor(diff / hour) + '小时前';
  } else {
    return Math.floor(diff / day) + '天前';
  }
}

/**
 * 格式化友好时间（今天HH:mm、昨天HH:mm、MM-DD HH:mm）
 * @param {string|Date} timestamp - 时间戳或日期对象
 * @returns {string} 格式化后的友好时间
 */
function formatFriendlyTime(timestamp) {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  if (targetDate.getTime() === today.getTime()) {
    return `今天 ${hours}:${minutes}`;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (targetDate.getTime() === yesterday.getTime()) {
    return `昨天 ${hours}:${minutes}`;
  }

  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

/**
 * 格式化绝对时间（MM-DD HH:mm）
 * @param {string|Date} timestamp - 时间戳或日期对象
 * @returns {string} 格式化后的时间
 */
function formatDate(timestamp) {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${month}-${day} ${hour}:${minute}`;
}

/**
 * 格式化完整时间（YYYY-MM-DD HH:mm）
 * @param {string|Date} timestamp - 时间戳或日期对象
 * @returns {string} 格式化后的完整时间
 */
function formatFullDate(timestamp) {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * 格式化金额（保留两位小数）
 * @param {number|string} amount - 金额数值
 * @param {boolean} fromCent - 是否从分转换为元，默认 false
 * @returns {string} 格式化后的金额
 */
function formatMoney(amount, fromCent = false) {
  if (!amount && amount !== 0) return '0.00';

  let value = parseFloat(amount);
  if (fromCent) {
    value = value / 100;
  }

  return value.toFixed(2);
}

/**
 * 格式化金额（带货币符号）
 * @param {number|string} amount - 金额数值
 * @param {boolean} fromCent - 是否从分转换为元，默认 false
 * @returns {string} 格式化后的金额，带 ¥ 符号
 */
function formatMoneyWithSymbol(amount, fromCent = false) {
  return '¥' + formatMoney(amount, fromCent);
}

module.exports = {
  formatRelativeTime,
  formatFriendlyTime,
  formatDate,
  formatFullDate,
  formatMoney,
  formatMoneyWithSymbol,
  decodeHTMLEntities
};
