// ─── PATTERN DEFINITIONS ────────────────────────────────────────────────────
// cells: [col, row] with top-left origin; normalized to center before use

const PATTERNS = [
  // ── Still Lifes ──
  { name: 'Block', category: 'Still Lifes', meta: 'stable',
    cells: [[0,0],[1,0],[0,1],[1,1]] },
  { name: 'Beehive', category: 'Still Lifes', meta: 'stable',
    cells: [[1,0],[2,0],[0,1],[3,1],[1,2],[2,2]] },
  { name: 'Loaf', category: 'Still Lifes', meta: 'stable',
    cells: [[1,0],[2,0],[0,1],[3,1],[1,2],[3,2],[2,3]] },
  { name: 'Boat', category: 'Still Lifes', meta: 'stable',
    cells: [[0,0],[1,0],[0,1],[2,1],[1,2]] },
  { name: 'Tub', category: 'Still Lifes', meta: 'stable',
    cells: [[1,0],[0,1],[2,1],[1,2]] },

  // ── Oscillators ──
  { name: 'Blinker', category: 'Oscillators', meta: 'p2',
    cells: [[0,0],[1,0],[2,0]] },
  { name: 'Toad', category: 'Oscillators', meta: 'p2',
    cells: [[1,0],[2,0],[3,0],[0,1],[1,1],[2,1]] },
  { name: 'Beacon', category: 'Oscillators', meta: 'p2',
    cells: [[0,0],[1,0],[0,1],[1,1],[2,2],[3,2],[2,3],[3,3]] },
  { name: 'Pulsar', category: 'Oscillators', meta: 'p3',
    cells: [
      [2,0],[3,0],[4,0],[8,0],[9,0],[10,0],
      [0,2],[5,2],[7,2],[12,2],
      [0,3],[5,3],[7,3],[12,3],
      [0,4],[5,4],[7,4],[12,4],
      [2,5],[3,5],[4,5],[8,5],[9,5],[10,5],
      [2,7],[3,7],[4,7],[8,7],[9,7],[10,7],
      [0,8],[5,8],[7,8],[12,8],
      [0,9],[5,9],[7,9],[12,9],
      [0,10],[5,10],[7,10],[12,10],
      [2,12],[3,12],[4,12],[8,12],[9,12],[10,12]
    ] },
  { name: 'Pentadecathlon', category: 'Oscillators', meta: 'p15',
    cells: [
      [1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],
      [0,1],[9,1],
      [1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2]
    ] },
  { name: 'Traffic Light', category: 'Oscillators', meta: 'p2',
    cells: [
      [1,0],[2,0],[3,0],
      [0,2],[4,2],[0,3],[4,3],[0,4],[4,4],
      [1,6],[2,6],[3,6]
    ] },
  { name: 'Figure Eight', category: 'Oscillators', meta: 'p8',
    cells: [
      [0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2],
      [3,3],[4,3],[5,3],[3,4],[4,4],[5,4],[3,5],[4,5],[5,5]
    ] },

  // ── Spaceships ──
  { name: 'Glider', category: 'Spaceships', meta: 'p4',
    cells: [[1,0],[2,1],[0,2],[1,2],[2,2]] },
  { name: 'LWSS', category: 'Spaceships', meta: 'p4 · lightweight',
    cells: [[0,0],[3,0],[4,1],[0,2],[4,2],[1,3],[2,3],[3,3],[4,3]] },
  { name: 'MWSS', category: 'Spaceships', meta: 'p4 · middleweight',
    cells: [[2,0],[0,1],[4,1],[4,2],[0,3],[4,3],[1,4],[2,4],[3,4],[4,4]] },
  { name: 'HWSS', category: 'Spaceships', meta: 'p4 · heavyweight',
    cells: [[2,0],[3,0],[0,1],[5,1],[6,2],[0,3],[6,3],[1,4],[2,4],[3,4],[4,4],[5,4]] },

  // ── Guns ──
  { name: 'Gosper Gun', category: 'Guns', meta: 'p30 · emits gliders',
    cells: [
      [24,0],
      [22,1],[24,1],
      [12,2],[13,2],[20,2],[21,2],[34,2],[35,2],
      [11,3],[15,3],[20,3],[21,3],[34,3],[35,3],
      [0,4],[1,4],[10,4],[16,4],[20,4],[21,4],
      [0,5],[1,5],[10,5],[14,5],[15,5],[16,5],[21,5],[23,5],
      [10,6],[16,6],[24,6],
      [11,7],[15,7],
      [12,8],[13,8]
    ] },

  // ── Methuselahs ──
  { name: 'R-Pentomino', category: 'Methuselahs', meta: '1103 gens',
    cells: [[1,0],[2,0],[0,1],[1,1],[1,2]] },
  { name: 'Diehard', category: 'Methuselahs', meta: 'dies at gen 130',
    cells: [[6,0],[0,1],[1,1],[1,2],[5,2],[6,2],[7,2]] },
  { name: 'Acorn', category: 'Methuselahs', meta: '5206 gens',
    cells: [[1,0],[3,1],[0,2],[1,2],[4,2],[5,2],[6,2]] },
  { name: 'Pi Heptomino', category: 'Methuselahs', meta: 'long-lived',
    cells: [[0,0],[1,0],[2,0],[1,1],[0,2],[1,2],[2,2]] },
  { name: 'Switch Engine', category: 'Methuselahs', meta: 'infinite growth',
    cells: [[1,0],[3,0],[0,1],[1,2],[3,2],[4,2],[3,3]] },
];

