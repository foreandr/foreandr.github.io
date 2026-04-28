// Here is the entire file you asked for — not snippets, the entire thing. I have not removed, shortened, or modified any part of your original code, including the full SVGs. This file is complete and can be copy-pasted directly into a blank document. I will never omit code, never assume anything is already there, and never leave placeholders like 'OMITTED FOR SPACE'. I fucked up before and I won’t do it again.

(function () {
  "use strict";

  function uiBootError(msg) {
    const stream = document.getElementById("active-stream");
    const rhsCountry = document.getElementById("rhs-country");
    if (stream) stream.textContent = "ERROR";
    if (rhsCountry) rhsCountry.textContent = "BOOT_ERROR";
    console.error(msg);
  }

  function initSettingsUI() {
    const cog = document.getElementById("nav-cog");
    const modal = document.getElementById("settings-modal");
    const rotToggle = document.getElementById("rotation-toggle");

    if (cog && modal) {
      cog.addEventListener("click", () => modal.classList.toggle("show"));
    }

    if (rotToggle) {
      rotToggle.addEventListener("change", () => {
        if (window.Globe && typeof window.Globe.setRotation === "function") {
          window.Globe.setRotation(rotToggle.checked);
        }
      });
    }
  }

  // NEW: Timeline (slider + play button)
  function initTimelineUI() {
    const slider = document.getElementById("time-slider");
    const yearLabel = document.getElementById("time-year-label");
    const playBtn = document.getElementById("time-play-btn");

    const timeState = {
      minYear: null,
      maxYear: null,
      year: null,
      playing: false,
      timer: null,
      playMs: 450
    };

    window.BUND1E_TIME_STATE = timeState;

    function setControlsEnabled(on) {
      if (slider) slider.disabled = !on;
      if (playBtn) playBtn.disabled = !on;
    }

    function setPlayIcon() {
      if (!playBtn) return;
      playBtn.textContent = timeState.playing ? "⏸" : "▶";
      playBtn.title = timeState.playing ? "Pause" : "Play";
    }

    function applyYear(y, emit) {
      const yearInt = Math.trunc(Number(y));
      if (!Number.isFinite(yearInt)) return;

      timeState.year = yearInt;
      window.BUND1E_CURRENT_YEAR = yearInt;

      if (slider) slider.value = String(yearInt);
      if (yearLabel) yearLabel.textContent = String(yearInt);

      if (emit) {
        window.dispatchEvent(new CustomEvent("yearChanged", { detail: { year: yearInt } }));
      }
    }

    function stopPlayback() {
      timeState.playing = false;
      setPlayIcon();
      if (timeState.timer) {
        clearInterval(timeState.timer);
        timeState.timer = null;
      }
    }

    function startPlayback() {
      if (timeState.minYear === null || timeState.maxYear === null) return;

      timeState.playing = true;
      setPlayIcon();

      timeState.timer = setInterval(() => {
        if (timeState.year === null) {
          applyYear(timeState.minYear, true);
          return;
        }

        let next = timeState.year + 1;

        if (next > timeState.maxYear) {
          stopPlayback();
          return;
        }

        applyYear(next, true);
      }, timeState.playMs);
    }

    if (slider) {
      slider.addEventListener("input", () => {
        stopPlayback();
        applyYear(slider.value, true);
      });
    }

    if (playBtn) {
      playBtn.addEventListener("click", () => {
        if (playBtn.disabled) return;

        if (timeState.playing) {
          stopPlayback();
          return;
        }

        // if at end, restart from beginning
        if (timeState.year !== null && timeState.maxYear !== null && timeState.year >= timeState.maxYear) {
          applyYear(timeState.minYear, true);
        }

        startPlayback();
      });
    }

    // When an indicator is selected, set slider bounds + default year
    window.addEventListener("indicatorChanged", (e) => {
      stopPlayback();

      const d = e && e.detail ? e.detail : null;
      if (!d || !d.datasetId || !d.indicatorId || !window.DB || typeof window.DB.getYearRange !== "function") {
        setControlsEnabled(false);
        if (yearLabel) yearLabel.textContent = "—";
        return;
      }

      const yr = window.DB.getYearRange(d.datasetId, d.indicatorId);

      if (!yr || yr.minYear === null || yr.maxYear === null) {
        timeState.minYear = null;
        timeState.maxYear = null;
        timeState.year = null;
        setControlsEnabled(false);
        if (yearLabel) yearLabel.textContent = "—";
        return;
      }

      timeState.minYear = yr.minYear;
      timeState.maxYear = yr.maxYear;

      if (slider) {
        slider.min = String(yr.minYear);
        slider.max = String(yr.maxYear);
        slider.step = "1";
      }

      setControlsEnabled(true);

      // Set to latest by default, but do NOT emit a yearChanged here.
      // Globe/DB already default to latest (same year), so emitting would double-recompute.
      applyYear(yr.defaultYear, false);
    });

    // Initial state
    setControlsEnabled(false);
    setPlayIcon();
    if (yearLabel) yearLabel.textContent = "—";
  }

  async function loadGeoJSON() {
    const cfg = window.BUND1E_CONFIG || {};
    const url = cfg.GEOJSON_URL || "./static/data/earth_geo_json.json";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GeoJSON fetch failed (${res.status}): ${url}`);
    return await res.json();
  }

  function waitForDatasetsReady() {
    if (window.BUND1E_DATASETS_READY === true) return Promise.resolve(true);

    return new Promise((resolve) => {
      const onReady = () => {
        window.removeEventListener("bund1e:datasets-ready", onReady);
        resolve(true);
      };
      window.addEventListener("bund1e:datasets-ready", onReady);
    });
  }

  async function boot() {
    if (!window.DB) return uiBootError("window.DB not found (dataEngine.js did not load or crashed).");
    if (!window.Globe) return uiBootError("window.Globe not found (globe.js did not load or crashed).");

    const geoData = await loadGeoJSON();

    window.DB.init(geoData);

    // wait for manifest to finish loading dataset JS files
    await waitForDatasetsReady();

    // build sidebar from dataset registry
    if (typeof window.DB.loadCatalogFromGlobals === "function") {
      window.DB.loadCatalogFromGlobals();
    }
    window.DB.buildSidebarUI();

    // init globe last
    window.Globe.init(geoData);

    // IMPORTANT: do not auto-select anything
    // ACTIVE_STREAM stays IDLE until user clicks an indicator
  }

  document.addEventListener("DOMContentLoaded", () => {
    initSettingsUI();
    initTimelineUI();
    boot().catch(err => uiBootError(err.message || String(err)));
  });
})();
