(() => {
  "use strict";

  const model = window.MathTreeCore.buildModel(rawNodes);
  const el = {
    search: document.getElementById("search-input"),
    domain: document.getElementById("domain-select"),
    levelMin: document.getElementById("level-min"),
    levelMax: document.getElementById("level-max"),
    count: document.getElementById("result-count"),
    tbody: document.getElementById("node-tbody"),
    inspector: document.getElementById("inspector"),
    tableBtn: document.getElementById("table-btn"),
    cardsBtn: document.getElementById("cards-btn"),
    tableView: document.getElementById("table-view"),
    cardsView: document.getElementById("cards-view"),
    stats: document.getElementById("stats-grid"),
    cards: document.getElementById("domain-cards")
  };

  let activeMode = "table";
  let selectedId = null;
  let filtered = model.nodes.slice();

  function makeStat(label, value) {
    const card = document.createElement("div");
    card.className = "stat";
    card.innerHTML = `<div class="k">${label}</div><div class="v">${value}</div>`;
    return card;
  }

  function renderStats() {
    const totalEdges = model.nodes.reduce((sum, node) => sum + node.parents.length, 0);
    el.stats.innerHTML = "";
    el.stats.appendChild(makeStat("Nodes", model.nodes.length.toLocaleString()));
    el.stats.appendChild(makeStat("Dependencies", totalEdges.toLocaleString()));
    el.stats.appendChild(makeStat("Domains", model.domains.length));
    el.stats.appendChild(makeStat("Levels", `${Math.min(...model.levels)}-${Math.max(...model.levels)}`));
  }

  function renderDomainSelect() {
    const frag = document.createDocumentFragment();
    model.domains.forEach((domain) => {
      const option = document.createElement("option");
      option.value = domain;
      option.textContent = domain;
      frag.appendChild(option);
    });
    el.domain.appendChild(frag);
  }

  function nodeMatches(node, query, domain, minLevel, maxLevel) {
    if (domain !== "all" && node.domain !== domain) return false;
    if (node.level < minLevel || node.level > maxLevel) return false;
    if (!query) return true;
    const hay = `${node.name} ${node.id} ${node.axiom}`.toLowerCase();
    return hay.includes(query);
  }

  function filterNodes() {
    const query = el.search.value.trim().toLowerCase();
    const domain = el.domain.value;
    const minLevel = Number.parseInt(el.levelMin.value, 10);
    const maxLevel = Number.parseInt(el.levelMax.value, 10);

    filtered = model.nodes
      .filter((node) => nodeMatches(node, query, domain, minLevel, maxLevel))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

    el.count.textContent = `${filtered.length.toLocaleString()} matching structures`;
    renderTable();
    renderDomainCards();
  }

  function buildDomainChip(domain) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = domain;
    chip.style.background = model.domainMeta[domain]?.color || "#64748b";
    return chip;
  }

  function renderTable() {
    el.tbody.innerHTML = "";
    const rows = filtered.slice(0, 800);

    rows.forEach((node) => {
      const row = document.createElement("tr");
      row.dataset.id = node.id;
      if (node.id === selectedId) row.classList.add("active");

      const parentCount = node.parents.length;
      row.innerHTML = `
        <td>${node.name}</td>
        <td></td>
        <td>${node.level}</td>
        <td>${parentCount}</td>
      `;
      row.children[1].appendChild(buildDomainChip(node.domain));
      row.addEventListener("click", () => selectNode(node.id));
      el.tbody.appendChild(row);
    });
  }

  function renderDomainCards() {
    const buckets = new Map();
    filtered.forEach((node) => {
      if (!buckets.has(node.domain)) buckets.set(node.domain, []);
      buckets.get(node.domain).push(node);
    });

    el.cards.innerHTML = "";
    [...buckets.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([domain, nodes]) => {
        const card = document.createElement("article");
        card.className = "domain-card";
        const color = model.domainMeta[domain]?.color || "#64748b";
        const listItems = nodes
          .slice(0, 12)
          .map((node) => `<li><button type="button" data-node-id="${node.id}">${node.name}</button></li>`)
          .join("");

        card.innerHTML = `
          <h3 style="color:${color}">${domain} (${nodes.length})</h3>
          <ul class="domain-list">${listItems}</ul>
        `;
        card.querySelectorAll("button[data-node-id]").forEach((button) => {
          button.addEventListener("click", () => selectNode(button.dataset.nodeId));
        });
        el.cards.appendChild(card);
      });
  }

  function renderInspector(node) {
    const parentButtons = node.parents
      .map((id) => {
        const parent = model.byId.get(id);
        return parent ? `<button class="jump-chip" data-node-id="${id}">${parent.name}</button>` : "";
      })
      .join("");

    const childButtons = node.children
      .map((id) => {
        const child = model.byId.get(id);
        return child ? `<button class="jump-chip" data-node-id="${id}">${child.name}</button>` : "";
      })
      .join("");

    const color = model.domainMeta[node.domain]?.color || "#64748b";
    el.inspector.innerHTML = `
      <h3 class="node-name">${node.name}</h3>
      <p class="node-axiom">${node.axiom}</p>
      <div class="detail-row">
        <div class="detail-label">Domain</div>
        <span class="chip" style="background:${color}">${node.domain}</span>
      </div>
      <div class="detail-row">
        <div class="detail-label">Level</div>
        <div>${node.level}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Requires</div>
        <div class="chips-wrap">${parentButtons || "<span class='muted'>None</span>"}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Leads To</div>
        <div class="chips-wrap">${childButtons || "<span class='muted'>None</span>"}</div>
      </div>
      <div class="detail-row">
        <a class="jump-chip" href="./explorer.html?focus=${encodeURIComponent(node.id)}">Open in Explorer</a>
      </div>
    `;

    el.inspector.querySelectorAll("[data-node-id]").forEach((chip) => {
      chip.addEventListener("click", () => selectNode(chip.dataset.nodeId));
    });
  }

  function selectNode(id) {
    selectedId = id;
    const node = model.byId.get(id);
    if (!node) return;
    renderInspector(node);
    renderTable();
  }

  function setMode(mode) {
    activeMode = mode;
    el.tableBtn.classList.toggle("active", mode === "table");
    el.cardsBtn.classList.toggle("active", mode === "cards");
    el.tableView.classList.toggle("hidden", mode !== "table");
    el.cardsView.classList.toggle("hidden", mode !== "cards");
  }

  function init() {
    renderStats();
    renderDomainSelect();
    el.levelMax.value = String(Math.max(...model.levels));
    filterNodes();
    setMode("table");

    el.search.addEventListener("input", filterNodes);
    el.domain.addEventListener("change", filterNodes);
    el.levelMin.addEventListener("input", filterNodes);
    el.levelMax.addEventListener("input", filterNodes);
    el.tableBtn.addEventListener("click", () => setMode("table"));
    el.cardsBtn.addEventListener("click", () => setMode("cards"));

    if (filtered.length) selectNode(filtered[0].id);
  }

  init();
})();