// ─── RULE PRESETS ────────────────────────────────────────────────────────────

const RULE_PRESETS = [
  { name: 'Conway',          birth: [3],         survival: [2,3] },
  { name: 'HighLife',        birth: [3,6],        survival: [2,3] },
  { name: 'Day & Night',     birth: [3,6,7,8],    survival: [3,4,6,7,8] },
  { name: 'Seeds',           birth: [2],          survival: [] },
  { name: 'No Death',        birth: [3],          survival: [0,1,2,3,4,5,6,7,8] },
  { name: 'Maze',            birth: [3],          survival: [1,2,3,4,5] },
  { name: 'Coral',           birth: [3],          survival: [4,5,6,7,8] },
  { name: 'Anneal',          birth: [4,6,7,8],    survival: [3,5,6,7,8] },
];

const GENERATIONS_PRESETS = [
  { name: "Brian's Brain",   birth: [2],         survival: [],       states: 3 },
  { name: 'Starwars',        birth: [2],         survival: [3,4,5],  states: 4 },
  { name: 'Fireflies',       birth: [2],         survival: [1],      states: 6 },
  { name: 'Rug',             birth: [2],         survival: [1,2,3,4], states: 5 },
  { name: 'Caterpillars',    birth: [3,7,8],     survival: [2,3,5,6,7,8], states: 4 },
];

// ─── STATE ───────────────────────────────────────────────────────────────────

let cells = new Set();
let cellStates = new Map(); // For Generations mode: key -> state 1..N-1
let running = false;
let generation = 0;
let rafId = null;
let lastStepTime = 0;
let fps = 10;

let birthRule   = new Set([3]);
let survivalRule = new Set([2, 3]);

// Generations mode
let generationsMode = false;
let generationsN = 2;

// View
let cellSize = 14;
let panX = 0;
let panY = 0;

// Interaction
let isMouseDown = false;
let isPanning = false;
let lastMX = 0, lastMY = 0;
let paintAlive = true;
let hasPainted = false;

// Pattern placement
let selectedPatternIdx = -1;
let patternCells = null;   // normalized [col,row] array
let patternRotation = 0;
let mouseGridX = 0, mouseGridY = 0;
let mouseOnCanvas = false;
let isPatternDragging = false;
let lastPatternGX = null, lastPatternGY = null;

