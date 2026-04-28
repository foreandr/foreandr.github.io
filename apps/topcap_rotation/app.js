const TOPN_OPTIONS = [1, 2, 3, 5, 10, 20, 50, 100, 200, 300, 400, 500];
const COLORS = [
  "#63ffbf", "#6aa7ff", "#ffc857", "#ff8fa3",
  "#9d7bff", "#4be1d3", "#f27d7d", "#f8c43a",
  "#8cf5b0", "#76d7ff", "#ff9b5e", "#c4f078"
];

const dom = {
  capitalInput:  document.getElementById("capitalInput"),
  rebalanceSelect: document.getElementById("rebalanceSelect"),
  topNGrid:      document.getElementById("topNGrid"),
  focusSelect:   document.getElementById("focusSelect"),
  windowSelect:  document.getElementById("windowSelect"),
  scaleSelect:   document.getElementById("scaleSelect"),
  runBtn:        document.getElementById("runBtn"),
  chart:         document.getElementById("chart"),
  legend:        document.getElementById("legend"),
  summaryBody:   document.querySelector("#summaryTable tbody"),
  metricsCards:  document.getElementById("metricsCards"),
  rollingChart:  document.getElementById("rollingChart"),
  drawdownChart: document.getElementById("drawdownChart"),
  returnsBody:   document.querySelector("#returnsTable tbody"),
  dataStatus:    document.getElementById("dataStatus")
};

const tlDom = {
  focusSelect: document.getElementById("tlFocusSelect"),
  date:        document.getElementById("tlDate"),
  value:       document.getElementById("tlValue"),
  gain:        document.getElementById("tlGain"),
  progress:    document.getElementById("tlProgress"),
  resetBtn:    document.getElementById("tlResetBtn"),
  prevBtn:     document.getElementById("tlPrevBtn"),
  playBtn:     document.getElementById("tlPlayBtn"),
  nextBtn:     document.getElementById("tlNextBtn"),
  scrubber:    document.getElementById("tlScrubber"),
  speedSelect: document.getElementById("tlSpeedSelect"),
  tickerGrid:  document.getElementById("tlTickerGrid"),
  swapLog:     document.getElementById("tlSwapLog"),
  swapCount:   document.getElementById("tlSwapCount")
};

let dataset = null;
let lastResults = [];
let timelineData = null;
let timelineIdx = 0;
let timelineInterval = null;
let swapLogEntries = [];
let renderPending = null;

// ── Data Loading ────────────────────────────────────────────────────────────

function showDataError(msg) {
  console.error("fetchData:", msg);
  if (!dom.dataStatus) return;
  dom.dataStatus.textContent = msg;
  dom.dataStatus.style.color = "#ff6b6b";
}

async function fetchData() {
  if (dom.dataStatus) {
    dom.dataStatus.textContent = "Downloading dataset…";
    dom.dataStatus.style.color = "";
  }

  let res;
  try {
    res = await fetch("data/real_data.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    showDataError(
      location.protocol === "file:"
        ? "⚠ Open via HTTP server, not file://. Run: python server.py  then visit http://localhost:8001"
        : `⚠ Could not fetch real_data.json (${err.message}) — run fetch_topcap_data.py first.`
    );
    return;
  }

  if (dom.dataStatus) dom.dataStatus.textContent = "Parsing dataset…";

  let data;
  try {
    const text = await res.text();
    // Python json.dump writes bare `NaN` for float NaN by default — not valid JSON.
    // Replace every standalone NaN token with null before parsing.
    const cleaned = text.replace(/\bNaN\b/g, "null");
    data = JSON.parse(cleaned);
  } catch (err) {
    showDataError(
      `⚠ real_data.json failed to parse: ${err.message}. ` +
      `File may be corrupt — rerun data/fetch_topcap_data.py.`
    );
    return;
  }

  dataset = data;
  setDataStatus();
  return data;
}

function setDataStatus() {
  if (!dataset || !dom.dataStatus) return;
  const start = dataset.dates[0];
  const end   = dataset.dates[dataset.dates.length - 1];
  dom.dataStatus.textContent =
    `${dataset.tickers.length.toLocaleString()} tickers · ${dataset.meta.frequency} · ${start} → ${end} · Real market data`;
}

// ── Checkbox Grid ───────────────────────────────────────────────────────────

