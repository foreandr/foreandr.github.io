// ── PRNG (seeded random for reproducible jitter) ─────────────────────────────
function makePRNG(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223 >>> 0;
    return s / 0xffffffff;
  };
}

// ── CONFIG ────────────────────────────────────────────────────────────────────
const CFG = {
  CHARS_MIN:    80,
  CHARS_MAX:   800,
  MIN_CHILDREN:  3,
  SKIP_TAGS:   new Set(['head', 'body']),
  FILTER_TAGS: new Set(['script', 'style', 'link']),
};

// ── SYNTHETIC DATA ────────────────────────────────────────────────────────────
const CARS = [
  { year:2019, make:'Honda',      model:'Civic LX',           price:12500, km:87,  desc:'One owner, e-tested & safetied, no accidents, Bluetooth, backup cam, winter tires included' },
  { year:2017, make:'Toyota',     model:'Camry SE',           price:14900, km:102, desc:'Excellent condition, heated seats, sunroof, clean Carfax, lane assist, adaptive cruise control' },
  { year:2020, make:'Mazda',      model:'CX-5 GS AWD',        price:21900, km:54,  desc:'Panoramic sunroof, Bose audio, heated seats & steering wheel, Apple CarPlay, no accidents' },
  { year:2018, make:'Ford',       model:'F-150 XLT 4x4',      price:29900, km:76,  desc:'Tow package, spray-in bed liner, remote start, running boards, very clean, no rust at all' },
  { year:2016, make:'BMW',        model:'328i xDrive',        price:18500, km:121, desc:'Sport line, Dakota leather, navigation, sunroof, heads-up display, full service history available' },
  { year:2021, make:'Hyundai',    model:'Tucson Preferred',   price:24500, km:34,  desc:'Like new, AWD, heated seats & steering, remote start, forward collision warning, blind spot monitoring' },
  { year:2015, make:'Subaru',     model:'Forester 2.5i',      price:11900, km:143, desc:'AWD, moonroof, heated seats, EyeSight safety suite, well maintained, no accidents, new all-seasons' },
  { year:2022, make:'Kia',        model:'Sportage EX',        price:27800, km:18,  desc:'Nearly new, panoramic roof, 360-degree camera, wireless CarPlay, ventilated seats, full warranty' },
  { year:2019, make:'Volkswagen', model:'Tiguan Comfortline', price:22400, km:67,  desc:'AWD, 3rd row seating, heated seats, digital dash, CarPlay, no accidents, one owner from new' },
  { year:2017, make:'Chevrolet',  model:'Equinox LT',         price:13200, km:108, desc:'AWD, backup camera, remote start, heated front seats, clean title, safetied, new brakes and tires' },
  { year:2020, make:'Nissan',     model:'Rogue SV',           price:19900, km:48,  desc:'AWD, ProPilot Assist, heated seats, motion-sensing liftgate, Bose premium audio, like new condition' },
  { year:2018, make:'Audi',       model:'Q5 Technik',         price:31500, km:89,  desc:'Quattro AWD, virtual cockpit, Bang & Olufsen audio, air suspension, panoramic roof, full service' },
  { year:2016, make:'Jeep',       model:'Grand Cherokee',     price:16800, km:134, desc:'4x4, leather interior, navigation, panoramic roof, tow package, remote start, winter-tested daily' },
  { year:2021, make:'Toyota',     model:'RAV4 XLE Hybrid',    price:28900, km:29,  desc:'AWD hybrid, great fuel economy, heated seats, Apple CarPlay, Toyota Safety Sense, spotless condition' },
];

function makeMetaStr(tag, cls, textArr, attrs) {
  return JSON.stringify({ tag, class: cls, text: textArr, attrs });
}

