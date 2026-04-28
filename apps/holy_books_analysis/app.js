/* ── Sacred Texts Dashboard ─ app.js ── */
"use strict";

const D = HOLY_DATA;

// ── 21-book color palette ──────────────────────────────────────────────────
const BOOK_COLORS = {
  "Gospels":                   "#e8a04a",
  "Quran":                     "#7db5e0",
  "Tanakh":                    "#a07de8",
  "Talmud":                    "#c87de8",
  "Bhagavad Gita":             "#e87d7d",
  "Rig Veda":                  "#e8b47d",
  "Upanishads":                "#e8d07d",
  "Vedanta Sutras":            "#b8e87d",
  "Mahabharata":               "#7de8a0",
  "Ramayana":                  "#7de8d0",
  "Analects":                  "#7dc8e8",
  "Chin Kang Ching":           "#7d9ee8",
  "Tao Teh King":              "#9d7de8",
  "Iliad":                     "#e87da0",
  "Odyssey":                   "#e87dc8",
  "Hesiod":                    "#e8c87d",
  "Republic":                  "#a0e87d",
  "Babylonian Legends":        "#e8e07d",
  "Hammurabi":                 "#7de8c8",
  "Egyptian Book of the Dead": "#d0a07d",
  "Elements":                  "#a8c8e8",
};

function bookColor(b) {
  return BOOK_COLORS[b] || "#888888";
}

const ALPHA = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, "0");

// ── Active books state ─────────────────────────────────────────────────────
let ACTIVE_BOOKS = [...D.books];

function getActive() { return ACTIVE_BOOKS.filter(b => D.books.includes(b)); }

// ── Chart.js global defaults ───────────────────────────────────────────────
Chart.defaults.color = "#8a7f6e";
Chart.defaults.borderColor = "#2e2b24";
Chart.defaults.font.family = "'JetBrains Mono', monospace";
Chart.defaults.font.size = 11;

const chartInstances = {};
function makeChart(id, config) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  chartInstances[id] = new Chart(ctx, config);
  return chartInstances[id];
}

// ── Book selector bar ──────────────────────────────────────────────────────
function buildBookBar() {
  const groups = document.getElementById("book-groups");
  groups.innerHTML = "";
  Object.entries(D.categories).forEach(([cat, books]) => {
    const grpEl = document.createElement("div");
    grpEl.className = "book-group";
    grpEl.innerHTML = `<span class="group-label">${cat}</span><div class="book-toggles" data-cat="${cat}"></div>`;
    const togglesEl = grpEl.querySelector(".book-toggles");
    books.forEach(b => {
      const btn = document.createElement("button");
      btn.className = "book-toggle" + (ACTIVE_BOOKS.includes(b) ? " active" : "");
      btn.dataset.book = b;
      const col = bookColor(b);
      btn.style.color = col;
      btn.innerHTML = `<span class="dot"></span>${b}`;
      btn.addEventListener("click", () => {
        const idx = ACTIVE_BOOKS.indexOf(b);
        if (idx >= 0) { ACTIVE_BOOKS.splice(idx, 1); btn.classList.remove("active"); }
        else           { ACTIVE_BOOKS.push(b); btn.classList.add("active"); }
        // preserve order
        ACTIVE_BOOKS.sort((a, z) => D.books.indexOf(a) - D.books.indexOf(z));
        onBooksChanged();
      });
      togglesEl.appendChild(btn);
    });
    groups.appendChild(grpEl);
  });
}

function updateBookBarCount() {
  const n = getActive().length;
  document.getElementById("active-count").textContent = `${n} book${n !== 1 ? "s" : ""} active`;
  document.getElementById("toggle-count").textContent = `(${n} active)`;
  const footer = document.getElementById("footer-count");
  if (footer) footer.textContent = `${D.books.length} texts available`;
}

document.getElementById("book-bar-toggle").addEventListener("click", function() {
  this.classList.toggle("open");
  document.getElementById("book-bar-panel").classList.toggle("open");
});

window.bookBarSelectAll = function() {
  ACTIVE_BOOKS = [...D.books];
  document.querySelectorAll(".book-toggle").forEach(b => b.classList.add("active"));
  onBooksChanged();
};
window.bookBarClearAll = function() {
  ACTIVE_BOOKS = [];
  document.querySelectorAll(".book-toggle").forEach(b => b.classList.remove("active"));
  onBooksChanged();
};

