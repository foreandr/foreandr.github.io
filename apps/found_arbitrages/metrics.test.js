const assert = require('assert');
const {
  calcLockedDays,
  calcDailyReturnPct,
  calcAnnualizedReturnPct,
} = require('./metrics.js');

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${message}: expected ${expected}, got ${actual}`);
}

assert.strictEqual(calcLockedDays(0), 1, 'same-day arbs should clamp to 1 locked day');
assert.strictEqual(calcLockedDays(2.4), 2.4, 'future arbs should keep fractional days');

assertClose(calcDailyReturnPct(0.0141, 354), 0.00003983050847457627, 'daily return should be decimal margin divided by days');
assert.strictEqual(calcDailyReturnPct(0.01, 20), 0.0005, '1% over 20 days should be 0.05% per day in decimal form');

assertClose(calcAnnualizedReturnPct(0.0141, 354), 0.014538135593220339, 'annualized return should scale daily return by 365');
assertClose(calcAnnualizedReturnPct(0.015, 14), 0.39107142857142857, '1.5% over 14 days should annualize correctly');

console.log('metrics.test.js passed');