function buildTree(rng) {
  const listingNodes = CARS.map((car, i) => {
    const textArr = [
      `${car.year} ${car.make} ${car.model}`,
      `$${car.price.toLocaleString()}`,
      `${car.km}k km`,
      car.desc,
    ];
    const attrs = { 'data-id': String(1000 + i), 'data-price': String(car.price), 'data-year': String(car.year) };
    const meta = makeMetaStr('article', 'listing-card', textArr, attrs);
    return { id:`listing_${i}`, tag:'article', cls:'listing-card', textArr, attrs, metaLen:meta.length, children:[], raw:car };
  });

  function n(id, tag, cls, textArr, attrs, children) {
    const meta = makeMetaStr(tag, cls, textArr, attrs || {});
    return { id, tag, cls, textArr: textArr||[], attrs: attrs||{}, metaLen: meta.length, children: children||[] };
  }

  return n('html','html','',[], {}, [
    n('head','head','',[], {}, [
      n('title','title','',['AutoKijiji – Cars & Vehicles'], {}),
      n('meta1','meta','',[], { charset:'UTF-8', name:'viewport' }),
      n('style1','style','',['/* '+' '.repeat(180)+'css */'], {}),
      n('script1','script','',['(function(i,s,o){var f=s.getElementsByTagName(o)[0];'+'a'.repeat(60)+'})(window,document,"script")'], { src:'gtm.js' }),
    ]),
    n('body','body','',[], {}, [
      n('header_el','header','site-header',[], {}, [
        n('logo','div','logo',['AutoKijiji'], {}),
        n('nav_el','nav','main-nav',[], {}, [
          n('nav_post',  'a','nav-link',['Post Ad'],  { href:'/post' }),
          n('nav_browse','a','nav-link',['Browse'],   { href:'/browse' }),
          n('nav_login', 'a','nav-link',['Sign In'],  { href:'/login' }),
          n('nav_help',  'a','nav-link',['Help'],     { href:'/help' }),
        ]),
        n('searchbar','div','search-bar',[], {}, [
          n('srch_input','input','',[], { type:'text', placeholder:'Search listings...' }),
          n('srch_btn',  'button','btn-primary',['Search'], {}),
        ]),
      ]),
      n('main_el','main','content',[], {}, [
        n('listings_wrap','div','listings-wrapper',[], {}, [
          n('sort_bar','div','sort-bar',[], {}, [
            n('sort_lbl',  'span','',['Sort by:'],      {}),
            n('sort_rel',  'button','sort-btn active',['Relevance'], {}),
            n('sort_price','button','sort-btn',['Price ↑'], {}),
            n('count_lbl', 'span','result-count',['1,482 results'], {}),
          ]),
          n('listings_container','div','listings-grid',[], { 'data-total':'1482' }, listingNodes),
          n('pagination','div','pagination',[], {}, [
            n('pg_prev','button','pg-btn',['← Prev'], {}),
            n('pg_1',   'button','pg-btn active',['1'], {}),
            n('pg_2',   'button','pg-btn',['2'], {}),
            n('pg_3',   'button','pg-btn',['3'], {}),
            n('pg_next','button','pg-btn',['Next →'], {}),
          ]),
        ]),
        n('sidebar_el','aside','sidebar',[], {}, [
          n('filter_price','div','filter-group',['Price Range','Min $0','Max $50,000','Apply'], {}),
          n('filter_year', 'div','filter-group',['Year','2010','2024','Apply'], {}),
          n('filter_make', 'div','filter-group',['Make','Any','Toyota','Honda','Ford','BMW','Mazda','Apply'], {}),
          n('ad_banner',   'div','ad-unit',['Sponsored','Get Pre-Approved for Auto Financing Today! No impact to credit score. Fast 60-second approval.'], { 'data-ad':'true' }),
        ]),
      ]),
      n('footer_el','footer','site-footer',[], {}, [
        n('footer_copy','p','',['© 2024 AutoKijiji Inc. All rights reserved.'], {}),
        n('footer_nav','nav','footer-links',[], {}, [
          n('f_privacy','a','',['Privacy Policy'], { href:'/privacy' }),
          n('f_terms',  'a','',['Terms of Use'],   { href:'/terms' }),
          n('f_contact','a','',['Contact Us'],      { href:'/contact' }),
        ]),
      ]),
    ]),
  ]);
}

// ── ALGORITHM ENGINE ──────────────────────────────────────────────────────────

function flattenTree(root) {
  const nodes = {};
  const childIds = {};
  function walk(node, parentId) {
    nodes[node.id] = { ...node, children: undefined, parentId };
    childIds[node.id] = (node.children || []).map(c => c.id);
    (node.children || []).forEach(c => walk(c, node.id));
  }
  walk(root, null);
  return { nodes, childIds };
}

