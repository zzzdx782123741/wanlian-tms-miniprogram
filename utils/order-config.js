/**
 * 订单状态配置
 * 统一管理订单状态的显示文本、图标和样式类型
 */

/**
 * 订单状态常量
 */
const ORDER_STATUS = {
  AWAITING_FLEET_APPROVAL: 'awaiting_fleet_approval',      // 待车队审批
  AWAITING_TIME_CONFIRMATION: 'awaiting_time_confirmation', // 待门店确认时间
  PENDING_ASSESSMENT: 'pending_assessment',                 // 待接车检查
  AWAITING_APPROVAL: 'awaiting_approval',                   // 待审批报价
  IN_REPAIR: 'in_repair',                                   // 维修中/保养进行中
  AWAITING_ADDON_APPROVAL: 'awaiting_addon_approval',       // 增项待审批
  PENDING_CONFIRMATION: 'pending_confirmation',             // 待确认
  COMPLETED: 'completed',                                   // 已完成
  REJECTED: 'rejected',                                     // 已拒绝
  REFUNDED: 'refunded'                                      // 已退款
};

/**
 * 订单状态配置映射
 */
const ORDER_STATUS_CONFIG = {
  [ORDER_STATUS.AWAITING_FLEET_APPROVAL]: {
    label: '待车队审批',
    icon: '⏳',
    type: 'warning'
  },
  [ORDER_STATUS.AWAITING_TIME_CONFIRMATION]: {
    label: '待确认时间',
    icon: '⏰',
    type: 'warning'
  },
  [ORDER_STATUS.PENDING_ASSESSMENT]: {
    label: '待接车检查',
    icon: '🔍',
    type: 'warning'
  },
  [ORDER_STATUS.AWAITING_APPROVAL]: {
    label: '待审批报价',
    icon: '📋',
    type: 'info'
  },
  [ORDER_STATUS.IN_REPAIR]: {
    label: '维修中',
    icon: '🔧',
    type: 'primary'
  },
  [ORDER_STATUS.AWAITING_ADDON_APPROVAL]: {
    label: '增项待审批',
    icon: '⚠️',
    type: 'warning'
  },
  [ORDER_STATUS.PENDING_CONFIRMATION]: {
    label: '待确认',
    icon: '✅',
    type: 'success'
  },
  [ORDER_STATUS.COMPLETED]: {
    label: '已完成',
    icon: '✅',
    type: 'success'
  },
  [ORDER_STATUS.REJECTED]: {
    label: '已拒绝',
    icon: '❌',
    type: 'error'
  },
  [ORDER_STATUS.REFUNDED]: {
    label: '已退款',
    icon: '💸',
    type: 'error'
  }
};

/**
 * 获取状态配置
 * @param {string} status - 订单状态
 * @returns {object} 状态配置对象
 */
function getStatusConfig(status) {
  return ORDER_STATUS_CONFIG[status] || { label: '未知状态', icon: '❓', type: 'default' };
}

/**
 * 获取状态文本
 * @param {string} status - 订单状态
 * @returns {string} 状态文本
 */
function getStatusText(status) {
  return getStatusConfig(status).label;
}

/**
 * 获取状态图标
 * @param {string} status - 订单状态
 * @returns {string} 状态图标（emoji）
 */
function getStatusIcon(status) {
  return getStatusConfig(status).icon;
}

/**
 * 获取状态类型（用于样式）
 * @param {string} status - 订单状态
 * @returns {string} 状态类型
 */
function getStatusType(status) {
  return getStatusConfig(status).type;
}

/**
 * 检查状态是否为终态（已完成、拒绝、退款）
 * @param {string} status - 订单状态
 * @returns {boolean} 是否为终态
 */
function isTerminalStatus(status) {
  return [
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.REJECTED,
    ORDER_STATUS.REFUNDED
  ].includes(status);
}

/**
 * 检查状态是否为处理中状态
 * @param {string} status - 订单状态
 * @returns {boolean} 是否为处理中状态
 */
function isProcessingStatus(status) {
  return [
    ORDER_STATUS.PENDING_ASSESSMENT,
    ORDER_STATUS.AWAITING_APPROVAL,
    ORDER_STATUS.IN_REPAIR,
    ORDER_STATUS.AWAITING_ADDON_APPROVAL
  ].includes(status);
}

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_CONFIG,
  getStatusConfig,
  getStatusText,
  getStatusIcon,
  getStatusType,
  isTerminalStatus,
  isProcessingStatus
};
