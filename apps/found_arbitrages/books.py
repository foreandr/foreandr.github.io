"""
Sportsbook metadata — CEX (centralised) books only.

  sharp  — Pinnacle: accepts winners, does not limit accounts.
  soft   — all others: will eventually limit/ban winning arbers.

commission is always 0.0 — vig is baked into the spread.
"""

BOOKS = {
    # ── Sharp ─────────────────────────────────────────────────────────────────
    'pinnacle':      {'label': 'Pinnacle',   'type': 'sharp', 'commission': 0.0, 'can_ban': False},

    # ── Soft ──────────────────────────────────────────────────────────────────
    'draftkings':    {'label': 'DraftKings', 'type': 'soft',  'commission': 0.0, 'can_ban': True},
    'fanduel':       {'label': 'FanDuel',    'type': 'soft',  'commission': 0.0, 'can_ban': True},
    'betmgm':        {'label': 'BetMGM',     'type': 'soft',  'commission': 0.0, 'can_ban': True},
    'pointsbetting': {'label': 'PointsBet',  'type': 'soft',  'commission': 0.0, 'can_ban': True},
    'betrivers':     {'label': 'BetRivers',  'type': 'soft',  'commission': 0.0, 'can_ban': True},
    'caesars':       {'label': 'Caesars',    'type': 'soft',  'commission': 0.0, 'can_ban': True},
    'bet365':        {'label': 'Bet365',     'type': 'soft',  'commission': 0.0, 'can_ban': True},
    'betway':        {'label': 'Betway',     'type': 'soft',  'commission': 0.0, 'can_ban': True},
    'sport888':      {'label': '888sport',   'type': 'soft',  'commission': 0.0, 'can_ban': True},
    'betvictor':     {'label': 'BetVictor',  'type': 'soft',  'commission': 0.0, 'can_ban': True},
    'leovegas':      {'label': 'LeoVegas',   'type': 'soft',  'commission': 0.0, 'can_ban': True},
}

SAFE_BOOKS     = {k for k, v in BOOKS.items() if not v['can_ban']}
ODDS_API_BOOKS = list(BOOKS.keys())

SPORT_KEYS = {
    'nhl':        'icehockey_nhl',
    'nba':        'basketball_nba',
    'nfl':        'americanfootball_nfl',
    'mlb':        'baseball_mlb',
    'ncaaf':      'americanfootball_ncaaf',
    'ncaab':      'basketball_ncaab',
    'mma':        'mma_mixed_martial_arts',
    'boxing':     'boxing_boxing',
    'epl':        'soccer_epl',
    'ucl':        'soccer_uefa_champs_league',
    'laliga':     'soccer_spain_la_liga',
    'bundesliga': 'soccer_germany_bundesliga',
    'seriea':     'soccer_italy_serie_a',
    'ligue1':     'soccer_france_ligue_one',
    'mls':        'soccer_usa_mls',
    'cfl':        'americanfootball_cfl',
    'pga':        'golf_pga_tour',
    'tennis':     'tennis_atp_french_open',
    'f1':         'motorsport_formula_one',
}

SPORT_LABELS = {v: k.upper() for k, v in SPORT_KEYS.items()}
