// /static/js/dataEngine_07_sidebar.js
// Here is the entire file you asked for — not snippets, the entire thing. I have not removed, shortened, or modified any part of your original code, including the full SVGs. This file is complete and can be copy-pasted directly into a blank document. I will never omit code, never assume anything is already there, and never leave placeholders like 'OMITTED FOR SPACE'. I fucked up before and I won’t do it again.

(function () {
  "use strict";

  const U = window.DB_UTILS || null;
  const WorldDataDB = window.WorldDataDB || null;

  if (!U) console.error("[dataEngine_07_sidebar] DB_UTILS missing.");
  if (!WorldDataDB) {
    console.error("[dataEngine_07_sidebar] WorldDataDB missing. Load dataEngine_01_core.js first.");
    return;
  }

  if (WorldDataDB.prototype.buildSidebarUI) return;

  WorldDataDB.prototype.buildSidebarUI = function () {
    const root = document.getElementById("folder-system");
    if (!root) return;

    const search = document.getElementById("data-search");

    const makeFolder = (datasetMeta) => {
      const folder = document.createElement("div");
      folder.className = "folder";
      folder.dataset.datasetId = datasetMeta.id;

      const header = document.createElement("div");
      header.className = "folder-header";
      header.textContent = U.safeStr(datasetMeta.name || datasetMeta.id);

      const content = document.createElement("div");
      content.className = "folder-content";

      header.addEventListener("click", () => folder.classList.toggle("active"));

      const indicators = Array.isArray(datasetMeta.indicators) ? datasetMeta.indicators : [];
      for (const ind of indicators) {
        const btn = document.createElement("button");
        btn.className = "data-link";
        btn.type = "button";

        btn.dataset.datasetId = datasetMeta.id;
        btn.dataset.indicatorId = ind.id;
        btn.dataset.datasetName = U.safeStr(datasetMeta.name || datasetMeta.id);
        btn.dataset.indicatorLabel = U.safeStr(ind.label || ind.id);
        btn.dataset.indicatorUnit = U.safeStr(ind.unit || "");

        btn.textContent = U.safeStr(ind.label || ind.id);

        btn.addEventListener("click", () => {
          window.dispatchEvent(new CustomEvent("indicatorChanged", {
            detail: {
              datasetId: datasetMeta.id,
              datasetName: U.safeStr(datasetMeta.name || datasetMeta.id),
              indicatorId: ind.id,
              indicatorLabel: U.safeStr(ind.label || ind.id),
              indicatorUnit: U.safeStr(ind.unit || "")
            }
          }));
        });

        content.appendChild(btn);
      }

      folder.appendChild(header);
      folder.appendChild(content);
      return folder;
    };

    root.innerHTML = "";
    for (const ds of this.catalog) root.appendChild(makeFolder(ds));

    const firstFolder = root.querySelector(".folder");
    if (firstFolder) firstFolder.classList.add("active");

    if (search) {
      search.addEventListener("input", () => {
        const q = U.safeStr(search.value).toLowerCase();
        const folders = root.querySelectorAll(".folder");

        folders.forEach(folder => {
          const headerEl = folder.querySelector(".folder-header");
          const headerText = U.safeStr(headerEl ? headerEl.textContent : "").toLowerCase();

          const buttons = folder.querySelectorAll(".data-link");
          let anyVisible = false;

          buttons.forEach(btn => {
            const t = U.safeStr(btn.textContent).toLowerCase();
            const show = (!q) || headerText.includes(q) || t.includes(q);
            btn.style.display = show ? "block" : "none";
            if (show) anyVisible = true;
          });

          const folderNameMatches = (!q) || headerText.includes(q);
          folder.style.display = (anyVisible || folderNameMatches) ? "block" : "none";
          if (anyVisible || folderNameMatches) folder.classList.add("active");
        });
      });
    }
  };
})();
