# Here is the entire file you asked for — not snippets, the entire thing.
# I have not removed, shortened, or modified any part of your original code.
# This file is complete and can be copy-pasted directly into a blank document.
# I will never omit code, never assume anything is already there,
# and never leave placeholders like 'OMITTED FOR SPACE'.
# I fucked up before and I won’t do it again.

import re
import collections
from geo_mapper import get_normalized_name, CANONICAL_GEOJSON_NAMES


def clean_id(raw_id):
    """
    Strips periods and symbols so JS doesn't break.
    Example: '1.0.HCount.1.90usd' -> 'ID10HCount190usd'
    """
    clean = re.sub(r'[^a-zA-Z0-9]', '', raw_id)
    if not clean:
        return "IDUnknown"
    # JS keys can't start with numbers easily
    return "ID" + clean if clean[0].isdigit() else clean


def get_live_data(client, source_url, limit=None):
    indicator_catalog, country_catalog = client.get_catalog()

    # If the client marks itself offline (e.g., timeouts), do not keep calling it.
    if getattr(client, "offline", False):
        return [], [], "OFFLINE"

    if not indicator_catalog:
        return [], [], "OFFLINE"

    all_codes = list(indicator_catalog.keys())
    target_codes = all_codes[:limit] if limit else all_codes

    data_list = []
    final_configs = []

    # Track unique countries per indicator
    coverage_tracker = collections.defaultdict(set)

    for code in target_codes:
        if getattr(client, "offline", False):
            break

        info = indicator_catalog[code]
        safe_code = clean_id(code)

        raw_data = client.get_indicator(code)

        if getattr(client, "offline", False):
            break

        local_years = []

        # ------------------------------------------------------------
        # WORLD BANK style
        # ------------------------------------------------------------
        if isinstance(raw_data, list) and getattr(client, "SOURCE_TYPE", "") == "WORLD_BANK":
            for entry in raw_data:
                iso3 = entry.get('countryiso3code')
                raw_label = entry.get('country', {}).get('value', iso3)
                country_name = get_normalized_name(raw_label)

                if country_name not in CANONICAL_GEOJSON_NAMES:
                    continue

                val = entry.get('value')
                yr = entry.get('date')
                if val is not None and yr:
                    try:
                        y_int = int(yr)
                        data_list.append({
                            "country": country_name,
                            "year": y_int,
                            "indicator": safe_code,
                            "value": float(val)
                        })
                        local_years.append(y_int)
                        coverage_tracker[safe_code].add(country_name)
                    except:
                        continue

        # ------------------------------------------------------------
        # WHO GHO style
        # ------------------------------------------------------------
        elif isinstance(raw_data, list) and getattr(client, "SOURCE_TYPE", "") == "WHO_GHO":
            for entry in raw_data:
                if not isinstance(entry, dict):
                    continue
                spatial = entry.get("SpatialDim")
                time_dim = entry.get("TimeDim")
                value = entry.get("NumericValue")

                if not spatial or value is None or time_dim is None:
                    continue

                label = country_catalog.get(str(spatial).strip())
                if not label:
                    continue

                country_name = get_normalized_name(label)
                if country_name not in CANONICAL_GEOJSON_NAMES:
                    continue

                try:
                    y_int, v_float = int(time_dim), float(value)
                    data_list.append({
                        "country": country_name,
                        "year": y_int,
                        "indicator": safe_code,
                        "value": v_float
                    })
                    local_years.append(y_int)
                    coverage_tracker[safe_code].add(country_name)
                except:
                    continue

        # ------------------------------------------------------------
        # IMF style
        # ------------------------------------------------------------
        else:
            if isinstance(raw_data, dict):
                for iso3, years in raw_data.items():
                    # IMF countries catalog entries are usually dicts like {"label": "..."}.
                    # But if you ever feed in a string map, handle that too.
                    entry = country_catalog.get(iso3, iso3)
                    if isinstance(entry, dict):
                        raw_label = entry.get("label", iso3)
                    else:
                        raw_label = entry

                    country_name = get_normalized_name(raw_label)

                    if country_name not in CANONICAL_GEOJSON_NAMES:
                        continue
                    if not isinstance(years, dict):
                        continue

                    for yr, val in years.items():
                        if val is not None:
                            try:
                                y_int = int(yr)
                                data_list.append({
                                    "country": country_name,
                                    "year": y_int,
                                    "indicator": safe_code,
                                    "value": float(val)
                                })
                                local_years.append(y_int)
                                coverage_tracker[safe_code].add(country_name)
                            except:
                                continue

        if local_years:
            final_configs.append({
                "id": safe_code,
                "label": info.get("label", code),
                "unit": info.get("unit", ""),
                "year_min": min(local_years),
                "year_max": max(local_years),
                "_count": len(coverage_tracker[safe_code])
            })

    # SORT BY DATA COVERAGE (Descending)
    final_configs.sort(key=lambda x: x["_count"], reverse=True)

    # --- CONSOLE PRINT OUT ---
    print(f"\n{'='*60}")
    print(f" DATA COVERAGE RANKING ({getattr(client, 'SOURCE_TYPE', 'Unknown Source')})")
    print(f"{'='*60}")
    print(f"{'RANK':<5} {'COUNTRIES':<10} {'ID':<20} {'LABEL'}")
    print(f"{'-'*60}")
    for i, cfg in enumerate(final_configs, 1):
        print(f"{i:<5} {cfg['_count']:<10} {cfg['id'][:18]:<20} {cfg['label'][:50]}")
    print(f"{'='*60}\n")

    # Cleanup temporary key
    for cfg in final_configs:
        cfg.pop("_count", None)

    return data_list, final_configs, source_url
