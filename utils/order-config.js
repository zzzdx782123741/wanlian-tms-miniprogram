/**
 * 订单状态配置
 * 统一管理订单状态的显示文本、图标和样式类型
 */

const ORDER_STATUS = {
  AWAITING_FLEET_APPROVAL: 'awaiting_fleet_approval',
  AWAITING_TIME_CONFIRMATION: 'awaiting_time_confirmation',
  PENDING_ASSESSMENT: 'pending_assessment',
  AWAITING_APPROVAL: 'awaiting_approval',
  IN_REPAIR: 'in_repair',
  AWAITING_ADDON_APPROVAL: 'awaiting_addon_approval',
  PENDING_CONFIRMATION: 'pending_confirmation',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  REFUNDED: 'refunded'
};

const ORDER_STATUS_CONFIG = {
  [ORDER_STATUS.AWAITING_FLEET_APPROVAL]: {
    label: '待车队审批',
    icon: '/images/icons/warning-triangle.svg',
    type: 'warning'
  },
  [ORDER_STATUS.AWAITING_TIME_CONFIRMATION]: {
    label: '待确认到店时间',
    icon: '/images/icons/clock.svg',
    type: 'warning'
  },
  [ORDER_STATUS.PENDING_ASSESSMENT]: {
    label: '待接车检查',
    icon: '/images/icons/search.svg',
    type: 'warning'
  },
  [ORDER_STATUS.AWAITING_APPROVAL]: {
    label: '待审批报价',
    icon: '/images/icons/clipboard.svg',
    type: 'info'
  },
  [ORDER_STATUS.IN_REPAIR]: {
    label: '维修中',
    icon: '/images/icons/wrench.svg',
    type: 'primary'
  },
  [ORDER_STATUS.AWAITING_ADDON_APPROVAL]: {
    label: '待审批增项',
    icon: '/images/icons/warning-triangle.svg',
    type: 'warning'
  },
  [ORDER_STATUS.PENDING_CONFIRMATION]: {
    label: '待确认完工',
    icon: '/images/icons/check-circle.svg',
    type: 'warning'
  },
  [ORDER_STATUS.COMPLETED]: {
    label: '已完成',
    icon: '/images/icons/check-circle.svg',
    type: 'success'
  },
  [ORDER_STATUS.REJECTED]: {
    label: '已拒绝',
    icon: '/images/icons/x-circle.svg',
    type: 'error'
  },
  [ORDER_STATUS.REFUNDED]: {
    label: '已退款',
    icon: '/images/icons/money.svg',
    type: 'error'
  }
};

const ORDER_STATUS_ALIAS = {
  pending: ORDER_STATUS.AWAITING_FLEET_APPROVAL,
  processing: ORDER_STATUS.IN_REPAIR,
  repairing: ORDER_STATUS.IN_REPAIR,
  confirmed: ORDER_STATUS.COMPLETED,
  cancelled: 'cancelled',
  expired: 'expired'
};

const EXTRA_STATUS_CONFIG = {
  cancelled: {
    label: '已取消',
    icon: '/images/icons/x-circle.svg',
    type: 'error'
  },
  expired: {
    label: '已超时关闭',
    icon: '/images/icons/clock.svg',
    type: 'error'
  }
};

function normalizeOrderStatus(status) {
  if (!status || typeof status !== 'string') {
    return '';
  }

  const normalized = status.trim();
  return ORDER_STATUS_ALIAS[normalized] || normalized;
}

function getStatusConfig(status) {
  const normalizedStatus = normalizeOrderStatus(status);
  return ORDER_STATUS_CONFIG[normalizedStatus] || EXTRA_STATUS_CONFIG[normalizedStatus] || {
    label: '未知状态',
    icon: '/images/icons/info-circle.svg',
    type: 'default'
  };
}

function getStatusText(status) {
  return getStatusConfig(status).label;
}

function getStatusIcon(status) {
  return getStatusConfig(status).icon;
}

function getStatusType(status) {
  return getStatusConfig(status).type;
}

function isTerminalStatus(status) {
  return [
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.REJECTED,
    ORDER_STATUS.REFUNDED
  ].includes(status);
}

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
  normalizeOrderStatus,
  getStatusConfig,
  getStatusText,
  getStatusIcon,
  getStatusType,
  isTerminalStatus,
  isProcessingStatus
};
