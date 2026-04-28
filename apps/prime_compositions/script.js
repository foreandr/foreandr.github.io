// ── Math ──────────────────────────────────────────────────────────────────────

// Find all ways to write n as (d repeated k times) + remainder r
// i.e. d * k + r = n, with d >= 2 (and d > r), k >= 2
function getCompositionsMod(n, r) {
  if (r >= n) return [];
  const result = [];
  const dStart = Math.max(2, r + 1);       // d must be > r for n % d === r
  const dEnd = Math.floor((n - r) / 2);    // ensures k = floor(n/d) >= 2
  for (let d = dStart; d <= dEnd; d++) {
    if (n % d === r) {
      result.push({ factor: d, count: Math.floor(n / d) });
    }
  }
  return result;
}

// Consistent HSL colour per factor value (golden-angle spacing)
function factorColor(v) {
  const hue = (v * 137.508) % 360;
  return { bg: `hsl(${hue}, 60%, 54%)`, border: `hsl(${hue}, 60%, 40%)` };
}

// ── Row builder ───────────────────────────────────────────────────────────────

function buildRow(n, comps, r, base) {
  const row = document.createElement('div');
  row.className = 'number-row';

  const label = document.createElement('div');
  label.className = 'num-label';
  const baseStr = n.toString(base).toUpperCase();
  label.innerHTML = `<div class="num-main">${baseStr}</div><div class="num-sub">(${n})</div>`;
  row.appendChild(label);

  const right = document.createElement('div');
  right.className = 'compositions';

  if (n === 1) {
    right.appendChild(makeBadge('unit', 'unit-badge'));
  } else if (comps.length === 0) {
    const text = '★ prime';
    right.appendChild(makeBadge(text, 'prime-badge'));
  } else {
    comps.forEach(({ factor, count }) => {
      const line = document.createElement('div');
      line.className = 'comp-line';
      const { bg, border } = factorColor(factor);

      const MAX_CHIPS = 50;
      const shown = Math.min(count, MAX_CHIPS);
      for (let i = 0; i < shown; i++) {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = factor;
        chip.style.background = bg;
        chip.style.borderColor = border;
        line.appendChild(chip);
      }

      if (count > MAX_CHIPS) {
        const more = document.createElement('div');
        more.className = 'chip-more';
        more.textContent = `… ×${count}`;
        line.appendChild(more);
      }

      if (r > 0) {
        const rem = document.createElement('div');
        rem.className = 'chip-rem';
        rem.textContent = `+${r}`;
        line.appendChild(rem);
      }

      const summary = document.createElement('span');
      summary.className = 'comp-summary';
      summary.textContent = r > 0
        ? `(${factor}×${count} + ${r})`
        : `(${factor} × ${count})`;
      line.appendChild(summary);

      right.appendChild(line);
    });
  }

  row.appendChild(right);
  return row;
}

function makeBadge(text, cls) {
  const b = document.createElement('span');
  b.className = `badge ${cls}`;
  b.textContent = text;
  return b;
}

// ── Panel management ──────────────────────────────────────────────────────────

let maxN = 100;
let panelSeq = 0;

function createPanel(modVal = 0, baseVal = 10) {
  panelSeq++;
  const panel = document.createElement('div');
  panel.className = 'panel';

  // Header
  const header = document.createElement('div');
  header.className = 'panel-header';

  const modWrap = document.createElement('div');
  modWrap.className = 'mod-wrap';
  modWrap.innerHTML =
    `<span class="mod-label">Numbers mod</span>` +
    `<input class="mod-input" type="number" value="${modVal}" min="0" max="999">` +
    `<span class="mod-label">Base</span>` +
    `<input class="base-input" type="number" value="${baseVal}" min="2" max="36">`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'panel-close';
  closeBtn.textContent = '×';
  closeBtn.title = 'Remove panel';
  closeBtn.onclick = () => {
    panel.remove();
    syncCloseButtons();
  };

  header.appendChild(modWrap);
  header.appendChild(closeBtn);

  const stats = document.createElement('div');
  stats.className = 'panel-stats';

  const numbers = document.createElement('div');
  numbers.className = 'panel-numbers';

  panel.appendChild(header);
  panel.appendChild(stats);
  panel.appendChild(numbers);
  document.getElementById('panels-container').appendChild(panel);

  const modInput = modWrap.querySelector('.mod-input');
  const baseInput = modWrap.querySelector('.base-input');
  modInput.addEventListener('change', () => {
    renderPanel(panel, parseInt(modInput.value) || 0, parseInt(baseInput.value) || 10);
  });
  baseInput.addEventListener('change', () => {
    renderPanel(panel, parseInt(modInput.value) || 0, parseInt(baseInput.value) || 10);
  });

  renderPanel(panel, modVal, baseVal);
  syncCloseButtons();
}

function renderPanel(panel, r, base) {
  const numbers = panel.querySelector('.panel-numbers');
  const stats = panel.querySelector('.panel-stats');
  numbers.innerHTML = '';
  const safeBase = Math.min(36, Math.max(2, base || 10));

  let irreducible = 0, reducible = 0;
  const frag = document.createDocumentFragment();

  for (let n = 1; n <= maxN; n++) {
    const comps = getCompositionsMod(n, r);
    if (n > 1) {
      if (comps.length === 0) irreducible++;
      else reducible++;
    }
    frag.appendChild(buildRow(n, comps, r, safeBase));
  }

  numbers.appendChild(frag);
  stats.textContent = `${irreducible} prime · ${reducible} composite (mod ${r}, base ${safeBase}, up to ${maxN})`;
}

function rerenderAll() {
  document.querySelectorAll('.panel').forEach(panel => {
    const r = parseInt(panel.querySelector('.mod-input').value) || 0;
    const b = parseInt(panel.querySelector('.base-input').value) || 10;
    renderPanel(panel, r, b);
  });
}

function syncCloseButtons() {
  const panels = document.querySelectorAll('.panel');
  panels.forEach(p => {
    p.querySelector('.panel-close').disabled = panels.length === 1;
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

const slider = document.getElementById('max-n-slider');
const sliderVal = document.getElementById('max-n-val');

slider.addEventListener('input', () => {
  maxN = parseInt(slider.value);
  sliderVal.textContent = maxN;
  rerenderAll();
});

document.getElementById('add-panel-btn').addEventListener('click', () => {
  // New panel defaults to one higher mod than the last panel
  const panels = document.querySelectorAll('.panel');
  const lastMod = panels.length
    ? parseInt(panels[panels.length - 1].querySelector('.mod-input').value) || 0
    : 0;
  const lastBase = panels.length
    ? parseInt(panels[panels.length - 1].querySelector('.base-input').value) || 10
    : 10;
  createPanel(lastMod + 1, lastBase);
});

// Start with one panel (mod 0)
createPanel(0, 10);