function calcStats(vals) {
  if (!vals.length) return null;
  const n = vals.length;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  // Binned mode (bin=20)
  const bins = {};
  vals.forEach(v => { const b = Math.round(v / 20) * 20; bins[b] = (bins[b] || 0) + 1; });
  const mode = +Object.entries(bins).sort((a, b) => b[1] - a[1])[0][0];
  const stdDev = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
  const min = sorted[0], max = sorted[n - 1];
  return { mean, median, mode, stdDev, min, max, range: max - min, count: n };
}

function runAlgorithm(tree) {
  const { nodes, childIds } = flattenTree(tree);

  // Build candidate list: every node with at least one child
  let candidates = Object.keys(childIds)
    .filter(id => childIds[id].length > 0)
    .map(id => ({
      nodeId: id,
      node: nodes[id],
      rawChildLens: childIds[id].map(cid => nodes[cid].metaLen),
      childTags: childIds[id].map(cid => nodes[cid].tag),
    }));

  // Filter steps — track each step for the UI
  const filterSteps = [];

  // Step 0: skip head/body
  let before = candidates.length;
  candidates = candidates.filter(c => !CFG.SKIP_TAGS.has(c.node.tag));
  filterSteps.push({ label: 'Skip head & body nodes', removed: before - candidates.length });

  // Step 1: remove if ALL children exceed CHARS_MAX
  before = candidates.length;
  candidates = candidates.filter(c => c.rawChildLens.some(l => l <= CFG.CHARS_MAX));
  filterSteps.push({ label: `All children > ${CFG.CHARS_MAX} chars`, removed: before - candidates.length });

  // Step 2: remove if ALL children below CHARS_MIN
  before = candidates.length;
  candidates = candidates.filter(c => c.rawChildLens.some(l => l >= CFG.CHARS_MIN));
  filterSteps.push({ label: `All children < ${CFG.CHARS_MIN} chars`, removed: before - candidates.length });

  // Step 3: remove script/style/link children
  candidates = candidates.map(c => ({
    ...c,
    filteredChildLens: c.rawChildLens.filter((_, i) => !CFG.FILTER_TAGS.has(c.childTags[i]))
  }));
  before = candidates.length;
  candidates = candidates.filter(c => c.filteredChildLens.length > 0);
  filterSteps.push({ label: 'Remove script/style/link children', removed: before - candidates.length });

  // Step 4: apply CHARS_MIN / CHARS_MAX window, require MIN_CHILDREN
  candidates = candidates.map(c => ({
    ...c,
    childLens: c.filteredChildLens.filter(l => l >= CFG.CHARS_MIN && l <= CFG.CHARS_MAX)
  }));
  before = candidates.length;
  candidates = candidates.filter(c => c.childLens.length >= CFG.MIN_CHILDREN);
  filterSteps.push({ label: `Fewer than ${CFG.MIN_CHILDREN} children in range`, removed: before - candidates.length });

  // Compute stats
  candidates = candidates.map(c => ({ ...c, stats: calcStats(c.childLens) }));

  // Score across 7 criteria
  const CRITERIA = [
    { key:'mean',    label:'Highest mean',    getter: s => s.mean,    higher:true },
    { key:'median',  label:'Highest median',  getter: s => s.median,  higher:true },
    { key:'mode',    label:'Highest mode',    getter: s => s.mode,    higher:true },
    { key:'range',   label:'Smallest range',  getter: s => s.range,   higher:false },
    { key:'stdDev',  label:'Lowest std dev',  getter: s => s.stdDev,  higher:false },
    { key:'min',     label:'Highest minimum', getter: s => s.min,     higher:true },
    { key:'count',   label:'Most children',   getter: s => s.count,   higher:true },
  ];

  const scores = {};
  candidates.forEach(c => { scores[c.nodeId] = 0; });

  const criteriaRows = CRITERIA.map(cr => {
    const sorted = [...candidates].sort((a, b) =>
      cr.higher ? cr.getter(b.stats) - cr.getter(a.stats)
               : cr.getter(a.stats) - cr.getter(b.stats));
    const winner = sorted[0].nodeId;
    scores[winner]++;
    return {
      ...cr,
      winner,
      values: Object.fromEntries(candidates.map(c => [c.nodeId, cr.getter(c.stats)])),
    };
  });

  // Find overall winner
  const winnerId = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  candidates.forEach(c => { c.totalScore = scores[c.nodeId]; });

  // Sort candidates: winner first, then by score desc
  candidates.sort((a, b) => b.totalScore - a.totalScore);

  const winnerCand = candidates.find(c => c.nodeId === winnerId);
  const winnerChildren = childIds[winnerId].map(cid => nodes[cid]);

  return { nodes, childIds, candidates, criteriaRows, winnerId, winnerCand, winnerChildren, filterSteps };
}