const PRESETS = {
  abrahamic: ["Gospels", "Quran", "Tanakh", "Talmud"],
  hindu:     ["Bhagavad Gita", "Rig Veda", "Upanishads", "Vedanta Sutras", "Mahabharata", "Ramayana"],
  greek:     ["Iliad", "Odyssey", "Hesiod", "Republic"],
  asian:     ["Analects", "Chin Kang Ching", "Tao Teh King"],
};
window.bookBarPreset = function(key) {
  const preset = PRESETS[key] || [];
  ACTIVE_BOOKS = preset.filter(b => D.books.includes(b));
  document.querySelectorAll(".book-toggle").forEach(btn => {
    btn.classList.toggle("active", ACTIVE_BOOKS.includes(btn.dataset.book));
  });
  onBooksChanged();
};

function onBooksChanged() {
  updateBookBarCount();
  populateSelectors();
  const active = document.querySelector(".tab.active");
  if (active) renderActiveTab(active.dataset.tab);
}

// ── Populate book dropdowns ────────────────────────────────────────────────
function populateSelect(id, selected) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const prev = selected || sel.value;
  const books = getActive();
  sel.innerHTML = books.map(b => `<option value="${b}">${b}</option>`).join("");
  if (books.includes(prev)) sel.value = prev;
}

function populateSelectors() {
  const books = getActive();
  populateSelect("vocab-book-select");
  populateSelect("phrase-book-select");
  populateSelect("starters-book-select");
  populateSelect("sim-book1", books[0]);
  populateSelect("sim-book2", books[1] || books[0]);

  // sacred term select
  const termSel = document.getElementById("sacred-term-select");
  if (termSel && D.divine_names[books[0]]) {
    const prev = termSel.value;
    const names = Object.keys(D.divine_names[books[0]]);
    termSel.innerHTML = `<option value="all">All Terms</option>` +
      names.map(n => `<option value="${n}">${n}</option>`).join("");
    if (names.includes(prev) || prev === "all") termSel.value = prev || "all";
  }
}

// ── Tab switching ──────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    const panel = document.getElementById("tab-" + btn.dataset.tab);
    if (panel) panel.classList.add("active");
    renderActiveTab(btn.dataset.tab);
  });
});

function renderActiveTab(tab) {
  switch(tab) {
    case "overview":    renderOverview();    break;
    case "vocabulary":  renderVocabulary();  break;
    case "phrases":     renderPhrases();     break;
    case "sacred":      renderSacred();      break;
    case "similarity":  renderSimilarity();  break;
    case "style":       renderStyle();       break;
    case "sentiment":   renderSentiment();   break;
    case "distinctive": renderDistinctive(); break;
  }
}

// ── Bar opts helper ────────────────────────────────────────────────────────
function barOpts(yLabel, min, max) {
  return {
    responsive: true, maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: "#2e2b2440" } },
      y: {
        grid: { color: "#2e2b2440" }, beginAtZero: true,
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {}),
      }
    }
  };
}

function hBarOpts() {
  return {
    indexAxis: "y",
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: "#2e2b2440" }, beginAtZero: true },
      y: { grid: { display: false } }
    }
  };
}