function buildTopNCheckboxes() {
  dom.topNGrid.innerHTML = "";
  TOPN_OPTIONS.forEach(n => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = [1, 5, 10, 50, 100, 500].includes(n);
    input.dataset.n = n;
    const span = document.createElement("span");
    span.textContent = `Top ${n}`;
    label.appendChild(input);
    label.appendChild(span);
    dom.topNGrid.appendChild(label);
  });
}

function getSelectedNs() {
  return Array.from(dom.topNGrid.querySelectorAll("input"))
    .filter(input => input.checked)
    .map(input => Number(input.dataset.n));
}

// ── Simulation Core ─────────────────────────────────────────────────────────

function computeTopNSeries(n, rebalanceEvery) {
  const dates  = dataset.dates;
  const prices = dataset.prices;
  const caps   = dataset.market_caps;
  const count  = dataset.tickers.length;

  let value = Number(dom.capitalInput.value) || 10000;
  const series = [value];
  let rotations = 0;
  let lastSet = new Set();
  const rebalanceSets = [];

  for (let t = 0; t < dates.length - 1; t++) {
    if (t % rebalanceEvery === 0) {
      const capRow = caps[t];
      const indices = Array.from({ length: count }, (_, i) => i);
      indices.sort((a, b) => (capRow[b] ?? -Infinity) - (capRow[a] ?? -Infinity));
      const filtered = indices.filter(i =>
        capRow[i] != null &&
        prices[t][i] != null &&
        prices[t + 1]?.[i] != null
      );
      const selected = new Set(filtered.slice(0, n));
      if (selected.size > 0 && !setsEqual(selected, lastSet)) {
        rotations++;
        lastSet = selected;
      }
      if (selected.size > 0) rebalanceSets.push({ t, selected, capRow });
    }

    if (lastSet.size === 0) { series.push(value); continue; }

    const weight = value / lastSet.size;
    let nextValue = 0;
    lastSet.forEach(i => {
      nextValue += (weight / prices[t][i]) * prices[t + 1][i];
    });
    value = nextValue;
    series.push(value);
  }

  return { series, rotations, rebalanceSets };
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

// ── Statistics ──────────────────────────────────────────────────────────────

function maxDrawdown(series) {
  let peak = series[0], maxDD = 0;
  for (let i = 1; i < series.length; i++) {
    if (series[i] > peak) peak = series[i];
    const dd = (peak - series[i]) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

function cagr(series, years) {
  const start = series[0], end = series[series.length - 1];
  if (start <= 0 || years <= 0) return 0;
  return Math.pow(end / start, 1 / years) - 1;
}

function getYears() {
  if (dataset?.meta?.years) return dataset.meta.years;
  if (!dataset?.dates?.length) return 0;
  return (dataset.dates.length - 1) / 12;
}

function seriesToReturns(series) {
  const out = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    out.push(prev === 0 ? 0 : series[i] / prev - 1);
  }
  return out;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function computeDrawdownSeries(series) {
  let peak = series[0];
  return series.map(v => {
    if (v > peak) peak = v;
    return (v - peak) / peak;
  });
}

function computeRollingCagr(series, windowMonths) {
  return series.map((v, i) => {
    if (i < windowMonths) return null;
    const start = series[i - windowMonths];
    if (start <= 0) return null;
    return Math.pow(v / start, 12 / windowMonths) - 1;
  });
}

function concentrationStats(rebalanceSets) {
  if (!rebalanceSets.length) return { avgHHI: 0, avgTop1: 0 };
  let hhiSum = 0, top1Sum = 0, count = 0;
  rebalanceSets.forEach(({ selected, capRow }) => {
    let total = 0;
    selected.forEach(i => { total += capRow[i] || 0; });
    if (total <= 0) return;
    let hhi = 0, top1 = 0;
    selected.forEach(i => {
      const w = (capRow[i] || 0) / total;
      hhi += w * w;
      if (w > top1) top1 = w;
    });
    hhiSum += hhi; top1Sum += top1; count++;
  });
  if (!count) return { avgHHI: 0, avgTop1: 0 };
  return { avgHHI: hhiSum / count, avgTop1: top1Sum / count };
}

// ── Charts ──────────────────────────────────────────────────────────────────

function drawChart(results) {
  const ctx  = dom.chart.getContext("2d");
  const rect = dom.chart.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  dom.chart.width  = rect.width  * ratio;
  dom.chart.height = rect.height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  // Asymmetric padding: left for Y labels, bottom for X labels
  const padL = 72, padR = 16, padT = 16, padB = 36;
  const width  = rect.width  - padL - padR;
  const height = rect.height - padT - padB;

  const allSeries = results.map(r => r.series);
  const allFlat   = allSeries.flat().filter(v => v != null && isFinite(v));
  const maxValue  = Math.max(...allFlat);
  const minValue  = Math.min(...allFlat);
  const scaleType = dom.scaleSelect.value;
  const dates     = dataset?.dates ?? [];
  const n         = results[0]?.series?.length ?? 0;

  const getX = i => padL + (n > 1 ? (i / (n - 1)) * width : 0);
  const getY = val => {
    if (scaleType === "log") {
      const lo = Math.log(Math.max(1, minValue)), hi = Math.log(maxValue);
      return padT + height - ((Math.log(Math.max(val, 1)) - lo) / (hi - lo)) * height;
    }
    const range = maxValue - minValue || 1;
    return padT + height - ((val - minValue) / range) * height;
  };

  // ── Y-axis grid lines + labels ──────────────────────────────────────────
  function niceYTicks(lo, hi, count) {
    if (scaleType === "log") {
      const ticks = [];
      const loExp = Math.floor(Math.log10(Math.max(lo, 1)));
      const hiExp = Math.ceil(Math.log10(hi));
      for (let e = loExp; e <= hiExp; e++) {
        for (const m of [1, 2, 5]) {
          const v = m * Math.pow(10, e);
          if (v >= lo * 0.99 && v <= hi * 1.01) ticks.push(v);
        }
      }
      return ticks;
    }
    const step = Math.pow(10, Math.floor(Math.log10((hi - lo) / count)));
    const mag  = Math.ceil((hi - lo) / count / step) * step;
    const ticks = [];
    let t = Math.ceil(lo / mag) * mag;
    while (t <= hi + mag * 0.01) { ticks.push(t); t = Math.round((t + mag) * 1e9) / 1e9; }
    return ticks;
  }

  function fmtMoney(v) {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(v >= 10e6 ? 0 : 1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  }

  const yTicks = niceYTicks(minValue, maxValue, 6);
  ctx.font = "11px 'Space Grotesk', system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  yTicks.forEach(tick => {
    const y = getY(tick);
    if (y < padT - 4 || y > padT + height + 4) return;
    // Grid line
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + width, y);
    ctx.stroke();
    ctx.setLineDash([]);
    // Label
    ctx.fillStyle = "rgba(159,176,200,0.85)";
    ctx.fillText(fmtMoney(tick), padL - 8, y);
  });

  // ── X-axis year labels ───────────────────────────────────────────────────
  // Collect one index per calendar year (first month of each year seen in dates)
  const yearIndices = [];
  let lastYear = null;
  dates.forEach((d, i) => {
    if (i >= n) return;
    const yr = d.slice(0, 4);
    if (yr !== lastYear) { yearIndices.push({ i, yr }); lastYear = yr; }
  });

  // How many labels fit? ~60px per label
  const maxLabels = Math.floor(width / 60);
  const step = Math.max(1, Math.ceil(yearIndices.length / maxLabels));
  const labeledYears = yearIndices.filter((_, idx) => idx % step === 0);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(159,176,200,0.85)";

  labeledYears.forEach(({ i, yr }) => {
    const x = getX(i);
    // Vertical grid line
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + height);
    ctx.stroke();
    ctx.setLineDash([]);
    // Year label
    ctx.fillText(yr, x, padT + height + 8);
  });

  // ── Axis border ──────────────────────────────────────────────────────────
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + height);
  ctx.lineTo(padL + width, padT + height);
  ctx.stroke();

  // ── Series lines ─────────────────────────────────────────────────────────
  results.forEach((result, idx) => {
    ctx.strokeStyle = COLORS[idx % COLORS.length];
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    result.series.forEach((val, i) => {
      if (val == null || !isFinite(val)) return;
      const x = getX(i);
      const y = getY(val);
      if (i === 0 || result.series[i - 1] == null) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
}

function drawMiniChart(canvas, series, color, zeroLine = false) {
  const ctx  = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width  = rect.width  * ratio;
  canvas.height = rect.height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const padL = 44, padR = 8, padT = 8, padB = 24;
  const width  = rect.width  - padL - padR;
  const height = rect.height - padT - padB;
  const filtered = series.filter(v => v != null && isFinite(v));
  if (!filtered.length) return;
  const maxValue = Math.max(...filtered);
  const minValue = Math.min(...filtered);
  const range    = maxValue - minValue || 1;
  const n        = series.length;
  const dates    = dataset?.dates ?? [];

  const getX = i => padL + (n > 1 ? (i / (n - 1)) * width : 0);
  const getY = val => padT + height - ((val - minValue) / range) * height;

  ctx.font = "10px 'Space Grotesk', system-ui, sans-serif";

  // ── Y ticks (3 levels) ───────────────────────────────────────────────────
  const yStops = [minValue, (minValue + maxValue) / 2, maxValue];
  yStops.forEach(v => {
    const y = getY(v);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + width, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(159,176,200,0.8)";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(`${(v * 100).toFixed(0)}%`, padL - 4, y);
  });

  // ── Zero line ────────────────────────────────────────────────────────────
  if (zeroLine && minValue < 0 && maxValue > 0) {
    const y0 = getY(0);
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(padL, y0); ctx.lineTo(padL + width, y0); ctx.stroke();
  }

  // ── X year labels ────────────────────────────────────────────────────────
  const yearIndices = [];
  let lastYr = null;
  dates.forEach((d, i) => {
    if (i >= n) return;
    const yr = d.slice(0, 4);
    if (yr !== lastYr) { yearIndices.push({ i, yr }); lastYr = yr; }
  });
  const maxLabels = Math.floor(width / 52);
  const step = Math.max(1, Math.ceil(yearIndices.length / maxLabels));
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(159,176,200,0.75)";
  yearIndices.filter((_, idx) => idx % step === 0).forEach(({ i, yr }) => {
    const x = getX(i);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + height); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText(yr, x, padT + height + 5);
  });

  // ── Axis ─────────────────────────────────────────────────────────────────
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + height);
  ctx.lineTo(padL + width, padT + height);
  ctx.stroke();

  // ── Series line ──────────────────────────────────────────────────────────
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  series.forEach((val, i) => {
    if (val == null || !isFinite(val)) return;
    const x = getX(i);
    const y = getY(val);
    if (i === 0 || series[i - 1] == null) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

// ── UI Rendering ─────────────────────────────────────────────────────────────

function renderLegend(results) {
  dom.legend.innerHTML = "";
  results.forEach((result, idx) => {
    const span = document.createElement("span");
    const dot  = document.createElement("i");
    dot.style.background = COLORS[idx % COLORS.length];
    span.appendChild(dot);
    span.appendChild(document.createTextNode(`Top ${result.n}`));
    dom.legend.appendChild(span);
  });
}

function renderTable(results) {
  dom.summaryBody.innerHTML = "";
  results.forEach(result => {
    const tr = document.createElement("tr");
    const finalValue = result.series[result.series.length - 1];
    const dd      = maxDrawdown(result.series);
    const years   = getYears();
    const growth  = cagr(result.series, years);
    const returns = seriesToReturns(result.series);
    const vol     = std(returns) * Math.sqrt(12);
    const best    = returns.length ? Math.max(...returns) : 0;
    const worst   = returns.length ? Math.min(...returns) : 0;
    tr.innerHTML = `
      <td>Top ${result.n}</td>
      <td>$${finalValue.toFixed(2)}</td>
      <td>${(growth * 100).toFixed(2)}%</td>
      <td>${(dd * 100).toFixed(2)}%</td>
      <td>${result.rotations}</td>
      <td>${(vol * 100).toFixed(2)}%</td>
      <td>${(best * 100).toFixed(2)}%</td>
      <td>${(worst * 100).toFixed(2)}%</td>
    `;
    dom.summaryBody.appendChild(tr);
  });
}

function updateFocusOptions(results) {
  dom.focusSelect.innerHTML = "";
  results.forEach(result => {
    const opt = document.createElement("option");
    opt.value = result.n;
    opt.textContent = `Top ${result.n}`;
    dom.focusSelect.appendChild(opt);
  });
}

function updateDiagnostics(result) {
  if (!result) return;
  const years   = getYears();
  const returns = seriesToReturns(result.series);
  const ddSeries = computeDrawdownSeries(result.series);
  const rollingMonths = Number(dom.windowSelect.value);
  const rolling = computeRollingCagr(result.series, rollingMonths);
  const vol     = std(returns) * Math.sqrt(12);
  const avg     = mean(returns);
  const sharpe  = vol === 0 ? 0 : (avg * 12) / vol;
  const best    = returns.length ? Math.max(...returns) : 0;
  const worst   = returns.length ? Math.min(...returns) : 0;
  const positivePct = returns.length ? returns.filter(r => r > 0).length / returns.length : 0;
  const { avgHHI, avgTop1 } = concentrationStats(result.rebalanceSets);

  const cards = [
    { label: "Focus Strategy",   value: `Top ${result.n}` },
    { label: "CAGR",             value: `${(cagr(result.series, years) * 100).toFixed(2)}%` },
    { label: "Max Drawdown",     value: `${(maxDrawdown(result.series) * 100).toFixed(2)}%` },
    { label: "Volatility",       value: `${(vol * 100).toFixed(2)}%` },
    { label: "Sharpe (0% RF)",   value: sharpe.toFixed(2) },
    { label: "Rotations / Year", value: (result.rotations / years).toFixed(2) },
    { label: "Avg HHI",          value: avgHHI.toFixed(3) },
    { label: "Avg Top-1 Weight", value: `${(avgTop1 * 100).toFixed(2)}%` }
  ];

  dom.metricsCards.innerHTML = "";
  cards.forEach(card => {
    const div = document.createElement("div");
    div.className = "metric-card";
    div.innerHTML = `<span>${card.label}</span><strong>${card.value}</strong>`;
    dom.metricsCards.appendChild(div);
  });

  dom.returnsBody.innerHTML = "";
  const rows = [
    ["Average Monthly Return", `${(avg * 100).toFixed(2)}%`],
    ["Best Month",             `${(best * 100).toFixed(2)}%`],
    ["Worst Month",            `${(worst * 100).toFixed(2)}%`],
    ["Positive Months",        `${(positivePct * 100).toFixed(1)}%`],
    ["Total Rotations",        `${result.rotations}`],
    ["Rolling Window",         `${rollingMonths} months`]
  ];
  rows.forEach(([k, v]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${k}</td><td>${v}</td>`;
    dom.returnsBody.appendChild(tr);
  });

  drawMiniChart(dom.rollingChart,  rolling,  "#63ffbf", true);
  drawMiniChart(dom.drawdownChart, ddSeries, "#ff8fa3", true);
}

// ── Main Simulation ──────────────────────────────────────────────────────────

function runSimulation() {
  if (!dataset) return;
  const selected = getSelectedNs();
  if (!selected.length) return;
  const rebalanceEvery = Number(dom.rebalanceSelect.value);

  const results = selected.map(n => {
    const res = computeTopNSeries(n, rebalanceEvery);
    return { n, series: res.series, rotations: res.rotations, rebalanceSets: res.rebalanceSets };
  });

  lastResults = results;
  drawChart(results);
  renderLegend(results);
  renderTable(results);
  updateFocusOptions(results);
  const focusN = Number(dom.focusSelect.value) || results[0].n;
  const focus  = results.find(r => r.n === focusN) || results[0];
  updateDiagnostics(focus);
  initTimeline(results);
}

// ── Portfolio Time Machine ───────────────────────────────────────────────────

function formatCap(cap) {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9)  return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6)  return `$${(cap / 1e6).toFixed(0)}M`;
  return `$${cap.toFixed(0)}`;
}

function formatMoney(v) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(3)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(3)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function buildTimelineData(result) {
  const { n, series, rebalanceSets } = result;

  const timeline = rebalanceSets.map(({ t, selected, capRow }, idx) => {
    let totalCap = 0;
    selected.forEach(i => { totalCap += capRow[i] || 0; });

    const sortedIndices = [...selected].sort((a, b) => (capRow[b] || 0) - (capRow[a] || 0));
    const tickers = sortedIndices.map((i, rank) => ({
      symbol: dataset.tickers[i],
      rank:   rank + 1,
      cap:    capRow[i] || 0,
      weight: totalCap > 0 ? (capRow[i] || 0) / totalCap : 0
    }));

    const prevSelected = idx > 0 ? rebalanceSets[idx - 1].selected : new Set();
    const swapsIn  = [...selected].filter(i => !prevSelected.has(i)).map(i => dataset.tickers[i]);
    const swapsOut = [...prevSelected].filter(i => !selected.has(i)).map(i => dataset.tickers[i]);

    return { t, date: dataset.dates[t], portfolioValue: series[t], tickers, swapsIn, swapsOut };
  });

  return { timeline, series, n };
}

function buildTickerGrid(shown, more, prevSymbols, currSymbols, animate) {
  tlDom.tickerGrid.innerHTML = "";
  shown.forEach(ticker => {
    const isNew = animate && !prevSymbols.has(ticker.symbol);
    const card  = document.createElement("div");
    card.className = `ticker-card rank-${Math.min(ticker.rank, 5)}${isNew ? " swap-in" : ""}`;
    card.innerHTML = `
      <div class="tc-rank">#${ticker.rank}</div>
      <div class="tc-symbol">${ticker.symbol}</div>
      <div class="tc-cap">${formatCap(ticker.cap)}</div>
      <div class="tc-weight">${(ticker.weight * 100).toFixed(1)}%</div>
    `;
    tlDom.tickerGrid.appendChild(card);
  });
  if (more > 0) {
    const moreEl = document.createElement("div");
    moreEl.className   = "tl-more";
    moreEl.textContent = `+${more} more`;
    tlDom.tickerGrid.appendChild(moreEl);
  }
}

function renderTimelineFrame(idx, animate) {
  if (!timelineData || !timelineData.timeline.length) return;

  // Cancel any pending delayed rebuild from a previous swap-out animation
  if (renderPending !== null) { clearTimeout(renderPending); renderPending = null; }

  const frame   = timelineData.timeline[idx];
  const initial = timelineData.series[0];

  tlDom.date.textContent     = frame.date;
  tlDom.value.textContent    = formatMoney(frame.portfolioValue);
  const gainPct = (frame.portfolioValue / initial - 1) * 100;
  tlDom.gain.textContent     = `${gainPct >= 0 ? "+" : ""}${gainPct.toFixed(1)}%`;
  tlDom.gain.className       = `tl-gain ${gainPct >= 0 ? "positive" : "negative"}`;
  tlDom.progress.textContent = `${idx + 1} / ${timelineData.timeline.length}`;
  tlDom.scrubber.value       = idx;

  // Show ALL tickers for small portfolios, cap at 50 for large ones
  const MAX_SHOW    = 50;
  const prevFrame   = idx > 0 ? timelineData.timeline[idx - 1] : null;
  const prevSymbols = new Set(prevFrame ? prevFrame.tickers.map(t => t.symbol) : []);
  const currSymbols = new Set(frame.tickers.map(t => t.symbol));
  const shown       = frame.tickers.slice(0, MAX_SHOW);
  const more        = frame.tickers.length - MAX_SHOW;

  // Only animate swap-out at slower playback speeds (≥200ms interval)
  const speed = Number(tlDom.speedSelect?.value ?? 400);
  const doSwapOutAnim = animate && speed >= 200 && frame.swapsOut && frame.swapsOut.length > 0;

  if (doSwapOutAnim) {
    // Flash outgoing ticker cards red, then rebuild
    const existingCards = tlDom.tickerGrid.querySelectorAll(".ticker-card");
    existingCards.forEach(card => {
      const sym = card.querySelector(".tc-symbol")?.textContent;
      if (sym && !currSymbols.has(sym)) card.classList.add("swap-out");
    });
    renderPending = setTimeout(() => {
      renderPending = null;
      buildTickerGrid(shown, more, prevSymbols, currSymbols, animate);
    }, 300);
  } else {
    buildTickerGrid(shown, more, prevSymbols, currSymbols, animate);
  }

  if (animate && (frame.swapsIn.length || frame.swapsOut.length)) {
    swapLogEntries.unshift({ date: frame.date, in: frame.swapsIn, out: frame.swapsOut });
    if (swapLogEntries.length > 200) swapLogEntries.length = 200;
    if (tlDom.swapCount) tlDom.swapCount.textContent = `(${swapLogEntries.length} events)`;
  }

  renderSwapLog();
}

function renderSwapLog() {
  tlDom.swapLog.innerHTML = "";
  if (!swapLogEntries.length) {
    tlDom.swapLog.innerHTML = `<span class="tl-placeholder">Press Play or step through time to see tickers being swapped.</span>`;
    return;
  }
  swapLogEntries.forEach(entry => {
    const div = document.createElement("div");
    div.className = "swap-entry";
    const ins  = entry.in.map(s  => `<span class="sw-in">+${s}</span>`).join("");
    const outs = entry.out.map(s => `<span class="sw-out">−${s}</span>`).join("");
    div.innerHTML = `<span class="sw-date">${entry.date}</span><span class="sw-action">${ins}${outs}</span>`;
    tlDom.swapLog.appendChild(div);
  });
}

function tlPlay() {
  if (timelineInterval) return;
  const speed = Number(tlDom.speedSelect.value);
  tlDom.playBtn.textContent = "⏸ Pause";
  tlDom.playBtn.classList.add("active");
  timelineInterval = setInterval(() => {
    if (!timelineData || timelineIdx >= timelineData.timeline.length - 1) {
      tlPause();
      return;
    }
    timelineIdx++;
    renderTimelineFrame(timelineIdx, true);
  }, speed);
}

function tlPause() {
  clearInterval(timelineInterval);
  timelineInterval = null;
  tlDom.playBtn.textContent = "▶ Play";
  tlDom.playBtn.classList.remove("active");
}

function initTimeline(results) {
  if (!results || !results.length) return;
  tlDom.focusSelect.innerHTML = "";
  results.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.n;
    opt.textContent = `Top ${r.n}`;
    tlDom.focusSelect.appendChild(opt);
  });
  const currentN = Number(dom.focusSelect.value) || results[0].n;
  tlDom.focusSelect.value = currentN;
  loadTimelineForN(currentN);
}

function loadTimelineForN(n) {
  tlPause();
  swapLogEntries = [];
  if (tlDom.swapCount) tlDom.swapCount.textContent = "";
  const result = lastResults.find(r => r.n === n) || lastResults[0];
  if (!result) return;
  timelineData = buildTimelineData(result);
  timelineIdx  = 0;
  tlDom.scrubber.max   = Math.max(0, timelineData.timeline.length - 1);
  tlDom.scrubber.value = 0;
  renderTimelineFrame(0, false);
}

// ── Init ─────────────────────────────────────────────────────────────────────

function init() {
  buildTopNCheckboxes();
  fetchData().then(() => { if (dataset) runSimulation(); });

  dom.runBtn.addEventListener("click", runSimulation);
  dom.scaleSelect.addEventListener("change", () => drawChart(lastResults));
  dom.focusSelect.addEventListener("change", () => {
    const focusN = Number(dom.focusSelect.value);
    const focus  = lastResults.find(r => r.n === focusN) || lastResults[0];
    if (focus) updateDiagnostics(focus);
  });
  dom.windowSelect.addEventListener("change", () => {
    const focusN = Number(dom.focusSelect.value);
    const focus  = lastResults.find(r => r.n === focusN) || lastResults[0];
    if (focus) updateDiagnostics(focus);
  });

  // Timeline controls
  tlDom.playBtn.addEventListener("click", () => {
    if (timelineInterval) tlPause(); else tlPlay();
  });
  tlDom.resetBtn.addEventListener("click", () => {
    tlPause();
    timelineIdx    = 0;
    swapLogEntries = [];
    if (tlDom.swapCount) tlDom.swapCount.textContent = "";
    renderTimelineFrame(0, false);
    renderSwapLog();
  });
  tlDom.prevBtn.addEventListener("click", () => {
    tlPause();
    if (timelineIdx > 0) { timelineIdx--; renderTimelineFrame(timelineIdx, false); }
  });
  tlDom.nextBtn.addEventListener("click", () => {
    tlPause();
    if (timelineData && timelineIdx < timelineData.timeline.length - 1) {
      timelineIdx++;
      renderTimelineFrame(timelineIdx, true);
    }
  });
  tlDom.scrubber.addEventListener("input", () => {
    tlPause();
    timelineIdx = Number(tlDom.scrubber.value);
    renderTimelineFrame(timelineIdx, false);
  });
  tlDom.focusSelect.addEventListener("change", () => {
    loadTimelineForN(Number(tlDom.focusSelect.value));
  });
}

init();