// ── RENDERERS ─────────────────────────────────────────────────────────────────

// ---- 1. HTML Tree ----
function getNodeStatus(nodeId, candidates, winnerId) {
  const node = candidates.find(c => c.nodeId === nodeId);
  if (nodeId === winnerId) return 'winner';
  if (node) return 'candidate';
  return 'default'; // we'll refine to skipped/filtered below
}

function renderTree(tree, candidates, winnerId) {
  const candidateIds = new Set(candidates.map(c => c.nodeId));

  function buildRow(node, depth) {
    const hasChildren = node.children && node.children.length > 0;
    const status = node.id === winnerId ? 'winner'
                 : candidateIds.has(node.id) ? 'candidate'
                 : CFG.SKIP_TAGS.has(node.tag) ? 'skipped'
                 : CFG.FILTER_TAGS.has(node.tag) ? 'filtered'
                 : 'default';

    const statusLabel = status === 'winner' ? 'WINNER'
                      : status === 'candidate' ? 'candidate'
                      : status === 'skipped' ? 'skipped'
                      : status === 'filtered' ? 'filtered'
                      : '';

    const wrap = document.createElement('div');
    wrap.className = `tree-node status-${status}`;
    wrap.dataset.nodeId = node.id;

    const row = document.createElement('div');
    row.className = 'tree-row';
    row.style.paddingLeft = (depth * 0) + 'px';

    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle';
    toggle.textContent = hasChildren ? '▶' : ' ';

    const tagSpan = document.createElement('span');
    tagSpan.className = 'tree-tag';
    tagSpan.textContent = `<${node.tag}>`;

    const clsSpan = document.createElement('span');
    clsSpan.className = 'tree-cls';
    clsSpan.textContent = node.cls ? `.${node.cls.split(' ')[0]}` : '';
    if (node.id && !node.id.startsWith('listing_')) {
      clsSpan.textContent += `#${node.id}`;
    }

    row.appendChild(toggle);
    row.appendChild(tagSpan);
    row.appendChild(clsSpan);

    if (statusLabel) {
      const badge = document.createElement('span');
      badge.className = 'tree-status-badge';
      badge.textContent = statusLabel;
      row.appendChild(badge);
    }

    wrap.appendChild(row);

    if (hasChildren) {
      const childrenDiv = document.createElement('div');
      childrenDiv.className = 'tree-children collapsed';

      // For listing_container children, show first 3 + summary
      const children = node.children;
      const MAX_SHOW = node.id === 'listings_container' ? 3 : children.length;
      children.slice(0, MAX_SHOW).forEach(child => {
        childrenDiv.appendChild(buildRow(child, depth + 1));
      });
      if (children.length > MAX_SHOW) {
        const more = document.createElement('div');
        more.style.cssText = 'padding:3px 4px 3px 22px; font-size:0.72rem; color:var(--text-muted); font-style:italic;';
        more.textContent = `… and ${children.length - MAX_SHOW} more ${children[0].tag} elements`;
        childrenDiv.appendChild(more);
      }

      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const collapsed = childrenDiv.classList.toggle('collapsed');
        toggle.textContent = collapsed ? '▶' : '▼';
      });
      row.addEventListener('click', () => toggle.click());

      wrap.appendChild(childrenDiv);
    }

    return wrap;
  }

  const container = document.getElementById('tree-container');
  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'tree-root';
  root.appendChild(buildRow(tree, 0));
  container.appendChild(root);

  // Expand top 2 levels by default
  container.querySelectorAll('.tree-node').forEach(el => {
    const depth = getDepth(el);
    if (depth <= 2) {
      const childDiv = el.querySelector(':scope > .tree-children');
      const toggle = el.querySelector(':scope > .tree-row .tree-toggle');
      if (childDiv && toggle) {
        childDiv.classList.remove('collapsed');
        toggle.textContent = '▼';
      }
    }
  });

  document.getElementById('expand-all-btn').onclick = () => {
    container.querySelectorAll('.tree-children').forEach(d => d.classList.remove('collapsed'));
    container.querySelectorAll('.tree-toggle').forEach(t => { if (t.textContent.trim()) t.textContent = '▼'; });
  };
  document.getElementById('collapse-all-btn').onclick = () => {
    container.querySelectorAll('.tree-children').forEach(d => d.classList.add('collapsed'));
    container.querySelectorAll('.tree-toggle').forEach(t => { if (t.textContent.trim()) t.textContent = '▶'; });
  };
}

