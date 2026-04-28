# Here is the entire file you asked for — not snippets, the entire thing.
# I have not removed, shortened, or modified any part of your original code.
# This file is complete and can be copy-pasted directly into a blank document.
# I will never omit code, never assume anything is already there,
# and never leave placeholders like 'OMITTED FOR SPACE'.
# I fucked up before and I won’t do it again.

import random
import requests
import collections
from typing import Any, Dict, List, Optional, Tuple

from geo_mapper import get_normalized_name, CANONICAL_GEOJSON_NAMES
from bundler_utils import clean_id, save_as_bundle


CONNECT_TIMEOUT = 5
READ_TIMEOUT = 30
TIMEOUT = (CONNECT_TIMEOUT, READ_TIMEOUT)


class WorldBankClient:
    SOURCE_TYPE = "WORLD_BANK"

    def __init__(self):
        self.base_url = "https://api.worldbank.org/v2"
        self.session = requests.Session()
        self.offline = False
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        ]

    def _headers(self) -> Dict[str, str]:
        return {
            "User-Agent": random.choice(self.user_agents),
            "Accept": "application/json",
        }

    def _get_json(self, url: str) -> Any:
        resp = self.session.get(url, timeout=TIMEOUT, headers=self._headers())
        if resp.status_code < 200 or resp.status_code >= 300:
            body = (resp.text or "")[:300].replace("\n", "\\n")
            raise RuntimeError(f"HTTP {resp.status_code} for {url} | body[:300]={body}")
        return resp.json()

    def get_catalog(self) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        indicators: { code: {label: ...} }
        countries: { iso3: 'Country Name' }  (we keep it simple)
        """
        if self.offline:
            return {}, {}

        try:
            # Indicators: huge list
            ind_url = f"{self.base_url}/indicator?format=json&per_page=20000"
            ind_json = self._get_json(ind_url)

            # Countries
            c_url = f"{self.base_url}/country?format=json&per_page=400"
            c_json = self._get_json(c_url)

            indicators: Dict[str, Any] = {}
            if isinstance(ind_json, list) and len(ind_json) >= 2 and isinstance(ind_json[1], list):
                for row in ind_json[1]:
                    code = row.get("id")
                    if not code:
                        continue
                    indicators[code] = {
                        "label": row.get("name", code),
                        "unit": "",
                    }

            countries: Dict[str, str] = {}
            if isinstance(c_json, list) and len(c_json) >= 2 and isinstance(c_json[1], list):
                for row in c_json[1]:
                    iso3 = row.get("id")
                    nm = row.get("name") or iso3
                    if iso3:
                        countries[str(iso3).strip()] = str(nm).strip()

            if not indicators:
                print("[WORLD_BANK] Indicator catalog empty — marking OFFLINE.")
                self.offline = True
                return {}, {}

            return indicators, countries

        except Exception as e:
            print(f"[WORLD_BANK] Catalog error: {e}")
            self.offline = True
            return {}, {}

    def get_indicator_values(self, indicator_code: str) -> List[Dict[str, Any]]:
        """
        GET /country/all/indicator/{code}?format=json
        Returns list entries with fields including:
          countryiso3code, country.value, date, value
        """
        if self.offline:
            return []

        try:
            url = f"{self.base_url}/country/all/indicator/{indicator_code}?format=json&per_page=20000"
            data = self._get_json(url)

            if isinstance(data, list) and len(data) >= 2 and isinstance(data[1], list):
                return data[1]
            return []

        except Exception as e:
            print(f"[WORLD_BANK] Indicator error ({indicator_code}): {e}")
            self.offline = True
            return []


def build_worldbank_dataset(
    *,
    dataset_id: str = "world_bank_data",
    filename: str = "02_world_bank.js",
    base_output_dir: str = ".",
    compressor: bool = True,
    limit_indicators: Optional[int] = None,
) -> None:
    client = WorldBankClient()

    indicator_catalog, country_catalog = client.get_catalog()
    if client.offline or not indicator_catalog:
        print("[WORLD_BANK] OFFLINE — stopping.")
        return

    all_codes = list(indicator_catalog.keys())
    target_codes = all_codes[:limit_indicators] if limit_indicators else all_codes

    data_list: List[Dict[str, Any]] = []
    final_configs: List[Dict[str, Any]] = []
    coverage_tracker = collections.defaultdict(set)

    for code in target_codes:
        if client.offline:
            break

        info = indicator_catalog.get(code, {})
        safe_code = clean_id(code)

        rows = client.get_indicator_values(code)
        if client.offline:
            break

        local_years: List[int] = []

        for entry in rows:
            if not isinstance(entry, dict):
                continue

            iso3 = entry.get("countryiso3code")
            raw_label = (entry.get("country") or {}).get("value") or country_catalog.get(str(iso3), iso3)
            country_name = get_normalized_name(raw_label)

            if country_name not in CANONICAL_GEOJSON_NAMES:
                continue

            val = entry.get("value")
            yr = entry.get("date")
            if val is None or yr is None:
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
            final_configs.append(
                {
                    "id": safe_code,
                    "label": info.get("label", code),
                    "unit": info.get("unit", ""),
                    "year_min": min(local_years),
                    "year_max": max(local_years),
                    "_count": len(coverage_tracker[safe_code]),
                }
            )

    final_configs.sort(key=lambda x: x.get("_count", 0), reverse=True)

    print("\n" + "=" * 70)
    print(" WORLD BANK DATA COVERAGE RANKING (by #countries present)")
    print("=" * 70)
    print(f"{'RANK':<6}{'COUNTRIES':<12}{'ID':<22}{'LABEL'}")
    print("-" * 70)
    for i, cfg in enumerate(final_configs, 1):
        print(f"{i:<6}{cfg.get('_count', 0):<12}{cfg.get('id','')[:20]:<22}{str(cfg.get('label',''))[:60]}")
    print("=" * 70 + "\n")

    for cfg in final_configs:
        cfg.pop("_count", None)

    save_as_bundle(
        dataset_id=dataset_id,
        data=data_list,
        indicator_configs=final_configs,
        filename=filename,
        base_output_dir=base_output_dir,
        compressor=compressor,
    )