// DOM
let canvas, ctx;
let canvasWrap;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function key(x, y)        { return x + ',' + y; }
function keyToXY(k)       { const p = k.split(','); return [+p[0], +p[1]]; }

function normalizeCells(cells) {
  if (!cells.length) return cells;
  const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
  const cx = Math.round((Math.min(...xs) + Math.max(...xs)) / 2);
  const cy = Math.round((Math.min(...ys) + Math.max(...ys)) / 2);
  return cells.map(([x, y]) => [x - cx, y - cy]);
}

function rotateCW(cells) {
  return normalizeCells(cells.map(([x, y]) => [-y, x]));
}

function screenToGrid(sx, sy) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width / dpr, H = canvas.height / dpr;
  return [
    Math.floor((sx - W / 2 - panX) / cellSize),
    Math.floor((sy - H / 2 - panY) / cellSize)
  ];
}

function gridToScreen(gx, gy) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width / dpr, H = canvas.height / dpr;
  return [
    gx * cellSize + W / 2 + panX,
    gy * cellSize + H / 2 + panY
  ];
}

// ─── STEP ────────────────────────────────────────────────────────────────────

function step() {
  const counts = new Map();
  for (const k of cells) {
    const [x, y] = keyToXY(k);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nk = key(x + dx, y + dy);
        counts.set(nk, (counts.get(nk) || 0) + 1);
      }
    }
  }
  const next = new Set();
  for (const [k, n] of counts) {
    if (cells.has(k)) {
      if (survivalRule.has(n)) next.add(k);
    } else {
      if (birthRule.has(n)) next.add(k);
    }
  }
  cells = next;
  generation++;
  updateStats();
}

function stepGenerations() {
  // Count alive neighbors (state 1 only)
  const counts = new Map();
  for (const [k, state] of cellStates) {
    if (state === 1) { // only state-1 cells count as alive
      const [x, y] = keyToXY(k);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nk = key(x + dx, y + dy);
          counts.set(nk, (counts.get(nk) || 0) + 1);
        }
      }
    }
  }

  const nextStates = new Map();

  // Process all cells that might change
  const cellsToCheck = new Set(cellStates.keys());
  for (const [nk] of counts) cellsToCheck.add(nk);

  for (const k of cellsToCheck) {
    const aliveNeighbors = counts.get(k) || 0;
    const currentState = cellStates.get(k) || 0;

    if (currentState === 0) {
      // Dead cell: birth if exactly B alive neighbors
      if (birthRule.has(aliveNeighbors)) {
        nextStates.set(k, 1);
      }
    } else if (currentState === 1) {
      // Alive cell: survives if S alive neighbors
      if (survivalRule.has(aliveNeighbors)) {
        nextStates.set(k, 1);
      } else {
        // Dies and becomes state 2
        nextStates.set(k, 2);
      }
    } else if (currentState > 1 && currentState < generationsN - 1) {
      // Dying cell: advance to next state
      nextStates.set(k, currentState + 1);
    } else if (currentState === generationsN - 1) {
      // Last dying state: becomes dead (don't add to map)
    }
  }

  cellStates = nextStates;
  generation++;
  updateStats();
}

// ─── RENDER ──────────────────────────────────────────────────────────────────

let renderPending = false;
function requestRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => { renderPending = false; render(); });
}

