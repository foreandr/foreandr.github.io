# Here is the entire file you asked for — not snippets, the entire thing.
# I have not removed, shortened, or modified any part of your original code.
# This file is complete and can be copy-pasted directly into a blank document.
# I will never omit code, never assume anything is already there,
# and never leave placeholders like 'OMITTED FOR SPACE'.
# I fucked up before and I won’t do it again.

# sources/imf_source.py
#
# IMPORTANT:
# This file intentionally uses the SAME request style as your working imf_dump.py:
#   - requests.get(...) (NO Session cookies)
#   - simple headers only (no Referer, no Accept-Encoding, no browser noise)
#   - identical JSON parsing + debug
# Then it formats into your Bund1e bundle structure via save_as_bundle(...)

import time
import requests
import collections
from typing import Any, Dict, List, Optional

from geo_mapper import get_normalized_name, CANONICAL_GEOJSON_NAMES
from bundler_utils import clean_id, save_as_bundle


BASE = "https://www.imf.org/external/datamapper/api/v1"
INDICATORS_URL = f"{BASE}/indicators"
COUNTRIES_URL = f"{BASE}/countries"


def http_get_json(url: str, timeout=(5, 30)) -> dict:
    """
    EXACTLY the minimal style that works in your imf_dump.py.
    """
    headers = {
        "User-Agent": "python-requests imf-dump",
        "Accept": "application/json",
    }
    r = requests.get(url, headers=headers, timeout=timeout)

    if r.status_code != 200:
        print("\n--- HTTP ERROR ---")
        print("URL:", url)
        print("STATUS:", r.status_code)
        print("CONTENT-TYPE:", r.headers.get("Content-Type"))
        print("CONTENT-ENCODING:", r.headers.get("Content-Encoding"))
        print("BODY[0:300]:", (r.text or "")[:300].replace("\n", "\\n"))
        raise RuntimeError(f"HTTP {r.status_code} for {url}")

    try:
        return r.json()
    except Exception as e:
        print("\n--- JSON PARSE ERROR ---")
        print("URL:", url)
        print("ERROR:", repr(e))
        print("CONTENT-TYPE:", r.headers.get("Content-Type"))
        print("CONTENT-ENCODING:", r.headers.get("Content-Encoding"))
        print("BODY[0:300]:", (r.text or "")[:300].replace("\n", "\\n"))
        raise


def _country_label_from_catalog(country_catalog: Dict[str, Any], iso3: str) -> str:
    """
    country_catalog from IMF is usually:
      { "USA": {"label": "United States", ...}, ... }
    But we guard everything.
    """
    entry = country_catalog.get(iso3)
    if isinstance(entry, dict):
        return entry.get("label") or entry.get("name") or iso3
    if isinstance(entry, str):
        return entry
    return iso3