function getDepth(el) {
  let d = 0, cur = el.parentElement;
  while (cur) { if (cur.classList.contains('tree-node')) d++; cur = cur.parentElement; }
  return d;
}

// ---- 2. Dot Plot ----
function renderDotPlot(candidates, winnerId) {
  const rng = makePRNG(42);

  const LABEL_W = 190;
  const RIGHT_PAD = 60;
  const ROW_H = 56;
  const TOP_PAD = 16;
  const AXIS_H = 44;
  const X_MAX = 500;
  const TOTAL_W = 900;
  const PLOT_W = TOTAL_W - LABEL_W - RIGHT_PAD;
  const TOTAL_H = TOP_PAD + candidates.length * ROW_H + AXIS_H;

  function xScale(v) { return LABEL_W + (Math.min(v, X_MAX) / X_MAX) * PLOT_W; }

  const ns = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, text) {
    const e = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (text !== undefined) e.textContent = text;
    return e;
  }

  const svg = el('svg', { viewBox:`0 0 ${TOTAL_W} ${TOTAL_H}`, 'aria-label':'Candidate dot plot' });

  candidates.forEach((cand, i) => {
    const rowY = TOP_PAD + i * ROW_H;
    const cy = rowY + ROW_H / 2;
    const isWinner = cand.nodeId === winnerId;
    const color = isWinner ? '#22c55e' : '#3b82f6';
    const { mean, stdDev, min, max, count } = cand.stats;

    const g = el('g', {});

    // Row bg tint for winner
    if (isWinner) {
      g.appendChild(el('rect', { x:0, y:rowY, width:TOTAL_W, height:ROW_H, fill:'rgba(34,197,94,0.06)' }));
    }

    // Std dev band
    const bandX1 = xScale(mean - stdDev);
    const bandX2 = xScale(mean + stdDev);
    g.appendChild(el('rect', {
      x: bandX1, y: rowY + 10,
      width: Math.max(0, bandX2 - bandX1),
      height: ROW_H - 20,
      fill: color, opacity: '0.12', rx: '4'
    }));

    // Min–max whisker
    g.appendChild(el('line', {
      x1: xScale(min), x2: xScale(max),
      y1: cy, y2: cy,
      stroke: color, 'stroke-width': '1', 'stroke-dasharray': '3,2', opacity: '0.5'
    }));

    // Mean tick
    g.appendChild(el('line', {
      x1: xScale(mean), x2: xScale(mean),
      y1: rowY + 8, y2: rowY + ROW_H - 8,
      stroke: color, 'stroke-width': '2.5', opacity: '0.9'
    }));

    // Dots
    cand.childLens.forEach((len, j) => {
      const jitter = (rng() - 0.5) * 22;
      const cx = xScale(len);
      const circle = el('circle', {
        cx, cy: cy + jitter, r: '4.5',
        fill: color, stroke: '#0f1117', 'stroke-width': '1', opacity: '0.82'
      });
      const title = document.createElementNS(ns, 'title');
      title.textContent = `${cand.nodeId} child ${j}: ${len} chars`;
      circle.appendChild(title);
      g.appendChild(circle);
    });

    // Row label
    const label = cand.nodeId.length > 22 ? cand.nodeId.slice(0, 21) + '…' : cand.nodeId;
    const labelEl = el('text', {
      x: LABEL_W - 10, y: cy + 4,
      'text-anchor': 'end',
      fill: isWinner ? '#22c55e' : '#9ca3af',
      'font-size': '11.5',
      'font-family': 'monospace',
      'font-weight': isWinner ? '700' : '400'
    }, label);
    g.appendChild(labelEl);

    // Stats annotation
    const statsText = `n=${count}  μ=${mean.toFixed(0)}  σ=${stdDev.toFixed(0)}`;
    g.appendChild(el('text', {
      x: TOTAL_W - RIGHT_PAD + 4, y: cy + 4,
      'text-anchor': 'start',
      fill: isWinner ? '#22c55e' : '#6b7280',
      'font-size': '10',
      'font-family': 'monospace'
    }, statsText));

    // Score badge (right edge)
    if (isWinner) {
      g.appendChild(el('text', {
        x: TOTAL_W - 4, y: cy - 8,
        'text-anchor': 'end',
        fill: '#22c55e',
        'font-size': '9',
        'font-family': 'sans-serif',
        'font-weight': '700'
      }, `WINNER (${cand.totalScore}/7)`));
    }

    svg.appendChild(g);
  });

  // X-axis
  const axisY = TOP_PAD + candidates.length * ROW_H + 6;
  svg.appendChild(el('line', { x1:LABEL_W, x2:LABEL_W+PLOT_W, y1:axisY, y2:axisY, stroke:'#2a2d3a' }));
  [0, 100, 200, 300, 400, 500].forEach(tick => {
    const tx = xScale(tick);
    svg.appendChild(el('line', { x1:tx, x2:tx, y1:axisY, y2:axisY+5, stroke:'#2a2d3a' }));
    svg.appendChild(el('text', {
      x:tx, y:axisY+18, 'text-anchor':'middle', fill:'#6b7280', 'font-size':'11', 'font-family':'monospace'
    }, tick === 500 ? '500+' : String(tick)));
  });
  svg.appendChild(el('text', {
    x: LABEL_W + PLOT_W/2, y: axisY + 36,
    'text-anchor': 'middle', fill: '#6b7280', 'font-size': '11', 'font-family': 'sans-serif'
  }, 'metadata char length'));

  const wrap = document.getElementById('dot-plot-container');
  wrap.innerHTML = '';
  wrap.appendChild(svg);
}

