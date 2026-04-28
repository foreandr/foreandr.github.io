import os
import sys
import time
import requests
import pandas as pd
import random

# 1. SETUP PATHS AND IMPORTS
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import config
import utils
import data_cleaner 

# --- SETTINGS ---
BASE = "https://www.imf.org/external/datamapper/api/v1"
INDICATORS_URL = f"{BASE}/indicators"
COUNTRIES_URL = f"{BASE}/countries"

DATA_FILE = 'imf_data.csv'
MIN_ENTITIES = 28 
MIN_TIME_STEPS = 12 

def get_data(url):
    """Base API helper with headers and timeout."""
    headers = {"User-Agent": "python-requests imf-dump", "Accept": "application/json"}
    try:
        r = requests.get(url, headers=headers, timeout=(10, 60))
        return r.json() if r.status_code == 200 else None
    except Exception:
        return None

def main(limit=250):
    print(f"--- STARTING IMF PIPELINE ---")
    print(f"Targeting: {limit} indicators | Min Entities: {MIN_ENTITIES} | Min Steps: {MIN_TIME_STEPS}")

    # 1. Fetch Catalogs
    ind_data = get_data(INDICATORS_URL)
    count_data = get_data(COUNTRIES_URL)
    
    if not ind_data or not count_data:
        print("Error: Could not fetch IMF catalogs.")
        return

    ind_catalog = ind_data.get("indicators", {})
    count_catalog = count_data.get("countries", {})
    
    all_codes = sorted(list(ind_catalog.keys()))
    if limit:
        all_codes = all_codes[:limit]
    
    # Shuffle for variety if running with a limit
    random.shuffle(all_codes)

    # 2. Process Indicators
    for idx, code in enumerate(all_codes, 1):
        try:
            info = ind_catalog.get(code, {})
            ind_name = info.get("label", "Unknown")
            print(f"\n[{idx}/{len(all_codes)}] Fetching: {ind_name} ({code})")
            
            data = get_data(f"{BASE}/{code}")
            if not data or "values" not in data:
                print(f"    ! No values found for: {code}")
                continue

            # Parse raw JSON into list of dicts
            raw_rows = []
            values = data.get("values", {}).get(code, {})
            
            for iso3, years in values.items():
                country_label = count_catalog.get(iso3, {}).get("label", iso3)
                if isinstance(years, dict):
                    for year, val in years.items():
                        raw_rows.append({
                            "country": country_label,
                            "iso3": iso3,
                            "year": year,
                            "indicator_label": ind_name,
                            "unit": info.get("unit", ""),
                            "value": val
                        })

            if not raw_rows:
                continue

            # 3. CLEAN & AUDIT (Using your agnostic auditor)
            raw_df = pd.DataFrame(raw_rows)
            processed_df = data_cleaner.analyze_data_quality(
                raw_df, 
                min_entities=MIN_ENTITIES, 
                min_time_steps=MIN_TIME_STEPS
            )

            # 4. SAVE (Append mode)
            if processed_df is not None:
                file_exists = os.path.isfile(DATA_FILE)
                processed_df.to_csv(DATA_FILE, mode='a', index=False, header=not file_exists)
                print(f"SUCCESS: Saved {len(processed_df)} rows to {DATA_FILE}")
            else:
                print(f"SKIPPED: {code} failed quality audit.")

            time.sleep(0.2) # Polite delay

        except Exception as e:
            print(f"CRITICAL ERROR on {code}: {e}")
            continue

    print("\n--- IMF PIPELINE COMPLETE ---")

if __name__ == "__main__":
    # Change limit=None for full catalog run
    main(limit=None)