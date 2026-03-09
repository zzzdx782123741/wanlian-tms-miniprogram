/**
 * 全局常量定义
 * 统一管理系统中使用的各种常量
 */

/**
 * 用户角色类型
 */
const USER_ROLE = {
  DRIVER: 'DRIVER',                        // 司机
  FLEET_MANAGER: 'FLEET_MANAGER',          // 车队管理员
  STORE_TECHNICIAN: 'STORE_TECHNICIAN',    // 门店技师
  STORE_MANAGER: 'STORE_MANAGER',          // 门店管理员
  PLATFORM_OPERATOR: 'PLATFORM_OPERATOR'   // 平台运营者
};

/**
 * 技师状态
 */
const TECHNICIAN_STATUS = {
  BUSY: 'busy',    // 工作中
  IDLE: 'idle'     // 空闲
};

/**
 * 订单筛选类型
 */
const ORDER_FILTER_TYPE = {
  PENDING: 'pending',      // 待处理
  PROCESSING: 'processing', // 维修中
  COMPLETED: 'completed'    // 已完成
};

/**
 * 时间范围类型
 */
const TIME_RANGE = {
  TODAY: 'today',     // 今天
  WEEK: 'week',       // 本周
  MONTH: 'month',     // 本月
  ALL: 'all'          // 全部
};

/**
 * 动态类型（用于门店管理台最近动态）
 */
const ACTIVITY_TYPE = {
  ORDER: 'order',         // 订单相关
  ADDON: 'addon',         // 增项相关
  STOCK: 'stock',         // 库存相关
  COMPLETED: 'completed'  // 完成相关
};

/**
 * 动态类型配置
 */
const ACTIVITY_CONFIG = {
  [ACTIVITY_TYPE.ORDER]: {
    icon: '📋',
    label: '订单'
  },
  [ACTIVITY_TYPE.ADDON]: {
    icon: '⚠️',
    label: '增项'
  },
  [ACTIVITY_TYPE.STOCK]: {
    icon: '📦',
    label: '库存'
  },
  [ACTIVITY_TYPE.COMPLETED]: {
    icon: '✅',
    label: '完成'
  }
};

/**
 * 订单状态（用于筛选）
 */
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

/**
 * 技师权限类型
 */
const TECHNICIAN_PERMISSION = {
  RECEIVE_ORDER: 'receive_order',    // 接单
  DIAGNOSIS: 'diagnosis',            // 诊断
  QUOTE: 'quote',                    // 报价
  REPAIR: 'repair',                  // 维修
  COMPLETE: 'complete'               // 完工
};

/**
 * 默认分页配置
 */
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

/**
 * 缓存键名
 */
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