// ---- 3. Score Table ----
function renderScoreTable(candidates, criteriaRows, winnerId) {
  // Show only top candidates (max 6 for readability)
  const shown = candidates.slice(0, 6);
  const winnerIdx = shown.findIndex(c => c.nodeId === winnerId);

  const table = document.createElement('table');
  table.className = 'score-table';

  // Header
  const thead = table.createTHead();
  const hr = thead.insertRow();
  const thCrit = document.createElement('th');
  thCrit.textContent = 'Criterion';
  hr.appendChild(thCrit);
  shown.forEach((c, i) => {
    const th = document.createElement('th');
    th.textContent = c.nodeId.replace('_el','').replace('_container','_grid');
    if (c.nodeId === winnerId) { th.style.color = '#22c55e'; th.classList.add('col-winner'); }
    hr.appendChild(th);
  });

  // Body
  const tbody = table.createTBody();
  criteriaRows.forEach(cr => {
    const tr = tbody.insertRow();
    const td0 = tr.insertCell();
    td0.textContent = cr.label;
    td0.style.cssText = 'color:var(--text-dim); font-size:0.78rem;';

    shown.forEach(c => {
      const td = tr.insertCell();
      const val = cr.values[c.nodeId];
      const isWin = cr.winner === c.nodeId;
      td.textContent = val !== undefined ? (Number.isInteger(val) ? val : val.toFixed(1)) : '—';
      if (isWin) td.className = 'cell-winner';
      if (c.nodeId === winnerId) td.classList.add('col-winner');
    });
  });

  // Total row
  const tr = tbody.insertRow();
  tr.className = 'row-total';
  const td0 = tr.insertCell();
  td0.textContent = 'Total Score';
  shown.forEach(c => {
    const td = tr.insertCell();
    td.textContent = `${c.totalScore} / ${criteriaRows.length}`;
    if (c.nodeId === winnerId) { td.className = 'cell-winner col-winner'; }
  });

  const wrap = document.getElementById('score-table-container');
  wrap.innerHTML = '';
  const scrollWrap = document.createElement('div');
  scrollWrap.className = 'score-table-wrap';
  scrollWrap.appendChild(table);
  wrap.appendChild(scrollWrap);
}

