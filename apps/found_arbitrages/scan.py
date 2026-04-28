# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

"""
CEX Arbitrage Scanner
=====================
Fetches live odds from The Odds API (centralised sportsbooks only),
finds arbitrage opportunities, and writes them to arbitrages.json.

Usage:
    python scan.py

Requires a .env file in this folder:
    ODDS_API_KEYS=your_key_here
    SPORTS=nhl,nba,mlb,epl,ucl,laliga,bundesliga,seriea,ligue1,mls,mma,boxing
    MIN_NET=0.0          # 0.0 = show all positives; 0.02 = 2%+ only
    BATCH_SIZE=0         # 0 = fetch all sports each run (burns more quota)

Free-tier keys: 500 req/month — https://the-odds-api.com/#get-access
"""

import os
import sys
import json
import time

_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(_DIR, '.env'))

from books   import SPORT_KEYS, SPORT_LABELS
from odds    import fetch_all_odds, get_quota, get_in_season_sports, get_scan_cost, init_keys, AllKeysExhausted
from monitor import find_arbs

# -- Config --------------------------------------------------------------------
_raw_keys  = os.getenv('ODDS_API_KEYS', os.getenv('ODDS_API_KEY', ''))
MIN_NET    = float(os.getenv('MIN_NET', 0.0))
BATCH_SIZE = int(os.getenv('BATCH_SIZE', 0))

_sports_env   = os.getenv('SPORTS', 'nhl,nba,mlb,mma,boxing,epl,ucl,laliga,bundesliga,seriea,ligue1,mls')
ACTIVE_SPORTS = [SPORT_KEYS[s.strip().lower()] for s in _sports_env.split(',') if s.strip().lower() in SPORT_KEYS]

OUT_FILE = os.path.join(_DIR, 'arbitrages.json')

# -- Main ----------------------------------------------------------------------
def main():
    if not _raw_keys:
        print('ERROR: No ODDS_API_KEYS set in .env')
        print('  Get a free key at https://the-odds-api.com/#get-access')
        sys.exit(1)

    if not ACTIVE_SPORTS:
        print(f'ERROR: No valid sports in SPORTS= env var.')
        print(f'  Valid options: {", ".join(SPORT_KEYS.keys())}')
        sys.exit(1)

    init_keys(_raw_keys)
    t0 = time.time()

    print(f'Scanning {len(ACTIVE_SPORTS)} sports via The Odds API...')

    try:
        live_sports  = get_in_season_sports(ACTIVE_SPORTS)
        events, meta = fetch_all_odds(live_sports, batch_size=BATCH_SIZE)
    except AllKeysExhausted:
        print('ERROR: All API keys exhausted. Add more keys or wait until the 1st of next month.')
        sys.exit(1)
    except Exception as e:
        print(f'ERROR fetching odds: {e}')
        sys.exit(1)

    scan_s = time.time() - t0
    print(f'Fetched {meta["n_events"]} events in {scan_s:.1f}s — {get_scan_cost()} API requests used')

    if meta.get('errors'):
        for err in meta['errors']:
            print(f'  Warning: {err}')

    # Find arbs — include everything with net_pct >= MIN_NET, exclude in-progress
    all_arbs = find_arbs(events, min_gross=-0.05)
    arbs     = [a for a in all_arbs if a['net_pct'] >= MIN_NET and a['commence'] != 'IN PROGRESS']

    quota = get_quota()
    print(f'Found {len(arbs)} opportunities (net >= {MIN_NET*100:.1f}%)')
    for i, q in enumerate(quota):
        print(f'  Key {i+1}: {q["remaining"]} requests remaining / {q["used"]} used this month')

    now_str = time.strftime('%Y-%m-%d %H:%M:%S')

    # Serialize legs dict
    def clean_arb(a):
        return {
            'event':        a['event'],
            'home':         a['home'],
            'away':         a['away'],
            'sport':        a['sport'],
            'sport_key':    a['sport_key'],
            'commence':     a['commence'],
            'days_until':   round(a['days_until'], 4),
            'net_pct':      round(a['net_pct'], 6),
            'apr':          round(a['apr'], 4),
            'has_safe_leg': a['has_safe_leg'],
            'all_safe':     a['all_safe'],
            'n_outcomes':   a['n_outcomes'],
            'found_at':     now_str,
            'legs': {
                outcome: {
                    'book':      leg['label'],
                    'book_key':  leg['book_key'],
                    'book_type': leg['type'],
                    'odds':      round(leg['raw_price'], 3),
                    'can_ban':   leg['can_ban'],
                }
                for outcome, leg in a['legs'].items()
            },
        }

    new_arbs = [clean_arb(a) for a in arbs]

    # -- Load existing file and APPEND (never wipe) ----------------------------
    existing_arbs = []
    scan_history  = []
    if os.path.exists(OUT_FILE):
        try:
            with open(OUT_FILE) as f:
                old = json.load(f)
            existing_arbs = old.get('arbs', [])
            scan_history  = old.get('scan_history', [])
        except Exception:
            pass  # corrupt/missing — start fresh

    # Dedup key: event + sport + commence + sorted book names across all legs
    def arb_key(a):
        books = sorted(leg['book'] for leg in a['legs'].values())
        return (a['event'], a['sport'], a['commence'], tuple(books))

    existing_keys = {arb_key(a) for a in existing_arbs}
    added = [a for a in new_arbs if arb_key(a) not in existing_keys]
    all_arbs_combined = existing_arbs + added

    # Keep scan history log
    scan_history.append({
        'scanned_at':   now_str,
        'scan_seconds': round(scan_s, 2),
        'n_events':     meta['n_events'],
        'api_requests': get_scan_cost(),
        'new_arbs':     len(added),
        'total_arbs':   len(all_arbs_combined),
    })

    output = {
        'last_scanned':  now_str,
        'total_arbs':    len(all_arbs_combined),
        'min_net':       MIN_NET,
        'scan_history':  scan_history,
        'arbs':          all_arbs_combined,
    }

    with open(OUT_FILE, 'w') as f:
        json.dump(output, f, indent=2)

    print(f'Saved -> {OUT_FILE}  ({len(added)} new, {len(existing_arbs)} existing, {len(all_arbs_combined)} total)')

    # Quick summary to terminal
    real_arbs = [a for a in arbs if a['net_pct'] > 0]
    if real_arbs:
        print(f'\n{"-"*60}')
        print(f'  {"Event":<30}  {"Sport":<10}  {"Net":>7}  {"Starts"}')
        print(f'{"-"*60}')
        for a in real_arbs[:20]:
            print(f'  {a["event"][:30]:<30}  {a["sport"]:<10}  {a["net_pct"]*100:>6.2f}%  {a["commence"]}')
        if len(real_arbs) > 20:
            print(f'  ... {len(real_arbs)-20} more in arbitrages.json')
        print(f'{"-"*60}')
    else:
        print('  No positive arbs found in this scan.')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\nScan cancelled.')
