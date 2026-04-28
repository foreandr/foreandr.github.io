"""
main.py — Natural Resources data pipeline
==========================================
Step 1: Rename raw CSVs to sensible names (idempotent).
Step 2: Parse both CSVs and emit data/resources.js matching the
        window.RESOURCE_DATA structure consumed by script.js.

Sources
-------
  minerals.csv  — BGS World Mineral Statistics (production, 1971-1976)
  energy.csv    — BP Statistical Review of World Energy (1965-2024)

Run:   python main.py
Output: data/resources.js  (overwrites existing file)
"""

import os
import json
import math
import re
import pandas as pd

# ── paths ─────────────────────────────────────────────────────────────────────
BASE = os.path.dirname(os.path.abspath(__file__))
RAW_MINERALS_NAMES = [
    'Minerals_Data_Export.csv',
    'minerals.csv',
]
RAW_ENERGY_NAMES = [
    'Statistical Review of World Energy Narrow format.csv',
    'energy.csv',
]
MINERALS_DEST = os.path.join(BASE, 'minerals.csv')
ENERGY_DEST   = os.path.join(BASE, 'energy.csv')
OUT_JS        = os.path.join(BASE, 'data', 'resources.js')


# ── Step 1: rename CSVs ───────────────────────────────────────────────────────
def rename_csvs():
    for name in RAW_MINERALS_NAMES:
        src = os.path.join(BASE, name)
        if os.path.exists(src) and src != MINERALS_DEST:
            os.rename(src, MINERALS_DEST)
            print('Renamed -> minerals.csv')
            break

    for name in RAW_ENERGY_NAMES:
        src = os.path.join(BASE, name)
        if os.path.exists(src) and src != ENERGY_DEST:
            os.rename(src, ENERGY_DEST)
            print('Renamed -> energy.csv')
            break


# ── ISO helpers ───────────────────────────────────────────────────────────────
# ISO2 → ISO3 lookup (comprehensive)
ISO2_TO_ISO3 = {
    'AF':'AFG','AL':'ALB','DZ':'DZA','AD':'AND','AO':'AGO','AG':'ATG','AR':'ARG',
    'AM':'ARM','AU':'AUS','AT':'AUT','AZ':'AZE','BS':'BHS','BH':'BHR','BD':'BGD',
    'BB':'BRB','BY':'BLR','BE':'BEL','BZ':'BLZ','BJ':'BEN','BT':'BTN','BO':'BOL',
    'BA':'BIH','BW':'BWA','BR':'BRA','BN':'BRN','BG':'BGR','BF':'BFA','BI':'BDI',
    'KH':'KHM','CM':'CMR','CA':'CAN','CV':'CPV','CF':'CAF','TD':'TCD','CL':'CHL',
    'CN':'CHN','CO':'COL','KM':'COM','CG':'COG','CD':'COD','CR':'CRI','CI':'CIV',
    'HR':'HRV','CU':'CUB','CY':'CYP','CZ':'CZE','DK':'DNK','DJ':'DJI','DM':'DMA',
    'DO':'DOM','EC':'ECU','EG':'EGY','SV':'SLV','GQ':'GNQ','ER':'ERI','EE':'EST',
    'ET':'ETH','FJ':'FJI','FI':'FIN','FR':'FRA','GA':'GAB','GM':'GMB','GE':'GEO',
    'DE':'DEU','GH':'GHA','GR':'GRC','GD':'GRD','GT':'GTM','GN':'GIN','GW':'GNB',
    'GY':'GUY','HT':'HTI','HN':'HND','HU':'HUN','IS':'ISL','IN':'IND','ID':'IDN',
    'IR':'IRN','IQ':'IRQ','IE':'IRL','IL':'ISR','IT':'ITA','JM':'JAM','JP':'JPN',
    'JO':'JOR','KZ':'KAZ','KE':'KEN','KI':'KIR','KP':'PRK','KR':'KOR','KW':'KWT',
    'KG':'KGZ','LA':'LAO','LV':'LVA','LB':'LBN','LS':'LSO','LR':'LBR','LY':'LBY',
    'LI':'LIE','LT':'LTU','LU':'LUX','MG':'MDG','MW':'MWI','MY':'MYS','MV':'MDV',
    'ML':'MLI','MT':'MLT','MH':'MHL','MR':'MRT','MU':'MUS','MX':'MEX','FM':'FSM',
    'MD':'MDA','MC':'MCO','MN':'MNG','ME':'MNE','MA':'MAR','MZ':'MOZ','MM':'MMR',
    'NA':'NAM','NR':'NRU','NP':'NPL','NL':'NLD','NZ':'NZL','NI':'NIC','NE':'NER',
    'NG':'NGA','MK':'MKD','NO':'NOR','OM':'OMN','PK':'PAK','PW':'PLW','PA':'PAN',
    'PG':'PNG','PY':'PRY','PE':'PER','PH':'PHL','PL':'POL','PT':'PRT','QA':'QAT',
    'RO':'ROU','RU':'RUS','RW':'RWA','KN':'KNA','LC':'LCA','VC':'VCT','WS':'WSM',
    'SM':'SMR','ST':'STP','SA':'SAU','SN':'SEN','RS':'SRB','SC':'SYC','SL':'SLE',
    'SG':'SGP','SK':'SVK','SI':'SVN','SB':'SLB','SO':'SOM','ZA':'ZAF','SS':'SSD',
    'ES':'ESP','LK':'LKA','SD':'SDN','SR':'SUR','SZ':'SWZ','SE':'SWE','CH':'CHE',
    'SY':'SYR','TW':'TWN','TJ':'TJK','TZ':'TZA','TH':'THA','TL':'TLS','TG':'TGO',
    'TO':'TON','TT':'TTO','TN':'TUN','TR':'TUR','TM':'TKM','TV':'TUV','UG':'UGA',
    'UA':'UKR','AE':'ARE','GB':'GBR','US':'USA','UY':'URY','UZ':'UZB','VU':'VUT',
    'VE':'VEN','VN':'VNM','YE':'YEM','ZM':'ZMB','ZW':'ZWE','HK':'HKG','MO':'MAC',
    'PS':'PSE','XK':'XKX','TZ':'TZA','SZ':'SWZ',
}