function render() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width, H = canvas.height;
  const cssW = W / dpr, cssH = H / dpr;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // compute visible grid extent
  const x0 = Math.floor((-cssW / 2 - panX) / cellSize) - 1;
  const x1 = Math.ceil((cssW / 2 - panX) / cellSize) + 1;
  const y0 = Math.floor((-cssH / 2 - panY) / cellSize) - 1;
  const y1 = Math.ceil((cssH / 2 - panY) / cellSize) + 1;

  ctx.save();
  ctx.scale(dpr, dpr);

  // ── grid lines (only when cellSize >= 4) ──
  if (cellSize >= 4) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.8;
    const ox = cssW / 2 + panX, oy = cssH / 2 + panY;
    ctx.beginPath();
    for (let gx = x0; gx <= x1; gx++) {
      const sx = gx * cellSize + ox;
      ctx.moveTo(sx, 0); ctx.lineTo(sx, cssH);
    }
    for (let gy = y0; gy <= y1; gy++) {
      const sy = gy * cellSize + oy;
      ctx.moveTo(0, sy); ctx.lineTo(cssW, sy);
    }
    ctx.stroke();
  }

  // ── live cells ──
  const cs = cellSize >= 3 ? cellSize - (cellSize >= 6 ? 1 : 0.5) : cellSize;
  const ox = cssW / 2 + panX, oy = cssH / 2 + panY;
  const pad = cellSize >= 6 ? 0.5 : 0;

  if (generationsMode) {
    // Render Generations mode with gradient colors
    for (const [k, state] of cellStates) {
      const [gx, gy] = keyToXY(k);
      if (gx < x0 || gx > x1 || gy < y0 || gy > y1) continue;
      const sx = gx * cellSize + ox + pad;
      const sy = gy * cellSize + oy + pad;

      // Interpolate color from bright orange (state 1) to dark gray (state N-1)
      const ratio = (state - 1) / (generationsN - 1);
      const r = Math.round(255 * (1 - ratio * 0.7));
      const g = Math.round(165 * (1 - ratio * 0.8));
      const b = Math.round(0 * (1 - ratio));
      const bgR = Math.round(17 * ratio);
      const bgG = Math.round(17 * ratio);
      const bgB = Math.round(17 * ratio);
      const color = `rgb(${bgR + (r - bgR) * (1 - ratio * 0.5)}, ${bgG + (g - bgG) * (1 - ratio * 0.5)}, ${bgB + (b - bgB) * (1 - ratio * 0.5)})`;
      ctx.fillStyle = color;

      if (cellSize >= 4) {
        ctx.beginPath();
        ctx.roundRect(sx, sy, cs, cs, Math.min(2, cs * 0.2));
        ctx.fill();
      } else {
        ctx.fillRect(sx, sy, cs, cs);
      }
    }
  } else {
    // Render classic mode
    ctx.fillStyle = '#111111';
    for (const k of cells) {
      const [gx, gy] = keyToXY(k);
      if (gx < x0 || gx > x1 || gy < y0 || gy > y1) continue;
      const sx = gx * cellSize + ox + pad;
      const sy = gy * cellSize + oy + pad;
      if (cellSize >= 4) {
        ctx.beginPath();
        ctx.roundRect(sx, sy, cs, cs, Math.min(2, cs * 0.2));
        ctx.fill();
      } else {
        ctx.fillRect(sx, sy, cs, cs);
      }
    }
  }

  // ── ghost pattern ──
  if (patternCells && mouseOnCanvas) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 0.8;
    for (const [dx, dy] of patternCells) {
      const gx = mouseGridX + dx, gy = mouseGridY + dy;
      const sx = gx * cellSize + ox + pad;
      const sy = gy * cellSize + oy + pad;
      if (cellSize >= 4) {
        ctx.beginPath();
        ctx.roundRect(sx, sy, cs, cs, Math.min(2, cs * 0.2));
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(sx, sy, cs, cs);
      }
    }
  }

  ctx.restore();
}

// ─── GAME LOOP ────────────────────────────────────────────────────────────────

function gameLoop(ts) {
  if (!running) return;
  const interval = 1000 / fps;
  if (ts - lastStepTime >= interval) {
    if (generationsMode) stepGenerations();
    else step();
    lastStepTime = ts;
    render();
  }
  rafId = requestAnimationFrame(gameLoop);
}

function startLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  lastStepTime = performance.now();
  rafId = requestAnimationFrame(gameLoop);
}

function stopLoop() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}

// ─── CONTROLS ────────────────────────────────────────────────────────────────

