import os
import requests
import pandas as pd
import time
import pycountry
import re
from datetime import datetime

# --- CONFIGURATION ---
API_KEY = "2d147c86611dcf8c75fea9a142b27171"
TAGS_SERIES_URL = "https://api.stlouisfed.org/fred/tags/series"
OBS_URL = "https://api.stlouisfed.org/fred/series/observations"
SERIES_SEARCH_URL = "https://api.stlouisfed.org/fred/series/search"
CATEGORY_SERIES_URL = "https://api.stlouisfed.org/fred/category/series"
DATA_FILE = 'fred_data.csv'

def clean_indicator_name(title, country_name):
    """
    Removes the country name from the indicator title to create a generic indicator label.
    This allows multiple countries to share the same indicator_label for comparison.
    """
    clean_title = title.upper()
    country_upper = country_name.upper()
    
    # Expanded patterns to catch EVERYTHING
    patterns_to_remove = [
        f" FOR THE {country_upper}",
        f" FOR {country_upper}",
        f" IN THE {country_upper}",
        f" IN {country_upper}",
        f", {country_upper}",
        f" - {country_upper}",
        f": {country_upper}",
        f" ({country_upper})",
        f" {country_upper}",
        f"/{country_upper}",
        f"\\{country_upper}",
    ]
    
    for pattern in patterns_to_remove:
        clean_title = clean_title.replace(pattern, "")
    
    # Also try variations with "THE"
    country_with_the = f" FOR THE {country_upper.replace('THE ', '')}"
    clean_title = clean_title.replace(country_with_the, "")
    
    # Clean up formatting
    clean_title = re.sub(r'\s+', ' ', clean_title).strip()
    clean_title = re.sub(r',\s*$', '', clean_title).strip()
    clean_title = re.sub(r'^\s*,', '', clean_title).strip()
    
    return clean_title

def get_all_national_series():
    """Fetches ALL series tagged with 'nation' and 'annual' - COMPLETE PAGINATION."""
    print("📡 PHASE 1: Pulling ALL National+Annual tagged series...")
    
    all_series = []
    offset = 0
    limit = 1000
    
    while True:
        print(f"   → Batch at offset {offset}...")
        params = {
            'tag_names': 'nation;annual',
            'api_key': API_KEY,
            'file_type': 'json',
            'limit': limit,
            'offset': offset,
            'order_by': 'popularity',
            'sort_order': 'desc'
        }
        
        try:
            res = requests.get(TAGS_SERIES_URL, params=params, timeout=20)
            if res.status_code == 200:
                batch = res.json().get('seriess', [])
                
                if not batch:
                    break
                
                all_series.extend(batch)
                print(f"   ✓ {len(batch)} series | Total: {len(all_series)}")
                
                if len(batch) < limit:
                    break
                
                offset += limit
                time.sleep(0.3)
            else:
                print(f"   ✗ API error {res.status_code}")
                break
        except Exception as e:
            print(f"   ✗ {e}")
            break
    
    return all_series

def get_all_annual_series():
    """Gets ALL annual series regardless of tags - the nuclear option."""
    print("\n📡 PHASE 2: Pulling ALL Annual series (no tag filters)...")
    
    all_series = []
    offset = 0
    limit = 1000
    
    while True:
        print(f"   → Batch at offset {offset}...")
        params = {
            'tag_names': 'annual',  # ONLY annual filter, no nation requirement
            'api_key': API_KEY,
            'file_type': 'json',
            'limit': limit,
            'offset': offset,
            'order_by': 'popularity',
            'sort_order': 'desc'
        }
        
        try:
            res = requests.get(TAGS_SERIES_URL, params=params, timeout=20)
            if res.status_code == 200:
                batch = res.json().get('seriess', [])
                
                if not batch:
                    break
                
                all_series.extend(batch)
                print(f"   ✓ {len(batch)} series | Total: {len(all_series)}")
                
                if len(batch) < limit:
                    break
                
                offset += limit
                time.sleep(0.3)
            else:
                print(f"   ✗ API error {res.status_code}")
                break
        except Exception as e:
            print(f"   ✗ {e}")
            break
    
    return all_series