# Country name → ISO3 for the energy CSV (which uses full names)
# We rely on the ISO3166_alpha3 column already present — no manual map needed there.


def safe_float(v):
    """Return float or None for NaN/inf."""
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


# ── Step 2: parse energy CSV ──────────────────────────────────────────────────
# Variable → (resource_id, unit, unitShort, label, category, description, scale)
# scale: multiply raw value by this to get output unit
ENERGY_VAR_MAP = {
    # Oil production: kbd (thousand barrels/day) → Mt/year roughly, but
    # BP reports oilprod_mt in million tonnes — we use that.
    # Reserves not in this CSV, so we skip proved reserves here and use production.
    'oilprod_mt':        ('oil_prod',      'million tonnes/yr',   'Mt/yr',
                          'Oil Production', 'Energy',
                          'Crude oil + NGL production (BP Statistical Review)', 1.0),
    'gasprod_bcm':       ('gas_prod',      'billion m³/yr',       'Gm³/yr',
                          'Natural Gas Production', 'Energy',
                          'Dry natural gas production (BP Statistical Review)', 1.0),
    'coalprod_mt':       ('coal_prod',     'million tonnes/yr',   'Mt/yr',
                          'Coal Production', 'Energy',
                          'Commercial solid fuels production (BP Statistical Review)', 1.0),
    'nuclear_twh':       ('nuclear_gen',   'TWh/yr',              'TWh/yr',
                          'Nuclear Generation', 'Energy',
                          'Nuclear electricity generation (BP Statistical Review)', 1.0),
    'hydro_twh':         ('hydro_gen',     'TWh/yr',              'TWh/yr',
                          'Hydropower Generation', 'Energy',
                          'Hydro electricity generation (BP Statistical Review)', 1.0),
    'solar_twh':         ('solar_gen',     'TWh/yr',              'TWh/yr',
                          'Solar Generation', 'Energy',
                          'Solar electricity generation (BP Statistical Review)', 1.0),
    'wind_twh':          ('wind_gen',      'TWh/yr',              'TWh/yr',
                          'Wind Generation', 'Energy',
                          'Wind electricity generation (BP Statistical Review)', 1.0),
    'co2_combust_mtco2': ('co2_energy',   'million tonnes CO2/yr','Mt CO2/yr',
                          'Energy CO₂ Emissions', 'Energy',
                          'CO₂ from energy combustion (BP Statistical Review)', 1.0),
    # Minerals embedded in BP data
    'cobalt_kt':         ('cobalt_prod',   'thousand tonnes/yr',  'kt/yr',
                          'Cobalt Production', 'Metals',
                          'Cobalt mine production (BP Statistical Review)', 1.0),
    'cobaltres_kt':      ('cobalt_res',    'thousand tonnes',     'kt',
                          'Cobalt Reserves', 'Metals',
                          'Cobalt known reserves (BP Statistical Review)', 1.0),
    'lithium_kt':        ('lithium_prod',  'thousand tonnes/yr',  'kt/yr',
                          'Lithium Production', 'Metals',
                          'Lithium mine production (BP Statistical Review)', 1.0),
    'lithiumres_kt':     ('lithium_res',   'thousand tonnes',     'kt',
                          'Lithium Reserves', 'Metals',
                          'Lithium known reserves (BP Statistical Review)', 1.0),
    'graphite_kt':       ('graphite_prod', 'thousand tonnes/yr',  'kt/yr',
                          'Graphite Production', 'Metals',
                          'Natural graphite production (BP Statistical Review)', 1.0),
    'graphiteres_kt':    ('graphite_res',  'thousand tonnes',     'kt',
                          'Graphite Reserves', 'Metals',
                          'Natural graphite reserves (BP Statistical Review)', 1.0),
    'rareearths_kt':     ('ree_prod',      'thousand tonnes/yr',  'kt/yr',
                          'Rare Earth Production', 'Metals',
                          'Rare earth elements mine production (BP Statistical Review)', 1.0),
    'rareearthsres_kt':  ('ree_res',       'thousand tonnes',     'kt',
                          'Rare Earth Reserves', 'Metals',
                          'Rare earth elements reserves (BP Statistical Review)', 1.0),
}

