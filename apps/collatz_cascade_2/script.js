(function () {
'use strict';

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const DEFAULT_MAX_STEPS = 500000;
const MAX_STEPS_CAP = 10_000_000;
const MIN_COMPUTE_MS = 500;
const MAX_COMPUTE_MS = 15_000;
const COMPUTE_MS_FACTOR = 0.02;
const BUILD_SLICE_MS = 7.5;
const LOG10_2 = Math.log10(2);
const MAX_CALC_STEPS = 2000;

const SAFETY_PROFILES = {
  potato:   { label: 'Potato Safe',  maxSteps: 100_000,   maxValue: '1000000000000',              guidance: 'Best for older machines.' },
  balanced: { label: 'Balanced',     maxSteps: 500_000,   maxValue: '1000000000000000',            guidance: 'Good for most laptops.' },
  high:     { label: 'High Power',   maxSteps: 2_000_000, maxValue: '1000000000000000000000',      guidance: 'Modern desktop.' },
  extreme:  { label: 'Extreme',      maxSteps: 5_000_000, maxValue: '1000000000000000000000000000000', guidance: '⚠ Can melt older CPUs.' },
  custom:   { label: 'Custom',       guidance: 'Manual limits.' }
};

// ═══════════════════════════════════════════════════════════════════
// OPERATION DEFINITIONS  — latexBtn shown on each button chip
//                        — latexFull(params) = display formula with values
// ═══════════════════════════════════════════════════════════════════
const OP_DEFS = [
  // ── Basic ──────────────────────────────────────────────────────
  {
    id: 'linear', cat: 'basic',
    label: 'Linear',
    latexBtn:  'a\\,n+b',
    latexFull: p => `${p.a}\\cdot n + ${p.b}`,
    params: [{k:'a',l:'a',d:'3'},{k:'b',l:'b',d:'1'}]
  },
  {
    id: 'divide', cat: 'basic',
    label: 'Divide',
    latexBtn:  '\\lfloor n/d\\rfloor',
    latexFull: p => `\\left\\lfloor\\dfrac{n}{${p.d}}\\right\\rfloor`,
    params: [{k:'d',l:'d',d:'2'}]
  },
  {
    id: 'add', cat: 'basic',
    label: 'Add',
    latexBtn:  'n+b',
    latexFull: p => `n + ${p.b}`,
    params: [{k:'b',l:'b',d:'1'}]
  },
  {
    id: 'subtract', cat: 'basic',
    label: 'Subtract',
    latexBtn:  'n-b',
    latexFull: p => `n - ${p.b}`,
    params: [{k:'b',l:'b',d:'1'}]
  },
  {
    id: 'modulo', cat: 'basic',
    label: 'Modulo',
    latexBtn:  'n\\bmod k',
    latexFull: p => `n \\bmod ${p.k}`,
    params: [{k:'k',l:'k',d:'3'}]
  },
  {
    id: 'negate', cat: 'basic',
    label: 'Negate',
    latexBtn:  '-n',
    latexFull: _p => '-n',
    params: []
  },
  // ── Power / Log ────────────────────────────────────────────────
  {
    id: 'power', cat: 'power',
    label: 'Power',
    latexBtn:  'n^e',
    latexFull: p => `n^{${p.e}}`,
    params: [{k:'e',l:'e',d:'2'}]
  },
  {
    id: 'root', cat: 'power',
    label: 'Root',
    latexBtn:  '\\lfloor\\sqrt[e]{n}\\rfloor',
    latexFull: p => `\\left\\lfloor\\sqrt[${p.e}]{n}\\right\\rfloor`,
    params: [{k:'e',l:'e',d:'2'}]
  },
  {
    id: 'exponential', cat: 'power',
    label: 'Exponential',
    latexBtn:  'a^n',
    latexFull: p => `${p.a}^{\\,n}`,
    params: [{k:'a',l:'a',d:'2'}]
  },
  {
    id: 'log', cat: 'power',
    label: 'Log',
    latexBtn:  '\\lfloor\\log_b n\\rfloor',
    latexFull: p => `\\left\\lfloor\\log_{${p.b}} n\\right\\rfloor`,
    params: [{k:'b',l:'b',d:'2'}]
  },
  // ── Calculus ───────────────────────────────────────────────────
  {
    id: 'derivative', cat: 'calc',
    label: 'Derivative',
    latexBtn:  "p'(n)",
    latexFull: p => {
      const cs = safeParsePolyForDisplay(p.poly || '0,1,1');
      return `\\frac{d}{dn}\\bigl[${cs}\\bigr]`;
    },
    params: [{k:'poly',l:'Polynomial p(x) — comma-separated coefficients c₀, c₁, c₂, …',d:'0,1,1'}]
  },
  {
    id: 'integral', cat: 'calc',
    label: 'Integral',
    latexBtn:  '\\lfloor\\int_0^n p\\,dt\\rfloor',
    latexFull: p => {
      const cs = safeParsePolyForDisplay(p.poly || '1,0');
      return `\\left\\lfloor\\int_0^{n}\\bigl(${cs}\\bigr)\\,dt\\right\\rfloor`;
    },
    params: [{k:'poly',l:'Polynomial p(t) — comma-separated coefficients c₀, c₁, c₂, …',d:'1,0'}]
  },
  {
    id: 'rational', cat: 'calc',
    label: 'Rational',
    latexBtn:  '\\left\\lfloor\\tfrac{a\\,n^p}{b\\,n^q+c}\\right\\rfloor',
    latexFull: p => `\\left\\lfloor\\dfrac{${p.a}\\cdot n^{${p.p}}}{${p.b}\\cdot n^{${p.q}}+${p.c}}\\right\\rfloor`,
    params: [{k:'a',l:'a',d:'1'},{k:'p',l:'p',d:'1'},{k:'b',l:'b',d:'1'},{k:'q',l:'q',d:'0'},{k:'c',l:'c',d:'1'}]
  },
];
const OP_BY_ID = Object.fromEntries(OP_DEFS.map(o => [o.id, o]));

// ═══════════════════════════════════════════════════════════════════
// RULE STATE
// ═══════════════════════════════════════════════════════════════════
let ruleConfig = {
  modulus: 2,
  rules: [
    { opType: 'divide', params: { d: '2' } },
    { opType: 'linear', params: { a: '3', b: '1' } }
  ]
};

// ═══════════════════════════════════════════════════════════════════
// DOM ELEMENTS
// ═══════════════════════════════════════════════════════════════════
const el = {
  nInput:          document.getElementById('n-input'),
  autoFocusCheck:  document.getElementById('auto-focus-check'),
  speedRange:      document.getElementById('speed-range'),
  speedValue:      document.getElementById('speed-value'),
  buildBtn:        document.getElementById('build-btn'),
  randomBtn:       document.getElementById('random-btn'),
  playBtn:         document.getElementById('play-btn'),
  resetBtn:        document.getElementById('reset-btn'),
  globalResetBtn:  document.getElementById('global-reset-btn'),
  focusSceneBtn:   document.getElementById('focus-scene-btn'),
  queueLine:       document.getElementById('queue-line'),
  status:          document.getElementById('status-line'),
  modulusBtnGroup: document.getElementById('modulus-btn-group'),
  customModWrap:   document.getElementById('custom-mod-wrap'),
  customModInput:  document.getElementById('custom-mod-input'),
  coverageBadge:   document.getElementById('coverage-badge'),
  rulesContainer:  document.getElementById('rules-container'),
  formulaPreview:  document.getElementById('formula-preview'),
  profileInput:    document.getElementById('profile-input'),
  maxStepsInput:   document.getElementById('max-steps-input'),
  maxValueInput:   document.getElementById('max-value-input'),
  safetyHint:      document.getElementById('safety-hint'),
  statStarts:      document.getElementById('stat-starts'),
  statNodes:       document.getElementById('stat-nodes'),
  statEdges:       document.getElementById('stat-edges'),
  statLongest:     document.getElementById('stat-longest'),
  statPeak:        document.getElementById('stat-peak'),
  statStep:        document.getElementById('stat-step'),
  statCurrentNode: document.getElementById('stat-current-node'),
  statHoverNode:   document.getElementById('stat-hover-node'),
  canvas:          document.getElementById('scene'),
  tooltip:         document.getElementById('hover-tooltip'),
  runsList:        document.getElementById('runs-list'),
  historyModal:    document.getElementById('history-modal'),
  historyCloseBtn: document.getElementById('history-close-btn'),
  historyDlBtn:    document.getElementById('history-download-btn'),
  historyTitle:    document.getElementById('history-title'),
  historyMeta:     document.getElementById('history-meta'),
  historyText:     document.getElementById('history-text'),
  scenePanel:      document.getElementById('scene-panel'),
};

const ctx = el.canvas.getContext('2d');

// ═══════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════
const state = {
  runs: [], nextRunId: 1, activeRunId: null,
  width: 0, height: 0, dpr: 1,
  speed: Number(el.speedRange.value) || 14,
  playing: true, lastTs: 0, tailFrames: 36,
  pointer: null, hovered: null, selectedRunForHistory: null,
  pendingBuild: null, buildQueue: [],
  globalMaxValue: 1n, globalMaxLog10: 0, globalMaxSteps: 1,
  distinctNodeCount: 0, distinctEdgeCount: 0,
};

// ═══════════════════════════════════════════════════════════════════
// KATEX HELPERS
// ═══════════════════════════════════════════════════════════════════
function kHtml(latex, display = false) {
  try {
    if (window.katex) return katex.renderToString(latex, { throwOnError: false, displayMode: display });
  } catch(_) {}
  return latex;
}

function kRender(el, latex, display = false) {
  try {
    if (window.katex) { katex.render(latex, el, { throwOnError: false, displayMode: display }); return; }
  } catch(_) {}
  el.textContent = latex;
}

// Safely render a polynomial (comma-sep coefficients) to LaTeX for display
function safeParsePolyForDisplay(str) {
  try {
    const cs = str.split(',').map(s => BigInt(s.trim()));
    return polyToLatex(cs);
  } catch(_) { return str; }
}

function polyToLatex(coeffs) {
  if (!coeffs || !coeffs.length) return '0';
  const terms = [];
  for (let i = coeffs.length - 1; i >= 0; i--) {
    const c = coeffs[i]; if (c === 0n) continue;
    if (i === 0) { terms.push(c.toString()); }
    else if (i === 1) { terms.push(c === 1n ? 'n' : c === -1n ? '-n' : `${c}n`); }
    else { terms.push(c === 1n ? `n^{${i}}` : c === -1n ? `-n^{${i}}` : `${c}n^{${i}}`); }
  }
  return terms.length ? terms.join(' + ').replace(/\+ -/g, '- ') : '0';
}

// ═══════════════════════════════════════════════════════════════════
// BIGINT MATH
// ═══════════════════════════════════════════════════════════════════
function absBig(n) { return n < 0n ? -n : n; }

function bigIntSqrt(n) {
  if (n <= 0n) return 0n;
  let x = n, y = (n + 1n) / 2n;
  while (y < x) { x = y; y = (x + n / x) / 2n; }
  return x;
}

function bigIntRoot(n, e) {
  if (e <= 0n) throw new Error('Root exponent must be ≥ 1');
  if (e === 1n) return n;
  if (n <= 0n) return 0n;
  if (e === 2n) return bigIntSqrt(n);
  const em1 = e - 1n;
  let x = n;
  while (true) {
    const xp = x ** em1;
    if (xp === 0n) break;
    const x1 = (em1 * x + n / xp) / e;
    if (x1 >= x) break;
    x = x1;
  }
  return x;
}

function bigIntLog(n, base) {
  if (n <= 0n) throw new Error('Log of non-positive');
  if (base <= 1n) throw new Error('Log base must be > 1');
  let r = 0n, v = base;
  while (v <= n) { r++; v *= base; }
  return r;
}

function gcdBig(a, b) {
  a = absBig(a); b = absBig(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

// ═══════════════════════════════════════════════════════════════════
// POLYNOMIAL UTILITIES
// ═══════════════════════════════════════════════════════════════════
function parsePolyCoeffs(str) {
  return str.split(',').map((s, i) => {
    const t = s.trim();
    if (!/^-?\d+$/.test(t)) throw new Error(`Invalid coefficient [${i}]: "${t}"`);
    return BigInt(t);
  });
}

function evalPolyDeriv(coeffs, n) {
  let r = 0n;
  for (let i = 1; i < coeffs.length; i++) r += BigInt(i) * coeffs[i] * n ** BigInt(i - 1);
  return r;
}

function evalPolyIntegral(coeffs, n) {
  let num = 0n, den = 1n;
  for (let i = 0; i < coeffs.length; i++) {
    const deg = BigInt(i + 1);
    num = num * deg + coeffs[i] * (n ** deg) * den;
    den *= deg;
    const g = gcdBig(absBig(num), den);
    if (g > 1n) { num /= g; den /= g; }
  }
  if (den === 0n) return 0n;
  let r = num / den;
  if (num < 0n && num % den !== 0n) r -= 1n;
  return r;
}

function polyToStr(coeffs) {
  if (!coeffs || !coeffs.length) return '0';
  const sup = ['⁰','¹','²','³','⁴','⁵','⁶','⁷','⁸','⁹'];
  const terms = [];
  for (let i = coeffs.length - 1; i >= 0; i--) {
    const c = coeffs[i]; if (c === 0n) continue;
    if (i === 0) { terms.push(c.toString()); }
    else if (i === 1) { terms.push(c === 1n ? 'n' : c === -1n ? '−n' : `${c}n`); }
    else {
      const exp = i < 10 ? sup[i] : `^${i}`;
      terms.push(c === 1n ? `n${exp}` : c === -1n ? `−n${exp}` : `${c}n${exp}`);
    }
  }
  return terms.length ? terms.join(' + ').replace(/\+ −/g, '− ') : '0';
}

// ═══════════════════════════════════════════════════════════════════
// OPERATION EVALUATOR
// ═══════════════════════════════════════════════════════════════════
function evalOp(n, opType, params) {
  try {
    switch (opType) {
      case 'linear': {
        const a = BigInt(params.a||'1'), b = BigInt(params.b||'0');
        const v = a*n+b;
        return { ok:true, value:v, calcStr:`${a}·${n} + ${b} = ${v}` };
      }
      case 'divide': {
        const d = BigInt(params.d||'2');
        if (d===0n) return { ok:false, error:'Divisor = 0' };
        const v = n/d;
        return { ok:true, value:v, calcStr:`⌊${n} ÷ ${d}⌋ = ${v}` };
      }
      case 'add': {
        const b = BigInt(params.b||'1');
        const v = n+b;
        return { ok:true, value:v, calcStr:`${n} + ${b} = ${v}` };
      }
      case 'subtract': {
        const b = BigInt(params.b||'1');
        const v = n-b;
        return { ok:true, value:v, calcStr:`${n} − ${b} = ${v}` };
      }
      case 'modulo': {
        const k = BigInt(params.k||'3');
        if (k===0n) return { ok:false, error:'Modulo by 0' };
        const v = n%k;
        return { ok:true, value:v, calcStr:`${n} mod ${k} = ${v}` };
      }
      case 'negate': {
        return { ok:true, value:-n, calcStr:`−(${n}) = ${-n}` };
      }
      case 'power': {
        const e = BigInt(params.e||'2');
        if (e<0n) return { ok:false, error:'Negative exponent' };
        if (n>1n && e>1n) {
          const ln = Math.log10(Number(n));
          if (Number(e)*(isFinite(ln)?ln:0) > 310)
            return { ok:false, error:'n^e too large', terminatedAs:'maxValue' };
        }
        const v = n**e;
        return { ok:true, value:v, calcStr:`${n}^${e} = ${v}` };
      }
      case 'root': {
        const e = BigInt(params.e||'2');
        if (e<=0n) return { ok:false, error:'Root exponent must be > 0' };
        if (n<0n) return { ok:false, error:'Root of negative' };
        const v = bigIntRoot(n,e);
        return { ok:true, value:v, calcStr:`⌊${e}√${n}⌋ = ${v}` };
      }
      case 'exponential': {
        const a = BigInt(params.a||'2');
        if (a===0n) return { ok:true, value:0n, calcStr:`0^${n}=0` };
        if (a===1n) return { ok:true, value:1n, calcStr:`1^${n}=1` };
        if (a<0n) return { ok:false, error:'Negative base' };
        const la = Math.log10(Number(a));
        if (isFinite(la) && Number(n)*la>310)
          return { ok:false, error:'a^n too large', terminatedAs:'maxValue' };
        const v = a**n;
        return { ok:true, value:v, calcStr:`${a}^${n} = ${v}` };
      }
      case 'log': {
        const b = BigInt(params.b||'2');
        if (b<=1n) return { ok:false, error:'Log base must be > 1' };
        if (n<=0n) return { ok:false, error:'Log of non-positive' };
        const v = bigIntLog(n,b);
        return { ok:true, value:v, calcStr:`⌊log_${b}(${n})⌋ = ${v}` };
      }
      case 'derivative': {
        const cs = parsePolyCoeffs(params.poly||'0,1');
        const v = evalPolyDeriv(cs,n);
        return { ok:true, value:v, calcStr:`d/dn[${polyToStr(cs)}] at ${n} = ${v}` };
      }
      case 'integral': {
        const cs = parsePolyCoeffs(params.poly||'1');
        const v = evalPolyIntegral(cs,n);
        return { ok:true, value:v, calcStr:`⌊∫₀^${n}(${polyToStr(cs)})dt⌋ = ${v}` };
      }
      case 'rational': {
        const a=BigInt(params.a||'1'), p=BigInt(params.p||'1');
        const b=BigInt(params.b||'1'), q=BigInt(params.q||'0'), c=BigInt(params.c||'1');
        if (p<0n||q<0n) return { ok:false, error:'Negative exponent in rational' };
        const denom = b*(n**q)+c;
        if (denom===0n) return { ok:false, error:'Denominator = 0' };
        const v = (a*(n**p))/denom;
        return { ok:true, value:v, calcStr:`⌊${a}·${n}^${p}/(${b}·${n}^${q}+${c})⌋ = ${v}` };
      }
      default: return { ok:false, error:`Unknown op: ${opType}` };
    }
  } catch(e) { return { ok:false, error:e.message }; }
}

// ═══════════════════════════════════════════════════════════════════
// NEXT VALUE
// ═══════════════════════════════════════════════════════════════════
function nextValue(n, config, maxValue) {
  const m = BigInt(config.modulus);
  const residue = ((n%m)+m)%m;
  const idx = Number(residue);
  const rule = config.rules[idx];
  if (!rule) return { ok:false, error:`No rule for residue ${idx}`, terminatedAs:'noRule' };
  const res = evalOp(n, rule.opType, rule.params);
  if (!res.ok) return { ...res, terminatedAs: res.terminatedAs||'evalError' };
  const next = res.value;
  if (next<0n) return { ok:false, error:'Negative value produced', terminatedAs:'negative' };
  if (maxValue && next>maxValue) return { ok:false, error:'Exceeded max value cap', terminatedAs:'maxValue' };
  return { ok:true, value:next, residue, modulus:m, ruleIdx:idx, opType:rule.opType, params:rule.params, calcStr:res.calcStr };
}

// ═══════════════════════════════════════════════════════════════════
// RULE BUILDER UI — redesigned with KaTeX
// ═══════════════════════════════════════════════════════════════════
const PRESET_MODULI = [2,3,4,5,6,7,8];

function applyModulus(m) {
  m = Math.max(2, Math.min(24, m|0));
  ruleConfig.modulus = m;
  while (ruleConfig.rules.length < m) {
    const i = ruleConfig.rules.length;
    ruleConfig.rules.push(i===0
      ? { opType:'divide',  params:{ d:'2' } }
      : { opType:'linear',  params:{ a:'3', b:'1' } }
    );
  }
  ruleConfig.rules.length = m;

  el.modulusBtnGroup.querySelectorAll('.mod-btn').forEach(b => {
    const mv = b.dataset.m;
    b.classList.toggle('active', mv===String(m) || (mv==='custom' && !PRESET_MODULI.includes(m)));
  });
  el.customModWrap.classList.toggle('hidden', PRESET_MODULI.includes(m));
  rebuildRuleCards();
}

function rebuildRuleCards() {
  el.rulesContainer.innerHTML = '';
  for (let r = 0; r < ruleConfig.modulus; r++) {
    el.rulesContainer.appendChild(createRuleCard(r));
  }
  updateFormulaPreview();
}

// ── Build one rule card ──────────────────────────────────────────
function createRuleCard(residue) {
  const m = ruleConfig.modulus;
  const rule = ruleConfig.rules[residue];
  const opDef = OP_BY_ID[rule.opType];

  const card = document.createElement('div');
  card.className = 'rule-card';
  card.dataset.residue = residue;
  card.dataset.activeCat = opDef ? opDef.cat : 'basic';

  // ── Header row ──────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'rule-card-header';

  const badge = document.createElement('span');
  badge.className = 'residue-badge';
  badge.innerHTML = `n ≡ <strong>${residue}</strong> <span class="mod-label">(mod ${m})</span>`;
  header.appendChild(badge);

  const opTag = document.createElement('span');
  opTag.className = 'active-op-tag';
  opTag.textContent = opDef ? opDef.label : rule.opType;
  header.appendChild(opTag);
  card.appendChild(header);

  // ── Active formula display (big KaTeX) ─────────────────────────
  const formulaWrap = document.createElement('div');
  formulaWrap.className = 'active-formula-wrap';

  const formulaEl = document.createElement('div');
  formulaEl.className = 'active-formula';
  formulaWrap.appendChild(formulaEl);
  card.appendChild(formulaWrap);

  // ── Op type selector ────────────────────────────────────────────
  const opSel = document.createElement('div');
  opSel.className = 'op-type-selector';

  const cats = [
    { id:'basic', label:'Basic Arithmetic' },
    { id:'power', label:'Power · Log' },
    { id:'calc',  label:'Calculus' }
  ];

  for (const cat of cats) {
    const ops = OP_DEFS.filter(o => o.cat === cat.id);
    if (!ops.length) continue;

    const grp = document.createElement('div');
    grp.className = 'op-cat-group';

    const lbl = document.createElement('span');
    lbl.className = 'op-cat-label';
    lbl.textContent = cat.label;
    grp.appendChild(lbl);

    const row = document.createElement('div');
    row.className = 'op-btn-row';

    for (const def of ops) {
      const btn = document.createElement('button');
      btn.className = 'op-btn' + (rule.opType === def.id ? ' active' : '');
      btn.dataset.op = def.id;
      btn.dataset.cat = def.cat;
      // Render compact KaTeX in button
      btn.innerHTML = kHtml(def.latexBtn, false);
      btn.title = def.label;
      btn.addEventListener('click', () => selectOp(residue, def.id, card));
      row.appendChild(btn);
    }
    grp.appendChild(row);
    opSel.appendChild(grp);
  }
  card.appendChild(opSel);

  // ── Params area ─────────────────────────────────────────────────
  const paramsArea = document.createElement('div');
  paramsArea.className = 'op-params-area';
  card.appendChild(paramsArea);

  // Render initial formula + params
  renderCardFormula(formulaEl, rule.opType, rule.params);
  renderParamInputs(residue, rule.opType, rule.params, paramsArea, formulaEl);

  return card;
}

// ── Render the big active formula at top of card ─────────────────
function renderCardFormula(formulaEl, opType, params) {
  const opDef = OP_BY_ID[opType];
  if (!opDef) { formulaEl.textContent = opType; return; }
  try {
    const latex = opDef.latexFull(params);
    kRender(formulaEl, latex, true);
  } catch(_) {
    formulaEl.textContent = opDef.label;
  }
}

// ── Switch the op for a residue ──────────────────────────────────
function selectOp(residue, opId, card) {
  const opDef = OP_BY_ID[opId];
  if (!opDef) return;

  const defaults = {};
  for (const p of opDef.params) defaults[p.k] = p.d;
  ruleConfig.rules[residue] = { opType: opId, params: defaults };

  // Update active button styling
  card.querySelectorAll('.op-btn').forEach(b => b.classList.toggle('active', b.dataset.op === opId));

  // Update card category accent
  card.dataset.activeCat = opDef.cat;

  // Update header tag
  const tag = card.querySelector('.active-op-tag');
  if (tag) tag.textContent = opDef.label;

  // Re-render formula + params
  const formulaEl = card.querySelector('.active-formula');
  const paramsArea = card.querySelector('.op-params-area');
  renderCardFormula(formulaEl, opId, defaults);
  renderParamInputs(residue, opId, defaults, paramsArea, formulaEl);
  updateFormulaPreview();
}

// ── Param inputs with live formula update ────────────────────────
function renderParamInputs(residue, opType, params, container, formulaEl) {
  const opDef = OP_BY_ID[opType];
  container.innerHTML = '';

  if (!opDef || opDef.params.length === 0) {
    container.innerHTML = '<span class="no-params">No parameters — this operation is fully determined.</span>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'params-grid';

  for (const pd of opDef.params) {
    const lbl = document.createElement('label');
    lbl.className = 'param-label';

    const spanEl = document.createElement('span');
    spanEl.textContent = pd.l;
    lbl.appendChild(spanEl);

    if (pd.k === 'poly') {
      const inp = document.createElement('input');
      inp.type = 'text'; inp.className = 'param-input poly-input';
      inp.value = params[pd.k] || pd.d;
      inp.placeholder = 'e.g. 0,1,1  →  n + n²';
      inp.spellcheck = false;

      const preview = document.createElement('div');
      preview.className = 'poly-preview';
      updatePolyPreview(inp.value, opType, preview);

      inp.addEventListener('input', () => {
        params[pd.k] = inp.value;
        updatePolyPreview(inp.value, opType, preview);
        if (formulaEl) renderCardFormula(formulaEl, opType, params);
        updateFormulaPreview();
      });
      lbl.appendChild(inp);
      lbl.appendChild(preview);
    } else {
      const inp = document.createElement('input');
      inp.type = 'text'; inp.className = 'param-input';
      inp.value = params[pd.k] || pd.d;
      inp.spellcheck = false;
      inp.addEventListener('input', () => {
        params[pd.k] = inp.value;
        if (formulaEl) renderCardFormula(formulaEl, opType, params);
        updateFormulaPreview();
      });
      lbl.appendChild(inp);
    }
    grid.appendChild(lbl);
  }
  container.appendChild(grid);

  if (opType === 'rational') {
    const diag = document.createElement('div');
    diag.className = 'rational-diagram';
    diag.innerHTML = `<span class="rational-formula">${kHtml('\\displaystyle\\left\\lfloor\\frac{a\\cdot n^{p}}{b\\cdot n^{q}+c}\\right\\rfloor', false)}</span>`;
    container.appendChild(diag);
  }
}

function updatePolyPreview(str, opType, previewEl) {
  try {
    const cs = parsePolyCoeffs(str);
    const polyStr = polyToStr(cs);
    if (opType === 'derivative') {
      const dcs = [];
      for (let i = 1; i < cs.length; i++) dcs.push(BigInt(i)*cs[i]);
      previewEl.textContent = `p(n) = ${polyStr}  →  p'(n) = ${polyToStr(dcs)||'0'}`;
    } else {
      previewEl.textContent = `p(t) = ${polyStr}`;
    }
    previewEl.className = 'poly-preview ok';
  } catch(e) {
    previewEl.textContent = `⚠ ${e.message}`;
    previewEl.className = 'poly-preview err';
  }
}

function updateFormulaPreview() {
  const m = ruleConfig.modulus;
  const lines = [`Modulus: n mod ${m}\n`];
  for (let r = 0; r < m; r++) {
    const rule = ruleConfig.rules[r];
    const opDef = OP_BY_ID[rule.opType];
    const label = opDef ? opDef.label : rule.opType;
    let paramStr = '';
    if (opDef && opDef.params.length > 0) {
      const parts = opDef.params.map(pd => `${pd.k}=${rule.params[pd.k]!==undefined ? rule.params[pd.k] : pd.d}`);
      paramStr = '  [' + parts.join(', ') + ']';
    }
    lines.push(`  n ≡ ${r} (mod ${m})  →  ${label}${paramStr}`);
  }
  el.formulaPreview.textContent = lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// MODULUS CONTROLS
// ═══════════════════════════════════════════════════════════════════
el.modulusBtnGroup.addEventListener('click', e => {
  const btn = e.target.closest('.mod-btn');
  if (!btn) return;
  if (btn.dataset.m === 'custom') {
    el.customModWrap.classList.remove('hidden');
    const v = parseInt(el.customModInput.value);
    if (v >= 2) applyModulus(v);
    el.customModInput.focus();
  } else {
    applyModulus(parseInt(btn.dataset.m));
  }
});
el.customModInput.addEventListener('input', () => {
  const v = parseInt(el.customModInput.value);
  if (v >= 2 && v <= 24) applyModulus(v);
});

// ═══════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════
function clamp(v,lo,hi) { return Math.max(lo, Math.min(hi, v)); }

function seededNoise(n) {
  const x = Math.sin(n*12.9898+78.233)*43758.5453123;
  return x - Math.floor(x);
}

function normalizeIntText(raw) { return String(raw||'').trim().replace(/[,_\s]/g,''); }

function formatBig(value) {
  const sign = value < 0n ? '-' : '';
  return sign + absBig(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtInt(value) {
  if (typeof value === 'bigint') return formatBig(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    if (Number.isInteger(value)) return formatBig(BigInt(value));
    return value.toLocaleString(undefined, { maximumFractionDigits:6 });
  }
  if (value==null) return '-';
  return String(value);
}

function fmtNode(v) { return v==null ? '-' : fmtInt(v); }
function setStatus(text) { el.status.textContent = text; }

function describeBigInt(value) {
  const text = absBig(value).toString();
  let log10Plus1 = 0;
  if (text !== '0') {
    if (text.length <= 15) { log10Plus1 = Math.log10(Number(text)+1); }
    else { log10Plus1 = Math.log10(Number(text.slice(0,15))) + (text.length-15); }
  }
  const head = Number(text.slice(0, Math.min(6,text.length))) || 0;
  const tail = Number(text.slice(Math.max(0,text.length-6))) || 0;
  const jitterSeed = (head*1e-6) + (tail*1e-9) + (text.length*0.173);
  return { log10Plus1, jitterSeed };
}

function deriveComputeBudgetMs(maxSteps) {
  return clamp(Math.round(maxSteps*COMPUTE_MS_FACTOR), MIN_COMPUTE_MS, MAX_COMPUTE_MS);
}

function parseBigIntInput(inputEl, label, opts={}) {
  const c = normalizeIntText(inputEl.value);
  if (!/^[+-]?\d+$/.test(c)) throw new Error(`${label} must be an integer.`);
  const v = BigInt(c);
  if (opts.min!==undefined && v<opts.min) throw new Error(`${label} must be ≥ ${fmtInt(opts.min)}.`);
  return v;
}

function parseIntegerInput(inputEl, label, opts={}) {
  const raw = Number(inputEl.value);
  if (!Number.isFinite(raw)||!Number.isInteger(raw)) throw new Error(`${label} must be an integer.`);
  if (opts.min!==undefined && raw<opts.min) throw new Error(`${label} must be ≥ ${opts.min}.`);
  if (opts.max!==undefined && raw>opts.max) throw new Error(`${label} must be ≤ ${opts.max}.`);
  return raw;
}

function readRunLimitsFromInputs() {
  const maxSteps = parseIntegerInput(el.maxStepsInput,'Max Steps',{min:1000,max:MAX_STEPS_CAP});
  const maxValue = parseBigIntInput(el.maxValueInput,'Max Value Cap',{min:2n});
  const maxComputeMs = deriveComputeBudgetMs(maxSteps);
  return { maxSteps, maxComputeMs, maxValue };
}

function shouldAutoFocus() { return !el.autoFocusCheck || el.autoFocusCheck.value !== 'off'; }

function focusScene(smooth=true) {
  if (!el.scenePanel) return;
  el.scenePanel.scrollIntoView({ behavior:smooth?'smooth':'auto', block:'start' });
}

function collapseAccordions() {
  const s = document.getElementById('safety-details');
  const h = document.getElementById('help-details');
  if (s) s.open = false;
  if (h) h.open = false;
}

// ═══════════════════════════════════════════════════════════════════
// SAFETY PROFILE
// ═══════════════════════════════════════════════════════════════════
function applySafetyProfile(key) {
  const profile = SAFETY_PROFILES[key] || SAFETY_PROFILES.balanced;
  if (key !== 'custom') {
    el.maxStepsInput.value = String(profile.maxSteps);
    el.maxValueInput.value = profile.maxValue;
  }
  updateSafetyHint();
}

function switchToCustom() { if (el.profileInput.value!=='custom') el.profileInput.value='custom'; }

function updateSafetyHint() {
  const key = el.profileInput.value||'balanced';
  const profile = SAFETY_PROFILES[key]||SAFETY_PROFILES.balanced;
  const maxSteps = Number(el.maxStepsInput.value)||DEFAULT_MAX_STEPS;
  const ms = deriveComputeBudgetMs(maxSteps);
  const cap = normalizeIntText(el.maxValueInput.value||'0');
  const prettyCap = /^[+-]?\d+$/.test(cap) ? fmtInt(BigInt(cap)) : el.maxValueInput.value;
  el.safetyHint.textContent = `${profile.label}: step cap ${fmtInt(maxSteps)}, value cap ${prettyCap}, compute budget ~${fmtInt(ms)} ms/run. ${profile.guidance}`;
}

function setPlayButton() {
  const running = state.runs.length>0 && state.playing;
  el.playBtn.textContent = running ? 'Pause (Space)' : 'Play (Space)';
  el.playBtn.classList.toggle('running', running);
}

function updateQueueLine() {
  const q = state.buildQueue.length;
  const id = state.pendingBuild ? state.pendingBuild.runId : null;
  if (id!==null && q>0) { el.queueLine.textContent = `Building run #${id}. ${q} run${q===1?'':'s'} queued next.`; }
  else if (id!==null) { el.queueLine.textContent = `Building run #${id}. Click Add Run to queue more.`; }
  else if (q>0) { el.queueLine.textContent = `${q} run${q===1?'':'s'} waiting in queue.`; }
  else { el.queueLine.textContent = 'Tip: click Random N + Add repeatedly to compare trajectories.'; }
}

// ═══════════════════════════════════════════════════════════════════
// RUN COLOR
// ═══════════════════════════════════════════════════════════════════
function createRunColor() {
  const h = Math.floor(Math.random()*360);
  return {
    hue: h,
    node(a) { return `hsla(${h},88%,66%,${a})`; },
    edge(a) { return `hsla(${h},92%,62%,${a})`; },
    ring(a) { return `hsla(${h},95%,78%,${a})`; },
    solid: `hsl(${h},88%,64%)`
  };
}

// ═══════════════════════════════════════════════════════════════════
// BUILD SYSTEM
// ═══════════════════════════════════════════════════════════════════
function createRunDraft(startN, config, runId, limits) {
  const desc = describeBigInt(startN);
  return {
    id:runId, startN,
    config: JSON.parse(JSON.stringify(config)),
    sequence:[startN], stepCalcs:[],
    nodes:[{value:startN,step:0,x:0,y:0,radius:2,log10Plus1:desc.log10Plus1,jitterSeed:desc.jitterSeed}],
    edges:[], steps:0, maxValue:absBig(startN), maxLog10:desc.log10Plus1,
    progress:0, endFrame:state.tailFrames, currentNodeValue:startN,
    color:createRunColor(), completed:false, convergedValue:null, terminated:'',
    maxStepsUsed:limits.maxSteps, maxComputeMsUsed:0, maxComputeMsBudget:limits.maxComputeMs, maxValueCap:limits.maxValue,
    cycleDetectedAt:null, cycleFirstStep:null, isBuilding:true
  };
}

function beginRunBuild(run, limits) {
  state.pendingBuild = {
    runId:run.id, n:run.startN,
    visited:new Set([run.startN.toString()]),
    step:0, startedAt:performance.now(), lastRelayoutStep:0,
    maxSteps:limits.maxSteps, maxComputeMs:limits.maxComputeMs, maxValue:limits.maxValue
  };
}

function finishRunBuild(run, job) {
  run.maxComputeMsUsed = Math.round(performance.now()-job.startedAt);
  run.steps = Math.max(0, run.sequence.length-1);
  const finalValue = run.sequence[run.sequence.length-1];
  run.currentNodeValue = run.sequence[0];
  if (run.convergedValue===null && finalValue===1n) run.convergedValue=1n;
  run.completed = run.convergedValue!==null;
  if (!run.completed && !run.terminated && run.steps>=job.maxSteps)
    run.terminated = run.cycleDetectedAt
      ? `step cap (${job.maxSteps}) after cycle at n=${fmtInt(run.cycleDetectedAt)}`
      : `step cap reached (${job.maxSteps})`;
  run.progress=0; run.endFrame=run.steps+state.tailFrames; run.isBuilding=false;
  state.pendingBuild=null;
  recomputeGlobalLayout(); renderRunsList(); updateQueueLine();
  const end = run.completed ? `converged to ${fmtInt(run.convergedValue)}` : `did not converge (${run.terminated})`;
  setStatus(`Run #${run.id} ready. steps=${fmtInt(run.steps)} | peak=${fmtInt(run.maxValue)} | ${end}`);
  if (state.buildQueue.length>0) startNextQueuedRun();
}

function processPendingBuild() {
  const job = state.pendingBuild; if (!job) return;
  const run = state.runs.find(r=>r.id===job.runId);
  if (!run) { state.pendingBuild=null; return; }

  const sliceStart = performance.now();
  let appended=0, finalized=false;

  while ((performance.now()-sliceStart)<BUILD_SLICE_MS) {
    if (job.n===1n) { run.convergedValue=1n; finalized=true; break; }
    if (job.step>=job.maxSteps) { finalized=true; break; }
    const elapsed = performance.now()-job.startedAt;
    if (elapsed>job.maxComputeMs) {
      run.terminated = `compute-time cap (${Math.round(elapsed)}ms > ${job.maxComputeMs}ms)`;
      finalized=true; break;
    }
    const transition = nextValue(job.n, run.config, job.maxValue);
    if (!transition.ok) { run.terminated=transition.error||'evaluation error'; finalized=true; break; }

    const next = transition.value;
    const isFixed = next===job.n;
    const desc = describeBigInt(next);

    if (run.stepCalcs.length < MAX_CALC_STEPS) {
      run.stepCalcs.push({ fromN:job.n, residue:transition.residue, modulus:transition.modulus, ruleIdx:transition.ruleIdx, opType:transition.opType, calcStr:transition.calcStr });
    }

    run.sequence.push(next);
    run.nodes.push({ value:next, step:run.sequence.length-1, x:0, y:0, radius:2, log10Plus1:desc.log10Plus1, jitterSeed:desc.jitterSeed });
    run.edges.push({ from:job.n, to:next, step:run.sequence.length-2 });

    job.step = run.sequence.length-1; job.n=next;
    run.steps=job.step; run.currentNodeValue=next; run.progress=run.steps; run.endFrame=run.steps+state.tailFrames;

    const mag = absBig(next);
    if (mag>run.maxValue) run.maxValue=mag;
    if (desc.log10Plus1>run.maxLog10) run.maxLog10=desc.log10Plus1;

    if (isFixed) { run.convergedValue=next; run.terminated=`fixed point at n=${fmtInt(next)}`; finalized=true; }
    else if (next!==1n && job.visited.has(next.toString())) {
      if (!run.cycleDetectedAt) { run.cycleDetectedAt=next; run.cycleFirstStep=run.steps; }
      run.terminated=`cycle detected at n=${fmtInt(next)}`; finalized=true;
    }
    job.visited.add(next.toString()); appended++;
    if (finalized) break;
  }

  run.maxComputeMsUsed = Math.round(performance.now()-job.startedAt);
  if (finalized) { finishRunBuild(run,job); return; }

  const needsRecompute = (run.maxValue>state.globalMaxValue)||(run.steps>state.globalMaxSteps)||(run.steps-job.lastRelayoutStep>=256);
  if (needsRecompute) { recomputeGlobalLayout(); job.lastRelayoutStep=run.steps; }
  else if (appended>0) { layoutRun(run); }

  if (appended>0) {
    if ((run.steps&511)===0) setStatus(`Generating run #${run.id}... step ${fmtInt(run.steps)}, n=${fmtInt(run.currentNodeValue)}, peak=${fmtInt(run.maxValue)}`);
    renderRunsList();
  }
}

function startNextQueuedRun() {
  if (state.pendingBuild||state.buildQueue.length===0) { updateQueueLine(); return; }
  const next = state.buildQueue.shift();
  for (const run of state.runs) {
    if (!run.isBuilding) { run.progress=run.endFrame; run.currentNodeValue=run.sequence[run.sequence.length-1]; }
  }
  const run = createRunDraft(next.startN, next.config, state.nextRunId++, next.limits);
  state.runs.push(run); state.activeRunId=run.id;
  beginRunBuild(run, next.limits);
  state.playing=true; state.lastTs=0;
  setPlayButton(); recomputeGlobalLayout(); renderRunsList(); updateQueueLine();
  setStatus(`Generating run #${run.id} from n=${fmtInt(run.startN)} | step-cap=${fmtInt(run.maxStepsUsed)} | value-cap=${fmtInt(run.maxValueCap)}`);
  drawScene();
}

// ═══════════════════════════════════════════════════════════════════
// LAYOUT
// ═══════════════════════════════════════════════════════════════════
function layoutRun(run) {
  const w=state.width, h=state.height;
  const maxLog=state.globalMaxLog10, maxSteps=Math.max(1,state.globalMaxSteps);
  const padX=Math.min(70,w*0.07), padTop=Math.min(42,h*0.08), padBot=Math.min(76,h*0.12);
  for (const node of run.nodes) {
    const xBase = maxLog===0 ? 0.5 : node.log10Plus1/maxLog;
    const rs = (seededNoise(run.id*0.71+node.step*0.013)-0.5)*0.028;
    const ls = (seededNoise(run.id*19.13+node.jitterSeed+node.step)-0.5)*0.024;
    const xNorm = clamp(xBase+rs+ls, 0.01, 0.99);
    node.x = padX+xNorm*(w-padX*2);
    node.y = padTop+(node.step/maxSteps)*(h-padTop-padBot);
    const l2 = node.log10Plus1/LOG10_2;
    node.radius = node.value===1n ? 6 : clamp(1.8+l2*0.24, 1.8, 5.2);
  }
}

function recomputeGlobalLayout() {
  if (!state.runs.length) {
    state.globalMaxValue=1n; state.globalMaxLog10=0; state.globalMaxSteps=1;
    state.distinctNodeCount=0; state.distinctEdgeCount=0; return;
  }
  let maxV=1n, maxL=0, maxS=1;
  const nodes=new Set(), edges=new Set();
  for (const run of state.runs) {
    if (run.maxValue>maxV) maxV=run.maxValue;
    if (run.maxLog10>maxL) maxL=run.maxLog10;
    if (run.steps>maxS) maxS=run.steps;
    for (const v of run.sequence) nodes.add(v.toString());
    for (let i=0;i<run.sequence.length-1;i++) edges.add(`${run.sequence[i]}->${run.sequence[i+1]}`);
  }
  state.globalMaxValue=maxV; state.globalMaxLog10=maxL; state.globalMaxSteps=maxS;
  state.distinctNodeCount=nodes.size; state.distinctEdgeCount=edges.size;
  for (const run of state.runs) { run.endFrame=run.steps+state.tailFrames; layoutRun(run); }
}

// ═══════════════════════════════════════════════════════════════════
// CANVAS RENDERING
// ═══════════════════════════════════════════════════════════════════
function getActiveRun() {
  if (!state.runs.length) return null;
  let a = state.runs.find(r=>r.id===state.activeRunId);
  if (a && a.progress<a.endFrame) return a;
  for (let i=state.runs.length-1;i>=0;i--) {
    if (state.runs[i].progress<state.runs[i].endFrame) { state.activeRunId=state.runs[i].id; return state.runs[i]; }
  }
  state.activeRunId=state.runs[state.runs.length-1].id;
  return state.runs[state.runs.length-1];
}

function findHoveredNode() {
  if (!state.pointer||!state.runs.length) return null;
  let best=null, bestDist=Infinity;
  for (let ri=state.runs.length-1;ri>=0;ri--) {
    const run=state.runs[ri];
    for (let ni=run.nodes.length-1;ni>=0;ni--) {
      const node=run.nodes[ni];
      if (run.progress-node.step<-2.8) continue;
      const dx=state.pointer.x-node.x, dy=state.pointer.y-node.y;
      const d2=dx*dx+dy*dy, hr=node.radius+6;
      if (d2<=hr*hr&&d2<bestDist) { bestDist=d2; best={run,node}; }
    }
  }
  return best;
}

function updateTooltip() {
  if (!state.hovered||!state.pointer) { el.tooltip.classList.add('hidden'); return; }
  const {run,node}=state.hovered;
  el.tooltip.innerHTML = `<strong>run #${run.id}</strong> &nbsp; n=${fmtInt(node.value)}<br>start=${fmtInt(run.startN)} &nbsp; step=${fmtInt(node.step)}/${fmtInt(run.steps)}`;
  el.tooltip.classList.remove('hidden');
  const margin=14, tw=el.tooltip.offsetWidth||170, th=el.tooltip.offsetHeight||42;
  const tx=clamp(state.pointer.x, margin+tw/2, state.width-margin-tw/2);
  const ty=clamp(state.pointer.y, margin+th+10, state.height-margin);
  el.tooltip.style.left=`${tx}px`; el.tooltip.style.top=`${ty}px`;
}

function updateStats() {
  if (!state.runs.length) {
    ['statStarts','statNodes','statEdges','statLongest','statPeak','statStep'].forEach(k=>el[k].textContent='0');
    el.statCurrentNode.textContent='-'; el.statHoverNode.textContent='-'; return;
  }
  const active=getActiveRun();
  const step=active?clamp(Math.floor(active.progress),0,active.steps):0;
  const cur=active?active.sequence[step]:null;
  el.statStarts.textContent=fmtInt(state.runs.length);
  el.statNodes.textContent=fmtInt(state.distinctNodeCount);
  el.statEdges.textContent=fmtInt(state.distinctEdgeCount);
  el.statLongest.textContent=fmtInt(state.globalMaxSteps);
  el.statPeak.textContent=fmtInt(state.globalMaxValue);
  el.statStep.textContent=active?`run #${active.id}: ${fmtInt(step)} / ${fmtInt(active.steps)}`:'0';
  el.statCurrentNode.textContent=fmtNode(cur);
  el.statHoverNode.textContent=fmtNode(state.hovered?.node?.value);
}

function drawBackground() {
  const w=state.width, h=state.height;
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'#0a223a'); g.addColorStop(1,'#07182c');
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(190,220,245,0.09)'; ctx.lineWidth=1;
  for (let i=1;i<8;i++) { ctx.beginPath(); ctx.moveTo(0,h/8*i); ctx.lineTo(w,h/8*i); ctx.stroke(); }
  for (let i=1;i<12;i++) { ctx.beginPath(); ctx.moveTo(w/12*i,0); ctx.lineTo(w/12*i,h); ctx.stroke(); }
}

function drawPlaceholder() {
  const w=state.width, h=state.height;
  ctx.fillStyle='rgba(223,240,255,0.88)';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font='700 24px "Plus Jakarta Sans",sans-serif';
  ctx.fillText('Add runs to overlay generalized cascade trajectories', w/2, h/2-14);
  ctx.font='600 15px "Source Sans 3",sans-serif';
  ctx.fillStyle='rgba(195,223,246,0.75)';
  ctx.fillText('Pick operations for each residue class, then click Add Run.', w/2, h/2+20);
}

function drawRun(run, isActive) {
  for (const edge of run.edges) {
    const fn=run.nodes[edge.step], tn=run.nodes[edge.step+1];
    if (!fn||!tn) continue;
    const local=run.progress-edge.step;
    if (local<-2.8) continue;
    const fade=clamp((local+2.8)/7.8,0,1);
    const wave=Math.exp(-Math.pow((local-1.0)/1.4,2));
    const alpha=clamp(0.03+0.40*fade+0.28*wave,0,1);
    ctx.strokeStyle=run.color.edge(alpha.toFixed(3));
    ctx.lineWidth=0.7+1.45*wave+(isActive?0.3:0);
    ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(fn.x,fn.y); ctx.lineTo(tn.x,tn.y); ctx.stroke();
  }
  for (const node of run.nodes) {
    const local=run.progress-node.step;
    if (local<-2.8) continue;
    const fade=clamp((local+2.8)/7.8,0,1);
    const wave=Math.exp(-Math.pow((local-0.6)/1.22,2));
    const alpha=clamp(0.10+0.72*fade+0.20*wave,0,1);
    const radius=node.radius*(1+0.34*wave);
    ctx.fillStyle=node.value===1n?'rgba(251,191,36,0.95)':run.color.node(alpha.toFixed(3));
    ctx.beginPath(); ctx.arc(node.x,node.y,radius,0,Math.PI*2); ctx.fill();
  }
}

function drawHud() {
  const active=getActiveRun(); if (!active) return;
  const step=clamp(Math.floor(active.progress),0,active.steps);
  const current=active.sequence[step];
  const cfg=active.config;
  ctx.fillStyle='rgba(230,242,255,0.97)';
  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.font='700 14px "Source Sans 3",sans-serif';
  const lines=[];
  lines.push(`run #${active.id}  frame ${step}/${active.steps}`);
  lines.push(`n = ${fmtInt(current)}`);
  const sc=active.stepCalcs[step];
  if (sc) {
    lines.push(`n mod ${sc.modulus} = ${sc.residue}  →  Rule ${sc.ruleIdx} (${OP_BY_ID[sc.opType]?.label||sc.opType})`);
    const cs=sc.calcStr.length>90?sc.calcStr.slice(0,87)+'…':sc.calcStr;
    lines.push(`  calc: ${cs}`);
  } else {
    const m=cfg.modulus;
    try {
      const r=Number(((current%BigInt(m))+BigInt(m))%BigInt(m));
      const rule=cfg.rules[r];
      const opDef=OP_BY_ID[rule?.opType];
      lines.push(`n mod ${m} = ${r}  →  Rule ${r} (${opDef?.label||rule?.opType||'?'})`);
    } catch(_) {}
  }
  if (active.isBuilding) lines.push(`building… step-cap ${fmtInt(active.maxStepsUsed)} | value-cap ${fmtInt(active.maxValueCap)}`);
  if (state.hovered) lines.push(`hover: run #${state.hovered.run.id}  n=${fmtInt(state.hovered.node.value)}`);
  lines.forEach((line,i) => ctx.fillText(line, 14, 12+i*22));
}

function drawScene() {
  drawBackground();
  if (!state.runs.length) {
    state.hovered=null; drawPlaceholder(); el.tooltip.classList.add('hidden'); updateStats(); return;
  }
  const active=getActiveRun();
  for (const run of state.runs) drawRun(run, Boolean(active&&run.id===active.id));
  if (active) {
    const as=clamp(Math.floor(active.progress),0,active.steps);
    const node=active.nodes[as];
    if (node) {
      const wave=0.55+0.45*Math.sin(performance.now()*0.0054);
      ctx.strokeStyle=active.color.ring((0.38+0.46*wave).toFixed(3));
      ctx.lineWidth=2.1;
      ctx.beginPath(); ctx.arc(node.x,node.y,node.radius+5+5*wave,0,Math.PI*2); ctx.stroke();
    }
  }
  state.hovered=findHoveredNode(); drawHud(); updateTooltip(); updateStats();
}

function resizeCanvas() {
  const rect=el.canvas.getBoundingClientRect();
  const dpr=Math.max(1,window.devicePixelRatio||1);
  state.width=rect.width; state.height=rect.height; state.dpr=dpr;
  el.canvas.width=Math.floor(rect.width*dpr);
  el.canvas.height=Math.floor(rect.height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  recomputeGlobalLayout(); drawScene();
}

// ═══════════════════════════════════════════════════════════════════
// RUNS LIST
// ═══════════════════════════════════════════════════════════════════
function ruleConfigSummary(cfg) {
  const m=cfg.modulus;
  const parts=cfg.rules.map((r,i)=>{
    const opDef=OP_BY_ID[r.opType];
    return `${i}:${opDef?opDef.label:r.opType}`;
  });
  return `mod ${m} [${parts.join(' | ')}]`;
}

function renderRunsList() {
  updateQueueLine();
  if (!state.runs.length) {
    el.runsList.innerHTML='<div class="run-item"><div class="run-main">No runs yet. Click Add Run.</div><div class="run-state">idle</div></div>';
    return;
  }
  const active=getActiveRun();
  const rows=[...state.runs].reverse().map(run=>{
    const isActive=active&&run.id===active.id;
    const stateText=run.isBuilding
      ?(state.playing?'building':'build paused')
      :(run.progress>=run.endFrame?'complete':(state.playing?'running':'paused'));
    const badge=run.isBuilding?'building'
      :run.completed?`→ ${fmtInt(run.convergedValue)}`
      :run.terminated?.includes('cycle')?'cycle':'truncated';
    const summary=ruleConfigSummary(run.config);
    return `<div class="run-item${isActive?' active':''}" data-run-id="${run.id}" title="Click to inspect full run history">
      <span class="run-swatch" style="background:${run.color.solid}"></span>
      <div class="run-main">#${run.id} &nbsp; n₀=${fmtInt(run.startN)} &nbsp; ${summary} &nbsp; (${badge})</div>
      <div class="run-state">${stateText}</div>
    </div>`;
  });
  el.runsList.innerHTML=rows.join('');
}

// ═══════════════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════════════
function buildHistoryText(run) {
  const lines=[];
  lines.push(`Run #${run.id}`);
  lines.push(`start_n = ${fmtInt(run.startN)}`);
  lines.push(`rule_system = ${ruleConfigSummary(run.config)}`);
  lines.push(`modulus = ${run.config.modulus}`);
  run.config.rules.forEach((r,i)=>{
    const opDef=OP_BY_ID[r.opType];
    const pStr=Object.entries(r.params).map(([k,v])=>`${k}=${v}`).join(', ');
    lines.push(`  residue_${i}: ${opDef?opDef.label:r.opType}  [${pStr}]`);
  });
  lines.push(`steps = ${run.steps}`);
  lines.push(`peak = ${fmtInt(run.maxValue)}`);
  lines.push(`completed = ${run.completed?'yes':'no'}`);
  if (run.convergedValue!=null) lines.push(`converged_to = ${fmtInt(run.convergedValue)}`);
  lines.push(`terminated = ${run.terminated||'n/a'}`);
  if (run.cycleDetectedAt!=null) lines.push(`cycle_at = ${fmtInt(run.cycleDetectedAt)}`);
  lines.push(`max_steps_cap = ${run.maxStepsUsed}`);
  lines.push(`max_value_cap = ${fmtInt(run.maxValueCap)}`);
  lines.push(`compute_time_ms = ${run.maxComputeMsUsed}`);
  lines.push(`step_calcs_stored = ${run.stepCalcs.length} (of ${run.steps} steps)`);
  lines.push('');
  if (run.stepCalcs.length>0) {
    lines.push('step\tn\tn mod m\tresidue\toperation\tcalculation\tnext_n');
    for (let i=0;i<run.sequence.length;i++) {
      const val=run.sequence[i];
      const sc=run.stepCalcs[i];
      if (sc) {
        const next=i+1<run.sequence.length?fmtInt(run.sequence[i+1]):'(end)';
        const opLabel=OP_BY_ID[sc.opType]?.label||sc.opType;
        lines.push(`${i}\t${fmtInt(val)}\tmod ${sc.modulus}\t≡${sc.residue}\t${opLabel}\t${sc.calcStr}\t→ ${next}`);
      } else { lines.push(`${i}\t${fmtInt(val)}\t(calc not stored)`); }
    }
  } else {
    lines.push('index\tvalue');
    for (let i=0;i<run.sequence.length;i++) lines.push(`${i}\t${fmtInt(run.sequence[i])}`);
  }
  return lines.join('\n');
}

function openHistoryModal(runId) {
  const run=state.runs.find(r=>r.id===runId); if (!run) return;
  state.selectedRunForHistory=run.id;
  el.historyTitle.textContent=`Run #${run.id} History`;
  const outcome=run.completed?`converged to ${fmtInt(run.convergedValue)}`:(run.terminated||'not completed');
  el.historyMeta.textContent=`n₀=${fmtInt(run.startN)} | steps=${fmtInt(run.steps)} | peak=${fmtInt(run.maxValue)} | ${outcome}`;
  el.historyText.value='Loading…';
  el.historyModal.classList.remove('hidden');
  setTimeout(()=>{ el.historyText.value=buildHistoryText(run); el.historyText.scrollTop=0; },0);
}

function closeHistoryModal() {
  state.selectedRunForHistory=null;
  el.historyModal.classList.add('hidden');
  el.historyText.value='';
}

function downloadHistory() {
  if (!state.selectedRunForHistory) return;
  const run=state.runs.find(r=>r.id===state.selectedRunForHistory); if (!run) return;
  const content=el.historyText.value||buildHistoryText(run);
  const blob=new Blob([content],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`cascade2_run_${run.id}.txt`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════
// ADD RUN
// ═══════════════════════════════════════════════════════════════════
function addRun(startN) {
  let limits;
  try { limits=readRunLimitsFromInputs(); }
  catch(err) { setStatus(err.message); return; }
  state.buildQueue.push({ startN, config:JSON.parse(JSON.stringify(ruleConfig)), limits });
  state.playing=true; state.lastTs=0;
  setPlayButton(); updateQueueLine();
  if (shouldAutoFocus()) { collapseAccordions(); focusScene(true); }
  if (!state.pendingBuild) { startNextQueuedRun(); }
  else { renderRunsList(); setStatus(`Queued run from n=${fmtInt(startN)}. ${state.buildQueue.length} in queue.`); drawScene(); }
}

function randomStart() { return BigInt(Math.floor(Math.random()*5000)+1); }

function resetAnimation() {
  if (!state.runs.length) return;
  for (const run of state.runs) { run.progress=0; run.currentNodeValue=run.sequence[0]; }
  state.activeRunId=state.runs[state.runs.length-1].id;
  state.playing=true; state.lastTs=0;
  setPlayButton(); renderRunsList();
  setStatus('Restarted animation for all runs.'); drawScene();
}

function globalReset() {
  state.runs=[]; state.activeRunId=null; state.pendingBuild=null;
  state.buildQueue=[]; state.playing=false; state.lastTs=0; state.hovered=null;
  closeHistoryModal(); setPlayButton();
  recomputeGlobalLayout(); renderRunsList(); updateQueueLine();
  setStatus('Cleared all runs.'); drawScene();
}

// ═══════════════════════════════════════════════════════════════════
// ANIMATION LOOP
// ═══════════════════════════════════════════════════════════════════
function tick(ts) {
  if (state.playing&&!state.pendingBuild&&state.buildQueue.length>0) startNextQueuedRun();
  if (state.playing&&state.pendingBuild) processPendingBuild();
  if (state.playing&&state.runs.length>0) {
    if (state.lastTs===0) state.lastTs=ts;
    const dt=(ts-state.lastTs)/1000; state.lastTs=ts;
    let anyAnimating=false;
    for (const run of state.runs) {
      if (run.isBuilding) { anyAnimating=true; continue; }
      if (run.progress<run.endFrame) {
        run.progress=Math.min(run.endFrame,run.progress+dt*state.speed);
        const idx=clamp(Math.floor(run.progress),0,run.steps);
        run.currentNodeValue=run.sequence[idx];
        if (run.progress<run.endFrame) anyAnimating=true;
      }
    }
    if (!anyAnimating) { state.playing=false; setPlayButton(); }
  } else { state.lastTs=ts; }
  drawScene();
  requestAnimationFrame(tick);
}

// ═══════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════
el.speedRange.addEventListener('input', ()=>{
  state.speed=Number(el.speedRange.value)||1;
  el.speedValue.textContent=`${state.speed}×`;
});

el.buildBtn.addEventListener('click', ()=>{
  try { addRun(parseBigIntInput(el.nInput,'Start N')); }
  catch(err) { setStatus(err.message); }
});

el.randomBtn.addEventListener('click', ()=>{
  const n=randomStart(); el.nInput.value=n.toString(); addRun(n);
});

el.playBtn.addEventListener('click', ()=>{
  if (!state.runs.length) return;
  state.playing=!state.playing; setPlayButton(); renderRunsList();
  setStatus(state.playing?'Animation resumed.':'Animation paused.');
});

el.resetBtn.addEventListener('click', resetAnimation);
el.globalResetBtn.addEventListener('click', globalReset);
if (el.focusSceneBtn) el.focusSceneBtn.addEventListener('click', ()=>focusScene(true));

el.nInput.addEventListener('keydown', e=>{
  if (e.key!=='Enter') return;
  try { addRun(parseBigIntInput(el.nInput,'Start N')); }
  catch(err) { setStatus(err.message); }
});

el.profileInput.addEventListener('change', ()=>applySafetyProfile(el.profileInput.value));
el.maxStepsInput.addEventListener('input', ()=>{ switchToCustom(); updateSafetyHint(); });
el.maxValueInput.addEventListener('input', ()=>{ switchToCustom(); updateSafetyHint(); });

el.runsList.addEventListener('click', e=>{
  const row=e.target.closest('.run-item[data-run-id]'); if (!row) return;
  const id=Number(row.getAttribute('data-run-id'));
  if (Number.isFinite(id)) openHistoryModal(id);
});

el.historyCloseBtn.addEventListener('click', closeHistoryModal);
el.historyDlBtn.addEventListener('click', downloadHistory);
el.historyModal.addEventListener('click', e=>{ if (e.target===el.historyModal) closeHistoryModal(); });

document.addEventListener('keydown', e=>{
  if (e.key==='Escape'&&!el.historyModal.classList.contains('hidden')) { closeHistoryModal(); return; }
  if (!el.historyModal.classList.contains('hidden')) return;
  if (e.code!=='Space') return;
  const tag=(e.target?.tagName||'').toLowerCase();
  if (['input','textarea','select','button'].includes(tag)) return;
  if (!state.runs.length) return;
  e.preventDefault();
  state.playing=!state.playing; setPlayButton(); renderRunsList();
  setStatus(state.playing?'Animation resumed.':'Animation paused.');
});

el.canvas.addEventListener('mousemove', e=>{
  const rect=el.canvas.getBoundingClientRect();
  state.pointer={x:e.clientX-rect.left, y:e.clientY-rect.top};
  state.hovered=findHoveredNode(); drawScene();
});
el.canvas.addEventListener('mouseleave', ()=>{
  state.pointer=null; state.hovered=null; el.tooltip.classList.add('hidden'); drawScene();
});
window.addEventListener('resize', resizeCanvas);

// ═══════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════
applySafetyProfile(el.profileInput.value||'balanced');
applyModulus(2);   // builds default Collatz rule cards
el.speedValue.textContent=`${state.speed}×`;
setPlayButton();
renderRunsList();
updateSafetyHint();
setStatus('Ready. Define your rule system, set n₀, then click Add Run.');
resizeCanvas();
requestAnimationFrame(tick);

})();
