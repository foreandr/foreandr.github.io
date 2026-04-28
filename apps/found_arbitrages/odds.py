"""
The Odds API fetcher — with key rotation and sport batching.

Key rotation:
  Set ODDS_API_KEYS=key1,key2 in .env.
  When a key hits its quota (429 or remaining=0) the next key is used automatically.
  When all keys are exhausted, AllKeysExhausted is raised.

Sport batching:
  Set BATCH_SIZE=6 in .env (default: fetch all in-season sports every cycle).
  With 16 active sports and BATCH_SIZE=6 each sport refreshes every ~3 cycles (90s)
  but you only burn 6 requests per cycle instead of 16.
  Stale results for non-batched sports are served from cache.

  Free tier : 500 req/month  — https://the-odds-api.com/#get-access
  Starter   : $79/mo for 100k requests
"""

import os
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

from books import ODDS_API_BOOKS, SPORT_LABELS

ODDS_API_BASE = 'https://api.the-odds-api.com/v4'
TIMEOUT       = 12

# ── Key manager ───────────────────────────────────────────────────────────────

class AllKeysExhausted(Exception):
    pass


class _KeyManager:
    def __init__(self, keys: list):
        self._keys      = keys
        self._exhausted = set()
        self._quota     = {k: {'remaining': '?', 'used': '?'} for k in keys}

    def active(self) -> str:
        for k in self._keys:
            if k not in self._exhausted:
                return k
        raise AllKeysExhausted()

    def update_quota(self, key: str, remaining: str, used: str):
        self._quota[key] = {'remaining': remaining, 'used': used}
        if remaining == '0':
            self._exhausted.add(key)

    def mark_exhausted(self, key: str):
        self._exhausted.add(key)

    def all_exhausted(self) -> bool:
        return all(k in self._exhausted for k in self._keys)

    def quota_summary(self) -> list:
        return [
            {
                'key':       k[:8] + '…',
                'remaining': self._quota[k]['remaining'],
                'used':      self._quota[k]['used'],
                'exhausted': k in self._exhausted,
            }
            for k in self._keys
        ]


_km = None


def init_keys(raw: str):
    """Call once at startup with the ODDS_API_KEYS env string."""
    global _km
    keys = [k.strip() for k in raw.split(',') if k.strip()]
    _km  = _KeyManager(keys)


def get_quota() -> list:
    """Return quota info for all keys."""
    return _km.quota_summary() if _km else []


# ── Caches ────────────────────────────────────────────────────────────────────

_cache         = {}
CACHE_TTL      = 90

_seasons_cache = (0.0, set())
SEASONS_TTL    = 3600

_batch_idx     = 0
_scan_cost     = 0


def get_scan_cost() -> int:
    return _scan_cost


# ── Internals ─────────────────────────────────────────────────────────────────

def _fetch_sport(sport_key: str) -> list:
    now = time.time()
    if sport_key in _cache and now - _cache[sport_key][0] < CACHE_TTL:
        return _cache[sport_key][1]

    while True:
        key = _km.active()
        params = {
            'apiKey':     key,
            'regions':    'us,us2,eu,uk,au',
            'markets':    'h2h',
            'oddsFormat': 'decimal',
            'bookmakers': ','.join(ODDS_API_BOOKS),
        }
        try:
            global _scan_cost
            r = requests.get(
                f'{ODDS_API_BASE}/sports/{sport_key}/odds',
                params=params,
                timeout=TIMEOUT,
            )
            _scan_cost += 1
            remaining = r.headers.get('x-requests-remaining', '?')
            used      = r.headers.get('x-requests-used', '?')
            _km.update_quota(key, remaining, used)

            if r.status_code == 429:
                if remaining == '0':
                    _km.mark_exhausted(key)
                    continue
                else:
                    time.sleep(2)
                    continue

            r.raise_for_status()
            events = r.json()
            _cache[sport_key] = (time.time(), events)
            return events

        except AllKeysExhausted:
            raise
        except Exception:
            raise


# ── Public API ────────────────────────────────────────────────────────────────

def get_in_season_sports(wanted: list) -> list:
    global _seasons_cache
    now = time.time()
    if now - _seasons_cache[0] < SEASONS_TTL:
        active_keys = _seasons_cache[1]
    else:
        try:
            global _scan_cost
            key = _km.active()
            r   = requests.get(
                f'{ODDS_API_BASE}/sports',
                params={'apiKey': key},
                timeout=TIMEOUT,
            )
            _scan_cost += 1
            remaining = r.headers.get('x-requests-remaining', '?')
            used      = r.headers.get('x-requests-used', '?')
            _km.update_quota(key, remaining, used)
            if r.status_code == 429:
                if remaining == '0':
                    _km.mark_exhausted(key)
                else:
                    time.sleep(2)
                active_keys = _seasons_cache[1] or set(wanted)
            else:
                r.raise_for_status()
                active_keys    = {s['key'] for s in r.json() if s.get('active')}
                _seasons_cache = (now, active_keys)
        except AllKeysExhausted:
            raise
        except Exception:
            active_keys = _seasons_cache[1] or set(wanted)

    return [sk for sk in wanted if sk in active_keys]


def fetch_all_odds(sport_keys: list, batch_size: int = 0) -> tuple:
    global _batch_idx, _scan_cost
    _scan_cost = 0

    if batch_size and batch_size < len(sport_keys):
        start      = _batch_idx % len(sport_keys)
        batch      = (sport_keys + sport_keys)[start:start + batch_size]
        _batch_idx = (start + batch_size) % len(sport_keys)
    else:
        batch = sport_keys

    all_events      = []
    errors          = []
    n_sports_active = 0

    cached_keys = set(sport_keys) - set(batch)
    for sk in cached_keys:
        if sk in _cache:
            evts = _cache[sk][1]
            if evts:
                all_events.extend(evts)
                n_sports_active += 1

    with ThreadPoolExecutor(max_workers=min(len(batch), 3)) as ex:
        futs = {ex.submit(_fetch_sport, sk): sk for sk in batch}
        for f in as_completed(futs):
            sk = futs[f]
            try:
                events = f.result()
                if events:
                    all_events.extend(events)
                    n_sports_active += 1
            except AllKeysExhausted:
                raise
            except Exception as e:
                errors.append(f'{sk}: {e}')

    return all_events, {
        'n_events':        len(all_events),
        'n_sports_active': n_sports_active,
        'errors':          errors,
        'batch':           batch,
    }