# Minerals CSV commodity → (resource_id, keep_units)
# Only commodities we actually care about and that aren't already in energy CSV
MINERAL_COMMODITY_MAP = {
    'copper, mine':               ('copper_prod',   ['tonnes (metal content)']),
    'gold, mine':                 ('gold_prod',     ['kilograms']),                        # BGS reports gold in kg
    'silver, mine':               ('silver_prod',   ['kilograms (metal content)']),
    'iron ore':                   ('iron_prod',     ['tonnes (metric)']),
    'nickel, mine':               ('nickel_prod',   ['tonnes (metal content)']),
    'zinc, mine':                 ('zinc_prod',     ['tonnes (metal content)']),
    'lead, mine':                 ('lead_prod',     ['tonnes (metal content)']),
    'platinum group metals, mine':('pgm_prod',      ['kilograms (metal content)']),
    'phosphate rock':             ('phosphate_prod',['tonnes (metric)']),
    'potash':                     ('potash_prod',   ['tonnes (K20 content)']),
    'manganese ore':              ('manganese_prod',['tonnes (metric)']),
    'chromium ores and concentrates': ('chromium_prod', ['tonnes (metric)']),
    'bauxite':                    ('bauxite_prod',  ['tonnes (metric)']),
    'salt':                       ('salt_prod',     ['tonnes (metric)']),
    'diamond':                    ('diamond_prod',  ['Carats']),
    'coal':                       ('coal_bgsprod',  ['tonnes (metric)']),
}

