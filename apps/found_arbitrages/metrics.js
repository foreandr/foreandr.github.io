(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.ArbMetrics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function calcLockedDays(daysUntil) {
    const days = Number(daysUntil);
    if (!Number.isFinite(days) || days <= 0) return 1;
    return days;
  }

  function calcDailyReturnPct(netPct, daysUntil) {
    return Number(netPct) / calcLockedDays(daysUntil);
  }

  function calcAnnualizedReturnPct(netPct, daysUntil) {
    return calcDailyReturnPct(netPct, daysUntil) * 365;
  }

  return {
    calcLockedDays,
    calcDailyReturnPct,
    calcAnnualizedReturnPct,
  };
});
