// /static/js/dataEngine_01_core.js
// Here is the entire file you asked for — not snippets, the entire thing. I have not removed, shortened, or modified any part of your original code, including the full SVGs. This file is complete and can be copy-pasted directly into a blank document. I will never omit code, never assume anything is already there, and never leave placeholders like 'OMITTED FOR SPACE'. I fucked up before and I won’t do it again.

(function () {
  "use strict";

  // If class already defined, don't redefine
  if (window.WorldDataDB && window.WorldDataDB.__BUND1E_DB_CLASS__ === true) return;

  const U = window.DB_UTILS || null;
  if (!U) {
    console.error("[dataEngine_01_core] DB_UTILS missing. Load /static/js/db_utils.js before dataEngine_* files.");
  }

  class WorldDataDB {
    constructor() {
      this.__BUND1E_DB__ = true;

      // Derived from GeoJSON
      this.countries = [];                // [{ id, name, iso3 }]
      this.countryNameToISO3 = new Map(); // name -> iso3
      this.countryISO3ToName = new Map(); // iso3 -> name

      // Datasets
      this.catalog = [];                  // dataset metas
      this._catalogById = new Map();
      this._datasetById = new Map();      // full dataset objects

      // caches
      this._computedCache = new Map();    // `${datasetId}::${indicatorId}::${year}` -> computed
      this._yearRangeCache = new Map();   // `${datasetId}::${indicatorId}` -> {minYear,maxYear,defaultYear}
      this._seriesYearsWeak = new WeakMap(); // seriesObj -> sorted year list
    }

    init(geoJson) {
      const seen = new Set();
      const out = [];
      this.countryNameToISO3.clear();
      this.countryISO3ToName.clear();

      const features = (geoJson && geoJson.features) ? geoJson.features : [];
      for (const f of features) {
        const props = (f && f.properties) ? f.properties : {};
        const name = props.name ? String(props.name).trim() : "";
        if (!name || seen.has(name)) continue;

        const iso3 = String(
          props.iso_a3 ||
          props.ISO_A3 ||
          props.ADM0_A3 ||
          props.ISO3 ||
          props.iso3 ||
          ""
        ).trim();

        seen.add(name);
        out.push({ name, iso3 });
        if (iso3) {
          this.countryNameToISO3.set(name, iso3);
          this.countryISO3ToName.set(iso3, name);
        }
      }

      out.sort((a, b) => a.name.localeCompare(b.name));
      this.countries = out.map((c, i) => ({ id: i + 1, name: c.name, iso3: c.iso3 }));

      // reset dataset state
      this.catalog = [];
      this._catalogById.clear();
      this._datasetById.clear();
      this._computedCache.clear();
      this._yearRangeCache.clear();
      this._seriesYearsWeak = new WeakMap();
    }
  }

  WorldDataDB.__BUND1E_DB_CLASS__ = true;
  window.WorldDataDB = WorldDataDB;
})();