# Minerals resource metadata
MINERAL_META = {
    'copper_prod':    ('Copper Production',     'Metals',     'thousand tonnes/yr', 'kt/yr',
                       'Copper mine production (BGS World Mineral Statistics)', 0.001),
    'gold_prod':      ('Gold Production',       'Metals',     'tonnes/yr',          't/yr',
                       'Gold mine production (BGS World Mineral Statistics)', 0.001),   # kg→t
    'silver_prod':    ('Silver Production',     'Metals',     'tonnes/yr',          't/yr',
                       'Silver mine production (BGS World Mineral Statistics)', 0.001),
    'iron_prod':      ('Iron Ore Production',   'Metals',     'million tonnes/yr',  'Mt/yr',
                       'Iron ore production metal content (BGS World Mineral Statistics)', 1e-6),
    'nickel_prod':    ('Nickel Production',     'Metals',     'thousand tonnes/yr', 'kt/yr',
                       'Nickel mine production (BGS World Mineral Statistics)', 0.001),
    'zinc_prod':      ('Zinc Production',       'Metals',     'thousand tonnes/yr', 'kt/yr',
                       'Zinc mine production (BGS World Mineral Statistics)', 0.001),
    'lead_prod':      ('Lead Production',       'Metals',     'thousand tonnes/yr', 'kt/yr',
                       'Lead mine production (BGS World Mineral Statistics)', 0.001),
    'pgm_prod':       ('Platinum Group Metals', 'Metals',     'tonnes/yr',          't/yr',
                       'PGM mine production (BGS World Mineral Statistics)', 0.001),
    'phosphate_prod': ('Phosphate Rock',        'Metals',     'million tonnes/yr',  'Mt/yr',
                       'Phosphate rock production (BGS World Mineral Statistics)', 1e-6),
    'potash_prod':    ('Potash Production',     'Renewables', 'million tonnes/yr',  'Mt/yr',
                       'Potash (K₂O equivalent) production (BGS World Mineral Statistics)', 1e-6),
    'manganese_prod': ('Manganese Production',  'Metals',     'thousand tonnes/yr', 'kt/yr',
                       'Manganese ore production (BGS World Mineral Statistics)', 0.001),
    'chromium_prod':  ('Chromium Production',   'Metals',     'thousand tonnes/yr', 'kt/yr',
                       'Chromium ore production (BGS World Mineral Statistics)', 0.001),
    'bauxite_prod':   ('Bauxite Production',    'Metals',     'million tonnes/yr',  'Mt/yr',
                       'Bauxite production (BGS World Mineral Statistics)', 1e-6),
    'salt_prod':      ('Salt Production',       'Renewables', 'million tonnes/yr',  'Mt/yr',
                       'Salt production (BGS World Mineral Statistics)', 1e-6),
    'diamond_prod':   ('Diamond Production',    'Metals',     'million carats/yr',  'Mct/yr',
                       'Diamond production (BGS World Mineral Statistics)', 1e-6),
    'coal_bgsprod':   ('Coal Production (BGS)', 'Energy',     'million tonnes/yr',  'Mt/yr',
                       'Coal production (BGS World Mineral Statistics)', 1e-6),
}


def parse_energy_csv():
    """
    Returns dict: { iso3 -> { var_resource_id -> { year -> value } } }
    and the set of resource_ids found.
    """
    print('Parsing energy CSV...')
    df = pd.read_csv(ENERGY_DEST, encoding='utf-8', low_memory=False)

    # Keep only rows whose Var we care about
    vars_we_want = set(ENERGY_VAR_MAP.keys())
    df = df[df['Var'].isin(vars_we_want)].copy()

    # Drop rows with no ISO3 or no value
    df = df[df['ISO3166_alpha3'].notna() & df['Value'].notna()].copy()
    df['Year'] = pd.to_numeric(df['Year'], errors='coerce')
    df = df[df['Year'].notna()].copy()
    df['Year'] = df['Year'].astype(int)

    # Build nested dict
    data = {}  # iso3 -> rid -> { year -> value }
    resource_ids_found = set()

    for _, row in df.iterrows():
        iso3 = str(row['ISO3166_alpha3']).strip().upper()
        var  = str(row['Var']).strip()
        year = int(row['Year'])
        val  = safe_float(row['Value'])
        if val is None or iso3 == 'NAN':
            continue

        mapping = ENERGY_VAR_MAP.get(var)
        if not mapping:
            continue
        rid, _, _, _, _, _, scale = mapping
        scaled = val * scale if val is not None else None

        data.setdefault(iso3, {}).setdefault(rid, {})[year] = scaled
        resource_ids_found.add(rid)

    print(f'  → {len(data)} countries, {len(resource_ids_found)} resource vars from energy CSV')
    return data, resource_ids_found


