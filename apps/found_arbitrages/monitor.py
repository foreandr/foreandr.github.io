"""
Arbitrage detection.

For each event from The Odds API:
  1. Find the best (highest) decimal odds for each outcome across all books.
  2. If the implied probability sum < 1.0, an arb exists.
  3. Calculate net % and annualized return (APR).

Arb math:
  implied_sum = sum(1 / best_odds_i)
  net_pct     = 1/implied_sum - 1          (positive = arb)
  apr         = (1 + net_pct)^(365/days) - 1

APR accounts for capital lockup time — a 1% arb in 60 days (~6% APR)
is worth far less than a 1% arb tomorrow (~3650% APR).
Results are sorted by APR, not raw net%.
"""

from datetime import datetime, timezone

from books import BOOKS, SAFE_BOOKS, SPORT_LABELS

MIN_ODDS = 1.01
MAX_ODDS = 50.0


def _effective_odds(raw: float, commission: float) -> float:
    return 1.0 + (raw - 1.0) * (1.0 - commission)


def _parse_commence(iso: str):
    try:
        dt    = datetime.fromisoformat(iso.replace('Z', '+00:00'))
        delta = (dt - datetime.now(timezone.utc)).total_seconds()
        if delta < 0:
            return 'IN PROGRESS', -1.0
        days = max(delta / 86400, 1 / 24)
        if delta < 3600:
            label = f'in {int(delta / 60)}m'
        elif delta < 86400:
            label = f'in {delta / 3600:.1f}h'
        else:
            label = dt.strftime('%Y-%m-%d')
        return label, days
    except Exception:
        fallback = iso[:10] if len(iso) >= 10 else iso
        return fallback, 30.0


def _calc_apr(net_pct: float, days: float) -> float:
    if days <= 0:
        return 0.0
    return (1.0 + net_pct) ** (365.0 / days) - 1.0


def find_arbs(events: list, min_gross: float = -0.05) -> list:
    results = []

    for event in events:
        sport_key   = event.get('sport_key', '')
        sport_label = SPORT_LABELS.get(sport_key, sport_key.split('_')[-1].upper())
        home        = event.get('home_team', '?')
        away        = event.get('away_team', '?')
        commence, days_until = _parse_commence(event.get('commence_time', ''))
        best = {}

        for bk in event.get('bookmakers', []):
            bk_key  = bk.get('key', '')
            bk_meta = BOOKS.get(bk_key, {'label': bk_key, 'type': 'soft', 'commission': 0.0, 'can_ban': True})
            for market in bk.get('markets', []):
                if market.get('key') != 'h2h':
                    continue
                for outcome in market.get('outcomes', []):
                    name  = outcome.get('name', '')
                    price = float(outcome.get('price', 0))
                    if price < MIN_ODDS or price > MAX_ODDS:
                        continue
                    if name not in best or price > best[name]['raw_price']:
                        best[name] = {
                            'raw_price':       price,
                            'effective_price': _effective_odds(price, bk_meta['commission']),
                            'book_key':        bk_key,
                            'label':           bk_meta['label'],
                            'type':            bk_meta['type'],
                            'can_ban':         bk_meta['can_ban'],
                            'commission':      bk_meta['commission'],
                        }

        if len(best) < 2:
            continue
        raw_prices = sorted(v['raw_price'] for v in best.values())
        if max(raw_prices) / min(raw_prices) > 30:
            continue

        gross_implied = sum(1.0 / v['raw_price'] for v in best.values())
        gross_pct     = (1.0 / gross_implied) - 1.0
        if gross_pct < min_gross:
            continue

        net_implied = sum(1.0 / v['effective_price'] for v in best.values())
        net_pct     = (1.0 / net_implied) - 1.0
        apr         = _calc_apr(net_pct, days_until) if days_until > 0 else 0.0

        results.append({
            'event':        f'{home} vs {away}',
            'home':         home,
            'away':         away,
            'sport':        sport_label,
            'sport_key':    sport_key,
            'commence':     commence,
            'days_until':   days_until,
            'legs':         best,
            'net_pct':      net_pct,
            'apr':          apr,
            'has_safe_leg': any(not v['can_ban'] for v in best.values()),
            'all_safe':     all(not v['can_ban'] for v in best.values()),
            'n_outcomes':   len(best),
        })

    results.sort(key=lambda x: x['apr'], reverse=True)
    return results
