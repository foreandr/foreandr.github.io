(function () {
  'use strict';

  // ── CONFIG ───────────────────────────────────────────────────────────────────
  const GEOJSON_PATH = './data/world.geojson';
  const PLAY_INTERVAL_MS = 900;

  // Category color dots (sidebar)
  const CATEGORY_COLOR = {
    Energy:     '#f59e0b',
    Metals:     '#38bdf8',
    Renewables: '#4ade80'
  };

  // Per-category map hue for choropleth coloring
  const CATEGORY_HUE = {
    Energy:     38,   // amber/gold
    Metals:     195,  // cyan/teal
    Renewables: 130   // green
  };

  // Source labels by resource id
  const SOURCE_LABELS = {
    oil_prod:      'BP Statistical Review of World Energy',
    gas_prod:      'BP Statistical Review of World Energy',
    coal_prod:     'BP Statistical Review of World Energy',
    nuclear_gen:   'BP Statistical Review of World Energy',
    hydro_gen:     'BP Statistical Review of World Energy',
    solar_gen:     'BP Statistical Review of World Energy',
    wind_gen:      'BP Statistical Review of World Energy',
    co2_energy:    'BP Statistical Review of World Energy',
    cobalt_prod:   'BP Statistical Review of World Energy',
    cobalt_res:    'BP Statistical Review of World Energy',
    lithium_prod:  'BP Statistical Review of World Energy',
    lithium_res:   'BP Statistical Review of World Energy',
    graphite_prod: 'BP Statistical Review of World Energy',
    graphite_res:  'BP Statistical Review of World Energy',
    ree_prod:      'BP Statistical Review of World Energy',
    ree_res:       'BP Statistical Review of World Energy',
    copper_prod:   'BGS World Mineral Statistics',
    gold_prod:     'BGS World Mineral Statistics',
    silver_prod:   'BGS World Mineral Statistics',
    iron_prod:     'BGS World Mineral Statistics',
    nickel_prod:   'BGS World Mineral Statistics',
    zinc_prod:     'BGS World Mineral Statistics',
    lead_prod:     'BGS World Mineral Statistics',
    pgm_prod:      'BGS World Mineral Statistics',
    bauxite_prod:  'BGS World Mineral Statistics',
    manganese_prod:'BGS World Mineral Statistics',
    chromium_prod: 'BGS World Mineral Statistics',
    phosphate_prod:'BGS World Mineral Statistics',
    potash_prod:   'BGS World Mineral Statistics',
    salt_prod:     'BGS World Mineral Statistics',
    diamond_prod:  'BGS World Mineral Statistics',
  };

  // ── STATE ────────────────────────────────────────────────────────────────────
  const state = {
    activeResourceId: 'oil_prod',
    activeYearIndex: 0,       // index into YEARS array (set after data loads)
    selectedIso3: null,
    playing: false,
    playTimer: null,
    svgReady: false,
    countryPaths: {},         // iso3 → SVGPathElement
    countryNames: {},         // iso3 → human name
    globalMaxByResource: {},  // resourceId → { year → max value }
    allRanks: {},             // resourceId → { year → { iso3 → rank } }
    YEARS: []                 // filled from RESOURCE_DATA.meta.years
  };

  // ── ELEMENT REFS ─────────────────────────────────────────────────────────────
  const el = {
    mapContainer:    document.getElementById('map-container'),
    mapLoading:      document.getElementById('map-loading'),
    resourceList:    document.getElementById('resource-list'),
    leadersBar:      document.getElementById('leaders-bar'),
    tooltip:         document.getElementById('tooltip'),
    legendGradient:  document.getElementById('legend-gradient'),
    legendLabelLow:  document.getElementById('legend-label-low'),
    legendLabelHigh: document.getElementById('legend-label-high'),
    legendUnit:      document.getElementById('legend-unit'),
    yearSlider:      document.getElementById('year-slider'),
    yearDisplay:     document.getElementById('year-display'),
    tlYears:         document.getElementById('tl-years'),
    playBtn:         document.getElementById('play-btn'),
    topSource:       document.getElementById('top-source'),
    detailsPlaceholder: document.getElementById('details-placeholder'),
    detailsContent:     document.getElementById('details-content'),
    detailsFlag:        document.getElementById('details-flag'),
    detailsName:        document.getElementById('details-name'),
    detailsIso:         document.getElementById('details-iso'),
    detailsHero:        document.getElementById('details-hero'),
    detailsYear:        document.getElementById('details-year'),
    detailsTable:       document.getElementById('details-table')
  };

  // ── UTILS ────────────────────────────────────────────────────────────────────
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function fmt(val) {
    if (val === null || val === undefined) return '—';
    if (val >= 1e6)  return (val / 1e6).toFixed(2) + 'M';
    if (val >= 1000) return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
    if (val >= 10)   return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (val >= 1)    return val.toLocaleString(undefined, { maximumFractionDigits: 3 });
    return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }

  function ordinal(n) {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // ── SPARSE YEAR LOOKUP ────────────────────────────────────────────────────────
  // resources.js stores only years with real data.
  // getVal returns the value for the exact year, or null if not present.
  function getVal(iso3, rid, year) {
    const c = window.RESOURCE_DATA.countries[iso3];
    if (!c) return null;
    const r = c[rid];
    if (!r) return null;
    const v = r[year];
    return (v !== undefined && v !== null) ? v : null;
  }

  // Find the nearest year with data at or before `year`, then at or after.
  function getNearestVal(iso3, rid, year) {
    const c = window.RESOURCE_DATA.countries[iso3];
    if (!c) return null;
    const r = c[rid];
    if (!r) return null;
    const ys = Object.keys(r).map(Number).sort((a, b) => a - b);
    if (!ys.length) return null;
    // Exact match
    if (r[year] !== undefined) return r[year];
    // Nearest (prefer earlier year for production data)
    let best = null, bestDist = Infinity;
    for (const y of ys) {
      const d = Math.abs(y - year);
      if (d < bestDist) { bestDist = d; best = r[y]; }
    }
    return best;
  }

  // ── FLAG EMOJI ───────────────────────────────────────────────────────────────
  const ISO3_TO_ISO2 = {
    AFG:'AF',ALB:'AL',DZA:'DZ',AGO:'AO',ARG:'AR',ARM:'AM',AUS:'AU',AUT:'AT',
    AZE:'AZ',BHS:'BS',BHR:'BH',BGD:'BD',BLR:'BY',BEL:'BE',BLZ:'BZ',BEN:'BJ',
    BTN:'BT',BOL:'BO',BIH:'BA',BWA:'BW',BRA:'BR',BRN:'BN',BGR:'BG',BFA:'BF',
    BDI:'BI',KHM:'KH',CMR:'CM',CAN:'CA',CAF:'CF',TCD:'TD',CHL:'CL',CHN:'CN',
    COL:'CO',COD:'CD',COG:'CG',CRI:'CR',CIV:'CI',HRV:'HR',CUB:'CU',CYP:'CY',
    CZE:'CZ',DNK:'DK',DJI:'DJ',DOM:'DO',ECU:'EC',EGY:'EG',SLV:'SV',GNQ:'GQ',
    ERI:'ER',EST:'EE',ETH:'ET',FJI:'FJ',FIN:'FI',FRA:'FR',GAB:'GA',GMB:'GM',
    GEO:'GE',DEU:'DE',GHA:'GH',GRC:'GR',GTM:'GT',GIN:'GN',GNB:'GW',GUY:'GY',
    HTI:'HT',HND:'HN',HUN:'HU',ISL:'IS',IND:'IN',IDN:'ID',IRN:'IR',IRQ:'IQ',
    IRL:'IE',ISR:'IL',ITA:'IT',JAM:'JM',JPN:'JP',JOR:'JO',KAZ:'KZ',KEN:'KE',
    PRK:'KP',KOR:'KR',KWT:'KW',KGZ:'KG',LAO:'LA',LVA:'LV',LBN:'LB',LSO:'LS',
    LBR:'LR',LBY:'LY',LTU:'LT',LUX:'LU',MDG:'MG',MWI:'MW',MYS:'MY',MDV:'MV',
    MLI:'ML',MLT:'MT',MRT:'MR',MUS:'MU',MEX:'MX',MDA:'MD',MNG:'MN',MNE:'ME',
    MAR:'MA',MOZ:'MZ',NAM:'NA',NPL:'NP',NLD:'NL',NZL:'NZ',NIC:'NI',NER:'NE',
    NGA:'NG',MKD:'MK',NOR:'NO',OMN:'OM',PAK:'PK',PAN:'PA',PNG:'PG',PRY:'PY',
    PER:'PE',PHL:'PH',POL:'PL',PRT:'PT',QAT:'QA',ROU:'RO',RUS:'RU',RWA:'RW',
    SAU:'SA',SEN:'SN',SRB:'RS',SLE:'SL',SOM:'SO',ZAF:'ZA',SSD:'SS',ESP:'ES',
    LKA:'LK',SDN:'SD',SUR:'SR',SWZ:'SZ',SWE:'SE',CHE:'CH',SYR:'SY',TWN:'TW',
    TJK:'TJ',TZA:'TZ',THA:'TH',TLS:'TL',TGO:'TG',TTO:'TT',TUN:'TN',TUR:'TR',
    TKM:'TM',UGA:'UG',UKR:'UA',ARE:'AE',GBR:'GB',USA:'US',URY:'UY',UZB:'UZ',
    VEN:'VE',VNM:'VN',YEM:'YE',ZMB:'ZM',ZWE:'ZW',HKG:'HK',
  };

  function flagEmoji(iso3) {
    const iso2 = ISO3_TO_ISO2[iso3];
    if (!iso2) return '🌐';
    return iso2.toUpperCase().replace(/./g, c =>
      String.fromCodePoint(c.charCodeAt(0) + 127397)
    );
  }

  // ── PRECOMPUTE RANKINGS ───────────────────────────────────────────────────────
  function precompute() {
    const data = window.RESOURCE_DATA;
    const resources = data.meta.resources;
    const countries = data.countries;
    const iso3s = Object.keys(countries);
    const YEARS = state.YEARS;

    for (const res of resources) {
      const rid = res.id;
      state.globalMaxByResource[rid] = {};
      state.allRanks[rid] = {};

      for (const year of YEARS) {
        const vals = [];
        for (const iso3 of iso3s) {
          const v = getNearestVal(iso3, rid, year);
          if (v !== null && v > 0) vals.push({ iso3, v });
        }
        vals.sort((a, b) => b.v - a.v);

        state.globalMaxByResource[rid][year] = vals.length ? vals[0].v : 0;

        const rankMap = {};
        let rank = 1;
        for (const entry of vals) {
          rankMap[entry.iso3] = { rank: rank++, total: vals.length };
        }
        state.allRanks[rid][year] = rankMap;
      }
    }
  }

  // ── SVG MAP ──────────────────────────────────────────────────────────────────
  function project(lon, lat, w, h) {
    const x = (lon + 180) / 360 * w;
    const latRad = lat * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(latRad / 2 + Math.PI / 4)) / Math.PI) / 2 * h;
    return [x, y];
  }

  function buildPathD(feature, w, h) {
    const geom = feature.geometry;
    if (!geom) return '';

    function ringToD(ring) {
      let d = '';
      for (let i = 0; i < ring.length; i++) {
        const [lon, lat] = ring[i];
        const [x, y] = project(lon, lat, w, h);
        d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2);
      }
      return d + 'Z';
    }

    function geomToD(g) {
      if (g.type === 'Polygon')      return g.coordinates.map(ringToD).join(' ');
      if (g.type === 'MultiPolygon') return g.coordinates.map(p => p.map(ringToD).join(' ')).join(' ');
      return '';
    }

    return geomToD(geom);
  }

  function buildSVG(geojson) {
    const container = el.mapContainer;
    const w = container.clientWidth  || 800;
    const h = container.clientHeight || 500;

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('id', 'world-svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const g = document.createElementNS(svgNS, 'g');
    svg.appendChild(g);

    for (const feature of geojson.features) {
      const props = feature.properties;
      let iso3 = props.ISO_A3;
      if (!iso3 || iso3 === '-99') iso3 = props.ADM0_A3;
      if (!iso3 || iso3 === '-99') continue;

      const name = props.NAME || props.ADMIN || iso3;
      state.countryNames[iso3] = name;

      const d = buildPathD(feature, w, h);
      if (!d) continue;

      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'country no-data');
      path.setAttribute('data-iso3', iso3);
      path.setAttribute('data-name', name);
      path.style.fill = '#142030';

      path.addEventListener('mouseenter', onCountryHover);
      path.addEventListener('mouseleave', onCountryLeave);
      path.addEventListener('mousemove',  onCountryMove);
      path.addEventListener('click',      onCountryClick);

      g.appendChild(path);
      state.countryPaths[iso3] = path;
    }

    el.mapContainer.appendChild(svg);
    el.mapLoading.style.display = 'none';
    state.svgReady = true;
  }

  // ── COLORING ─────────────────────────────────────────────────────────────────
  function resourceHue(resourceId) {
    const res = window.RESOURCE_DATA.meta.resources.find(r => r.id === resourceId);
    if (!res) return 38;
    return CATEGORY_HUE[res.category] || 38;
  }

  function valueToColor(v, globalMax, hue) {
    if (v === null || v === undefined || v <= 0 || globalMax === 0) return null;
    const t = clamp(v / globalMax, 0, 1);
    const lightness  = 18 + t * 42;
    const saturation = 28 + t * 62;
    return `hsl(${hue}, ${saturation.toFixed(0)}%, ${lightness.toFixed(0)}%)`;
  }

  function colorMap() {
    const rid     = state.activeResourceId;
    const year    = state.YEARS[state.activeYearIndex];
    const globalMax = state.globalMaxByResource[rid]?.[year] || 0;
    const hue     = resourceHue(rid);

    for (const iso3 in state.countryPaths) {
      const path = state.countryPaths[iso3];
      const v    = getNearestVal(iso3, rid, year);
      const color = valueToColor(v, globalMax, hue);

      if (color) {
        path.style.fill = color;
        path.classList.remove('no-data');
      } else {
        path.style.fill = '#142030';
        path.classList.add('no-data');
      }
    }

    updateLegend(rid, year, globalMax, hue);
    updateLeadersBar(rid, year);
    if (state.selectedIso3) updateDetailsPanel(state.selectedIso3);
  }

  // ── LEGEND ───────────────────────────────────────────────────────────────────
  function updateLegend(rid, year, globalMax, hue) {
    const res = window.RESOURCE_DATA.meta.resources.find(r => r.id === rid);
    const stops = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const l = 18 + t * 42;
      const s = 28 + t * 62;
      stops.push(`hsl(${hue}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`);
    }
    el.legendGradient.style.background =
      `linear-gradient(to right, #142030, ${stops.join(', ')})`;
    el.legendLabelLow.textContent  = 'low';
    el.legendLabelHigh.textContent = fmt(globalMax);
    el.legendUnit.textContent      = res ? res.unitShort : '';
  }

  // ── LEADERS BAR ──────────────────────────────────────────────────────────────
  function updateLeadersBar(rid, year) {
    const res   = window.RESOURCE_DATA.meta.resources.find(r => r.id === rid);
    const ranks = state.allRanks[rid]?.[year] || {};

    const leaders = Object.entries(ranks)
      .sort((a, b) => a[1].rank - b[1].rank)
      .slice(0, 5);

    let html = `<span class="leaders-label">Top ${res ? res.label : rid}:</span>`;
    for (const [iso3, { rank }] of leaders) {
      const name = state.countryNames[iso3] || iso3;
      const displayName = name.length > 14 ? iso3 : name;
      html += `<div class="leader-pill">
        <span class="leader-rank">${rank}</span>
        <span>${displayName}</span>
      </div>`;
    }
    if (res) html += `<span class="leaders-unit">(${res.unit})</span>`;

    el.leadersBar.innerHTML = html;
    el.topSource.textContent = SOURCE_LABELS[rid]
      ? `Source: ${SOURCE_LABELS[rid]}`
      : '';
  }

  // ── SIDEBAR ───────────────────────────────────────────────────────────────────
  function buildSidebar() {
    const resources = window.RESOURCE_DATA.meta.resources;
    const categories = {};
    for (const r of resources) {
      if (!categories[r.category]) categories[r.category] = [];
      categories[r.category].push(r);
    }

    let html = '';
    for (const [cat, items] of Object.entries(categories)) {
      const dotColor = CATEGORY_COLOR[cat] || '#aaa';
      html += `<div class="res-category"><div class="res-category-label">${cat}</div></div>`;
      for (const r of items) {
        const active = r.id === state.activeResourceId ? ' active' : '';
        html += `<div class="res-item${active}" data-rid="${r.id}">
          <span class="res-dot" style="background:${dotColor}"></span>
          <span>${r.label}</span>
        </div>`;
      }
    }
    el.resourceList.innerHTML = html;

    el.resourceList.addEventListener('click', e => {
      const item = e.target.closest('[data-rid]');
      if (!item) return;
      setActiveResource(item.dataset.rid);
    });
  }

  function setActiveResource(rid) {
    state.activeResourceId = rid;
    el.resourceList.querySelectorAll('.res-item').forEach(item => {
      item.classList.toggle('active', item.dataset.rid === rid);
    });
    if (state.svgReady) colorMap();
  }

  // ── TIMELINE ─────────────────────────────────────────────────────────────────
  function buildTimeline() {
    const YEARS = state.YEARS;
    // Show a label every N years to avoid crowding
    const step = YEARS.length > 30 ? 5 : YEARS.length > 15 ? 3 : 1;
    let html = '';
    for (let i = 0; i < YEARS.length; i++) {
      html += `<span style="opacity:${i % step === 0 ? 1 : 0}">${YEARS[i]}</span>`;
    }
    el.tlYears.innerHTML = html;
    el.yearSlider.max   = YEARS.length - 1;
    el.yearSlider.value = state.activeYearIndex;
    el.yearDisplay.textContent = YEARS[state.activeYearIndex];
  }

  function setYear(index) {
    state.activeYearIndex = clamp(index, 0, state.YEARS.length - 1);
    el.yearSlider.value    = state.activeYearIndex;
    el.yearDisplay.textContent = state.YEARS[state.activeYearIndex];
    if (state.svgReady) colorMap();
  }

  function startPlay() {
    state.playing = true;
    el.playBtn.innerHTML = '&#9646;&#9646;';
    el.playBtn.classList.add('playing');
    state.playTimer = setInterval(() => {
      setYear((state.activeYearIndex + 1) % state.YEARS.length);
    }, PLAY_INTERVAL_MS);
  }

  function stopPlay() {
    state.playing = false;
    el.playBtn.innerHTML = '&#9654;';
    el.playBtn.classList.remove('playing');
    clearInterval(state.playTimer);
    state.playTimer = null;
  }

  // ── TOOLTIP ───────────────────────────────────────────────────────────────────
  let tooltipIso3 = null;

  function onCountryHover(e) {
    tooltipIso3 = e.currentTarget.dataset.iso3;
    showTooltip(tooltipIso3, e.clientX, e.clientY);
  }
  function onCountryMove(e) {
    if (tooltipIso3) positionTooltip(e.clientX, e.clientY);
  }
  function onCountryLeave() {
    tooltipIso3 = null;
    el.tooltip.classList.add('hidden');
  }

  function showTooltip(iso3, cx, cy) {
    const rid  = state.activeResourceId;
    const year = state.YEARS[state.activeYearIndex];
    const res  = window.RESOURCE_DATA.meta.resources.find(r => r.id === rid);
    const v    = getNearestVal(iso3, rid, year);
    const name = state.countryNames[iso3] || iso3;
    const rankInfo = state.allRanks[rid]?.[year]?.[iso3];

    const valueStr = (v !== null && v > 0)
      ? fmt(v) + (res ? ' ' + res.unitShort : '')
      : 'no data';
    const rankStr = rankInfo
      ? `Rank ${ordinal(rankInfo.rank)} of ${rankInfo.total}`
      : '';

    el.tooltip.innerHTML = `
      <div class="tooltip-name">${name}</div>
      <div class="tooltip-value">${valueStr}</div>
      ${rankStr ? `<div class="tooltip-rank">${rankStr}</div>` : ''}
    `;
    el.tooltip.classList.remove('hidden');
    positionTooltip(cx, cy);
  }

  function positionTooltip(cx, cy) {
    const tt = el.tooltip;
    const w  = tt.offsetWidth  || 160;
    const h  = tt.offsetHeight || 60;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 14;
    let x = cx + 14;
    let y = cy - h / 2;
    if (x + w > vw - margin) x = cx - w - 14;
    if (y < margin)           y = margin;
    if (y + h > vh - margin)  y = vh - h - margin;
    tt.style.left = x + 'px';
    tt.style.top  = y + 'px';
  }

  // ── COUNTRY DETAILS ───────────────────────────────────────────────────────────
  function onCountryClick(e) {
    const iso3 = e.currentTarget.dataset.iso3;
    if (state.selectedIso3 && state.countryPaths[state.selectedIso3]) {
      state.countryPaths[state.selectedIso3].classList.remove('selected');
    }
    state.selectedIso3 = iso3;
    e.currentTarget.classList.add('selected');
    updateDetailsPanel(iso3);
  }

  function updateDetailsPanel(iso3) {
    const rid      = state.activeResourceId;
    const year     = state.YEARS[state.activeYearIndex];
    const resources = window.RESOURCE_DATA.meta.resources;
    const name     = state.countryNames[iso3] || iso3;

    el.detailsPlaceholder.style.display = 'none';
    el.detailsContent.classList.remove('hidden');

    el.detailsFlag.textContent = flagEmoji(iso3);
    el.detailsName.textContent = name;
    el.detailsIso.textContent  = iso3;

    // Hero card
    const activeRes  = resources.find(r => r.id === rid);
    const heroVal    = getNearestVal(iso3, rid, year);
    const heroRank   = state.allRanks[rid]?.[year]?.[iso3];
    el.detailsHero.innerHTML = `
      <div class="details-hero-resource">${activeRes ? activeRes.label : rid}</div>
      <div class="details-hero-value">${(heroVal !== null && heroVal > 0) ? fmt(heroVal) : '—'}</div>
      <div class="details-hero-unit">${activeRes ? activeRes.unit : ''}</div>
      ${heroRank
        ? `<div class="details-hero-rank">Ranked <strong>#${heroRank.rank}</strong> of ${heroRank.total} countries</div>`
        : `<div class="details-hero-rank">No data for this year</div>`}
    `;

    el.detailsYear.textContent = year;

    // Full resource table grouped by category
    const groups = {};
    for (const r of resources) {
      if (!groups[r.category]) groups[r.category] = [];
      groups[r.category].push(r);
    }

    let tableHtml = '';
    for (const [cat, items] of Object.entries(groups)) {
      tableHtml += `<div style="color:var(--text-muted);font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.08em;padding:8px 8px 2px">${cat}</div>`;
      for (const res of items) {
        const v        = getNearestVal(iso3, res.id, year);
        const isActive = res.id === rid;
        const gMax     = state.globalMaxByResource[res.id]?.[year] || 0;
        const barW     = (v && gMax) ? clamp(v / gMax * 100, 2, 100) : 0;
        const valStr   = (v !== null && v > 0) ? `${fmt(v)} ${res.unitShort}` : null;

        tableHtml += `<div class="dt-row${isActive ? ' active' : ''}" data-rid="${res.id}">
          <span class="dt-label">${res.label}</span>
          <div class="dt-bar-wrap"><div class="dt-bar" style="width:${barW.toFixed(1)}%"></div></div>
          <span class="dt-value${valStr ? '' : '" style="color:var(--text-muted)'}">${valStr || '—'}</span>
        </div>`;
      }
    }
    el.detailsTable.innerHTML = tableHtml;

    el.detailsTable.querySelectorAll('.dt-row[data-rid]').forEach(row => {
      row.addEventListener('click', () => setActiveResource(row.dataset.rid));
    });
  }

  // ── LOAD MAP ──────────────────────────────────────────────────────────────────
  function loadMap() {
    fetch(GEOJSON_PATH)
      .then(r => {
        if (!r.ok) throw new Error('GeoJSON fetch failed: ' + r.status);
        return r.json();
      })
      .then(geojson => {
        buildSVG(geojson);
        colorMap();
      })
      .catch(err => {
        el.mapLoading.textContent = 'Map failed to load: ' + err.message;
        console.error(err);
      });
  }

  function onResize() {
    const svg = document.getElementById('world-svg');
    if (!svg) return;
    svg.remove();
    Object.keys(state.countryPaths).forEach(k => delete state.countryPaths[k]);
    state.svgReady = false;
    el.mapLoading.style.display = '';
    loadMap();
  }

  // ── EVENTS ────────────────────────────────────────────────────────────────────
  el.yearSlider.addEventListener('input', () => {
    setYear(Number(el.yearSlider.value));
  });

  el.playBtn.addEventListener('click', () => {
    if (state.playing) stopPlay();
    else startPlay();
  });

  // ── BOOT ─────────────────────────────────────────────────────────────────────
  function init() {
    const data = window.RESOURCE_DATA;
    state.YEARS = data.meta.years;
    // Default to last year
    state.activeYearIndex = state.YEARS.length - 1;

    precompute();
    buildSidebar();
    buildTimeline();
    // Sync slider to last year
    el.yearSlider.value = state.activeYearIndex;
    el.yearDisplay.textContent = state.YEARS[state.activeYearIndex];
    loadMap();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(onResize, 300);
    });
  }

  init();
})();
