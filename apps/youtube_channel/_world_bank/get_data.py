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
BASE_URL = "https://api.worldbank.org/v2"
DATA_FILE = 'worldbank_data.csv'
MIN_ENTITIES = 28 
MIN_TIME_STEPS = 12  # <--- NEW SETTING

def get_wb_data(endpoint, params=None):
    """Base API helper with timeout and basic error handling."""
    default_params = {"format": "json", "per_page": 1000}
    if params: 
        default_params.update(params)
    try:
        r = requests.get(f"{BASE_URL}/{endpoint}", params=default_params, timeout=(5, 30))
        return r.json() if r.status_code == 200 else None
    except Exception:
        return None

def fetch_to_dataframe(ind_code, ind_name):
    """Fetches data and handles potential NoneType or malformed API responses."""
    print(f"\nFetching: {ind_name}")
    res = get_wb_data(f"country/all/indicator/{ind_code}", {"date": "1990:2025"})
    
    if not isinstance(res, list) or len(res) < 2:
        print(f"   ! No valid data list found for: {ind_name}")
        return None

    rows = []
    for item in res[1]:
        try:
            val = item.get('value')
            date_raw = item.get('date')
            if val is not None and date_raw is not None:
                rows.append({
                    "country": item['country']['value'],
                    "year": date_raw,
                    "indicator_label": ind_name,
                    "value": val
                })
        except (KeyError, TypeError, AttributeError):
            continue
            
    return pd.DataFrame(rows) if rows else None

def main(limit=250):
    print(f"--- STARTING PIPELINE ---")
    print(f"Targeting top {limit} indicators | Min Entities: {MIN_ENTITIES} | Min Steps: {MIN_TIME_STEPS}")
    
    catalog = get_wb_data("indicator", {"page": 1, "per_page": limit})

    if not catalog or not isinstance(catalog, list) or len(catalog) < 2:
        print("Error: Could not fetch indicator catalog.")
        return

    # Correctly shuffle only the list of indicators (index 1)
    indicators = catalog[1]
    random.shuffle(indicators)

    for indicator in indicators:
        try:
            ind_id = indicator.get('id')
            ind_name = indicator.get('name')
            
            if not ind_id: continue

            # 1. FETCH
            raw_df = fetch_to_dataframe(ind_id, ind_name)
            
            if raw_df is not None:
                # 2. CLEAN & AUDIT
                processed_df = data_cleaner.analyze_data_quality(
                    raw_df, 
                    min_entities=MIN_ENTITIES, 
                    min_time_steps=MIN_TIME_STEPS
                )
                
                if processed_df is not None:
                    # 3. SAVE
                    file_exists = os.path.isfile(DATA_FILE)
                    processed_df.to_csv(DATA_FILE, mode='a', index=False, header=not file_exists)
                    print(f"SUCCESS: {ind_name} saved to {DATA_FILE}")
                else:
                    print(f"SKIPPED: {ind_name} failed quality audit.")
            
            time.sleep(0.1)

        except Exception as e:
            print(f"CRITICAL ERROR on {indicator.get('name', 'Unknown')}: {e}")
            continue

    print("\n--- PIPELINE COMPLETE ---")

if __name__ == "__main__":
    main(limit=10000) 