def search_every_country(countries):
    """Searches FRED for every single country name to find all possible series."""
    print("\n📡 PHASE 3: Searching for EVERY country individually...")
    
    additional_series = []
    
    for name_key, (full_name, iso3) in countries.items():
        print(f"   → Searching '{full_name}'...")
        
        # Try multiple search variations
        search_terms = [full_name, iso3, name_key]
        
        for term in set(search_terms):  # dedupe
            params = {
                'search_text': term,
                'api_key': API_KEY,
                'file_type': 'json',
                'limit': 1000,
                'order_by': 'popularity',
                'sort_order': 'desc'
            }
            
            try:
                res = requests.get(SERIES_SEARCH_URL, params=params, timeout=15)
                if res.status_code == 200:
                    batch = res.json().get('seriess', [])
                    additional_series.extend(batch)
                    if batch:
                        print(f"      ✓ '{term}': {len(batch)} series")
                time.sleep(0.3)
            except Exception as e:
                print(f"      ✗ Error on '{term}': {e}")
    
    return additional_series

def main():
    start_time = datetime.now()
    print(f"\n{'#'*70}")
    print(f"# ULTIMATE FRED DATA SCRAPER - GET EVERYTHING MODE")
    print(f"# Started: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#'*70}\n")
    
    # Build comprehensive country list
    countries = {c.name.lower(): (c.name, c.alpha_3) for c in pycountry.countries}
    
    # Add EVERY possible alias you can think of
    aliases = {
        "russia": ("Russian Federation", "RUS"),
        "south korea": ("Korea, Republic of", "KOR"),
        "north korea": ("Korea, Democratic People's Republic of", "PRK"),
        "united states": ("United States", "USA"),
        "uk": ("United Kingdom", "GBR"),
        "britain": ("United Kingdom", "GBR"),
        "us": ("United States", "USA"),
        "usa": ("United States", "USA"),
        "ussr": ("Russian Federation", "RUS"),
        "soviet union": ("Russian Federation", "RUS"),
        "congo": ("Congo", "COG"),
        "czech": ("Czechia", "CZE"),
        "holland": ("Netherlands", "NLD"),
        "burma": ("Myanmar", "MMR"),
        "persia": ("Iran", "IRN"),
        "siam": ("Thailand", "THA"),
    }
    countries.update(aliases)
    
    all_rows = []
    processed_ids = set()
    
    # PHASE 1: Get all nation+annual tagged series
    phase1 = get_all_national_series()
    print(f"\n✅ PHASE 1 COMPLETE: {len(phase1)} series")
    
    # PHASE 2: Get ALL annual series (nuclear option)
    phase2 = get_all_annual_series()
    print(f"\n✅ PHASE 2 COMPLETE: {len(phase2)} series")
    
    # PHASE 3: Search for every country
    phase3 = search_every_country(countries)
    print(f"\n✅ PHASE 3 COMPLETE: {len(phase3)} series")
    
    # Combine and deduplicate
    all_meta = {s['id']: s for s in (phase1 + phase2 + phase3)}.values()
    total_series = len(all_meta)
    
    print(f"\n{'='*70}")
    print(f"TOTAL UNIQUE SERIES TO PROCESS: {total_series}")
    print(f"{'='*70}\n")
    
    # Process every single series
    for idx, series in enumerate(all_meta, 1):
        title = series['title']
        sid = series['id']
        units = series.get('units', 'Unknown')
        frequency = series.get('frequency_short', 'Unknown')
        
        # Only process if it's actually annual data
        if frequency not in ['A', 'Annual']:
            continue
        
        # Try to match to a country
        matched_country = None
        matched_iso = None
        
        for name_key, (full_name, iso3) in countries.items():
            if name_key in title.lower():
                matched_country = full_name
                matched_iso = iso3
                break
        
        # Progress updates
        if idx % 100 == 0:
            elapsed = (datetime.now() - start_time).total_seconds()
            rate = idx / elapsed if elapsed > 0 else 0
            remaining = (total_series - idx) / rate if rate > 0 else 0
            print(f"\n{'='*70}")
            print(f"PROGRESS: {idx}/{total_series} ({(idx/total_series)*100:.1f}%)")
            print(f"Matched so far: {len(processed_ids)} series | {len(all_rows)} data points")
            print(f"Rate: {rate:.1f} series/sec | ETA: {remaining/60:.1f} minutes")
            print(f"{'='*70}")
        
        if matched_country and sid not in processed_ids:
            # Clean the indicator name
            cleaned_indicator = clean_indicator_name(title, matched_country)
            
            print(f"[{idx}/{total_series}] 📥 {matched_country[:20]}: {cleaned_indicator[:50]}...")
            
            # Fetch observations
            obs_params = {'series_id': sid, 'api_key': API_KEY, 'file_type': 'json', 'sort_order': 'asc'}
            try:
                res = requests.get(OBS_URL, params=obs_params, timeout=10)
                if res.status_code == 200:
                    observations = res.json().get('observations', [])
                    row_count = 0
                    for obs in observations:
                        if obs['value'] not in [".", None, "", " "]:
                            try:
                                # Validate it's actually a number
                                float(obs['value'])
                                all_rows.append({
                                    "country": matched_country,
                                    "iso3": matched_iso,
                                    "year": int(obs['date'][:4]),
                                    "indicator_label": cleaned_indicator,
                                    "unit": units,
                                    "value": obs['value']
                                })
                                row_count += 1
                            except:
                                pass  # Skip non-numeric values
                    
                    if row_count > 0:
                        print(f"   ✓ {row_count} points")
                        processed_ids.add(sid)
                    
            except Exception as e:
                print(f"   ✗ Error: {e}")
            
            # Save progress FREQUENTLY (every 100 series)
            if len(processed_ids) % 100 == 0 and len(all_rows) > 0:
                temp_df = pd.DataFrame(all_rows)
                temp_df.to_csv(DATA_FILE, index=False)
                print(f"\n💾 CHECKPOINT SAVED: {len(all_rows)} rows\n")
            
            time.sleep(0.35)  # Rate limiting
    
    # FINAL PROCESSING
    print(f"\n\n{'#'*70}")
    print(f"# PROCESSING FINAL DATA")
    print(f"{'#'*70}\n")
    
    if all_rows:
        df = pd.DataFrame(all_rows)
        
        print(f"Raw rows collected: {len(df)}")
        
        # Convert values to numeric
        df['value'] = pd.to_numeric(df['value'], errors='coerce')
        df = df.dropna(subset=['value'])
        print(f"After removing non-numeric: {len(df)}")
        
        # Remove duplicates
        before_dedup = len(df)
        df = df.drop_duplicates(subset=['country', 'year', 'indicator_label'], keep='first')
        print(f"After deduplication: {len(df)} (removed {before_dedup - len(df)} dupes)")
        
        # Sort by country, indicator, year
        df = df.sort_values(['country', 'indicator_label', 'year'])
        
        # COMPREHENSIVE SUMMARY
        print(f"\n{'='*70}")
        print(f"FINAL DATASET SUMMARY")
        print(f"{'='*70}")
        print(f"Total rows: {len(df):,}")
        print(f"Unique indicators: {df['indicator_label'].nunique():,}")
        print(f"Unique countries: {df['country'].nunique()}")
        print(f"Year range: {df['year'].min()} - {df['year'].max()}")
        print(f"Series processed: {len(processed_ids):,}")
        
        print(f"\n📊 COUNTRIES IN DATASET ({df['country'].nunique()}):")
        country_stats = df.groupby('country').agg({
            'indicator_label': 'nunique',
            'year': ['min', 'max'],
            'value': 'count'
        }).sort_values(('value', 'count'), ascending=False)
        
        for country in country_stats.index:
            indicators = country_stats.loc[country, ('indicator_label', 'nunique')]
            points = country_stats.loc[country, ('value', 'count')]
            year_min = country_stats.loc[country, ('year', 'min')]
            year_max = country_stats.loc[country, ('year', 'max')]
            print(f"  • {country}: {indicators} indicators, {points} points ({year_min}-{year_max})")
        
        print(f"\n🎯 TOP 30 INDICATORS BY COUNTRY COVERAGE:")
        indicator_coverage = df.groupby('indicator_label').agg({
            'country': 'nunique',
            'year': 'nunique',
            'value': 'count'
        }).sort_values('country', ascending=False).head(30)
        
        for idx, (indicator, row) in enumerate(indicator_coverage.iterrows(), 1):
            countries = row['country']
            years = row['year']
            points = row['value']
            print(f"  {idx}. {indicator[:65]}")
            print(f"     → {countries} countries, {years} years, {points} data points")
        
        # Save final file
        df.to_csv(DATA_FILE, index=False)
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print(f"\n{'#'*70}")
        print(f"# MISSION COMPLETE")
        print(f"# Duration: {duration/60:.1f} minutes")
        print(f"# Output: {DATA_FILE}")
        print(f"# Rows: {len(df):,}")
        print(f"{'#'*70}\n")
        
    else:
        print("❌ NO DATA COLLECTED!")

if __name__ == "__main__":
    main()