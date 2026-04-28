const pathsCanvas = document.getElementById("paths-canvas");
const argandUnitCanvas = document.getElementById("argand-unit-canvas");
const argandDampedCanvas = document.getElementById("argand-damped-canvas");
const hbarInput = document.getElementById("hbar");
const epsilonInput = document.getElementById("epsilon");
const resolutionInput = document.getElementById("resolution");
const buildSpeedInput = document.getElementById("build-speed");
const hbarValue = document.getElementById("hbar-value");
const epsilonValue = document.getElementById("epsilon-value");
const resolutionValue = document.getElementById("resolution-value");
const buildSpeedValue = document.getElementById("build-speed-value");
const freezeBtn = document.getElementById("freeze-btn");
const resampleBtn = document.getElementById("resample-btn");
const pathStats = document.getElementById("path-stats");
const unitStats = document.getElementById("unit-stats");
const dampedStats = document.getElementById("damped-stats");

const ctxPaths = pathsCanvas.getContext("2d");
const ctxArgandUnit = argandUnitCanvas.getContext("2d");
const ctxArgandDamped = argandDampedCanvas.getContext("2d");

const state = {
  hbar: parseFloat(hbarInput.value),
  epsilon: parseFloat(epsilonInput.value),
  resolution: parseInt(resolutionInput.value, 10),
  buildSpeed: parseInt(buildSpeedInput.value, 10),
  frozen: false,
  numPaths: 100,
  paths: [],
  lastFrame: 0,
  needsResample: true,
  buildIndex: 0,
  buildProgress: 0,
};

function resizeCanvas(canvas, ctx) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resizeAll() {
  resizeCanvas(pathsCanvas, ctxPaths);
  resizeCanvas(argandUnitCanvas, ctxArgandUnit);
  resizeCanvas(argandDampedCanvas, ctxArgandDamped);
  draw();
}

window.addEventListener("resize", resizeAll);

function randomGaussian() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generatePath(resolution) {
  const points = [];
  const modes = 4;
  const coeffs = Array.from({ length: modes }, (_, i) => {
    const scale = 0.6 / (i + 1);
    return randomGaussian() * scale;
  });

  for (let i = 0; i <= resolution; i += 1) {
    const x = i / resolution;
    let y = 0;
    for (let k = 1; k <= modes; k += 1) {
      y += coeffs[k - 1] * Math.sin(k * Math.PI * x);
    }
    points.push({ x, y });
  }

  const dt = 1 / resolution;
  let action = 0;
  for (let i = 0; i < resolution; i += 1) {
    const dy = points[i + 1].y - points[i].y;
    const dyDt = dy / dt;
    const v2 = 1 + dyDt * dyDt;
    action += 0.5 * v2 * dt;
  }

  return { points, action };
}

function generatePaths() {
  const paths = [];
  for (let i = 0; i < state.numPaths; i += 1) {
    paths.push(generatePath(state.resolution));
  }
  return paths;
}

function updateControls() {
  hbarValue.textContent = state.hbar.toFixed(2);
  epsilonValue.textContent = state.epsilon.toFixed(2);
  resolutionValue.textContent = state.resolution.toString();
  buildSpeedValue.textContent = state.buildSpeed.toString();
}

function getVectors(useDamping) {
  const vectors = state.paths.map((path) => {
    const theta = path.action / state.hbar;
    const length = useDamping ? Math.exp(-state.epsilon * path.action) : 1;
    return {
      action: path.action,
      x: Math.cos(theta) * length,
      y: Math.sin(theta) * length,
      length,
    };
  });
  vectors.sort((a, b) => a.action - b.action);
  return vectors;
}