// ---- 4. Extracted Cards ----
function renderCards(winnerCand, winnerChildren) {
  const header = document.getElementById('extracted-header');
  header.innerHTML = `
    <h3>Extracted from <code style="color:var(--accent-light)">${winnerCand.nodeId}</code></h3>
    <span class="winner-badge">✓ ${winnerChildren.length} items</span>
  `;

  const grid = document.getElementById('cards-grid');
  grid.innerHTML = '';

  winnerChildren.forEach(node => {
    const card = document.createElement('div');
    card.className = 'listing-card';

    const raw = node.raw;
    if (raw) {
      card.innerHTML = `
        <div class="car-title">${raw.year} ${raw.make} ${raw.model}</div>
        <div class="car-price">$${raw.price.toLocaleString()}</div>
        <div class="car-detail">${raw.km}k km</div>
        <div class="car-desc">${raw.desc}</div>
        <div class="meta-len">metadata: ${node.metaLen} chars</div>
      `;
    } else {
      const text = (node.textArr || []).join(' · ');
      card.innerHTML = `
        <div class="car-title">${text.slice(0, 60)}</div>
        <div class="meta-len">metadata: ${node.metaLen} chars</div>
      `;
    }
    grid.appendChild(card);
  });
}

// ---- 2. vis.js DOM Graph ----
function renderVisGraph(nodes, childIds, candidates, winnerId) {
  const candidateIds = new Set(candidates.map(c => c.nodeId));

  function nodeColor(id) {
    if (id === winnerId) return { background: '#22c55e', border: '#16a34a', highlight: { background: '#4ade80', border: '#16a34a' } };
    if (candidateIds.has(id)) return { background: '#3b82f6', border: '#2563eb', highlight: { background: '#60a5fa', border: '#2563eb' } };
    if (CFG.SKIP_TAGS.has(nodes[id].tag)) return { background: '#374151', border: '#4b5563', highlight: { background: '#4b5563', border: '#6b7280' } };
    if (CFG.FILTER_TAGS.has(nodes[id].tag)) return { background: '#7f1d1d', border: '#991b1b', highlight: { background: '#ef4444', border: '#991b1b' } };
    return { background: '#1e293b', border: '#334155', highlight: { background: '#334155', border: '#475569' } };
  }

  function nodeSize(id) {
    const ml = nodes[id].metaLen || 50;
    return Math.max(8, Math.min(36, 8 + Math.sqrt(ml) * 0.8));
  }

  const visNodes = Object.keys(nodes).map(id => ({
    id,
    label: nodes[id].tag + (nodes[id].cls ? '.' + nodes[id].cls.split(' ')[0] : ''),
    title: `<b>${id}</b><br>tag: ${nodes[id].tag}<br>class: ${nodes[id].cls || '—'}<br>metaLen: ${nodes[id].metaLen}`,
    color: nodeColor(id),
    size: nodeSize(id),
    font: { color: '#c9d1d9', size: 10, face: 'monospace' },
    borderWidth: id === winnerId ? 3 : 1,
  }));

  const visEdges = [];
  Object.entries(childIds).forEach(([parentId, children]) => {
    children.forEach(childId => {
      visEdges.push({
        from: parentId,
        to: childId,
        arrows: 'to',
        color: { color: '#2a2d3a', highlight: '#00e5ff', opacity: 0.6 },
        width: 1,
      });
    });
  });

  const container = document.getElementById('vis-graph-container');
  const data = {
    nodes: new vis.DataSet(visNodes),
    edges: new vis.DataSet(visEdges),
  };
  const options = {
    layout: { hierarchical: { enabled: true, direction: 'UD', sortMethod: 'directed', levelSeparation: 80, nodeSpacing: 60 } },
    physics: { enabled: false },
    interaction: { hover: true, tooltipDelay: 100, navigationButtons: false, zoomView: true },
    nodes: { shape: 'dot' },
    edges: { smooth: { type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.4 } },
  };
  new vis.Network(container, data, options);
}

// ---- Filter steps sidebar ----
function renderFilterSteps(filterSteps) {
  const el = document.getElementById('filter-steps');
  el.innerHTML = '';
  filterSteps.forEach(step => {
    const row = document.createElement('div');
    row.className = 'config-row';
    row.innerHTML = `<span>${step.label}</span><strong style="color:${step.removed > 0 ? 'var(--c-filtered)' : 'var(--text-muted)'}">−${step.removed}</strong>`;
    el.appendChild(row);
  });
}

// ── DOM → TREE CONVERTER (for uploaded HTML files) ───────────────────────────

/**
 * Walk a real browser DOM element and convert it into the same node shape
 * used by the synthetic buildTree / runAlgorithm pipeline.
 *
 * The id we assign is a stable path-based string so that the vis-graph and
 * tree renderer can reference nodes without collisions.
 */
