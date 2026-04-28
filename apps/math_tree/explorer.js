(() => {
  "use strict";

  const model = window.MathTreeCore.buildModel(rawNodes);
  const el = {
    viewport: document.getElementById("viewport"),
    canvas: document.getElementById("canvas"),
    edges: document.getElementById("edges"),
    nodes: document.getElementById("nodes"),
    trace: document.getElementById("trace-list"),
    search: document.getElementById("search-input")
  };

  const state = {
    scale: 0.62,
    x: window.innerWidth * 0.22,
    y: 40,
    dragging: false,
    dragOrigin: { x: 0, y: 0 },
    activeId: null
  };

  function layoutNodes(nodes) {
    const byLevel = new Map();
    nodes.forEach((node) => {
      if (!byLevel.has(node.level)) byLevel.set(node.level, []);
      byLevel.get(node.level).push(node);
    });

    const levelGap = 170;
    const baseWidth = 190;
    const gap = 34;

    [...byLevel.keys()].sort((a, b) => a - b).forEach((level) => {
      const list = byLevel.get(level).sort((a, b) => a.name.localeCompare(b.name));
      const count = list.length;
      const width = count > 32 ? 150 : count > 22 ? 170 : baseWidth;
      const total = count * width + (count - 1) * gap;
      const startX = -total / 2 + width / 2;
      list.forEach((node, index) => {
        node.x = startX + index * (width + gap);
        node.y = level * levelGap;
      });
    });
  }

  function drawGraph() {
    layoutNodes(model.nodes);
    el.nodes.innerHTML = "";
    el.edges.innerHTML = "";

    model.nodes.forEach((node) => {
      node.parents.forEach((parentId) => {
        const parent = model.byId.get(parentId);
        if (!parent) return;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.classList.add("edge");
        line.dataset.key = `${parent.id}::${node.id}`;
        line.setAttribute("x1", String(parent.x));
        line.setAttribute("y1", String(parent.y));
        line.setAttribute("x2", String(node.x));
        line.setAttribute("y2", String(node.y));
        el.edges.appendChild(line);
      });

      const div = document.createElement("button");
      div.className = "node";
      div.type = "button";
      div.textContent = node.name;
      div.style.left = `${node.x}px`;
      div.style.top = `${node.y}px`;
      div.dataset.id = node.id;
      div.addEventListener("click", () => audit(node.id));
      el.nodes.appendChild(div);
    });
  }

  function ancestorsOf(id, set = new Set()) {
    if (set.has(id)) return set;
    set.add(id);
    const node = model.byId.get(id);
    if (!node) return set;
    node.parents.forEach((parentId) => ancestorsOf(parentId, set));
    return set;
  }

  function renderTrace(list, targetId) {
    el.trace.innerHTML = "";
    list
      .map((id) => model.byId.get(id))
      .filter(Boolean)
      .sort((a, b) => a.level - b.level)
      .forEach((node) => {
        const item = document.createElement("article");
        item.className = `trace-item ${node.id === targetId ? "target" : ""}`.trim();
        item.innerHTML = `<div class="name">${node.name}</div><div class="axiom">${node.axiom}</div>`;
        el.trace.appendChild(item);
      });
  }

  function audit(id) {
    state.activeId = id;
    const chain = ancestorsOf(id);

    el.nodes.querySelectorAll(".node").forEach((nodeEl) => {
      nodeEl.classList.toggle("active", chain.has(nodeEl.dataset.id));
    });

    el.edges.querySelectorAll(".edge").forEach((edgeEl) => {
      const [a, b] = edgeEl.dataset.key.split("::");
      edgeEl.classList.toggle("active", chain.has(a) && chain.has(b));
    });

    renderTrace([...chain], id);
  }

  function applyTransform() {
    el.canvas.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
  }

  function bindCamera() {
    el.viewport.addEventListener("wheel", (event) => {
      event.preventDefault();
      state.scale *= event.deltaY > 0 ? 0.9 : 1.1;
      state.scale = Math.max(0.18, Math.min(1.7, state.scale));
      applyTransform();
    });

    el.viewport.addEventListener("pointerdown", (event) => {
      state.dragging = true;
      state.dragOrigin = { x: event.clientX - state.x, y: event.clientY - state.y };
      el.viewport.setPointerCapture(event.pointerId);
    });

    el.viewport.addEventListener("pointermove", (event) => {
      if (!state.dragging) return;
      state.x = event.clientX - state.dragOrigin.x;
      state.y = event.clientY - state.dragOrigin.y;
      applyTransform();
    });

    const end = () => {
      state.dragging = false;
    };
    el.viewport.addEventListener("pointerup", end);
    el.viewport.addEventListener("pointercancel", end);
  }

  function findByQuery(query) {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return model.nodes.find((node) => node.id === q || node.name.toLowerCase().includes(q)) || null;
  }

  function initSearch() {
    el.search.addEventListener("input", () => {
      const node = findByQuery(el.search.value);
      if (!node) return;
      audit(node.id);
    });
  }

  function readFocusFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const focus = params.get("focus");
    if (!focus) return null;
    return model.byId.has(focus) ? focus : null;
  }

  function init() {
    drawGraph();
    bindCamera();
    initSearch();
    applyTransform();
    audit(readFocusFromUrl() || model.nodes[0].id);
  }

  init();
})();
