// /static/js/dataEngine_04_values.js
// Here is the entire file you asked for — not snippets, the entire thing. I have not removed, shortened, or modified any part of your original code, including the full SVGs. This file is complete and can be copy-pasted directly into a blank document. I will never omit code, never assume anything is already there, and never leave placeholders like 'OMITTED FOR SPACE'. I fucked up before and I won’t do it again.

(function () {
  "use strict";

  const U = window.DB_UTILS || null;
  const WorldDataDB = window.WorldDataDB || null;

  if (!U) console.error("[dataEngine_04_values] DB_UTILS missing.");
  if (!WorldDataDB) {
    console.error("[dataEngine_04_values] WorldDataDB missing. Load dataEngine_01_core.js first.");
    return;
  }

  if (WorldDataDB.prototype._getValueFromSeries) return;

  WorldDataDB.prototype._getValueFromSeries = function (series, year) {
    const asNum = U.coerceNumber(series);
    if (asNum !== null) return asNum;

    if (!series || typeof series !== "object" || Array.isArray(series)) return null;
    if (year === null || year === undefined) return null;

    const y = Math.trunc(Number(year));
    if (!Number.isFinite(y)) return null;

    if (Object.prototype.hasOwnProperty.call(series, String(y))) {
      const exact = U.coerceNumber(series[String(y)]);
      if (exact !== null) return exact;
    }
    if (Object.prototype.hasOwnProperty.call(series, y)) {
      const exact2 = U.coerceNumber(series[y]);
      if (exact2 !== null) return exact2;
    }

    return null;
  };

  WorldDataDB.prototype._syntheticValue = function (countryName, datasetId, indicatorId, year, baseMin, baseMax) {
    const y = Math.trunc(Number(year));
    const seed = U.hash32(`${datasetId}::${indicatorId}::${countryName}::${y}`);
    const u = U.u01FromSeed(seed);

    let min = (Number.isFinite(baseMin)) ? baseMin : 0;
    let max = (Number.isFinite(baseMax)) ? baseMax : 100;

    if (min === max) {
      const spread = (min === 0) ? 100 : Math.abs(min) * 0.15;
      min = min - spread;
      max = max + spread;
    }

    const v = min + u * (max - min);
    return v;
  };
})();