function drawArgandPanel(ctx, vectors, statsEl) {
  const width = ctx.canvas.getBoundingClientRect().width;
  const height = ctx.canvas.getBoundingClientRect().height;
  ctx.clearRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.38;

  ctx.strokeStyle = "rgba(15, 30, 38, 0.08)";
  ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i += 1) {
    const x = centerX + (radius / 4) * i;
    const y = centerY + (radius / 4) * i;
    ctx.beginPath();
    ctx.moveTo(x, centerY - radius);
    ctx.lineTo(x, centerY + radius);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX - radius, y);
    ctx.lineTo(centerX + radius, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(15, 107, 107, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(centerX - radius, centerY);
  ctx.lineTo(centerX + radius, centerY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - radius);
  ctx.lineTo(centerX, centerY + radius);
  ctx.stroke();

  const limit = state.frozen ? vectors.length : Math.min(state.buildIndex, vectors.length);
  let cumX = 0;
  let cumY = 0;
  const points = [{ x: 0, y: 0 }];
  let maxMag = 0;
  for (let i = 0; i < limit; i += 1) {
    cumX += vectors[i].x;
    cumY += vectors[i].y;
    points.push({ x: cumX, y: cumY });
    maxMag = Math.max(maxMag, Math.hypot(cumX, cumY));
  }

  const scale = maxMag > 0 ? radius / (maxMag * 1.1) : 1;

  ctx.strokeStyle = "rgba(201, 111, 66, 0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  points.forEach((pt, idx) => {
    const x = centerX + pt.x * scale;
    const y = centerY - pt.y * scale;
    if (idx === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  ctx.strokeStyle = "rgba(201, 111, 66, 0.7)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const sx = centerX + start.x * scale;
    const sy = centerY - start.y * scale;
    const ex = centerX + end.x * scale;
    const ey = centerY - end.y * scale;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }

  const end = points[points.length - 1] || { x: 0, y: 0 };
  const resX = centerX + end.x * scale;
  const resY = centerY - end.y * scale;

  ctx.strokeStyle = "rgba(43, 43, 143, 0.95)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(resX, resY);
  ctx.stroke();

  const angle = Math.atan2(centerY - resY, resX - centerX);
  const arrowSize = 10;
  ctx.fillStyle = "rgba(43, 43, 143, 0.95)";
  ctx.beginPath();
  ctx.moveTo(resX, resY);
  ctx.lineTo(resX - arrowSize * Math.cos(angle - Math.PI / 6), resY + arrowSize * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(resX - arrowSize * Math.cos(angle + Math.PI / 6), resY + arrowSize * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  const amplitude = Math.hypot(end.x, end.y);
  statsEl.textContent = `Resultant amplitude: ${amplitude.toFixed(3)}`;
}

function drawPathsPanel() {
  const width = pathsCanvas.getBoundingClientRect().width;
  const height = pathsCanvas.getBoundingClientRect().height;

  ctxPaths.clearRect(0, 0, width, height);

  const padding = 28;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const midY = padding + plotHeight / 2;

  ctxPaths.fillStyle = "rgba(15, 30, 38, 0.04)";
  for (let i = 0; i <= 10; i += 1) {
    const x = padding + (plotWidth / 10) * i;
    ctxPaths.fillRect(x, padding, 1, plotHeight);
  }
  for (let i = 0; i <= 6; i += 1) {
    const y = padding + (plotHeight / 6) * i;
    ctxPaths.fillRect(padding, y, plotWidth, 1);
  }

  ctxPaths.strokeStyle = "rgba(201, 111, 66, 0.35)";
  ctxPaths.lineWidth = 1;
  for (const path of state.paths) {
    ctxPaths.beginPath();
    path.points.forEach((pt, idx) => {
      const x = padding + pt.x * plotWidth;
      const y = midY - pt.y * (plotHeight * 0.4);
      if (idx === 0) {
        ctxPaths.moveTo(x, y);
      } else {
        ctxPaths.lineTo(x, y);
      }
    });
    ctxPaths.stroke();
  }

  ctxPaths.strokeStyle = "rgba(15, 107, 107, 0.9)";
  ctxPaths.lineWidth = 2.2;
  ctxPaths.beginPath();
  ctxPaths.moveTo(padding, midY);
  ctxPaths.lineTo(padding + plotWidth, midY);
  ctxPaths.stroke();

  ctxPaths.fillStyle = "rgba(15, 107, 107, 0.9)";
  ctxPaths.beginPath();
  ctxPaths.arc(padding, midY, 4, 0, Math.PI * 2);
  ctxPaths.fill();
  ctxPaths.beginPath();
  ctxPaths.arc(padding + plotWidth, midY, 4, 0, Math.PI * 2);
  ctxPaths.fill();
}

function draw() {
  if (state.needsResample) {
    state.paths = generatePaths();
    state.needsResample = false;
    state.buildIndex = 0;
    state.buildProgress = 0;
  }

  drawPathsPanel();
  drawArgandPanel(ctxArgandUnit, getVectors(false), unitStats);
  drawArgandPanel(ctxArgandDamped, getVectors(true), dampedStats);

  if (state.paths.length > 0) {
    const actions = state.paths.map((path) => path.action);
    const min = Math.min(...actions);
    const max = Math.max(...actions);
    pathStats.textContent = `Action range: ${min.toFixed(3)} to ${max.toFixed(3)}`;
  }
}

function animate(timestamp) {
  const delta = timestamp - state.lastFrame;
  state.lastFrame = timestamp;

  if (!state.frozen && delta > 16) {
    state.paths = generatePaths();
    state.buildIndex = 0;
    state.buildProgress = 0;
  }

  if (!state.frozen) {
    state.buildProgress += (delta / 1000) * state.buildSpeed;
    if (state.buildProgress >= 1) {
      const steps = Math.floor(state.buildProgress);
      state.buildIndex = Math.min(state.buildIndex + steps, state.numPaths);
      state.buildProgress -= steps;
    }
    if (state.buildIndex >= state.numPaths) {
      state.buildIndex = state.numPaths;
    }
  } else {
    state.buildIndex = state.numPaths;
  }

  draw();
  requestAnimationFrame(animate);
}

hbarInput.addEventListener("input", () => {
  state.hbar = parseFloat(hbarInput.value);
  updateControls();
  draw();
});

epsilonInput.addEventListener("input", () => {
  state.epsilon = parseFloat(epsilonInput.value);
  updateControls();
  draw();
});

resolutionInput.addEventListener("input", () => {
  state.resolution = parseInt(resolutionInput.value, 10);
  state.needsResample = true;
  updateControls();
});

buildSpeedInput.addEventListener("input", () => {
  state.buildSpeed = parseInt(buildSpeedInput.value, 10);
  updateControls();
});

freezeBtn.addEventListener("click", () => {
  state.frozen = !state.frozen;
  freezeBtn.classList.toggle("active", state.frozen);
  freezeBtn.textContent = state.frozen ? "Frozen" : "Freeze Sum";
  if (state.frozen) {
    state.needsResample = false;
  }
});

resampleBtn.addEventListener("click", () => {
  state.needsResample = true;
  draw();
});

updateControls();
resizeAll();
requestAnimationFrame(animate);
