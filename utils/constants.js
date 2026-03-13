/**
 * 全局常量定义
 */

const USER_ROLE = {
  DRIVER: 'DRIVER',
  FLEET_MANAGER: 'FLEET_MANAGER',
  STORE_TECHNICIAN: 'STORE_TECHNICIAN',
  STORE_MANAGER: 'STORE_MANAGER',
  PLATFORM_OPERATOR: 'PLATFORM_OPERATOR'
};

const TECHNICIAN_STATUS = {
  BUSY: 'busy',
  IDLE: 'idle'
};

const ORDER_FILTER_TYPE = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed'
};

const TIME_RANGE = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  ALL: 'all'
};

const ACTIVITY_TYPE = {
  ORDER: 'order',
  ADDON: 'addon',
  STOCK: 'stock',
  COMPLETED: 'completed'
};

const ACTIVITY_CONFIG = {
  [ACTIVITY_TYPE.ORDER]: {
    icon: '/images/icons/clipboard.svg',
    label: '订单'
  },
  [ACTIVITY_TYPE.ADDON]: {
    icon: '/images/icons/warning-triangle.svg',
    label: '增项'
  },
  [ACTIVITY_TYPE.STOCK]: {
    icon: '/images/icons/package-box.svg',
    label: '库存'
  },
  [ACTIVITY_TYPE.COMPLETED]: {
    icon: '/images/icons/check-circle.svg',
    label: '完成'
  }
};

const ORDER_STATUS_FILTER = {
  ALL: 'all',
  AWAITING_FLEET_APPROVAL: 'awaiting_fleet_approval',
  AWAITING_TIME_CONFIRMATION: 'awaiting_time_confirmation',
  PENDING_ASSESSMENT: 'pending_assessment',
  AWAITING_APPROVAL: 'awaiting_approval',
  IN_REPAIR: 'in_repair',
  AWAITING_ADDON_APPROVAL: 'awaiting_addon_approval',
  PENDING_CONFIRMATION: 'pending_confirmation',
  COMPLETED: 'completed'
};

const TECHNICIAN_PERMISSION = {
  RECEIVE_ORDER: 'receive_order',
  DIAGNOSIS: 'diagnosis',
  QUOTE: 'quote',
  REPAIR: 'repair',
  COMPLETE: 'complete'
};

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

const STORAGE_KEYS = {
  TOKEN: 'token',
  USER_INFO: 'userInfo',
  ROLE: 'role',
  STORE_INFO: 'storeInfo',
  FLEET_INFO: 'fleetInfo'
};

module.exports = {
  USER_ROLE,
  TECHNICIAN_STATUS,
  ORDER_FILTER_TYPE,
  TIME_RANGE,
  ACTIVITY_TYPE,
  ACTIVITY_CONFIG,
  ORDER_STATUS_FILTER,
  TECHNICIAN_PERMISSION,
  PAGINATION,
  STORAGE_KEYS
};