function setPlaying(val) {
  running = val;
  const btn = document.getElementById('btn-play');
  if (running) {
    btn.textContent = '⏸ Pause';
    btn.classList.add('active');
    startLoop();
  } else {
    btn.textContent = '▶ Play';
    btn.classList.remove('active');
    stopLoop();
    requestRender();
  }
}

function doStep() {
  if (generationsMode) stepGenerations();
  else step();
  requestRender();
}

function doClear() {
  cells.clear();
  cellStates.clear();
  generation = 0;
  updateStats();
  requestRender();
}

function doRandom() {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.width / dpr, cssH = canvas.height / dpr;
  const x0 = Math.floor((-cssW / 2 - panX) / cellSize) - 1;
  const x1 = Math.ceil((cssW / 2 - panX) / cellSize) + 1;
  const y0 = Math.floor((-cssH / 2 - panY) / cellSize) - 1;
  const y1 = Math.ceil((cssH / 2 - panY) / cellSize) + 1;

  if (generationsMode) {
    cellStates.clear();
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const k = key(gx, gy);
        if (Math.random() < 0.30) cellStates.set(k, 1);
      }
    }
  } else {
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        if (Math.random() < 0.30) cells.add(key(gx, gy));
        else cells.delete(key(gx, gy));
      }
    }
  }
  updateStats();
  requestRender();
}

// ─── STATS ───────────────────────────────────────────────────────────────────

function updateStats() {
  document.getElementById('gen-val').textContent = generation;
  const popCount = generationsMode ? cellStates.size : cells.size;
  document.getElementById('pop-val').textContent = popCount;
}

// ─── RULES ───────────────────────────────────────────────────────────────────

function applyRulePreset(preset) {
  birthRule   = new Set(preset.birth);
  survivalRule = new Set(preset.survival);
  updateRuleToggles();
  updateRuleNotation();
  highlightActivePreset(preset.name);
}

function updateRuleToggles() {
  for (let i = 0; i <= 8; i++) {
    const b = document.getElementById(`bt-${i}`);
    const s = document.getElementById(`st-${i}`);
    if (b) b.classList.toggle('on', birthRule.has(i));
    if (s) s.classList.toggle('on', survivalRule.has(i));
  }
}

function updateRuleNotation() {
  const b = [...birthRule].sort().join('');
  const s = [...survivalRule].sort().join('');
  document.getElementById('rule-notation').textContent = `B${b}/S${s}`;
}

function highlightActivePreset(name) {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === name);
  });
}

function applyGenerationsPreset(preset) {
  birthRule = new Set(preset.birth);
  survivalRule = new Set(preset.survival);
  generationsN = preset.states;
  document.getElementById('gen-states').value = generationsN;
  document.getElementById('gen-states-val').textContent = generationsN;
  updateRuleToggles();
  updateRuleNotation();
  highlightActivePreset(preset.name);
}

function buildGenerationsControls() {
  const toggle = document.getElementById('gen-toggle');
  const statesRow = document.getElementById('gen-states-row');
  const statesSlider = document.getElementById('gen-states');
  const statesVal = document.getElementById('gen-states-val');

  toggle.addEventListener('change', () => {
    generationsMode = toggle.checked;
    statesRow.style.display = generationsMode ? 'flex' : 'none';

    // Clear board and switch storage
    if (generationsMode) {
      // Converting from classic to Generations
      const newStates = new Map();
      for (const k of cells) {
        newStates.set(k, 1);
      }
      cellStates = newStates;
      cells.clear();
    } else {
      // Converting from Generations to classic
      const newCells = new Set();
      for (const [k, state] of cellStates) {
        if (state === 1) newCells.add(k);
      }
      cells = newCells;
      cellStates.clear();
    }

    // Update presets
    updateRulePresets();
    updateStats();
    requestRender();
  });

  statesSlider.addEventListener('input', () => {
    generationsN = +statesSlider.value;
    statesVal.textContent = generationsN;
    highlightActivePreset(null);
  });
}

