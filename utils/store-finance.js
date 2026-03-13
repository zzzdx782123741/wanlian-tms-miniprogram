const WITHDRAWAL_STATUS_MAP = {
  pending: '审核中',
  processing: '处理中',
  completed: '已完成',
  rejected: '已拒绝',
  cancelled: '已取消'
};

const WITHDRAWAL_APPLY_TYPE_MAP = {
  store: '门店申请',
  platform_auto: '平台结算'
};

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatMoneyYuan(value) {
  return toNumber(value).toFixed(2);
}

function formatMoneyCent(value) {
  return (toNumber(value) / 100).toFixed(2);
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function formatShortDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${month}-${day} ${hour}:${minute}`;
}

function maskBankAccount(accountNumber) {
  const value = String(accountNumber || '').replace(/\s+/g, '');
  if (!value) {
    return '-';
  }

  if (value.length <= 8) {
    return value;
  }

  return `${value.slice(0, 4)} **** **** ${value.slice(-4)}`;
}

function normalizeWithdrawal(record, options = {}) {
  const amountUnit = options.amountUnit || 'cent';
  const moneyFormatter = amountUnit === 'yuan' ? formatMoneyYuan : formatMoneyCent;
  const appliedAt = record?.appliedAt || record?.createdAt || '';
  const processedAt = record?.processedAt || '';

  return {
    ...(record || {}),
    statusText: WITHDRAWAL_STATUS_MAP[record?.status] || (record?.status || '-'),
    applyTypeText: WITHDRAWAL_APPLY_TYPE_MAP[record?.applyType] || (record?.applyType || '门店申请'),
    withdrawalAmountText: moneyFormatter(record?.withdrawalAmount),
    totalAmountText: moneyFormatter(record?.totalAmount),
    platformFeeText: moneyFormatter(record?.platformFee),
    appliedAtText: formatDateTime(appliedAt),
    appliedAtShortText: formatShortDateTime(appliedAt),
    processedAtText: formatDateTime(processedAt),
    maskedAccountNumber: maskBankAccount(record?.bankAccount?.accountNumber),
    canCancel: record?.status === 'pending' && record?.applyType === 'store'
  };
}

module.exports = {
  WITHDRAWAL_STATUS_MAP,
  formatMoneyCent,
  formatMoneyYuan,
  formatDateTime,
  maskBankAccount,
  normalizeWithdrawal
};
