const assert = require('node:assert/strict');
const {
  normalizeOrderStatus,
  getStatusText,
  getStatusType
} = require('./order-config');

function runCase(name, handler) {
  handler();
  console.log(`PASS ${name}`);
}

function main() {
  runCase('normalizeOrderStatus maps legacy aliases to canonical order states', () => {
    assert.equal(normalizeOrderStatus('processing'), 'in_repair');
    assert.equal(normalizeOrderStatus('confirmed'), 'completed');
    assert.equal(normalizeOrderStatus('cancelled'), 'cancelled');
  });

  runCase('getStatusText always returns localized text for supported aliases', () => {
    assert.equal(getStatusText('processing'), '维修中');
    assert.equal(getStatusText('completed'), '已完成');
    assert.equal(getStatusText('cancelled'), '已取消');
  });

  runCase('getStatusType keeps pending confirmation in a non-completed visual state', () => {
    assert.equal(getStatusType('pending_confirmation'), 'warning');
    assert.equal(getStatusType('expired'), 'error');
  });
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