function updateRulePresets() {
  const presetsEl = document.getElementById('rule-presets');
  presetsEl.innerHTML = '';

  const presets = generationsMode ? GENERATIONS_PRESETS : RULE_PRESETS;
  for (const p of presets) {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = p.name;
    btn.dataset.preset = p.name;
    btn.addEventListener('click', () => {
      if (generationsMode) applyGenerationsPreset(p);
      else applyRulePreset(p);
    });
    presetsEl.appendChild(btn);
  }
}

function buildRules() {
  updateRulePresets();

  const birthEl   = document.getElementById('birth-toggles');
  const survivalEl = document.getElementById('survival-toggles');
  birthEl.innerHTML = ''; survivalEl.innerHTML = '';

  for (let i = 0; i <= 8; i++) {
    const b = document.createElement('button');
    b.className = 'rule-toggle' + (birthRule.has(i) ? ' on' : '');
    b.id = `bt-${i}`; b.textContent = i;
    b.addEventListener('click', () => {
      birthRule.has(i) ? birthRule.delete(i) : birthRule.add(i);
      b.classList.toggle('on');
      updateRuleNotation();
      highlightActivePreset(null);
    });
    birthEl.appendChild(b);

    const s = document.createElement('button');
    s.className = 'rule-toggle' + (survivalRule.has(i) ? ' on' : '');
    s.id = `st-${i}`; s.textContent = i;
    s.addEventListener('click', () => {
      survivalRule.has(i) ? survivalRule.delete(i) : survivalRule.add(i);
      s.classList.toggle('on');
      updateRuleNotation();
      highlightActivePreset(null);
    });
    survivalEl.appendChild(s);
  }

  updateRuleNotation();
  highlightActivePreset('Conway');
}

// ─── PATTERN LIBRARY ─────────────────────────────────────────────────────────