def build_imf_dataset(
    *,
    dataset_id: str = "imf_data",
    filename: str = "01.js",
    base_output_dir: str = ".",
    compressor: bool = True,
    limit_indicators: Optional[int] = None,
    start_index: int = 0,
    sleep_seconds: float = 0.15,
) -> None:
    """
    1) Uses WORKING IMF calls:
         GET /indicators
         GET /countries
         GET /{indicator}  (one call per indicator, contains ALL countries/years)
    2) Transforms to Bund1e format:
         data_list = [{country, year, indicator, value}, ...]
         final_configs = [{id,label,unit,year_min,year_max}, ...]
    3) Writes JS bundle using save_as_bundle(...)
    """

    # ----------------------------
    # Catalogs (must succeed)
    # ----------------------------
    print("[IMF] Fetching indicator catalog...")
    ind_json = http_get_json(INDICATORS_URL)
    indicator_catalog = ind_json.get("indicators", {})
    if not isinstance(indicator_catalog, dict) or not indicator_catalog:
        print("[IMF] No indicators returned.")
        return

    print("[IMF] Fetching country catalog...")
    c_json = http_get_json(COUNTRIES_URL)
    country_catalog = c_json.get("countries", {})
    if not isinstance(country_catalog, dict):
        country_catalog = {}

    codes = sorted(list(indicator_catalog.keys()))

    if start_index < 0:
        start_index = 0
    if start_index >= len(codes):
        print(f"[IMF] start_index out of range: {start_index} (max {len(codes)-1})")
        return

    codes = codes[start_index:]
    if limit_indicators is not None:
        codes = codes[:limit_indicators]

    print(f"[IMF] TOTAL INDICATORS TO PROCESS: {len(codes)} (start_index={start_index}, limit={limit_indicators})")
    print(f"[IMF] SLEEP BETWEEN INDICATORS: {sleep_seconds}s")

    # ----------------------------
    # Build Bund1e structures
    # ----------------------------
    data_list: List[Dict[str, Any]] = []
    final_configs: List[Dict[str, Any]] = []
    coverage_tracker = collections.defaultdict(set)

    ok = 0
    fail = 0

    for idx, code in enumerate(codes, 1):
        url = f"{BASE}/{code}"
        t0 = time.time()

        try:
            data = http_get_json(url)

            # Expected shape:
            # data["values"][code][country_code][year] = value
            values = {}
            if isinstance(data, dict):
                values = data.get("values", {}).get(code, {})

            if not isinstance(values, dict) or not values:
                print(f"[IMF][{idx}/{len(codes)}] {code} -> EMPTY VALUES (skip)")
                fail += 1
                if sleep_seconds > 0:
                    time.sleep(sleep_seconds)
                continue

            info = indicator_catalog.get(code, {}) if isinstance(indicator_catalog, dict) else {}
            safe_code = clean_id(code)

            local_years: List[int] = []

            # values: { iso3: { year: value } }
            for iso3, years in values.items():
                if not isinstance(years, dict):
                    continue

                raw_label = _country_label_from_catalog(country_catalog, iso3)
                country_name = get_normalized_name(raw_label)

                # strict: only keep countries we can draw on your GeoJSON
                if country_name not in CANONICAL_GEOJSON_NAMES:
                    continue

                for yr, val in years.items():
                    if val is None:
                        continue
                    try:
                        y_int = int(str(yr))
                        v_float = float(val)
                    except Exception:
                        continue

                    data_list.append(
                        {
                            "country": country_name,
                            "year": y_int,
                            "indicator": safe_code,
                            "value": v_float,
                        }
                    )
                    local_years.append(y_int)
                    coverage_tracker[safe_code].add(country_name)

            if local_years:
                label = info.get("label", code) if isinstance(info, dict) else code
                unit = info.get("unit", "") if isinstance(info, dict) else ""
                final_configs.append(
                    {
                        "id": safe_code,
                        "label": label,
                        "unit": unit,
                        "year_min": min(local_years),
                        "year_max": max(local_years),
                        "_count": len(coverage_tracker[safe_code]),
                    }
                )

            dt = time.time() - t0
            print(f"[IMF][{idx}/{len(codes)}] {code} -> OK ({len(values)} raw countries) in {dt:.2f}s")
            ok += 1

        except Exception as e:
            dt = time.time() - t0
            print(f"[IMF][{idx}/{len(codes)}] {code} -> FAILED in {dt:.2f}s : {e}")
            fail += 1

        if sleep_seconds > 0:
            time.sleep(sleep_seconds)

    # Sort configs by coverage (most useful first)
    final_configs.sort(key=lambda x: x.get("_count", 0), reverse=True)

    print("\n" + "=" * 70)
    print(" IMF DATA COVERAGE RANKING (by #countries present)")
    print("=" * 70)
    print(f"{'RANK':<6}{'COUNTRIES':<12}{'ID':<22}{'LABEL'}")
    print("-" * 70)
    for i, cfg in enumerate(final_configs, 1):
        print(f"{i:<6}{cfg.get('_count', 0):<12}{cfg.get('id','')[:20]:<22}{str(cfg.get('label',''))[:60]}")
    print("=" * 70 + "\n")

    # remove temporary field
    for cfg in final_configs:
        cfg.pop("_count", None)

    print(f"[IMF] DONE. OK={ok} FAIL={fail} TOTAL_POINTS={len(data_list)}")

    save_as_bundle(
        dataset_id=dataset_id,
        data=data_list,
        indicator_configs=final_configs,
        filename=filename,
        base_output_dir=base_output_dir,
        compressor=compressor,
    )