def parse_minerals_csv():
    """
    Returns dict: { iso3 -> { resource_id -> { year -> value } } }
    Years are the integer year extracted from the date string.
    """
    if not os.path.exists(MINERALS_DEST):
        print('minerals.csv not found — skipping')
        return {}

    print('Parsing minerals CSV...')
    df = pd.read_csv(MINERALS_DEST, encoding='utf-8', low_memory=False)

    commodities_we_want = set(MINERAL_COMMODITY_MAP.keys())
    df = df[df['bgs_commodity_trans'].isin(commodities_we_want)].copy()

    # Parse year from datetime string like "1971-01-01 00:00:00"
    df['year_int'] = pd.to_datetime(df['year'], errors='coerce').dt.year
    df = df[df['year_int'].notna()].copy()
    df['year_int'] = df['year_int'].astype(int)

    data = {}  # iso3 -> rid -> { year -> value }

    for _, row in df.iterrows():
        commodity = str(row['bgs_commodity_trans']).strip().lower()
        iso3_raw  = row.get('country_iso3_code')
        iso2_raw  = row.get('country_iso2_code')

        # Determine ISO3
        if pd.notna(iso3_raw) and str(iso3_raw).strip() not in ('', 'nan'):
            iso3 = str(iso3_raw).strip().upper()
        elif pd.notna(iso2_raw) and str(iso2_raw).strip() in ISO2_TO_ISO3:
            iso3 = ISO2_TO_ISO3[str(iso2_raw).strip()]
        else:
            continue

        year = int(row['year_int'])
        val  = safe_float(row['quantity'])
        unit = str(row.get('units', '')).strip()
        if val is None:
            continue

        mapping = MINERAL_COMMODITY_MAP.get(commodity)
        if not mapping:
            continue
        rid, valid_units = mapping

        if valid_units and unit not in valid_units:
            continue

        meta = MINERAL_META.get(rid)
        if not meta:
            continue
        _, _, _, _, _, scale = meta

        # Gold/silver in kg → convert to tonnes using scale 0.001
        scaled = val * scale

        existing = data.setdefault(iso3, {}).setdefault(rid, {})
        # Sum multiple sub-commodity rows within same country/year
        existing[year] = existing.get(year, 0.0) + scaled

    print(f'  → {len(data)} countries with minerals data')
    return data


def build_resource_meta(energy_rids, mineral_rids):
    """
    Build the meta.resources array in the correct order.
    Returns list of dicts.
    """
    resources = []
    seen = set()

    # Energy vars in desired display order
    energy_order = [
        'oil_prod', 'gas_prod', 'coal_prod', 'nuclear_gen',
        'hydro_gen', 'solar_gen', 'wind_gen', 'co2_energy',
    ]
    for rid in energy_order:
        if rid in energy_rids and rid not in seen:
            m = ENERGY_VAR_MAP
            for var, info in m.items():
                if info[0] == rid:
                    _, unit, unitShort, label, category, desc, _ = info
                    resources.append({
                        'id': rid, 'label': label, 'category': category,
                        'unit': unit, 'unitShort': unitShort, 'description': desc
                    })
                    seen.add(rid)
                    break

    # Metals from energy CSV
    metals_energy_order = [
        'cobalt_prod', 'cobalt_res', 'lithium_prod', 'lithium_res',
        'graphite_prod', 'graphite_res', 'ree_prod', 'ree_res',
    ]
    for rid in metals_energy_order:
        if rid in energy_rids and rid not in seen:
            for var, info in ENERGY_VAR_MAP.items():
                if info[0] == rid:
                    _, unit, unitShort, label, category, desc, _ = info
                    resources.append({
                        'id': rid, 'label': label, 'category': category,
                        'unit': unit, 'unitShort': unitShort, 'description': desc
                    })
                    seen.add(rid)
                    break

    # Minerals from BGS CSV in desired order
    mineral_order = [
        'copper_prod', 'gold_prod', 'silver_prod', 'iron_prod', 'nickel_prod',
        'zinc_prod', 'lead_prod', 'pgm_prod', 'bauxite_prod',
        'manganese_prod', 'chromium_prod', 'phosphate_prod',
        'potash_prod', 'salt_prod', 'diamond_prod',
    ]
    for rid in mineral_order:
        if rid in mineral_rids and rid not in seen:
            meta = MINERAL_META.get(rid)
            if meta:
                label, category, unit, unitShort, desc, _ = meta
                resources.append({
                    'id': rid, 'label': label, 'category': category,
                    'unit': unit, 'unitShort': unitShort, 'description': desc
                })
                seen.add(rid)

    return resources


def collect_all_years(energy_data, mineral_data):
    """Find all years present across both datasets."""
    years = set()
    for iso3, rids in energy_data.items():
        for rid, yr_map in rids.items():
            years.update(yr_map.keys())
    for iso3, rids in mineral_data.items():
        for rid, yr_map in rids.items():
            years.update(yr_map.keys())
    return sorted(years)


def round_val(v):
    """Round to at most 4 significant figures for compactness."""
    if v is None:
        return None
    if v == 0.0:
        return 0
    mag = math.floor(math.log10(abs(v)))
    factor = 10 ** (3 - mag)
    rounded = round(v * factor) / factor
    # Return int if it's a whole number
    if rounded == int(rounded):
        return int(rounded)
    return rounded


