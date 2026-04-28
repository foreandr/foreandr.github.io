(() => {
  "use strict";

  const PALETTE = [
    "#ff5f5f",
    "#3f8cff",
    "#1fcf8b",
    "#ffb347",
    "#b27dff",
    "#27d6f5",
    "#f870c1",
    "#9be564",
    "#ffd166",
    "#7c9cf5",
    "#00c2a8",
    "#e56b6f"
  ];

  const FACE_DEFS = [
    { id: "front", label: "Front", n: [0, 0, 1], r: [1, 0, 0], d: [0, -1, 0] },
    { id: "right", label: "Right", n: [1, 0, 0], r: [0, 0, -1], d: [0, -1, 0] },
    { id: "back", label: "Back", n: [0, 0, -1], r: [-1, 0, 0], d: [0, -1, 0] },
    { id: "left", label: "Left", n: [-1, 0, 0], r: [0, 0, 1], d: [0, -1, 0] },
    { id: "up", label: "Top", n: [0, 1, 0], r: [1, 0, 0], d: [0, 0, 1] },
    { id: "down", label: "Bottom", n: [0, -1, 0], r: [1, 0, 0], d: [0, 0, -1] }
  ];

  const el = {
    modeSelect: document.getElementById("mode-select"),
    sizeInput: document.getElementById("size-input"),
    pairsInput: document.getElementById("pairs-input"),
    solvabilitySelect: document.getElementById("solvability-select"),
    budgetInput: document.getElementById("budget-input"),
    generateBtn: document.getElementById("generate-btn"),
    resetBtn: document.getElementById("reset-btn"),
    solveBtn: document.getElementById("solve-btn"),
    mathToggle: document.getElementById("math-toggle"),
    flagPill: document.getElementById("flag-pill"),
    statusLine: document.getElementById("status-line"),
    legend: document.getElementById("legend"),
    board2DWrap: document.getElementById("board-2d-wrap"),
    board3DWrap: document.getElementById("board-3d-wrap"),
    boardSubtitle: document.getElementById("board-subtitle"),
    canvas2d: document.getElementById("board-2d"),
    cubeScene: document.getElementById("cube-scene"),
    connectedPairs: document.getElementById("connected-pairs"),
    coverage: document.getElementById("coverage"),
    cellCount: document.getElementById("cell-count"),
    edgeCount: document.getElementById("edge-count"),
    mathPanel: document.getElementById("math-panel"),
    graphLine: document.getElementById("graph-line"),
    degreeLine: document.getElementById("degree-line"),
    topologyLine: document.getElementById("topology-line"),
    solverLine: document.getElementById("solver-line")
  };

  const state = {
    mode: "2d",
    board: null,
    terminals: [],
    terminalByCell: new Map(),
    paths: new Map(),
    occupancy: new Map(),
    usedDegrees: new Map(),
    active: null,
    hoverCell: null,
    solverSummary: "No solve attempt yet.",
    canvasLayout: {
      cell: 0,
      originX: 0,
      originY: 0,
      width: 0,
      height: 0,
      dpr: 1
    },
    three: {
      enabled: typeof window.THREE !== "undefined",
      renderer: null,
      scene: null,
      camera: null,
      raycaster: null,
      mouse: null,
      group: null,
      tileMeshes: new Map(),
      terminalMarkers: new Map(),
      eventsBound: false,
      view: {
        yaw: 0.65,
        pitch: 0.5,
        distance: 14
      },
      rotateActive: false,
      pointerActive: false,
      pointerId: null,
      rafHandle: null
    }
  };

  function vAdd(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }

  function vScale(a, s) {
    return [a[0] * s, a[1] * s, a[2] * s];
  }

  function vDist2(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return dx * dx + dy * dy + dz * dz;
  }

  function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(String(value), 10);
    if (!Number.isFinite(n)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, n));
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function colorFor(index) {
    return PALETTE[index % PALETTE.length];
  }

  function pointKey(p) {
    return `${p[0].toFixed(4)},${p[1].toFixed(4)},${p[2].toFixed(4)}`;
  }

  function edgeKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  function build2DBoard(n) {
    const cells = new Map();
    const neighbors = new Map();
    const ids = [];
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const id = `g:${x}:${y}`;
        ids.push(id);
        const center = [x + 0.5, y + 0.5, 0];
        cells.set(id, { id, x, y, center, label: `(${x + 1}, ${y + 1})` });
      }
    }

    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const id = `g:${x}:${y}`;
        const list = [];
        if (x > 0) list.push(`g:${x - 1}:${y}`);
        if (x < n - 1) list.push(`g:${x + 1}:${y}`);
        if (y > 0) list.push(`g:${x}:${y - 1}`);
        if (y < n - 1) list.push(`g:${x}:${y + 1}`);
        neighbors.set(id, list);
      }
    }

    const edgeCount = ids.reduce((acc, id) => acc + (neighbors.get(id)?.length || 0), 0) / 2;
    return {
      mode: "2d",
      size: n,
      cells,
      neighbors,
      cellIds: ids,
      cellCount: ids.length,
      edgeCount
    };
  }

  function buildCubeBoard(n) {
    const half = n / 2;
    const cells = new Map();
    const neighbors = new Map();
    const ids = [];
    const edgeOwner = new Map();

    for (const face of FACE_DEFS) {
      for (let row = 0; row < n; row += 1) {
        for (let col = 0; col < n; col += 1) {
          const id = `c:${face.id}:${row}:${col}`;
          const lx = col + 0.5 - half;
          const ly = row + 0.5 - half;
          const center = vAdd(vAdd(vScale(face.n, half), vScale(face.r, lx)), vScale(face.d, ly));

          const tl = vAdd(vAdd(center, vScale(face.r, -0.5)), vScale(face.d, -0.5));
          const tr = vAdd(vAdd(center, vScale(face.r, 0.5)), vScale(face.d, -0.5));
          const br = vAdd(vAdd(center, vScale(face.r, 0.5)), vScale(face.d, 0.5));
          const bl = vAdd(vAdd(center, vScale(face.r, -0.5)), vScale(face.d, 0.5));
          const corners = [tl, tr, br, bl];

          cells.set(id, {
            id,
            face: face.id,
            faceLabel: face.label,
            row,
            col,
            center,
            n: face.n.slice(),
            r: face.r.slice(),
            d: face.d.slice(),
            corners,
            label: `${face.label} [${row + 1}, ${col + 1}]`
          });
          ids.push(id);
          neighbors.set(id, []);
        }
      }
    }

    for (const id of ids) {
      const cell = cells.get(id);
      const cs = cell.corners;
      const edgeCorners = [
        [cs[0], cs[1]],
        [cs[1], cs[2]],
        [cs[2], cs[3]],
        [cs[3], cs[0]]
      ];
      for (const [aPoint, bPoint] of edgeCorners) {
        const a = pointKey(aPoint);
        const b = pointKey(bPoint);
        const key = edgeKey(a, b);
        const owners = edgeOwner.get(key) || [];
        owners.push(id);
        edgeOwner.set(key, owners);
      }
    }

    for (const owners of edgeOwner.values()) {
      if (owners.length !== 2) {
        continue;
      }
      const [a, b] = owners;
      neighbors.get(a).push(b);
      neighbors.get(b).push(a);
    }

    const edgeCount = ids.reduce((acc, id) => acc + (neighbors.get(id)?.length || 0), 0) / 2;
    return {
      mode: "cube",
      size: n,
      cells,
      neighbors,
      cellIds: ids,
      cellCount: ids.length,
      edgeCount
    };
  }

  function randomPairs(board, pairCount) {
    const available = board.cellIds.slice();
    shuffle(available);
    const pairs = [];

    for (let i = 0; i < pairCount && available.length >= 2; i += 1) {
      const a = available.pop();
      let bestIndex = 0;
      let bestScore = -1;
      const maxProbe = Math.min(16, available.length);
      for (let p = 0; p < maxProbe; p += 1) {
        const idx = Math.floor(Math.random() * available.length);
        const b = available[idx];
        const score = vDist2(board.cells.get(a).center, board.cells.get(b).center);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = idx;
        }
      }
      const b = available.splice(bestIndex, 1)[0];
      pairs.push([a, b]);
    }
    return pairs;
  }

  function setStatus(text) {
    el.statusLine.textContent = text;
  }

  function setSolver(text) {
    state.solverSummary = text;
    el.solverLine.textContent = text;
  }

  function setPuzzleFlag(mode, suffix = "") {
    if (!el.flagPill) {
      return;
    }
    el.flagPill.classList.remove("flag-solvable", "flag-unsolvable", "flag-random");

    if (mode === "solvable") {
      el.flagPill.classList.add("flag-solvable");
      el.flagPill.textContent = suffix ? `Flag: Solvable (${suffix})` : "Flag: Solvable";
      return;
    }
    if (mode === "unsolvable") {
      el.flagPill.classList.add("flag-unsolvable");
      el.flagPill.textContent = suffix ? `Flag: Unsolvable (${suffix})` : "Flag: Unsolvable";
      return;
    }
    el.flagPill.classList.add("flag-random");
    el.flagPill.textContent = suffix ? `Flag: Random (${suffix})` : "Flag: Random";
  }

  function formatCellLabel(cellId) {
    if (!state.board) {
      return cellId;
    }
    const cell = state.board.cells.get(cellId);
    return cell ? cell.label : cellId;
  }

  function ensurePathMap() {
    for (let i = 0; i < state.terminals.length; i += 1) {
      if (!state.paths.has(i)) {
        state.paths.set(i, []);
      }
    }
  }

  function recomputeOccupancy() {
    const occ = new Map();
    const deg = new Map();

    for (let i = 0; i < state.terminals.length; i += 1) {
      const [a, b] = state.terminals[i];
      occ.set(a, { color: i, terminal: true });
      occ.set(b, { color: i, terminal: true });
      deg.set(a, 0);
      deg.set(b, 0);
    }

    for (let i = 0; i < state.terminals.length; i += 1) {
      const path = state.paths.get(i) || [];
      for (const cellId of path) {
        const prev = occ.get(cellId);
        occ.set(cellId, { color: i, terminal: prev?.terminal === true });
        if (!deg.has(cellId)) {
          deg.set(cellId, 0);
        }
      }
      for (let j = 0; j < path.length - 1; j += 1) {
        const a = path[j];
        const b = path[j + 1];
        deg.set(a, (deg.get(a) || 0) + 1);
        deg.set(b, (deg.get(b) || 0) + 1);
      }
    }

    state.occupancy = occ;
    state.usedDegrees = deg;
  }

  function isPathSimple(path) {
    return new Set(path).size === path.length;
  }

  function isPathContiguous(path) {
    if (!state.board) {
      return false;
    }
    for (let i = 0; i < path.length - 1; i += 1) {
      const from = path[i];
      const to = path[i + 1];
      const nbs = state.board.neighbors.get(from) || [];
      if (!nbs.includes(to)) {
        return false;
      }
    }
    return true;
  }

  function isColorConnected(colorIndex) {
    const pair = state.terminals[colorIndex];
    if (!pair) {
      return false;
    }
    const [a, b] = pair;
    const path = state.paths.get(colorIndex) || [];
    if (path.length < 2) {
      return false;
    }
    if (!isPathSimple(path) || !isPathContiguous(path)) {
      return false;
    }
    const first = path[0];
    const last = path[path.length - 1];
    return (first === a && last === b) || (first === b && last === a);
  }

  function computeConnectedCount() {
    let connected = 0;
    for (let i = 0; i < state.terminals.length; i += 1) {
      if (isColorConnected(i)) {
        connected += 1;
      }
    }
    return connected;
  }

  function coveragePercent() {
    if (!state.board || state.board.cellCount === 0) {
      return 0;
    }
    return Math.round((state.occupancy.size / state.board.cellCount) * 100);
  }

  function isWin() {
    if (!state.board) {
      return false;
    }
    if (state.occupancy.size !== state.board.cellCount) {
      return false;
    }
    return computeConnectedCount() === state.terminals.length;
  }

  function updateLegend() {
    const html = [];
    for (let i = 0; i < state.terminals.length; i += 1) {
      const [a, b] = state.terminals[i];
      html.push(
        `<div class="legend-item">
          <span class="legend-dot" style="background:${colorFor(i)}"></span>
          <span>Pair ${i + 1}: ${formatCellLabel(a)} to ${formatCellLabel(b)}</span>
        </div>`
      );
    }
    el.legend.innerHTML = html.join("");
  }

  function updateMathPanel() {
    if (!state.board) {
      return;
    }
    el.graphLine.textContent = `Graph model: G = (V, E), |V| = ${state.board.cellCount}, |E| = ${state.board.edgeCount}.`;

    let hardViolations = 0;
    let highDegree = 0;
    let dangling = 0;
    for (const id of state.board.cellIds) {
      const degree = state.usedDegrees.get(id) || 0;
      const terminalOwner = state.terminalByCell.get(id);
      if (terminalOwner !== undefined) {
        if (degree > 1) {
          highDegree += 1;
          hardViolations += 1;
        }
      } else {
        if (degree > 2) {
          highDegree += 1;
          hardViolations += 1;
        }
        if (degree === 1) {
          dangling += 1;
        }
      }
    }
    el.degreeLine.textContent = `Degree constraints: terminal d(v) <= 1, path interior d(v) <= 2. High-degree violations: ${highDegree}, dangling non-terminals: ${dangling}, strict final-form violations: ${hardViolations}.`;

    if (state.mode === "2d") {
      el.topologyLine.textContent = "Topology note: in 2D, Jordan-curve separation can isolate regions and make some pairs unreachable.";
    } else {
      el.topologyLine.textContent = "Topology note: the cube surface is genus-0 (sphere-like), so edge wrapping changes reachability compared with a flat board.";
    }
  }

  function updateStatsAndMessages() {
    if (!state.board) {
      return;
    }
    const connected = computeConnectedCount();
    el.connectedPairs.textContent = `${connected} / ${state.terminals.length}`;
    el.coverage.textContent = `${coveragePercent()}%`;
    el.cellCount.textContent = String(state.board.cellCount);
    el.edgeCount.textContent = String(state.board.edgeCount);
    updateMathPanel();

    if (isWin()) {
      setStatus("Solved: all pairs connected and every cell occupied.");
    }
  }

  function setModeUI(mode) {
    state.mode = mode;
    el.board2DWrap.classList.toggle("active", mode === "2d");
    el.board3DWrap.classList.toggle("active", mode === "cube");
    el.boardSubtitle.textContent =
      mode === "2d"
        ? "Drag from a colored terminal to build paths on the square grid."
        : "Rotate the cube and drag on tiles to connect colored pairs across wrapped edges.";

    if (mode === "cube") {
      if (ensureThreeReady()) {
        requestAnimationFrame(() => {
          resizeThreeRenderer();
          refreshCubeColors();
        });
      }
    } else {
      draw2D();
    }
  }

  function hexToRgba(hex, alpha) {
    const c = hex.replace("#", "");
    const full = c.length === 3 ? c.split("").map((s) => s + s).join("") : c;
    const num = Number.parseInt(full, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function cellCenter2D(cellId) {
    if (!state.board || state.mode !== "2d") {
      return null;
    }
    const cellData = state.board.cells.get(cellId);
    if (!cellData) {
      return null;
    }
    const { cell, originX, originY } = state.canvasLayout;
    return {
      x: originX + (cellData.x + 0.5) * cell,
      y: originY + (cellData.y + 0.5) * cell
    };
  }

  function draw2D() {
    if (!state.board || state.mode !== "2d") {
      return;
    }
    const canvas = el.canvas2d;
    const wrap = el.board2DWrap;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(300, Math.floor(rect.width));
    const height = Math.max(300, Math.floor(rect.height));
    const pixelW = Math.floor(width * dpr);
    const pixelH = Math.floor(height * dpr);
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW;
      canvas.height = pixelH;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const n = state.board.size;
    const cell = Math.max(16, Math.floor(Math.min(width, height) / n));
    const boardW = cell * n;
    const boardH = cell * n;
    const originX = Math.floor((width - boardW) / 2);
    const originY = Math.floor((height - boardH) / 2);

    state.canvasLayout = { cell, originX, originY, width, height, dpr };

    ctx.fillStyle = "#0e1f39";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(108,145,194,0.28)";
    ctx.lineWidth = 1;

    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const id = `g:${x}:${y}`;
        const x0 = originX + x * cell;
        const y0 = originY + y * cell;
        const occ = state.occupancy.get(id);
        ctx.fillStyle = occ ? hexToRgba(colorFor(occ.color), 0.24) : "rgba(20,35,63,0.85)";
        ctx.fillRect(x0 + 1, y0 + 1, cell - 2, cell - 2);
        ctx.strokeRect(x0 + 0.5, y0 + 0.5, cell, cell);
      }
    }

    for (let color = 0; color < state.terminals.length; color += 1) {
      const path = state.paths.get(color) || [];
      if (path.length < 2) {
        continue;
      }
      ctx.strokeStyle = colorFor(color);
      ctx.lineWidth = Math.max(4, cell * 0.28);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < path.length; i += 1) {
        const p = cellCenter2D(path[i]);
        if (!p) continue;
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    for (let color = 0; color < state.terminals.length; color += 1) {
      const [a, b] = state.terminals[color];
      const points = [cellCenter2D(a), cellCenter2D(b)];
      for (const p of points) {
        if (!p) continue;
        ctx.fillStyle = colorFor(color);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(5, cell * 0.24), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.96)";
        ctx.lineWidth = Math.max(2, cell * 0.05);
        ctx.stroke();
      }
    }

    if (state.hoverCell) {
      const cellData = state.board.cells.get(state.hoverCell);
      if (cellData) {
        const x0 = originX + cellData.x * cell;
        const y0 = originY + cellData.y * cell;
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x0 + 2, y0 + 2, cell - 4, cell - 4);
      }
    }
  }

  function cellFrom2DPointer(event) {
    if (!state.board || state.mode !== "2d") {
      return null;
    }
    const rect = el.canvas2d.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const { cell, originX, originY } = state.canvasLayout;
    const gx = Math.floor((x - originX) / cell);
    const gy = Math.floor((y - originY) / cell);
    if (gx < 0 || gy < 0 || gx >= state.board.size || gy >= state.board.size) {
      return null;
    }
    return `g:${gx}:${gy}`;
  }

  function renderCubeFallback(message) {
    if (!el.cubeScene) {
      return;
    }
    el.cubeScene.innerHTML = `<div class="cube-fallback">${message}</div>`;
  }

  function setupThree() {
    if (!el.cubeScene) {
      return false;
    }
    const THREE = window.THREE;
    if (!THREE) {
      state.three.enabled = false;
      renderCubeFallback("3D renderer unavailable. Three.js did not load.");
      return false;
    }

    try {
      if (state.three.rafHandle) {
        cancelAnimationFrame(state.three.rafHandle);
      }
      if (state.three.renderer?.domElement?.parentNode) {
        state.three.renderer.domElement.parentNode.removeChild(state.three.renderer.domElement);
      }
      state.three.renderer?.dispose?.();

      const width = Math.max(320, el.cubeScene.clientWidth || 640);
      const height = Math.max(320, el.cubeScene.clientHeight || 640);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(width, height);
      renderer.setClearColor(0x0b1a31, 1);
      el.cubeScene.innerHTML = "";
      el.cubeScene.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
      camera.position.set(0, 0, 16);

      const ambient = new THREE.AmbientLight(0xffffff, 0.75);
      const key = new THREE.DirectionalLight(0xffffff, 0.7);
      key.position.set(8, 14, 12);
      scene.add(ambient);
      scene.add(key);

      const group = new THREE.Group();
      scene.add(group);

      state.three.enabled = true;
      state.three.renderer = renderer;
      state.three.scene = scene;
      state.three.camera = camera;
      state.three.group = group;
      state.three.raycaster = new THREE.Raycaster();
      state.three.mouse = new THREE.Vector2();
      state.three.view.distance = 16;
      state.three.view.yaw = 0.72;
      state.three.view.pitch = 0.52;
      state.three.eventsBound = false;

      const updateCamera = () => {
        const pitch = Math.max(-1.25, Math.min(1.25, state.three.view.pitch));
        const yaw = state.three.view.yaw;
        const d = Math.max(4.2, Math.min(80, state.three.view.distance));
        const cosPitch = Math.cos(pitch);
        const x = d * cosPitch * Math.sin(yaw);
        const y = d * Math.sin(pitch);
        const z = d * cosPitch * Math.cos(yaw);
        camera.position.set(x, y, z);
        camera.lookAt(0, 0, 0);
      };

      const animate = () => {
        state.three.rafHandle = requestAnimationFrame(animate);
        updateCamera();
        renderer.render(scene, camera);
      };
      animate();
      return true;
    } catch (error) {
      state.three.enabled = false;
      state.three.renderer = null;
      renderCubeFallback("3D rendering failed on this browser/device. Use 2D mode or enable WebGL.");
      return false;
    }
  }

  function ensureThreeReady() {
    if (!el.cubeScene) {
      return false;
    }
    if (!window.THREE) {
      state.three.enabled = false;
      renderCubeFallback("3D renderer unavailable. Three.js did not load.");
      return false;
    }
    if (!state.three.renderer && !setupThree()) {
      return false;
    }
    bind3DEvents();
    resizeThreeRenderer();
    return true;
  }

  function clearThreeGroup() {
    if (!state.three.enabled || !state.three.group) {
      return;
    }
    const group = state.three.group;
    while (group.children.length > 0) {
      const child = group.children.pop();
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }
    state.three.tileMeshes.clear();
    state.three.terminalMarkers.clear();
  }

  function buildCubeMeshes() {
    if (!state.three.enabled || !state.board || state.mode !== "cube") {
      return;
    }
    const THREE = window.THREE;
    clearThreeGroup();
    const n = state.board.size;
    const cubeExtent = n / 2;
    const marginScale = 1.02;
    const tileSize = 0.92;

    for (const id of state.board.cellIds) {
      const cell = state.board.cells.get(id);
      const geo = new THREE.PlaneGeometry(tileSize, tileSize);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x183257,
        roughness: 0.9,
        metalness: 0.05,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geo, mat);

      const xAxis = new THREE.Vector3(cell.r[0], cell.r[1], cell.r[2]);
      const yAxis = new THREE.Vector3(-cell.d[0], -cell.d[1], -cell.d[2]);
      const zAxis = new THREE.Vector3(cell.n[0], cell.n[1], cell.n[2]);
      const basis = new THREE.Matrix4();
      basis.makeBasis(xAxis, yAxis, zAxis);
      mesh.setRotationFromMatrix(basis);

      mesh.position.set(cell.center[0] * marginScale, cell.center[1] * marginScale, cell.center[2] * marginScale);
      mesh.userData.cellId = id;
      mesh.userData.isTile = true;

      state.three.group.add(mesh);
      state.three.tileMeshes.set(id, mesh);

      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x2a537f, transparent: true, opacity: 0.65 });
      const wire = new THREE.LineSegments(edgeGeo, edgeMat);
      wire.position.copy(mesh.position);
      wire.quaternion.copy(mesh.quaternion);
      state.three.group.add(wire);
    }

    const markerGeo = new THREE.SphereGeometry(Math.max(0.11, 0.25 - n * 0.01), 18, 18);
    for (let i = 0; i < state.terminals.length; i += 1) {
      const pair = state.terminals[i];
      for (const cellId of pair) {
        const cell = state.board.cells.get(cellId);
        const markerMat = new THREE.MeshStandardMaterial({
          color: colorFor(i),
          emissive: colorFor(i),
          emissiveIntensity: 0.3,
          roughness: 0.45,
          metalness: 0.05
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        const lift = cubeExtent * 0.015 + 0.15;
        marker.position.set(
          cell.center[0] * marginScale + cell.n[0] * lift,
          cell.center[1] * marginScale + cell.n[1] * lift,
          cell.center[2] * marginScale + cell.n[2] * lift
        );
        state.three.group.add(marker);
        state.three.terminalMarkers.set(cellId, marker);
      }
    }

    const distance = Math.max(9, n * 2.4);
    state.three.view.distance = distance;
    state.three.view.yaw = 0.72;
    state.three.view.pitch = 0.52;
  }

  function refreshCubeColors() {
    if (!state.three.enabled || state.mode !== "cube") {
      return;
    }
    for (const id of state.board.cellIds) {
      const mesh = state.three.tileMeshes.get(id);
      if (!mesh) continue;
      const occ = state.occupancy.get(id);
      const terminalOwner = state.terminalByCell.get(id);
      if (terminalOwner !== undefined) {
        mesh.material.color.set(colorFor(terminalOwner));
        mesh.material.emissive = new window.THREE.Color(colorFor(terminalOwner));
        mesh.material.emissiveIntensity = 0.15;
      } else if (occ) {
        mesh.material.color.set(colorFor(occ.color));
        mesh.material.emissive = new window.THREE.Color(0x000000);
        mesh.material.emissiveIntensity = 0;
      } else {
        mesh.material.color.set(0x183257);
        mesh.material.emissive = new window.THREE.Color(0x000000);
        mesh.material.emissiveIntensity = 0;
      }
    }
  }

  function pickCubeCell(clientX, clientY) {
    if (!state.three.enabled || !state.three.renderer || state.mode !== "cube") {
      return null;
    }
    const rect = state.three.renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    state.three.mouse.set(x, y);
    state.three.raycaster.setFromCamera(state.three.mouse, state.three.camera);

    const tiles = Array.from(state.three.tileMeshes.values());
    const hits = state.three.raycaster.intersectObjects(tiles, false);
    if (!hits.length) {
      return null;
    }
    return hits[0].object.userData.cellId || null;
  }

  function refreshAllVisuals() {
    recomputeOccupancy();
    updateLegend();
    updateStatsAndMessages();
    draw2D();
    refreshCubeColors();
  }

  function makeTerminalMap() {
    const map = new Map();
    for (let i = 0; i < state.terminals.length; i += 1) {
      const [a, b] = state.terminals[i];
      map.set(a, i);
      map.set(b, i);
    }
    state.terminalByCell = map;
  }

  function findSolvableTerminalPairs(board, initialPairCount, mode) {
    const started = performance.now();
    const deadlineMs = mode === "2d" ? 2600 : 4300;
    const deadline = started + deadlineMs;
    const perAttemptBudgetMs = mode === "2d" ? 140 : 180;
    const perAttemptNodeLimit = mode === "2d" ? 140000 : 190000;
    const maxAttemptsPerPairCount = mode === "2d" ? 28 : 34;

    let attempts = 0;
    let pairCount = initialPairCount;
    while (pairCount >= 2 && performance.now() < deadline) {
      for (let a = 0; a < maxAttemptsPerPairCount && performance.now() < deadline; a += 1) {
        attempts += 1;
        const candidate = randomPairs(board, pairCount);
        const result = solveBounded(board, candidate, perAttemptBudgetMs, perAttemptNodeLimit);
        if (result.status === "solved") {
          return {
            pairs: candidate,
            pairCount,
            attempts,
            elapsed: Math.round(performance.now() - started)
          };
        }
      }
      pairCount -= 1;
    }

    return {
      pairs: null,
      pairCount: initialPairCount,
      attempts,
      elapsed: Math.round(performance.now() - started)
    };
  }

  function findLikelyUnsolvableTerminalPairs(board, pairCount, mode) {
    const started = performance.now();
    const deadlineMs = mode === "2d" ? 1900 : 2600;
    const deadline = started + deadlineMs;
    const perAttemptBudgetMs = mode === "2d" ? 220 : 280;
    const perAttemptNodeLimit = mode === "2d" ? 220000 : 300000;
    const maxAttempts = mode === "2d" ? 22 : 28;
    let attempts = 0;
    let bestHard = null;

    while (attempts < maxAttempts && performance.now() < deadline) {
      attempts += 1;
      const candidate = randomPairs(board, pairCount);
      const result = solveBounded(board, candidate, perAttemptBudgetMs, perAttemptNodeLimit);
      if (result.status === "timeout") {
        return {
          pairs: candidate,
          attempts,
          elapsed: Math.round(performance.now() - started),
          confidence: "high"
        };
      }
      if (result.status === "unsolved" && !bestHard) {
        bestHard = candidate;
      }
    }

    if (bestHard) {
      return {
        pairs: bestHard,
        attempts,
        elapsed: Math.round(performance.now() - started),
        confidence: "medium"
      };
    }

    return {
      pairs: null,
      attempts,
      elapsed: Math.round(performance.now() - started),
      confidence: "low"
    };
  }

  function generatePuzzle() {
    const mode = el.modeSelect.value === "cube" ? "cube" : "2d";
    const maxN = mode === "cube" ? 7 : 10;
    const n = clampInt(el.sizeInput.value, 3, maxN, 5);
    el.sizeInput.value = String(n);
    setModeUI(mode);

    const board = mode === "cube" ? buildCubeBoard(n) : build2DBoard(n);
    const maxPairs = Math.min(PALETTE.length, Math.floor(board.cellCount / 2));
    const pairCount = clampInt(el.pairsInput.value, 2, Math.max(2, maxPairs), Math.min(5, maxPairs));
    el.pairsInput.value = String(pairCount);
    const generationMode = (el.solvabilitySelect?.value || "solvable");
    setPuzzleFlag(generationMode);

    state.board = board;
    let solvedPick = null;
    let hardPick = null;
    if (generationMode === "solvable") {
      solvedPick = findSolvableTerminalPairs(board, pairCount, mode);
      if (solvedPick.pairs) {
        state.terminals = solvedPick.pairs;
        if (solvedPick.pairCount !== pairCount) {
          el.pairsInput.value = String(solvedPick.pairCount);
        }
      } else {
        state.terminals = randomPairs(board, pairCount);
      }
    } else if (generationMode === "unsolvable") {
      hardPick = findLikelyUnsolvableTerminalPairs(board, pairCount, mode);
      state.terminals = hardPick.pairs || randomPairs(board, pairCount);
    } else {
      state.terminals = randomPairs(board, pairCount);
    }
    state.paths = new Map();
    ensurePathMap();
    makeTerminalMap();
    state.active = null;
    state.hoverCell = null;
    setSolver("No solve attempt yet.");
    if (generationMode === "solvable" && solvedPick?.pairs) {
      const adjusted = solvedPick.pairCount !== pairCount ? ` (auto-adjusted to ${solvedPick.pairCount} pairs)` : "";
      setPuzzleFlag("solvable", "verified");
      setStatus(
        `Puzzle generated: ${mode === "2d" ? `${n}x${n} grid` : `cube ${n}x${n}/face`}, ${solvedPick.pairCount} pairs${adjusted}. Verified solvable in ${solvedPick.attempts} tries (${solvedPick.elapsed} ms).`
      );
    } else if (generationMode === "solvable") {
      setPuzzleFlag("solvable", "unverified");
      setStatus(
        `Puzzle generated: ${mode === "2d" ? `${n}x${n} grid` : `cube ${n}x${n}/face`}, ${pairCount} pairs. Could not verify solvability within generator budget; try fewer pairs or smaller n for guaranteed-solvable picks.`
      );
    } else if (generationMode === "unsolvable" && hardPick?.pairs) {
      const confidenceText =
        hardPick.confidence === "high" ? "high confidence hard instance" : "likely hard instance";
      setPuzzleFlag("unsolvable", hardPick.confidence === "high" ? "high confidence" : "likely hard");
      setStatus(
        `Puzzle generated: ${mode === "2d" ? `${n}x${n} grid` : `cube ${n}x${n}/face`}, ${pairCount} pairs. ${confidenceText} found in ${hardPick.attempts} tries (${hardPick.elapsed} ms).`
      );
    } else if (generationMode === "unsolvable") {
      setPuzzleFlag("unsolvable", "unverified");
      setStatus(
        `Puzzle generated: ${mode === "2d" ? `${n}x${n} grid` : `cube ${n}x${n}/face`}, ${pairCount} pairs. Could not certify hardness quickly, so this is an unverified random instance.`
      );
    } else {
      setPuzzleFlag("random");
      setStatus(
        `Puzzle generated: ${mode === "2d" ? `${n}x${n} grid` : `cube ${n}x${n}/face`}, ${pairCount} pairs (pure random mode).`
      );
    }

    if (mode === "cube") {
      if (ensureThreeReady()) {
        buildCubeMeshes();
        requestAnimationFrame(() => resizeThreeRenderer());
      } else {
        renderCubeFallback("3D renderer unavailable. Keep using 2D mode on this device/browser.");
      }
    }
    refreshAllVisuals();
  }

  function clearPaths() {
    state.paths = new Map();
    ensurePathMap();
    state.active = null;
    setSolver("Paths cleared.");
    setStatus("Paths cleared. Drag from a colored terminal to start again.");
    refreshAllVisuals();
  }

  function beginDrag(cellId) {
    if (!state.board || !cellId) {
      return false;
    }

    const terminalOwner = state.terminalByCell.get(cellId);
    const occ = state.occupancy.get(cellId);
    const pickedColor = terminalOwner !== undefined ? terminalOwner : occ?.color;

    if (pickedColor === undefined) {
      return false;
    }

    let path = state.paths.get(pickedColor) || [];
    let fromStart = false;

    if (!path.length) {
      if (terminalOwner === undefined) {
        return false;
      }
      path = [cellId];
      state.paths.set(pickedColor, path);
      fromStart = false;
    } else {
      const idx = path.indexOf(cellId);
      if (idx === -1) {
        if (terminalOwner === pickedColor) {
          path = [cellId];
          state.paths.set(pickedColor, path);
          fromStart = false;
        } else {
          return false;
        }
      } else if (idx === 0) {
        fromStart = true;
      } else if (idx === path.length - 1) {
        fromStart = false;
      } else {
        path = path.slice(0, idx + 1);
        state.paths.set(pickedColor, path);
        fromStart = false;
      }
    }

    state.active = { color: pickedColor, fromStart };
    refreshAllVisuals();
    return true;
  }

  function canStepTo(color, targetId) {
    const targetTerminal = state.terminalByCell.get(targetId);
    if (targetTerminal !== undefined && targetTerminal !== color) {
      return false;
    }
    const occ = state.occupancy.get(targetId);
    return !(occ && occ.color !== color);
  }

  function stepDrag(cellId) {
    if (!state.active || !state.board || !cellId) {
      return;
    }
    const { color, fromStart } = state.active;
    let path = state.paths.get(color) || [];
    if (!path.length) {
      return;
    }

    const current = fromStart ? path[0] : path[path.length - 1];
    if (cellId === current) {
      return;
    }

    const neighbors = state.board.neighbors.get(current) || [];
    if (!neighbors.includes(cellId)) {
      return;
    }

    if (fromStart && path.length > 1 && cellId === path[1]) {
      path.shift();
      state.paths.set(color, path);
      refreshAllVisuals();
      return;
    }
    if (!fromStart && path.length > 1 && cellId === path[path.length - 2]) {
      path.pop();
      state.paths.set(color, path);
      refreshAllVisuals();
      return;
    }

    const existingIndex = path.indexOf(cellId);
    if (existingIndex !== -1) {
      path = fromStart ? path.slice(existingIndex) : path.slice(0, existingIndex + 1);
      state.paths.set(color, path);
      refreshAllVisuals();
      return;
    }

    if (!canStepTo(color, cellId)) {
      return;
    }

    if (fromStart) {
      path.unshift(cellId);
    } else {
      path.push(cellId);
    }
    state.paths.set(color, path);
    refreshAllVisuals();
  }

  function endDrag() {
    state.active = null;
  }

  function updateMathModeVisibility() {
    const show = el.mathToggle.checked;
    el.mathPanel.classList.toggle("hidden", !show);
  }

  function boardDistanceSq(a, b) {
    const pa = state.board.cells.get(a).center;
    const pb = state.board.cells.get(b).center;
    return vDist2(pa, pb);
  }

  function solveBounded(board, terminals, budgetMs, nodeLimit) {
    const started = performance.now();
    let timedOut = false;
    let nodeVisits = 0;

    const colors = terminals.map((_, i) => i);
    const terminalOwner = new Map();
    for (let c = 0; c < terminals.length; c += 1) {
      const [a, b] = terminals[c];
      terminalOwner.set(a, c);
      terminalOwner.set(b, c);
    }

    function budgetHit() {
      nodeVisits += 1;
      if (nodeVisits > nodeLimit) {
        timedOut = true;
        return true;
      }
      if ((nodeVisits & 255) === 0) {
        if (performance.now() - started > budgetMs) {
          timedOut = true;
          return true;
        }
      }
      return false;
    }

    function reachable(start, end, color, used) {
      const queue = [start];
      const seen = new Set([start]);
      while (queue.length) {
        if (budgetHit()) {
          return false;
        }
        const cur = queue.shift();
        if (cur === end) {
          return true;
        }
        const nbs = board.neighbors.get(cur) || [];
        for (const nb of nbs) {
          if (seen.has(nb)) continue;
          const owner = terminalOwner.get(nb);
          if (owner !== undefined && owner !== color) continue;
          if (used.has(nb)) continue;
          seen.add(nb);
          queue.push(nb);
        }
      }
      return false;
    }

    function enumeratePaths(color, used, cap) {
      const [start, end] = terminals[color];
      const blocked = new Set(used);
      for (const [cellId, owner] of terminalOwner.entries()) {
        if (owner !== color) blocked.add(cellId);
      }
      blocked.delete(start);
      blocked.delete(end);

      const path = [start];
      const seen = new Set([start]);
      const out = [];

      function dfs(cellId) {
        if (budgetHit()) return;
        if (cellId === end) {
          out.push(path.slice());
          return;
        }
        const nbs = (board.neighbors.get(cellId) || []).slice();
        nbs.sort((a, b) => boardDistanceSq(a, end) - boardDistanceSq(b, end));
        for (const nb of nbs) {
          if (out.length >= cap || timedOut) return;
          if (seen.has(nb) || blocked.has(nb)) continue;
          seen.add(nb);
          path.push(nb);
          dfs(nb);
          path.pop();
          seen.delete(nb);
        }
      }

      dfs(start);
      return out;
    }

    colors.sort((cA, cB) => {
      const [a1, b1] = terminals[cA];
      const [a2, b2] = terminals[cB];
      return boardDistanceSq(a2, b2) - boardDistanceSq(a1, b1);
    });

    const chosen = new Map();
    const used = new Set();

    function pruneRemaining(idx) {
      for (let i = idx; i < colors.length; i += 1) {
        const c = colors[i];
        const [start, end] = terminals[c];
        const localUsed = new Set(used);
        localUsed.delete(start);
        localUsed.delete(end);
        if (!reachable(start, end, c, localUsed)) {
          return false;
        }
        if (timedOut) return false;
      }
      return true;
    }

    function recurse(idx) {
      if (budgetHit()) return false;
      if (idx === colors.length) {
        const occ = new Set();
        for (const path of chosen.values()) {
          for (const cellId of path) {
            occ.add(cellId);
          }
        }
        return occ.size === board.cellCount;
      }

      const color = colors[idx];
      const candidates = enumeratePaths(color, used, 180);
      if (timedOut) return false;
      candidates.sort((a, b) => b.length - a.length);
      if (!candidates.length) {
        return false;
      }

      for (const path of candidates) {
        if (budgetHit()) return false;
        let valid = true;
        for (const cellId of path) {
          const owner = terminalOwner.get(cellId);
          if (owner !== undefined && owner !== color) {
            valid = false;
            break;
          }
          if (used.has(cellId)) {
            valid = false;
            break;
          }
        }
        if (!valid) continue;

        chosen.set(color, path);
        for (const cellId of path) used.add(cellId);

        if (pruneRemaining(idx + 1) && recurse(idx + 1)) {
          return true;
        }

        chosen.delete(color);
        for (const cellId of path) used.delete(cellId);

        if (timedOut) {
          return false;
        }
      }
      return false;
    }

    const solved = recurse(0);
    const elapsed = Math.round(performance.now() - started);

    if (solved) {
      return {
        status: "solved",
        elapsed,
        nodes: nodeVisits,
        paths: chosen
      };
    }
    return {
      status: timedOut ? "timeout" : "unsolved",
      elapsed,
      nodes: nodeVisits,
      paths: null
    };
  }

  function trySolve() {
    if (!state.board) return;
    const budgetMs = clampInt(el.budgetInput.value, 50, 6000, 1200);
    el.budgetInput.value = String(budgetMs);

    setSolver("Running bounded solver...");
    const nodeLimit = state.mode === "cube" ? 250000 : 400000;
    const result = solveBounded(state.board, state.terminals, budgetMs, nodeLimit);

    if (result.status === "solved" && result.paths) {
      state.paths = new Map(result.paths);
      ensurePathMap();
      refreshAllVisuals();
      const msg = `Solved in ${result.elapsed} ms after ${result.nodes.toLocaleString()} search nodes.`;
      setSolver(msg);
      setStatus(msg);
      return;
    }

    if (result.status === "timeout") {
      const msg = `No completion within ${budgetMs} ms (${result.nodes.toLocaleString()} nodes). Likely hard for bounded search (NP-complete family).`;
      setSolver(msg);
      setStatus(msg);
      refreshAllVisuals();
      return;
    }

    const msg = `No solution found in bounded search (${result.elapsed} ms, ${result.nodes.toLocaleString()} nodes).`;
    setSolver(msg);
    setStatus(msg);
    refreshAllVisuals();
  }

  function resizeThreeRenderer() {
    if (!state.three.enabled || !state.three.renderer) return;
    const w = Math.max(320, el.cubeScene.clientWidth || 640);
    const h = Math.max(320, el.cubeScene.clientHeight || 640);
    state.three.renderer.setSize(w, h);
    state.three.camera.aspect = w / h;
    state.three.camera.updateProjectionMatrix();
  }

  function bind2DEvents() {
    const canvas = el.canvas2d;
    if (!canvas) return;

    canvas.addEventListener("pointerdown", (event) => {
      if (state.mode !== "2d") return;
      const cellId = cellFrom2DPointer(event);
      if (!cellId) return;
      const started = beginDrag(cellId);
      if (!started) return;
      canvas.setPointerCapture(event.pointerId);
      state.active.pointerId = event.pointerId;
      event.preventDefault();
    });

    canvas.addEventListener("pointermove", (event) => {
      if (state.mode !== "2d") return;
      const cellId = cellFrom2DPointer(event);
      state.hoverCell = cellId;
      if (state.active && state.active.pointerId === event.pointerId && cellId) {
        stepDrag(cellId);
      } else {
        draw2D();
      }
    });

    const release = (event) => {
      if (state.mode !== "2d") return;
      if (state.active && state.active.pointerId === event.pointerId) {
        endDrag();
      }
    };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("pointerleave", () => {
      state.hoverCell = null;
      draw2D();
    });
  }

  function bind3DEvents() {
    if (!state.three.enabled || !state.three.renderer || state.three.eventsBound) {
      return;
    }
    const dom = state.three.renderer.domElement;

    dom.addEventListener("pointerdown", (event) => {
      if (state.mode !== "cube") return;
      const cellId = pickCubeCell(event.clientX, event.clientY);
      const started = cellId ? beginDrag(cellId) : false;
      state.three.pointerId = event.pointerId;
      state.three.pointerActive = Boolean(started);
      state.three.rotateActive = !started;
      state.three.lastX = event.clientX;
      state.three.lastY = event.clientY;
      dom.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    dom.addEventListener("pointermove", (event) => {
      if (state.mode !== "cube") return;
      if (state.three.pointerId !== event.pointerId) return;
      if (state.three.pointerActive) {
        const cellId = pickCubeCell(event.clientX, event.clientY);
        if (cellId) {
          stepDrag(cellId);
        }
      } else if (state.three.rotateActive) {
        const dx = event.clientX - (state.three.lastX || event.clientX);
        const dy = event.clientY - (state.three.lastY || event.clientY);
        state.three.lastX = event.clientX;
        state.three.lastY = event.clientY;
        state.three.view.yaw += dx * 0.012;
        state.three.view.pitch += dy * 0.01;
        state.three.view.pitch = Math.max(-1.25, Math.min(1.25, state.three.view.pitch));
      }
      event.preventDefault();
    });

    const release = (event) => {
      if (state.mode !== "cube") return;
      if (state.three.pointerId === event.pointerId) {
        endDrag();
        state.three.pointerActive = false;
        state.three.rotateActive = false;
        state.three.pointerId = null;
      }
    };

    dom.addEventListener("pointerup", release);
    dom.addEventListener("pointercancel", release);
    dom.addEventListener("pointerleave", release);

    dom.addEventListener(
      "wheel",
      (event) => {
        if (state.mode !== "cube") return;
        const delta = Math.sign(event.deltaY);
        state.three.view.distance *= delta > 0 ? 1.08 : 0.92;
        state.three.view.distance = Math.max(4.2, Math.min(80, state.three.view.distance));
        event.preventDefault();
      },
      { passive: false }
    );
    state.three.eventsBound = true;
  }

  function bindUI() {
    el.generateBtn.addEventListener("click", generatePuzzle);
    el.resetBtn.addEventListener("click", clearPaths);
    el.solveBtn.addEventListener("click", trySolve);

    el.modeSelect.addEventListener("change", generatePuzzle);
    if (el.solvabilitySelect) {
      el.solvabilitySelect.addEventListener("change", generatePuzzle);
    }
    el.mathToggle.addEventListener("change", () => {
      updateMathModeVisibility();
      updateMathPanel();
    });

    window.addEventListener("resize", () => {
      draw2D();
      resizeThreeRenderer();
    });

    bind2DEvents();
  }

  function init() {
    if (!el.modeSelect || !el.canvas2d || !el.cubeScene) {
      return;
    }

    updateMathModeVisibility();
    setModeUI(el.modeSelect.value === "cube" ? "cube" : "2d");
    setPuzzleFlag(el.solvabilitySelect?.value || "solvable");
    bindUI();
    generatePuzzle();
  }

  init();
})();