function drawMiniCanvas(cv, rawCells) {
  const W = cv.width, H = cv.height;
  const ctx2 = cv.getContext('2d');
  ctx2.fillStyle = '#ffffff';
  ctx2.fillRect(0, 0, W, H);

  const nc = normalizeCells(rawCells);
  const xs = nc.map(c => c[0]), ys = nc.map(c => c[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const bW = maxX - minX + 1, bH = maxY - minY + 1;
  const cs = Math.max(1, Math.min(6, Math.floor(Math.min(W, H) * 0.85 / Math.max(bW, bH, 1))));
  const ox = Math.round((W - bW * cs) / 2);
  const oy = Math.round((H - bH * cs) / 2);

  ctx2.fillStyle = '#111111';
  for (const [x, y] of nc) {
    const sx = (x - minX) * cs + ox;
    const sy = (y - minY) * cs + oy;
    ctx2.fillRect(sx, sy, Math.max(1, cs - (cs > 2 ? 1 : 0)), Math.max(1, cs - (cs > 2 ? 1 : 0)));
  }
}

function selectPattern(idx) {
  selectedPatternIdx = idx;
  if (idx < 0) {
    patternCells = null;
    patternRotation = 0;
    document.getElementById('ghost-hint').style.display = 'none';
    canvas.style.cursor = 'crosshair';
    document.querySelectorAll('.pattern-card').forEach(c => c.classList.remove('selected'));
    return;
  }
  const p = PATTERNS[idx];
  patternCells = normalizeCells([...p.cells]);
  for (let i = 0; i < patternRotation; i++) patternCells = rotateCW(patternCells);
  document.getElementById('ghost-hint').style.display = 'block';
  canvas.style.cursor = 'none';
  document.querySelectorAll('.pattern-card').forEach((c, i) => c.classList.toggle('selected', i === idx));
  requestRender();
}

function buildPatternLibrary() {
  const container = document.getElementById('pattern-library');
  container.innerHTML = '';

  const categories = [];
  const catMap = new Map();
  for (const p of PATTERNS) {
    if (!catMap.has(p.category)) {
      catMap.set(p.category, []);
      categories.push(p.category);
    }
    catMap.get(p.category).push(p);
  }

  categories.forEach(catName => {
    const div = document.createElement('div');
    div.className = 'pattern-category';

    const header = document.createElement('div');
    header.className = 'cat-header open';
    header.innerHTML = `<span class="cat-caret">▶</span>${catName}`;

    const cards = document.createElement('div');
    cards.className = 'cat-cards';

    header.addEventListener('click', () => {
      header.classList.toggle('open');
      cards.classList.toggle('collapsed');
    });

    catMap.get(catName).forEach(p => {
      const pidx = PATTERNS.indexOf(p);
      const card = document.createElement('div');
      card.className = 'pattern-card';
      card.setAttribute('draggable', 'true');

      const mini = document.createElement('canvas');
      const miniSize = 44;
      mini.className = 'pattern-mini';
      mini.width = miniSize; mini.height = miniSize;
      mini.style.width = miniSize + 'px'; mini.style.height = miniSize + 'px';
      setTimeout(() => drawMiniCanvas(mini, p.cells), 0);

      const info = document.createElement('div');
      info.innerHTML = `<div class="pattern-name">${p.name}</div><div class="pattern-meta">${p.meta || ''}</div>`;

      card.appendChild(mini);
      card.appendChild(info);
      card.addEventListener('click', () => {
        if (selectedPatternIdx === pidx) {
          selectPattern(-1);
        } else {
          patternRotation = 0;
          selectPattern(pidx);
        }
      });

      // drag to place
      card.addEventListener('dragstart', e => {
        patternRotation = 0;
        selectPattern(pidx);
        e.dataTransfer.setData('text/plain', pidx);
      });

      cards.appendChild(card);
    });

    div.appendChild(header);
    div.appendChild(cards);
    container.appendChild(div);
  });
}

// ─── CANVAS INTERACTION ───────────────────────────────────────────────────────

function placePattern() {
  if (!patternCells) return;
  if (generationsMode) {
    for (const [dx, dy] of patternCells) {
      cellStates.set(key(mouseGridX + dx, mouseGridY + dy), 1);
    }
  } else {
    for (const [dx, dy] of patternCells) {
      cells.add(key(mouseGridX + dx, mouseGridY + dy));
    }
  }
  updateStats();
  requestRender();
}

function toggleCell(gx, gy, forceAlive) {
  const k = key(gx, gy);
  if (generationsMode) {
    if (forceAlive !== undefined) {
      forceAlive ? cellStates.set(k, 1) : cellStates.delete(k);
    } else {
      cellStates.has(k) ? cellStates.delete(k) : cellStates.set(k, 1);
    }
  } else {
    if (forceAlive !== undefined) {
      forceAlive ? cells.add(k) : cells.delete(k);
    } else {
      cells.has(k) ? cells.delete(k) : cells.add(k);
    }
  }
  updateStats();
}

function attachCanvasEvents() {
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  canvas.addEventListener('mouseenter', () => { mouseOnCanvas = true; });
  canvas.addEventListener('mouseleave', () => { mouseOnCanvas = false; requestRender(); });

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const [gx, gy] = screenToGrid(sx, sy);
    mouseGridX = gx; mouseGridY = gy;

    if (isPanning) {
      const dx = e.clientX - lastMX, dy = e.clientY - lastMY;
      panX += dx; panY += dy;
      lastMX = e.clientX; lastMY = e.clientY;
      requestRender();
      return;
    }

    if (isMouseDown && !patternCells) {
      toggleCell(gx, gy, paintAlive);
      updateStats();
    }
    if (isPatternDragging && patternCells && (gx !== lastPatternGX || gy !== lastPatternGY)) {
      lastPatternGX = gx; lastPatternGY = gy;
      placePattern();
    }
    requestRender();
  });

  canvas.addEventListener('mousedown', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const [gx, gy] = screenToGrid(sx, sy);
    mouseGridX = gx; mouseGridY = gy;

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // middle click / alt+click = pan
      isPanning = true;
      lastMX = e.clientX; lastMY = e.clientY;
      canvas.style.cursor = 'grabbing';
      return;
    }

    if (patternCells) {
      if (e.button === 0) {
        placePattern();
        isPatternDragging = true;
        lastPatternGX = gx; lastPatternGY = gy;
      } else if (e.button === 2) {
        selectPattern(-1);
      }
      return;
    }

    isMouseDown = true;
    hasPainted = false;
    if (e.button === 2) {
      paintAlive = false;
      toggleCell(gx, gy, false);
    } else {
      const k = key(gx, gy);
      paintAlive = generationsMode ? !cellStates.has(k) : !cells.has(k);
      toggleCell(gx, gy, paintAlive);
    }
    hasPainted = true;
    updateStats();
    requestRender();
  });

  window.addEventListener('mouseup', e => {
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = patternCells ? 'none' : 'crosshair';
    }
    isMouseDown = false;
    isPatternDragging = false;
    lastPatternGX = null; lastPatternGY = null;
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr, cssH = canvas.height / dpr;

    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const oldSize = cellSize;
    cellSize = Math.max(1, Math.min(64, cellSize * factor));

    // zoom toward cursor
    const pivotGX = (sx - cssW / 2 - panX) / oldSize;
    const pivotGY = (sy - cssH / 2 - panY) / oldSize;
    panX = sx - cssW / 2 - pivotGX * cellSize;
    panY = sy - cssH / 2 - pivotGY * cellSize;

    requestRender();
  }, { passive: false });

  // drag-and-drop from sidebar
  canvas.addEventListener('dragover', e => { e.preventDefault(); });
  canvas.addEventListener('drop', e => {
    e.preventDefault();
    if (patternCells) {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const [gx, gy] = screenToGrid(sx, sy);
      mouseGridX = gx; mouseGridY = gy;
      placePattern();
    }
  });
}

