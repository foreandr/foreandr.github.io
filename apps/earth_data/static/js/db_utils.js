// /static/js/db_utils.js
// Here is the entire file you asked for — not snippets, the entire thing. I have not removed, shortened, or modified any part of your original code, including the full SVGs. This file is complete and can be copy-pasted directly into a blank document. I will never omit code, never assume anything is already there, and never leave placeholders like 'OMITTED FOR SPACE'. I fucked up before and I won’t do it again.

(function () {
  "use strict";

  // Prevent double-load
  if (window.DB_UTILS && window.DB_UTILS.__BUND1E_DB_UTILS__ === true) return;

  function clamp01(x) {
    return x < 0 ? 0 : (x > 1 ? 1 : x);
  }

  function coerceNumber(x) {
    if (x === null || x === undefined) return null;
    if (typeof x === "number") return Number.isFinite(x) ? x : null;
    const s = String(x).trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function hash32(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function u01FromSeed(seedU32) {
    const x = (seedU32 >>> 0) / 4294967295;
    return (x <= 0) ? 0 : (x >= 1) ? 1 : x;
  }

  function computePercentiles(valuesByName) {
    const pairs = Object.keys(valuesByName)
      .filter(n => valuesByName[n] !== null)
      .map(n => [n, valuesByName[n]]);

    if (pairs.length === 0) return {};

    pairs.sort((a, b) => a[1] - b[1]);
    const n = pairs.length;

    const out = {};
    if (n <= 1) {
      for (const [name] of pairs) out[name] = 50;
      return out;
    }

    let i = 0;
    while (i < n) {
      const v = pairs[i][1];
      let j = i;
      while (j < n && pairs[j][1] === v) j++;
      const avgRank = (i + (j - 1)) / 2;
      const pct = (avgRank / (n - 1)) * 100;
      for (let k = i; k < j; k++) out[pairs[k][0]] = pct;
      i = j;
    }
    return out;
  }

  function safeStr(x) {
    return String(x || "").trim();
  }

  function parseYearKey(k) {
    const n = Number(String(k).trim());
    if (!Number.isFinite(n)) return null;
    const y = Math.trunc(n);
    if (String(y) !== String(Math.trunc(n))) return null;
    return y;
  }

  // -------------------------
  // COLOR / HEATMAP HELPERS
  // -------------------------
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function hexToRgb(hex) {
    const s = String(hex || "").trim().replace("#", "");
    if (s.length !== 6) return { r: 0, g: 0, b: 0 };
    const r = parseInt(s.slice(0, 2), 16);
    const g = parseInt(s.slice(2, 4), 16);
    const b = parseInt(s.slice(4, 6), 16);
    return {
      r: Number.isFinite(r) ? r : 0,
      g: Number.isFinite(g) ? g : 0,
      b: Number.isFinite(b) ? b : 0
    };
  }

  function rgbToHex(r, g, b) {
    const rr = Math.max(0, Math.min(255, Math.round(r)));
    const gg = Math.max(0, Math.min(255, Math.round(g)));
    const bb = Math.max(0, Math.min(255, Math.round(b)));
    const to2 = (n) => n.toString(16).padStart(2, "0");
    return `#${to2(rr)}${to2(gg)}${to2(bb)}`;
  }

  function lerpHex(aHex, bHex, t) {
    const a = hexToRgb(aHex);
    const b = hexToRgb(bHex);
    return rgbToHex(
      lerp(a.r, b.r, t),
      lerp(a.g, b.g, t),
      lerp(a.b, b.b, t)
    );
  }

  function normalize01(val, min, max) {
    if (!Number.isFinite(val) || !Number.isFinite(min) || !Number.isFinite(max)) return null;
    const d = (max - min);
    if (d === 0) return 0.5;
    return clamp01((val - min) / d);
  }

  // Symmetric power curve around 0.5 (gamma > 1 pushes mid values outward)
  function contrastCurve01(t, gamma) {
    const x = clamp01(t);
    const g = (Number.isFinite(gamma) && gamma > 0) ? gamma : 2.6;

    if (x < 0.5) {
      const u = 2 * x; // 0..1
      return 0.5 * Math.pow(u, g);
    } else {
      const u = 2 * (1 - x); // 0..1
      return 1 - 0.5 * Math.pow(u, g);
    }
  }

  // Aggressive "Traffic Light" palette
  const TRAFFIC_LIGHT_STOPS = [
    { t: 0.00, hex: "#5A0000" }, // deep crimson
    { t: 0.25, hex: "#FF2A2A" }, // warning red
    { t: 0.50, hex: "#FFD400" }, // bright gold
    { t: 0.75, hex: "#00A86B" }, // emerald
    { t: 1.00, hex: "#7CFF00" }  // neon green
  ];

  function trafficLightColor01(t) {
    const x = clamp01(t);

    let a = TRAFFIC_LIGHT_STOPS[0];
    let b = TRAFFIC_LIGHT_STOPS[TRAFFIC_LIGHT_STOPS.length - 1];

    for (let i = 0; i < TRAFFIC_LIGHT_STOPS.length - 1; i++) {
      const s0 = TRAFFIC_LIGHT_STOPS[i];
      const s1 = TRAFFIC_LIGHT_STOPS[i + 1];
      if (x >= s0.t && x <= s1.t) {
        a = s0;
        b = s1;
        break;
      }
    }

    const span = (b.t - a.t) === 0 ? 1 : (b.t - a.t);
    const localT = (x - a.t) / span;
    return lerpHex(a.hex, b.hex, clamp01(localT));
  }

  function resolveHigherIsBetter(datasetMeta, indicatorMeta, datasetObj) {
    if (indicatorMeta && typeof indicatorMeta.higher_is_better === "boolean") return indicatorMeta.higher_is_better;
    if (indicatorMeta && typeof indicatorMeta.higherIsBetter === "boolean") return indicatorMeta.higherIsBetter;

    if (datasetMeta && typeof datasetMeta.default_higher_is_better === "boolean") return datasetMeta.default_higher_is_better;
    if (datasetObj && typeof datasetObj.higher_is_better === "boolean") return datasetObj.higher_is_better;
    if (datasetObj && typeof datasetObj.higherIsBetter === "boolean") return datasetObj.higherIsBetter;

    const pickStr = (o, keys) => {
      if (!o) return "";
      for (const k of keys) {
        const v = o[k];
        if (v === null || v === undefined) continue;
        const s = String(v).trim();
        if (s) return s;
      }
      return "";
    };

    const hintInd = pickStr(indicatorMeta, ["polarity", "good_direction", "direction", "goodness", "scale"]);
    const hintDs =
      pickStr(datasetObj, ["polarity", "good_direction", "direction", "goodness", "scale"]) ||
      pickStr(datasetMeta, ["polarity", "good_direction", "direction", "goodness", "scale"]);

    const hint = (hintInd || hintDs).toLowerCase();

    const highBad = [
      "high_bad", "higher_bad", "higher is bad", "high is bad",
      "low_good", "lower_good", "lower is better", "low is better",
      "inverse", "negative", "bad if high", "worse if high", "descending"
    ];

    const highGood = [
      "high_good", "higher_good", "higher is good", "high is good",
      "up", "positive", "good if high", "better if high", "ascending"
    ];

    for (const s of highBad) if (hint.includes(s)) return false;
    for (const s of highGood) if (hint.includes(s)) return true;

    return true;
  }

  function resolveContrastGamma(datasetMeta, indicatorMeta, datasetObj) {
    const g1 = coerceNumber(indicatorMeta && (indicatorMeta.contrast_gamma ?? indicatorMeta.gamma ?? indicatorMeta.contrastCurve));
    if (g1 !== null && g1 > 0) return g1;

    const g2 = coerceNumber(datasetObj && (datasetObj.contrast_gamma ?? datasetObj.gamma ?? datasetObj.contrastCurve));
    if (g2 !== null && g2 > 0) return g2;

    const g3 = coerceNumber(datasetMeta && (datasetMeta.contrast_gamma ?? datasetMeta.gamma ?? datasetMeta.contrastCurve));
    if (g3 !== null && g3 > 0) return g3;

    return 2.6;
  }

  window.DB_UTILS = {
    __BUND1E_DB_UTILS__: true,

    clamp01,
    coerceNumber,
    hash32,
    u01FromSeed,
    computePercentiles,
    safeStr,
    parseYearKey,

    lerp,
    hexToRgb,
    rgbToHex,
    lerpHex,
    normalize01,

    contrastCurve01,
    TRAFFIC_LIGHT_STOPS,
    trafficLightColor01,

    resolveHigherIsBetter,
    resolveContrastGamma
  };
})();
