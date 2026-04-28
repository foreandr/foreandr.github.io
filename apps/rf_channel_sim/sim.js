(function () {
  'use strict';

  const TWO_PI = Math.PI * 2;
  const TEXT_ENCODER = new TextEncoder();
  const TEXT_DECODER = new TextDecoder('utf-8', { fatal: false });

  const PALETTE = [
    '#22d3ee', '#f472b6', '#a78bfa', '#34d399', '#fbbf24', '#fb7185',
    '#38bdf8', '#c084fc', '#4ade80', '#fcd34d', '#f9a8d4', '#2dd4bf',
  ];

  /** @type {{ id: number, x: number, y: number, freq: number, msg: string, color: string, txOn: boolean, bits: number[] }[]} */
  let antennas = [];
  let nextAntId = 1;
  let selectedId = null;

  /** Antennas may be placed anywhere in ±this range (world units). */
  const WORLD_EXTENT = 40;

  const view = { panX: 0.5, panY: 0.5, worldPerPx: 0.003 };

  const state = {
    running: true,
    simT: 0,
    lastWall: 0,
    scope: [],
    scopeMax: 640,
    /** @type {number[]} */
    accums: [],
    /** @type {number[][]} */
    bitStreams: [],
    dragAntId: null,
    panning: false,
    panStart: null,
    viewStart: null,
    skipInspector: false,
  };

  let frameIdx = 0;

  const fieldBuffer = document.createElement('canvas');
  fieldBuffer.width = 280;
  fieldBuffer.height = 150;

  const el = {
    field: document.getElementById('field-canvas'),
    scope: document.getElementById('scope-canvas'),
    decomp: document.getElementById('decomp-canvas'),
    canvasOuter: document.getElementById('canvas-outer'),
    btnPlay: document.getElementById('btn-play'),
    btnReset: document.getElementById('btn-reset'),
    btnAdd: document.getElementById('btn-add-ant'),
    btnZoom: document.getElementById('btn-zoom-reset'),
    bitDur: document.getElementById('bit-dur'),
    waveC: document.getElementById('wave-c'),
    speed: document.getElementById('speed'),
    outBit: document.getElementById('out-bit'),
    outC: document.getElementById('out-c'),
    outSpeed: document.getElementById('out-speed'),
    clock: document.getElementById('sim-clock'),
    legend: document.getElementById('legend-summary'),
    hint: document.getElementById('separation-hint'),
    antList: document.getElementById('antenna-list'),
    antCount: document.getElementById('ant-count'),
    inspectorNone: document.getElementById('inspector-none'),
    inspectorBody: document.getElementById('inspector-body'),
    inspFreq: document.getElementById('insp-freq'),
    inspFreqOut: document.getElementById('insp-f-out'),
    inspMsg: document.getElementById('insp-msg'),
    inspTxOn: document.getElementById('insp-tx-on'),
    btnDel: document.getElementById('btn-del-ant'),
    freqColl: document.getElementById('freq-collision'),
    decodeMatrix: document.getElementById('decode-matrix'),
  };

  function stringToBits(str) {
    const bytes = TEXT_ENCODER.encode(str || '');
    const bits = [];
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      for (let b = 7; b >= 0; b--) bits.push((byte >> b) & 1);
    }
    return bits;
  }

  function refreshAntennaBits() {
    for (const a of antennas) a.bits = stringToBits(a.msg);
  }

  function bpskFromBits(bits, t, Tbit) {
    if (Tbit <= 0) return 1;
    const idx = Math.floor(t / Tbit);
    if (idx < 0) return 1;
    if (!bits.length) return 1;
    const wrapped = idx % bits.length;
    return bits[wrapped] === 1 ? 1 : -1;
  }

  function sampleFieldAt(wx, wy, t, c, Tbit, ants) {
    let v = 0;
    for (const a of ants) {
      if (!a.txOn) continue;
      const d = Math.hypot(wx - a.x, wy - a.y) + 1e-4;
      const tau = t - d / c;
      if (tau < 0) continue;
      const m = bpskFromBits(a.bits, tau, Tbit);
      v += (m / Math.sqrt(d)) * Math.sin(TWO_PI * a.freq * tau);
    }
    return v;
  }

  function bitsToString(bits) {
    const n = Math.floor(bits.length / 8);
    if (n === 0) return '…';
    const u8 = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i * 8 + j] & 1);
      u8[i] = b;
    }
    return TEXT_DECODER.decode(u8);
  }

  function syncDecoderArrays() {
    const n = antennas.length;
    while (state.accums.length < n) {
      state.accums.push(0);
      state.bitStreams.push([]);
    }
    while (state.accums.length > n) {
      state.accums.pop();
      state.bitStreams.pop();
    }
  }

  function resetDecoderOnly() {
    syncDecoderArrays();
    for (let i = 0; i < state.accums.length; i++) {
      state.accums[i] = 0;
      state.bitStreams[i] = [];
    }
  }

  function getListenerIndex() {
    if (!antennas.length) return -1;
    if (selectedId == null) return 0;
    const i = antennas.findIndex((a) => a.id === selectedId);
    return i >= 0 ? i : 0;
  }

  function finalizeBitWindow() {
    for (let j = 0; j < antennas.length; j++) {
      if (!antennas[j].txOn) {
        state.accums[j] = 0;
        continue;
      }
      const bit = state.accums[j] >= 0 ? 1 : 0;
      state.bitStreams[j].push(bit);
      state.accums[j] = 0;
    }
  }

  function integrateInterval(dt, c, Tbit) {
    if (dt <= 0 || !antennas.length) return;
    const li = getListenerIndex();
    if (li < 0) return;
    const L = antennas[li];
    const Lx = L.x;
    const Ly = L.y;

    let left = dt;
    while (left > 1e-10) {
      const idx0 = Math.floor(state.simT / Tbit);
      const nextEdge = (idx0 + 1) * Tbit;
      const toEdge = Math.max(0, nextEdge - state.simT);
      const step = Math.min(left, toEdge > 1e-14 ? toEdge : left);
      if (step <= 1e-14) {
        state.simT += 1e-12;
        continue;
      }
      const tMid = state.simT + step * 0.5;
      const s = sampleFieldAt(Lx, Ly, tMid, c, Tbit, antennas);

      for (let j = 0; j < antennas.length; j++) {
        if (!antennas[j].txOn) continue;
        const d = Math.hypot(Lx - antennas[j].x, Ly - antennas[j].y);
        const phase = TWO_PI * antennas[j].freq * (tMid - d / c);
        state.accums[j] += s * 2 * Math.sin(phase) * step;
      }

      state.simT += step;
      left -= step;
      const idx1 = Math.floor(state.simT / Tbit);
      if (idx1 > idx0) finalizeBitWindow();
    }
  }

  function worldToScreen(wx, wy, fw, fh) {
    return {
      ix: fw / 2 + (wx - view.panX) / view.worldPerPx,
      iy: fh / 2 - (wy - view.panY) / view.worldPerPx,
    };
  }

  function screenToWorld(ix, iy, fw, fh) {
    return {
      wx: view.panX + (ix - fw / 2) * view.worldPerPx,
      wy: view.panY - (iy - fh / 2) * view.worldPerPx,
    };
  }

  function canvasDeviceIxIy(clientX, clientY) {
    const rect = el.field.getBoundingClientRect();
    const ix = ((clientX - rect.left) / rect.width) * el.field.width;
    const iy = ((clientY - rect.top) / rect.height) * el.field.height;
    return { ix, iy };
  }

  function hitTestAntenna(ix, iy) {
    const fw = el.field.width;
    const fh = el.field.height;
    let best = null;
    let bestD = 1e9;
    for (let i = antennas.length - 1; i >= 0; i--) {
      const a = antennas[i];
      const p = worldToScreen(a.x, a.y, fw, fh);
      const d = Math.hypot(p.ix - ix, p.iy - iy);
      if (d < 18 && d < bestD) {
        bestD = d;
        best = a.id;
      }
    }
    return best;
  }

  function fitViewToAntennas() {
    const fw = el.field.width;
    const fh = el.field.height;
    if (!antennas.length) {
      view.panX = 0.5;
      view.panY = 0.5;
      view.worldPerPx = 1.15 / Math.min(fw, fh);
      return;
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const a of antennas) {
      minX = Math.min(minX, a.x);
      maxX = Math.max(maxX, a.x);
      minY = Math.min(minY, a.y);
      maxY = Math.max(maxY, a.y);
    }
    const pad = 0.14;
    const bw = Math.max(0.4, maxX - minX + 2 * pad);
    const bh = Math.max(0.4, maxY - minY + 2 * pad);
    view.panX = (minX + maxX) / 2;
    view.panY = (minY + maxY) / 2;
    view.worldPerPx = Math.max(bw / fw, bh / fh);
  }

  function drawField(ctx, fw, fh, t, c, Tbit) {
    const bw = fieldBuffer.width;
    const bh = fieldBuffer.height;
    const bctx = fieldBuffer.getContext('2d');
    const img = bctx.createImageData(bw, bh);
    const data = img.data;
    const worldW = fw * view.worldPerPx;
    const worldH = fh * view.worldPerPx;
    let p = 0;
    for (let j = 0; j < bh; j++) {
      const wy = view.panY - ((j + 0.5) / bh - 0.5) * worldH;
      for (let i = 0; i < bw; i++) {
        const wx = view.panX + ((i + 0.5) / bw - 0.5) * worldW;
        const u = sampleFieldAt(wx, wy, t, c, Tbit, antennas);
        const g = Math.tanh(u * 0.85);
        const intensity = (g + 1) * 0.5;
        const r = Math.floor(12 + intensity * 80);
        const gg = Math.floor(20 + (1 - intensity) * 60 + intensity * 40);
        const b = Math.floor(40 + (1 - intensity) * 120);
        data[p++] = r;
        data[p++] = gg;
        data[p++] = b;
        data[p++] = 255;
      }
    }
    bctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fieldBuffer, 0, 0, fw, fh);

    ctx.save();
    for (let i = 0; i < antennas.length; i++) {
      const a = antennas[i];
      const { ix, iy } = worldToScreen(a.x, a.y, fw, fh);
      const sel = a.id === selectedId;
      const r = sel ? 9 : 7;
      ctx.beginPath();
      ctx.arc(ix, iy, r, 0, TWO_PI);
      ctx.fillStyle = a.color;
      ctx.globalAlpha = a.txOn ? 0.92 : 0.45;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = sel ? '#fff' : 'rgba(255,255,255,0.45)';
      ctx.lineWidth = sel ? 2.5 : 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.font = '600 11px IBM Plex Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), ix, iy);
    }
    ctx.restore();
  }

  function drawScope(ctx, w, h, arr) {
    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(0, 0, w, h);
    if (arr.length < 2) return;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();

    let min = arr[0];
    let max = arr[0];
    for (let i = 1; i < arr.length; i++) {
      const v = arr[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const pad = Math.max(0.12, (max - min) * 0.08);
    min -= pad;
    max += pad;
    const span = max - min || 1;

    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    for (let i = 0; i < arr.length; i++) {
      const x = (i / (arr.length - 1)) * w;
      const y = h - ((arr[i] - min) / span) * (h - 8) - 4;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawDecomp(ctx, w, h) {
    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(0, 0, w, h);
    const rows = antennas
      .map((a, idx) => ({ a, idx }))
      .filter((o) => o.a.txOn);
    if (!rows.length) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px IBM Plex Sans, sans-serif';
      ctx.fillText('No active transmitters', 12, h / 2);
      return;
    }
    const rowH = Math.max(18, (h - 16) / rows.length);
    const maxAbs = Math.max(
      1e-6,
      ...rows.map((o) => Math.abs(state.accums[o.idx] || 0))
    );
    rows.forEach((o, r) => {
      const y0 = 8 + r * rowH;
      const acc = state.accums[o.idx] || 0;
      const norm = Math.tanh(acc / (maxAbs * 0.9 + 0.02));
      const barW = ((norm + 1) / 2) * (w - 140);
      ctx.fillStyle = 'rgba(148,163,184,0.25)';
      ctx.fillRect(120, y0 + 3, w - 128, rowH - 8);
      ctx.fillStyle = o.a.color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(120, y0 + 3, barW, rowH - 8);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px IBM Plex Mono, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('#' + (o.idx + 1) + '  ' + o.a.freq.toFixed(2) + ' Hz', 112, y0 + rowH / 2);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(acc.toFixed(3), 124 + barW + 6, y0 + rowH / 2);
    });
  }

  function readControls() {
    const Tbit = parseFloat(el.bitDur.value);
    const c = parseFloat(el.waveC.value);
    const speed = parseFloat(el.speed.value);
    el.outBit.textContent = Tbit.toFixed(2);
    el.outC.textContent = c.toFixed(2);
    el.outSpeed.textContent = speed.toFixed(2) + '×';
    return { Tbit, c, speed };
  }

  function freqKey(f) {
    return Math.round(f * 50) / 50;
  }

  function collisionMap() {
    const m = new Map();
    for (const a of antennas) {
      if (!a.txOn) continue;
      const k = freqKey(a.freq);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }

  function updateLegend() {
    const n = antennas.length;
    const tx = antennas.filter((a) => a.txOn).length;
    const cmap = collisionMap();
    let clash = 0;
    cmap.forEach((v) => {
      if (v > 1) clash += v;
    });
    el.legend.textContent =
      n + ' antenna' + (n === 1 ? '' : 's') + ' · ' + tx + ' TX · ';
    el.legend.textContent +=
      clash > 0 ? clash + ' TX on crowded carriers' : 'no same-frequency pile-up';
  }

  function renderAntennaList() {
    el.antCount.textContent = String(antennas.length);
    el.antList.innerHTML = '';
    const cmap = collisionMap();
    antennas.forEach((a, i) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'ant-row' + (a.id === selectedId ? ' selected' : '');
      const fk = freqKey(a.freq);
      const pill =
        a.txOn && cmap.get(fk) > 1
          ? '<span class="ant-row-pill">' + cmap.get(fk) + ' @ ' + fk.toFixed(2) + ' Hz</span>'
          : '<span class="ant-row-pill hide"></span>';
      row.innerHTML =
        '<span class="ant-swatch" style="background:' +
        a.color +
        '"></span><div class="ant-row-meta"><b>#' +
        (i + 1) +
        (a.txOn ? '' : ' (off)') +
        '</b><span>' +
        a.freq.toFixed(2) +
        ' Hz · ' +
        (a.msg || '∅').slice(0, 28) +
        (a.msg.length > 28 ? '…' : '') +
        '</span></div>' +
        pill;
      row.addEventListener('click', () => selectAntenna(a.id));
      el.antList.appendChild(row);
    });
  }

  function renderDecodeMatrix() {
    el.decodeMatrix.innerHTML = '';
    const cmap = collisionMap();
    const li = getListenerIndex();
    const listenLabel = li >= 0 ? '#' + (li + 1) : '—';

    antennas.forEach((a, j) => {
      if (!a.txOn) return;
      const fk = freqKey(a.freq);
      const collide = cmap.get(fk) > 1;
      const card = document.createElement('div');
      card.className = 'decode-card';
      card.innerHTML =
        '<div class="decode-card-head"><span class="sw" style="background:' +
        a.color +
        '"></span><b>TX #' +
        (j + 1) +
        '</b><span class="hz">' +
        a.freq.toFixed(2) +
        ' Hz</span>' +
        (collide ? '<span class="collision-tag">same freq as others</span>' : '') +
        '</div><div class="decode-help">Listener ' +
        listenLabel +
        ' · integrator ' +
        (state.accums[j] != null ? state.accums[j].toFixed(3) : '0') +
        '</div><div class="decode-out-sm">' +
        escapeHtml(bitsToString(state.bitStreams[j] || [])) +
        '</div>';
      el.decodeMatrix.appendChild(card);
    });

    if (!antennas.some((a) => a.txOn)) {
      el.decodeMatrix.innerHTML =
        '<p class="inspector-none">Turn on “Transmitting” on at least one antenna.</p>';
    }
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function selectAntenna(id) {
    selectedId = id;
    resetDecoderOnly();
    state.scope = [];
    renderAntennaList();
    updateInspector();
    el.canvasOuter.classList.toggle('drag-ant', false);
  }

  function updateInspector() {
    const a = antennas.find((x) => x.id === selectedId);
    if (!a) {
      el.inspectorNone.hidden = false;
      el.inspectorBody.hidden = true;
      el.freqColl.hidden = true;
      return;
    }
    el.inspectorNone.hidden = true;
    el.inspectorBody.hidden = false;

    const cmap = collisionMap();
    const fk = freqKey(a.freq);
    const nSame = cmap.get(fk) || 0;
    if (a.txOn && nSame > 1) {
      el.freqColl.hidden = false;
      el.freqColl.textContent =
        nSame +
        ' transmitting antennas share ~' +
        fk.toFixed(2) +
        ' Hz. On-air symbols add; each row still uses one TX’s path phase, so decoded text usually scrambles.';
    } else {
      el.freqColl.hidden = true;
    }

    state.skipInspector = true;
    el.inspFreq.value = String(a.freq);
    el.inspFreqOut.textContent = a.freq.toFixed(2);
    el.inspMsg.value = a.msg;
    el.inspTxOn.checked = a.txOn;
    state.skipInspector = false;

    el.btnDel.disabled = antennas.length <= 1;
    renderDecodeMatrix();
  }

  function addAntenna(x, y) {
    const col = PALETTE[(antennas.length + 3) % PALETTE.length];
    const id = nextAntId++;
    antennas.push({
      id,
      x,
      y,
      freq: 2 + (antennas.length % 7) * 0.65,
      msg: 'Hi #' + id,
      color: col,
      txOn: true,
      bits: [],
    });
    refreshAntennaBits();
    syncDecoderArrays();
    selectAntenna(id);
    updateLegend();
  }

  function deleteSelected() {
    if (antennas.length <= 1) return;
    const idx = antennas.findIndex((a) => a.id === selectedId);
    if (idx < 0) return;
    antennas.splice(idx, 1);
    selectedId = antennas[Math.max(0, idx - 1)].id;
    refreshAntennaBits();
    resetDecoderOnly();
    renderAntennaList();
    updateInspector();
    updateLegend();
  }

  function loop(now) {
    const { Tbit, c, speed } = readControls();
    if (!state.lastWall) state.lastWall = now;
    const wallDt = Math.min(0.05, (now - state.lastWall) / 1000);
    state.lastWall = now;

    if (state.running && antennas.length) {
      const dt = wallDt * speed;
      const t0 = state.simT;
      integrateInterval(dt, c, Tbit);
      const li = getListenerIndex();
      if (li >= 0) {
        const L = antennas[li];
        const sMid = sampleFieldAt(
          L.x,
          L.y,
          t0 + dt * 0.5,
          c,
          Tbit,
          antennas
        );
        state.scope.push(sMid);
        if (state.scope.length > state.scopeMax) state.scope.shift();
      }
      el.clock.textContent = 't = ' + state.simT.toFixed(2) + ' s';
    }

    const fw = el.field.width;
    const fh = el.field.height;
    const fctx = el.field.getContext('2d');
    drawField(fctx, fw, fh, state.simT, c, Tbit);

    const sw = el.scope.width;
    const sh = el.scope.height;
    el.scope.getContext('2d');
    drawScope(el.scope.getContext('2d'), sw, sh, state.scope);

    const dw = el.decomp.width;
    const dh = el.decomp.height;
    drawDecomp(el.decomp.getContext('2d'), dw, dh);

    updateLegend();
    if ((frameIdx++ % 4) === 0) renderDecodeMatrix();

    const li = getListenerIndex();
    if (li >= 0) {
      const cmap = collisionMap();
      let hint =
        'Listener #' +
        (li + 1) +
        ': scope shows the summed field; bars show each TX integrator for the current symbol.';
      const crowded = [...cmap.values()].some((v) => v > 1);
      if (crowded)
        hint +=
          ' Orange tags mark shared carriers—real systems add guard bands, codes, or spatial separation.';
      el.hint.textContent = hint;
    }

    requestAnimationFrame(loop);
  }

  function resetSim() {
    state.simT = 0;
    state.scope = [];
    state.lastWall = 0;
    resetDecoderOnly();
    el.clock.textContent = 't = 0.00 s';
  }

  function initDefaultAntennas() {
    antennas = [
      {
        id: nextAntId++,
        x: 0.12,
        y: 0.52,
        freq: 2.5,
        msg: 'Hi right ◀',
        color: PALETTE[0],
        txOn: true,
        bits: [],
      },
      {
        id: nextAntId++,
        x: 0.88,
        y: 0.48,
        freq: 5.5,
        msg: 'Hi left ▶',
        color: PALETTE[1],
        txOn: true,
        bits: [],
      },
    ];
    refreshAntennaBits();
    syncDecoderArrays();
    selectedId = antennas[0].id;
    fitViewToAntennas();
  }

  /* ── Pointer: pan / drag antenna ── */
  el.field.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const fw = el.field.width;
      const fh = el.field.height;
      const { ix, iy } = canvasDeviceIxIy(e.clientX, e.clientY);
      const before = screenToWorld(ix, iy, fw, fh);
      const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
      view.worldPerPx *= factor;
      /* Larger max ⇒ zoom farther out so you can separate antennas across a wide area. */
      view.worldPerPx = Math.max(1e-4, Math.min(0.55, view.worldPerPx));
      const after = screenToWorld(ix, iy, fw, fh);
      view.panX += before.wx - after.wx;
      view.panY += before.wy - after.wy;
    },
    { passive: false }
  );

  el.field.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    el.field.setPointerCapture(e.pointerId);
    const { ix, iy } = canvasDeviceIxIy(e.clientX, e.clientY);
    const hit = hitTestAntenna(ix, iy);
    if (hit != null) {
      state.dragAntId = hit;
      selectAntenna(hit);
      el.canvasOuter.classList.add('drag-ant');
      state.panning = false;
    } else {
      state.dragAntId = null;
      state.panning = true;
      state.panStart = { x: e.clientX, y: e.clientY };
      state.viewStart = { px: view.panX, py: view.panY };
      el.canvasOuter.classList.add('panning');
    }
  });

  el.field.addEventListener('pointermove', (e) => {
    const fw = el.field.width;
    const fh = el.field.height;
    if (state.dragAntId != null) {
      const a = antennas.find((x) => x.id === state.dragAntId);
      if (!a) return;
      const { ix, iy } = canvasDeviceIxIy(e.clientX, e.clientY);
      const w = screenToWorld(ix, iy, fw, fh);
      a.x = Math.max(-WORLD_EXTENT, Math.min(WORLD_EXTENT, w.wx));
      a.y = Math.max(-WORLD_EXTENT, Math.min(WORLD_EXTENT, w.wy));
    } else if (state.panning && state.panStart) {
      const dx = e.clientX - state.panStart.x;
      const dy = e.clientY - state.panStart.y;
      const rect = el.field.getBoundingClientRect();
      const dIx = (dx / rect.width) * fw;
      const dIy = (dy / rect.height) * fh;
      view.panX = state.viewStart.px - dIx * view.worldPerPx;
      view.panY = state.viewStart.py + dIy * view.worldPerPx;
    }
  });

  function endPointer(e) {
    try {
      el.field.releasePointerCapture(e.pointerId);
    } catch (_) {}
    state.dragAntId = null;
    state.panning = false;
    state.panStart = null;
    state.viewStart = null;
    el.canvasOuter.classList.remove('panning', 'drag-ant');
  }
  el.field.addEventListener('pointerup', endPointer);
  el.field.addEventListener('pointercancel', endPointer);

  el.btnAdd.addEventListener('click', () => {
    const fw = el.field.width;
    const fh = el.field.height;
    const wx =
      view.panX + (Math.random() - 0.5) * 0.4 * fw * view.worldPerPx;
    const wy =
      view.panY + (Math.random() - 0.5) * 0.4 * fh * view.worldPerPx;
    addAntenna(
      Math.max(-WORLD_EXTENT, Math.min(WORLD_EXTENT, wx)),
      Math.max(-WORLD_EXTENT, Math.min(WORLD_EXTENT, wy))
    );
  });

  el.btnZoom.addEventListener('click', () => {
    fitViewToAntennas();
  });

  el.inspFreq.addEventListener('input', () => {
    if (state.skipInspector) return;
    const a = antennas.find((x) => x.id === selectedId);
    if (!a) return;
    a.freq = parseFloat(el.inspFreq.value);
    el.inspFreqOut.textContent = a.freq.toFixed(2);
    refreshAntennaBits();
    renderAntennaList();
    renderDecodeMatrix();
  });

  el.inspMsg.addEventListener('input', () => {
    if (state.skipInspector) return;
    const a = antennas.find((x) => x.id === selectedId);
    if (!a) return;
    a.msg = el.inspMsg.value;
    refreshAntennaBits();
    renderAntennaList();
    renderDecodeMatrix();
  });

  el.inspTxOn.addEventListener('change', () => {
    if (state.skipInspector) return;
    const a = antennas.find((x) => x.id === selectedId);
    if (!a) return;
    a.txOn = el.inspTxOn.checked;
    refreshAntennaBits();
    resetDecoderOnly();
    renderAntennaList();
    updateInspector();
  });

  el.btnDel.addEventListener('click', deleteSelected);

  el.btnPlay.addEventListener('click', () => {
    state.running = !state.running;
    el.btnPlay.textContent = state.running ? 'Pause' : 'Play';
    el.btnPlay.setAttribute('aria-pressed', String(state.running));
    state.lastWall = 0;
  });

  el.btnReset.addEventListener('click', resetSim);

  initDefaultAntennas();
  renderAntennaList();
  updateInspector();
  readControls();
  requestAnimationFrame(loop);
})();