// ─── KEYBOARD ────────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  if (e.code === 'Space') {
    e.preventDefault();
    setPlaying(!running);
  } else if (e.code === 'KeyR') {
    if (patternCells) {
      patternRotation = (patternRotation + 1) % 4;
      patternCells = rotateCW(patternCells);
      requestRender();
    }
  } else if (e.code === 'Escape') {
    selectPattern(-1);
  } else if (e.code === 'KeyS' && !e.ctrlKey) {
    if (!running) doStep();
  } else if (e.code === 'KeyC' && !e.ctrlKey) {
    doClear();
  }
});

// ─── CANVAS SIZING ────────────────────────────────────────────────────────────

function sizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvasWrap.getBoundingClientRect();
  const W = Math.round(rect.width * dpr);
  const H = Math.round(rect.height * dpr);
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  requestRender();
}

// ─── SIDEBAR TOGGLE ───────────────────────────────────────────────────────────

function buildSidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const btn = document.getElementById('sidebar-toggle');
  btn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    setTimeout(sizeCanvas, 220);
  });
}

// ─── SPEED ───────────────────────────────────────────────────────────────────

function buildSpeedControl() {
  const range = document.getElementById('speed-range');
  const val   = document.getElementById('speed-val');
  range.addEventListener('input', () => {
    fps = +range.value;
    val.textContent = fps + ' fps';
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

function init() {
  canvas     = document.getElementById('gol-canvas');
  ctx        = canvas.getContext('2d');
  canvasWrap = document.getElementById('canvas-wrap');

  // wire controls
  document.getElementById('btn-play').addEventListener('click',   () => setPlaying(!running));
  document.getElementById('btn-step').addEventListener('click',   doStep);
  document.getElementById('btn-clear').addEventListener('click',  doClear);
  document.getElementById('btn-random').addEventListener('click', doRandom);

  buildSpeedControl();
  buildSidebarToggle();
  buildGenerationsControls();
  buildRules();
  buildPatternLibrary();
  attachCanvasEvents();

  new ResizeObserver(sizeCanvas).observe(canvasWrap);
  setTimeout(sizeCanvas, 0);

  updateStats();
}

document.addEventListener('DOMContentLoaded', init);
