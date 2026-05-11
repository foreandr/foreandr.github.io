const {
  NUMBER_SYSTEMS,
  OBJECT_FAMILIES,
  getNumberSystem,
  getObjectFamilyState,
  createInitialChain,
  listAvailableMoves,
  applyMove,
} = window.MathObjectBuilderLogic;

const state = {
  baseId: "reals",
  familyId: "vector_space",
  dimension: 3,
  baseSearch: "",
  familySearch: "",
  mapProperty: "free",
  chain: createInitialChain("reals"),
};

function matchesSearch(terms, query) {
  if (!query) return true;
  const lowered = query.trim().toLowerCase();
  return terms.some((term) => term.toLowerCase().includes(lowered));
}

function getTail() {
  return state.chain[state.chain.length - 1];
}

function formatNode(node) {
  if (node.kind === "base") return node.label;
  return node.label;
}

function proofBits(node) {
  if (node.kind === "base") return ["base"];
  if (node.kind === "map") return [node.title, node.property || "typed"];
  if (node.family === "vector_space") return [`dim=${node.dimension}`, `over ${getNumberSystem(node.baseId).short}`];
  if (node.family === "manifold") return [`dim=${node.dimension}`, "smooth-ready"];
  if (node.family === "algebra") return ["multiplication", `over ${getNumberSystem(node.baseId).short}`];
  return [node.title];
}

function renderBaseGrid() {
  const grid = document.getElementById("base-grid");
  grid.innerHTML = "";
  NUMBER_SYSTEMS
    .filter((item) => matchesSearch([item.label, item.short, ...item.search], state.baseSearch))
    .forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `catalog-card ${item.id === state.baseId ? "selected" : ""}`.trim();
      button.innerHTML = `<strong>${item.short}</strong><span>${item.label}</span>`;
      button.addEventListener("click", () => {
        state.baseId = item.id;
        state.chain = createInitialChain(item.id);
        renderAll();
      });
      grid.appendChild(button);
    });
}

function renderFamilyGrid() {
  const grid = document.getElementById("family-grid");
  grid.innerHTML = "";
  OBJECT_FAMILIES
    .filter((item) => matchesSearch([item.label, ...item.search], state.familySearch))
    .forEach((item) => {
      const availability = getObjectFamilyState(state.baseId, item.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `catalog-card ${item.id === state.familyId ? "selected" : ""} ${availability.available ? "ok" : "bad"}`.trim();
      button.innerHTML = `<strong>${item.label}</strong><span>${availability.available ? "ok" : "blocked"}</span>`;
      button.addEventListener("click", () => {
        state.familyId = item.id;
        renderAll();
      });
      grid.appendChild(button);
    });
}

function renderChain() {
  const strip = document.getElementById("chain-strip");
  strip.innerHTML = "";
  state.chain.forEach((node, index) => {
    const card = document.createElement("div");
    card.className = `chain-node ${node.kind}`;
    card.innerHTML = `
      <div class="chain-kind">${node.kind}</div>
      <div class="chain-main">${formatNode(node)}</div>
      <div class="chain-meta">${proofBits(node).join(" • ")}</div>
    `;
    strip.appendChild(card);

    if (index < state.chain.length - 1) {
      const arrow = document.createElement("div");
      arrow.className = "chain-arrow";
      arrow.textContent = "→";
      strip.appendChild(arrow);
    }
  });
}

function renderProofStrip() {
  const proof = document.getElementById("proof-strip");
  const tail = getTail();
  const base = getNumberSystem(state.baseId);
  const items = [
    `base=${base.short}`,
    `tail=${tail.title}`,
    ...proofBits(tail),
  ];
  proof.innerHTML = items.map((item) => `<span class="proof-pill">${item}</span>`).join("");
}

function renderMoves() {
  const grid = document.getElementById("move-grid");
  grid.innerHTML = "";
  listAvailableMoves(state.chain).forEach((move) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "move-card";
    button.innerHTML = `<strong>${move.label}</strong><span>${move.kind}</span>`;
    button.addEventListener("click", () => {
      const nextOptions = {
        dimension: state.dimension,
        targetDimension: state.dimension,
        property: state.mapProperty,
      };
      state.chain = applyMove(state.chain, move.id, nextOptions);
      renderAll();
    });
    grid.appendChild(button);
  });
}

function renderSummary() {
  document.getElementById("summary-base").textContent = getNumberSystem(state.baseId).short;
  document.getElementById("summary-tail").textContent = getTail().label;
  document.getElementById("summary-length").textContent = String(state.chain.length);
  document.getElementById("dimension-readout").textContent = `n = ${state.dimension}`;
}

function seedSelectedObject() {
  const availability = getObjectFamilyState(state.baseId, state.familyId);
  if (!availability.available) return;
  state.chain = createInitialChain(state.baseId);
  state.chain = applyMove(state.chain, state.familyId, { dimension: state.dimension });
  renderAll();
}

function renderAll() {
  renderSummary();
  renderBaseGrid();
  renderFamilyGrid();
  renderChain();
  renderProofStrip();
  renderMoves();
}

function initControls() {
  document.getElementById("base-search").addEventListener("input", (event) => {
    state.baseSearch = event.target.value;
    renderBaseGrid();
  });
  document.getElementById("family-search").addEventListener("input", (event) => {
    state.familySearch = event.target.value;
    renderFamilyGrid();
  });
  document.getElementById("dimension-input").addEventListener("input", (event) => {
    state.dimension = Number(event.target.value);
    renderSummary();
  });
  document.getElementById("map-property").addEventListener("change", (event) => {
    state.mapProperty = event.target.value;
  });
  document.getElementById("seed-object").addEventListener("click", seedSelectedObject);
}

initControls();
renderAll();