def build_js(energy_data, mineral_data, resources_meta, all_years):
    """
    Merge energy and mineral data, build the JS string.
    Uses SPARSE format: only emit years that have a real value for each resource.
    The JS consumer (script.js) interpolates/looks up the nearest year.
    """
    # Merge all iso3 keys
    all_iso3 = sorted(set(list(energy_data.keys()) + list(mineral_data.keys())))

    # Resource IDs in order
    rid_list = [r['id'] for r in resources_meta]

    print(f'Building JS: {len(all_iso3)} countries, {len(rid_list)} resources, {len(all_years)} years')

    lines = []
    lines.append('/* Natural Resources World Data -- auto-generated by main.py')
    lines.append(' * Sources:')
    lines.append(' *   Energy: BP Statistical Review of World Energy (1965-2024)')
    lines.append(' *   Mine production: BGS World Mineral Statistics (1971-1976)')
    lines.append(' *')
    lines.append(' * SPARSE format: each resource only stores years with real data.')
    lines.append(' * Structure: window.RESOURCE_DATA = { meta: { resources, years }, countries: { ISO3: { rid: { year: value } } } }')
    lines.append(' */')
    lines.append('window.RESOURCE_DATA = {')

    # meta
    lines.append('  meta: {')
    lines.append('    resources: [')
    for r in resources_meta:
        lines.append(f'      {{ id: {json.dumps(r["id"])}, label: {json.dumps(r["label"])}, '
                     f'category: {json.dumps(r["category"])}, unit: {json.dumps(r["unit"])}, '
                     f'unitShort: {json.dumps(r["unitShort"])}, description: {json.dumps(r["description"])} }},')
    lines.append('    ],')

    # years array — all years present in the dataset
    lines.append(f'    years: {json.dumps(all_years)}')
    lines.append('  },')

    # countries
    lines.append('  countries: {')

    emitted_countries = 0
    for iso3 in all_iso3:
        e_rids = energy_data.get(iso3, {})
        m_rids = mineral_data.get(iso3, {})

        # Gather all resource data for this country
        country_resources = {}
        for rid in rid_list:
            yr_map = e_rids.get(rid, {})
            if not yr_map:
                yr_map = m_rids.get(rid, {})
            # Keep only non-null years
            sparse = {y: round_val(v) for y, v in yr_map.items() if v is not None}
            if sparse:
                country_resources[rid] = sparse

        if not country_resources:
            continue  # skip countries with zero data

        lines.append(f'    {json.dumps(iso3)}: {{')
        for rid in rid_list:
            sparse = country_resources.get(rid, {})
            if sparse:
                parts = ', '.join(f'{y}: {json.dumps(v)}' for y, v in sorted(sparse.items()))
                lines.append(f'      {json.dumps(rid)}: {{ {parts} }},')
        lines.append('    },')
        emitted_countries += 1

    lines.append('  }')
    lines.append('};')

    print(f'  Emitted {emitted_countries} countries with at least one resource value')
    return '\n'.join(lines)


def main():
    # Step 1
    rename_csvs()

    # Step 2a: parse energy CSV
    if not os.path.exists(ENERGY_DEST):
        print('ERROR: energy.csv not found. Make sure the BP Statistical Review CSV is in the app folder.')
        return
    energy_data, energy_rids = parse_energy_csv()

    # Step 2b: parse minerals CSV
    mineral_data = parse_minerals_csv()
    mineral_rids = set()
    for iso3, rids in mineral_data.items():
        mineral_rids.update(rids.keys())

    # Step 3: build metadata
    resources_meta = build_resource_meta(energy_rids, mineral_rids)
    print(f'Resources in output: {[r["id"] for r in resources_meta]}')

    # Step 4: collect all years
    all_years = collect_all_years(energy_data, mineral_data)
    print(f'Year range: {all_years[0]} – {all_years[-1]} ({len(all_years)} years)')

    # Step 5: build and write JS
    js_str = build_js(energy_data, mineral_data, resources_meta, all_years)

    os.makedirs(os.path.join(BASE, 'data'), exist_ok=True)
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write(js_str)

    size_kb = os.path.getsize(OUT_JS) / 1024
    print(f'\nWrote {OUT_JS}')
    print(f'File size: {size_kb:.0f} KB')
    print('Done.')


if __name__ == '__main__':
    main()