// ═══════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════
function renderOverview() {
  const books = getActive();
  if (!books.length) { document.getElementById("stats-table").innerHTML = "<caption>No books selected</caption>"; return; }

  // Stats table
  const tbl = document.getElementById("stats-table");
  const metrics = [
    { key: "total_words",        label: "Words",       fmt: n => n.toLocaleString() },
    { key: "unique_words",       label: "Unique",      fmt: n => n.toLocaleString() },
    { key: "lexical_richness",   label: "Richness %",  fmt: n => n + "%" },
    { key: "avg_word_length",    label: "Avg Word",    fmt: n => n + " chr" },
    { key: "total_sentences",    label: "Sentences",   fmt: n => n.toLocaleString() },
    { key: "avg_sentence_length",label: "Avg Sent",    fmt: n => n + " wds" },
  ];
  tbl.innerHTML = `<thead><tr><th>Book</th>${metrics.map(m => `<th>${m.label}</th>`).join("")}</tr></thead>
    <tbody>${books.map(b => {
      const s = D.basic_stats[b];
      const col = bookColor(b);
      return `<tr><td><span class="book-dot" style="background:${col}"></span>${b}</td>
        ${metrics.map(m => `<td>${m.fmt(s[m.key])}</td>`).join("")}</tr>`;
    }).join("")}</tbody>`;

  const bColors = books.map(b => bookColor(b));

  makeChart("chart-wordcount", {
    type: "bar",
    data: { labels: books, datasets: [{ label: "Total Words",
      data: books.map(b => D.basic_stats[b].total_words),
      backgroundColor: bColors.map(c => ALPHA(c, 0.7)), borderColor: bColors, borderWidth: 2, borderRadius: 6 }] },
    options: barOpts("Words")
  });

  makeChart("chart-richness", {
    type: "bar",
    data: { labels: books, datasets: [{ label: "Lexical Richness %",
      data: books.map(b => D.basic_stats[b].lexical_richness),
      backgroundColor: bColors.map(c => ALPHA(c, 0.7)), borderColor: bColors, borderWidth: 2, borderRadius: 6 }] },
    options: barOpts("%")
  });

  makeChart("chart-flesch", {
    type: "bar",
    data: { labels: books, datasets: [{ label: "Flesch Score",
      data: books.map(b => D.reading_ease[b]),
      backgroundColor: bColors.map(c => ALPHA(c, 0.7)), borderColor: bColors, borderWidth: 2, borderRadius: 6 }] },
    options: barOpts("Score")
  });

  makeChart("chart-avgwordlen", {
    type: "bar",
    data: { labels: books, datasets: [{ label: "Avg Word Length",
      data: books.map(b => D.basic_stats[b].avg_word_length),
      backgroundColor: bColors.map(c => ALPHA(c, 0.7)), borderColor: bColors, borderWidth: 2, borderRadius: 6 }] },
    options: barOpts("Chars")
  });

  makeChart("chart-sentlen", {
    type: "bar",
    data: { labels: books, datasets: [{ label: "Avg Sentence Length",
      data: books.map(b => D.basic_stats[b].avg_sentence_length),
      backgroundColor: bColors.map(c => ALPHA(c, 0.7)), borderColor: bColors, borderWidth: 2, borderRadius: 6 }] },
    options: barOpts("Words")
  });

  const labels = Array.from({length: 15}, (_, i) => i + 1);
  makeChart("chart-wordlenDist", {
    type: "line",
    data: {
      labels: labels.map(l => l + " chr"),
      datasets: books.map(b => ({
        label: b,
        data: labels.map(l => { const item = D.word_lengths[b].find(x => x.length === l); return item ? item.count : 0; }),
        borderColor: bookColor(b),
        backgroundColor: ALPHA(bookColor(b), 0.06),
        fill: true, tension: 0.4, pointRadius: 2,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: "top" } },
      scales: {
        x: { grid: { color: "#2e2b2440" } },
        y: { grid: { color: "#2e2b2440" }, beginAtZero: true }
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════
// VOCABULARY
// ═══════════════════════════════════════════════════════════
function renderVocabulary() {
  const books = getActive();
  const bookSel = document.getElementById("vocab-book-select");
  const typeSel = document.getElementById("vocab-type-select");

  function draw() {
    const b = bookSel.value;
    if (!b || !D[typeSel.value][b]) return;
    const words = D[typeSel.value][b].slice(0, 30);
    const col = bookColor(b);
    makeChart("chart-topwords", {
      type: "bar",
      data: {
        labels: words.map(x => x.word),
        datasets: [{ label: "Count",
          data: words.map(x => x.count),
          backgroundColor: ALPHA(col, 0.65), borderColor: col, borderWidth: 1, borderRadius: 4 }]
      },
      options: hBarOpts()
    });
  }

  bookSel.onchange = draw;
  typeSel.onchange = draw;
  draw();

  // Exclusive
  const ex = document.getElementById("vocab-exclusive");
  ex.innerHTML = "";
  books.forEach(b => {
    const info = D.vocabulary.exclusive[b];
    if (!info) return;
    ex.innerHTML += `<div class="info-block">
      <h4 style="color:${bookColor(b)}">${b}</h4>
      <div class="count">${info.count.toLocaleString()} exclusive words</div>
      <div class="tag-cloud">${info.sample.slice(0,16).map(w => `<span class="tag">${w}</span>`).join("")}</div>
    </div>`;
  });

  // Hapax
  const hapax = document.getElementById("hapax-display");
  hapax.innerHTML = books.map(b => {
    if (!D.hapax[b]) return "";
    return `<div class="hapax-book">
      <h4 style="color:${bookColor(b)}">${b}</h4>
      <div class="hapax-count" style="color:${bookColor(b)}">${D.hapax[b].count.toLocaleString()}</div>
      <div style="color:var(--muted);font-size:.8rem;margin-bottom:8px">once-occurring</div>
      <div class="tag-cloud">${D.hapax[b].sample.map(w => `<span class="tag">${w}</span>`).join("")}</div>
    </div>`;
  }).join("");
}

// ═══════════════════════════════════════════════════════════
// PHRASES
// ═══════════════════════════════════════════════════════════
function renderPhrases() {
  const sel = document.getElementById("phrase-book-select");

  function draw() {
    const b = sel.value;
    if (!b) return;
    const col = bookColor(b);

    const bi = D.word_bigrams[b].slice(0, 18);
    makeChart("chart-bigrams", {
      type: "bar",
      data: { labels: bi.map(x => x.word), datasets: [{ label: "Count",
        data: bi.map(x => x.count), backgroundColor: ALPHA(col, 0.65),
        borderColor: col, borderWidth: 1, borderRadius: 4 }] },
      options: hBarOpts()
    });

    const tri = D.word_trigrams[b].slice(0, 18);
    makeChart("chart-trigrams", {
      type: "bar",
      data: { labels: tri.map(x => x.word), datasets: [{ label: "Count",
        data: tri.map(x => x.count), backgroundColor: ALPHA(col, 0.5),
        borderColor: col, borderWidth: 1, borderRadius: 4 }] },
      options: hBarOpts()
    });

    const dg = D.letter_ngrams[b]["2gram"].slice(0, 15);
    makeChart("chart-2gram", {
      type: "bar",
      data: { labels: dg.map(x => x.word), datasets: [{ label: "Count",
        data: dg.map(x => x.count), backgroundColor: ALPHA(col, 0.55),
        borderColor: col, borderWidth: 1, borderRadius: 4 }] },
      options: barOpts("Count")
    });

    const tg = D.letter_ngrams[b]["3gram"].slice(0, 15);
    makeChart("chart-3gram", {
      type: "bar",
      data: { labels: tg.map(x => x.word), datasets: [{ label: "Count",
        data: tg.map(x => x.count), backgroundColor: ALPHA(col, 0.4),
        borderColor: col, borderWidth: 1, borderRadius: 4 }] },
      options: barOpts("Count")
    });
  }

  sel.onchange = draw;
  draw();

  // Phrase search table — show active books as columns
  const books = getActive();
  const phrases = Object.entries(D.phrase_search);
  const cont = document.getElementById("phrase-search-table");
  cont.innerHTML = `<table>
    <thead><tr>
      <th>Phrase</th>
      ${books.map(b => `<th style="color:${bookColor(b)}">${b}</th>`).join("")}
    </tr></thead>
    <tbody>
      ${phrases.map(([phrase, counts]) => `<tr>
        <td class="td-phrase">${phrase}</td>
        ${books.map(b => `<td class="td-num" style="color:${bookColor(b)}">${counts[b] || 0}</td>`).join("")}
      </tr>`).join("")}
    </tbody>
  </table>`;
}

// ═══════════════════════════════════════════════════════════
// SACRED
// ═══════════════════════════════════════════════════════════
function renderSacred() {
  const books = getActive();
  if (!books.length) return;
  const termSel = document.getElementById("sacred-term-select");
  const termFilter = termSel ? termSel.value : "all";

  const allNames = Object.keys(D.divine_names[books[0]] || {});
  const names = termFilter === "all" ? allNames : [termFilter];

  if (termSel) termSel.onchange = renderSacred;

  makeChart("chart-divine", {
    type: "bar",
    data: {
      labels: names,
      datasets: books.map(b => ({
        label: b,
        data: names.map(n => (D.divine_names[b][n] || {per_1000: 0}).per_1000),
        backgroundColor: ALPHA(bookColor(b), 0.65),
        borderColor: bookColor(b), borderWidth: 1, borderRadius: 3,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "top" } },
      scales: {
        x: { grid: { color: "#2e2b2440" } },
        y: { grid: { color: "#2e2b2440" }, beginAtZero: true,
             title: { display: true, text: "per 1,000 words" } }
      }
    }
  });

  const numKeys = Object.keys(D.numbers[books[0]] || {});
  makeChart("chart-numbers", {
    type: "bar",
    data: {
      labels: numKeys,
      datasets: books.map(b => ({
        label: b,
        data: numKeys.map(n => (D.numbers[b] || {})[n] || 0),
        backgroundColor: ALPHA(bookColor(b), 0.65),
        borderColor: bookColor(b), borderWidth: 1, borderRadius: 3,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: "top" } },
      scales: {
        x: { grid: { color: "#2e2b2440" } },
        y: { grid: { color: "#2e2b2440" }, beginAtZero: true }
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════
// SIMILARITY
// ═══════════════════════════════════════════════════════════
function renderSimilarity() {
  const books = getActive();
  if (books.length < 2) return;

  // Collect pairs that exist in data for active books
  const pairKeys = [];
  for (let i = 0; i < books.length; i++) {
    for (let j = i + 1; j < books.length; j++) {
      const k = `${books[i]} vs ${books[j]}`;
      if (D.similarity[k]) pairKeys.push(k);
    }
  }

  const pairColors = pairKeys.map((_, i) => {
    const hue = (i / Math.max(pairKeys.length, 1)) * 300 + 20;
    return `hsl(${hue},60%,62%)`;
  });

  makeChart("chart-jaccard", {
    type: "bar",
    data: { labels: pairKeys,
      datasets: [{ label: "Jaccard",
        data: pairKeys.map(k => D.similarity[k].jaccard),
        backgroundColor: pairColors.map(c => c + "aa"), borderColor: pairColors, borderWidth: 2, borderRadius: 6 }] },
    options: barOpts("Score", 0)
  });

  makeChart("chart-cosine", {
    type: "bar",
    data: { labels: pairKeys,
      datasets: [{ label: "Cosine",
        data: pairKeys.map(k => D.similarity[k].cosine),
        backgroundColor: pairColors.map(c => c + "aa"), borderColor: pairColors, borderWidth: 2, borderRadius: 6 }] },
    options: barOpts("Score", 0, 1)
  });

  // Zipf
  const ranks = Array.from({length: 50}, (_, i) => i + 1);
  makeChart("chart-zipf", {
    type: "line",
    data: {
      labels: ranks,
      datasets: books.map(b => ({
        label: b,
        data: D.zipf[b].slice(0, 50).map(x => x.count),
        borderColor: bookColor(b), backgroundColor: "transparent", tension: 0.2, pointRadius: 1,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: "top" } },
      scales: {
        x: { title: { display: true, text: "Rank" }, grid: { color: "#2e2b2440" } },
        y: { type: "logarithmic", title: { display: true, text: "Frequency (log)" }, grid: { color: "#2e2b2440" } }
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════
// STYLE
// ═══════════════════════════════════════════════════════════
function renderStyle() {
  const books = getActive();
  if (!books.length) return;

  makeChart("chart-style-words", {
    type: "bar",
    data: {
      labels: books,
      datasets: [
        { label: "Short (≤3)", data: books.map(b => D.style[b].short_words_pct),
          backgroundColor: books.map(b => ALPHA(bookColor(b), 0.8)), borderRadius: 4 },
        { label: "Medium (4-7)", data: books.map(b => D.style[b].medium_words_pct),
          backgroundColor: books.map(b => ALPHA(bookColor(b), 0.45)), borderRadius: 4 },
        { label: "Long (8+)", data: books.map(b => D.style[b].long_words_pct),
          backgroundColor: books.map(b => ALPHA(bookColor(b), 0.2)), borderRadius: 4 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: "top" } },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, grid: { color: "#2e2b2440" }, title: { display: true, text: "%" } }
      }
    }
  });

  const pkeys = ["questions", "exclamations", "commas", "periods", "colons", "semicolons"];
  makeChart("chart-punct", {
    type: "bar",
    data: {
      labels: pkeys.map(p => p.charAt(0).toUpperCase() + p.slice(1)),
      datasets: books.map(b => ({
        label: b,
        data: pkeys.map(p => D.punctuation[b][p]),
        backgroundColor: ALPHA(bookColor(b), 0.6), borderColor: bookColor(b), borderWidth: 1, borderRadius: 3,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: "top" } },
      scales: {
        x: { grid: { color: "#2e2b2440" } },
        y: { grid: { color: "#2e2b2440" }, beginAtZero: true }
      }
    }
  });

  // Line stats
  const ls = document.getElementById("line-stats-display");
  ls.innerHTML = books.map(b => `
    <div class="info-block">
      <h4 style="color:${bookColor(b)}">${b}</h4>
      <div class="tag-cloud" style="flex-direction:column;gap:4px">
        ${Object.entries(D.line_stats[b]).map(([k, v]) =>
          `<div style="font-size:.85rem"><span style="color:var(--muted)">${k.replace(/_/g," ")}: </span>
           <span style="font-family:var(--font-mono)">${typeof v === "number" ? v.toLocaleString() : v}</span></div>`
        ).join("")}
      </div>
    </div>`).join("");

  // Starters
  const starterSel = document.getElementById("starters-book-select");
  function drawStarters() {
    const b = starterSel.value;
    if (!b || !D.starters[b]) return;
    const s = D.starters[b].slice(0, 12);
    makeChart("chart-starters", {
      type: "doughnut",
      data: {
        labels: s.map(x => x.word),
        datasets: [{ data: s.map(x => x.count),
          backgroundColor: s.map((_, i) => `hsl(${(i / s.length) * 280 + 20},55%,55%)`),
          borderColor: "var(--bg3)", borderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position: "right", labels: { boxWidth: 12 } } }
      }
    });
  }
  starterSel.onchange = drawStarters;
  drawStarters();
}

// ═══════════════════════════════════════════════════════════
// SENTIMENT
// ═══════════════════════════════════════════════════════════
function renderSentiment() {
  const books = getActive();
  if (!books.length) return;
  const bColors = books.map(b => bookColor(b));

  makeChart("chart-sentiment-counts", {
    type: "bar",
    data: {
      labels: books,
      datasets: [
        { label: "Positive Words", data: books.map(b => D.sentiment[b].positive_count),
          backgroundColor: bColors.map(c => ALPHA(c, 0.75)), borderColor: bColors, borderWidth: 2, borderRadius: 5 },
        { label: "Negative Words", data: books.map(b => D.sentiment[b].negative_count),
          backgroundColor: books.map(_ => "rgba(232,74,74,0.55)"), borderColor: "#e84a4a", borderWidth: 2, borderRadius: 5 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: "top" } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: "#2e2b2440" }, beginAtZero: true } }
    }
  });

  makeChart("chart-sentiment-ratio", {
    type: "bar",
    data: { labels: books, datasets: [{ label: "Pos/Neg Ratio",
      data: books.map(b => D.sentiment[b].ratio),
      backgroundColor: bColors.map(c => ALPHA(c, 0.75)), borderColor: bColors, borderWidth: 2, borderRadius: 6 }] },
    options: barOpts("Ratio")
  });

  makeChart("chart-sentiment-pct", {
    type: "bar",
    data: {
      labels: books,
      datasets: [
        { label: "Positive %", data: books.map(b => D.sentiment[b].positive_pct),
          backgroundColor: bColors.map(c => ALPHA(c, 0.7)), borderColor: bColors, borderWidth: 2, borderRadius: 5 },
        { label: "Negative %", data: books.map(b => D.sentiment[b].negative_pct),
          backgroundColor: books.map(_ => "rgba(232,74,74,0.55)"), borderColor: "#e84a4a", borderWidth: 2, borderRadius: 5 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: "top" } },
      scales: { x: { grid: { display: false } },
        y: { grid: { color: "#2e2b2440" }, beginAtZero: true, title: { display: true, text: "%" } } }
    }
  });
}

// ═══════════════════════════════════════════════════════════
// DISTINCTIVE
// ═══════════════════════════════════════════════════════════
function renderDistinctive() {
  const books = getActive();
  const grid = document.getElementById("distinctive-grid");
  grid.innerHTML = "";

  // Destroy old charts
  books.forEach(b => {
    const id = "chart-dist-" + b.replace(/\s+/g, "-");
    if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
  });

  books.forEach(b => {
    const id = "chart-dist-" + b.replace(/\s+/g, "-");
    const col = bookColor(b);
    const card = document.createElement("div");
    card.className = "distinctive-card";
    card.innerHTML = `<h3 style="color:${col}">${b} — Signature Words</h3><canvas id="${id}"></canvas>`;
    grid.appendChild(card);

    const words = (D.distinctive[b] || []).slice(0, 20);
    makeChart(id, {
      type: "bar",
      data: { labels: words.map(x => x.word),
        datasets: [{ label: "Distinctiveness",
          data: words.map(x => x.score),
          backgroundColor: ALPHA(col, 0.65), borderColor: col, borderWidth: 1, borderRadius: 4 }] },
      options: {
        indexAxis: "y",
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: "#2e2b2440" }, beginAtZero: true,
               title: { display: true, text: "Relative frequency score" } },
          y: { grid: { display: false } }
        }
      }
    });
  });
}

// ── Init ────────────────────────────────────────────────────────────────────
buildBookBar();
updateBookBarCount();
populateSelectors();
renderOverview();