function domToTree(el, path) {
  path = path || '0';
  const tag = el.tagName ? el.tagName.toLowerCase() : 'unknown';
  const cls = (el.className && typeof el.className === 'string') ? el.className.trim() : '';

  // Collect text content directly inside this element (not nested)
  const textArr = [];
  el.childNodes.forEach(cn => {
    if (cn.nodeType === Node.TEXT_NODE) {
      const t = cn.textContent.trim();
      if (t) textArr.push(t);
    }
  });

  // Collect meaningful attributes (exclude class, style — already captured)
  const attrs = {};
  if (el.attributes) {
    Array.from(el.attributes).forEach(a => {
      if (a.name !== 'class' && a.name !== 'style') {
        attrs[a.name] = a.value.slice(0, 120); // cap long values
      }
    });
  }

  const metaStr = makeMetaStr(tag, cls, textArr, attrs);

  // Recurse into element children only (skip text/comment nodes)
  const elementChildren = Array.from(el.children || []);
  const children = elementChildren.map((child, i) =>
    domToTree(child, `${path}_${i}`)
  );

  return {
    id:       path,
    tag,
    cls,
    textArr,
    attrs,
    metaLen:  metaStr.length,
    children,
    raw:      null,
  };
}

/**
 * Parse raw HTML text and return a synthetic tree rooted at the <html> node
 * (or at a wrapper if the parser produces a fragment).
 */
function htmlStringToTree(htmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  return domToTree(doc.documentElement, 'html');
}

// ── UPLOAD PIPELINE ───────────────────────────────────────────────────────────

function runFromTree(tree) {
  const result = runAlgorithm(tree);
  renderTree(tree, result.candidates, result.winnerId);
  renderVisGraph(result.nodes, result.childIds, result.candidates, result.winnerId);
  renderDotPlot(result.candidates, result.winnerId);
  renderScoreTable(result.candidates, result.criteriaRows, result.winnerId);
  renderCards(result.winnerCand, result.winnerChildren);
  renderFilterSteps(result.filterSteps);
  document.getElementById('winner-summary').textContent =
    `Winner: ${result.winnerId}  (${result.winnerCand.stats.count} children, score ${result.winnerCand.totalScore}/7)`;
}

function setUploadStatus(msg, cls) {
  const el = document.getElementById('upload-status');
  el.textContent = msg;
  el.className = 'upload-status ' + (cls || '');
}

function processHtmlFile(file) {
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'html' && ext !== 'htm' && file.type !== 'text/html') {
    setUploadStatus('Not an HTML file.', 'error');
    return;
  }
  setUploadStatus(`Reading "${file.name}" …`, 'loading');
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const tree = htmlStringToTree(e.target.result);
      runFromTree(tree);
      setUploadStatus(`Loaded "${file.name}"`, 'success');
      document.getElementById('drop-zone-text').textContent = file.name;
    } catch (err) {
      console.error(err);
      setUploadStatus('Failed to parse HTML.', 'error');
    }
  };
  reader.onerror = () => setUploadStatus('File read error.', 'error');
  reader.readAsText(file);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
let currentSeed = 1;

function run(seed) {
  const rng = makePRNG(seed);
  const tree = buildTree(rng);
  runFromTree(tree);
}

document.addEventListener('DOMContentLoaded', () => {
  // Synthetic demo
  document.getElementById('regen-btn').addEventListener('click', () => {
    currentSeed = (Date.now() % 99999) + 1;
    setUploadStatus('');
    document.getElementById('drop-zone-text').textContent = 'Drop .html file anywhere in this bar';
    run(currentSeed);
  });
  run(currentSeed);

  // ── File picker ──
  const fileInput = document.getElementById('html-file-input');
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      processHtmlFile(fileInput.files[0]);
      fileInput.value = ''; // reset so same file can be re-picked
    }
  });

  // ── Drag & drop on the whole upload bar ──
  const uploadBar = document.getElementById('upload-bar');

  // Also accept drops on the whole page (convenience)
  [uploadBar, document.body].forEach(target => {
    target.addEventListener('dragenter', (e) => {
      e.preventDefault();
      uploadBar.classList.add('drag-over');
    });
    target.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      uploadBar.classList.add('drag-over');
    });
    target.addEventListener('dragleave', (e) => {
      // Only clear when truly leaving the bar (not moving between children)
      if (!uploadBar.contains(e.relatedTarget)) {
        uploadBar.classList.remove('drag-over');
      }
    });
    target.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadBar.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) processHtmlFile(file);
    });
  });
});
