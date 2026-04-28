import json
import math
import os
import random
from datetime import datetime

def month_range(start_year, years):
    dates = []
    year = start_year
    month = 1
    total = years * 12
    for _ in range(total):
        dates.append(f"{year:04d}-{month:02d}-01")
        month += 1
        if month > 12:
            month = 1
            year += 1
    return dates

random.seed(42)

TICKER_COUNT = 500
YEARS = 30
START_YEAR = datetime.now().year - YEARS
BASE_PRICE = 20.0

# Generate tickers
TICKERS = [f"TICKER{i:03d}" for i in range(1, TICKER_COUNT + 1)]

# Monthly timeline
dates = month_range(START_YEAR, YEARS)

# Simulate lognormal price paths and market cap weights
prices = []
market_caps = []

# Initialize per-ticker parameters
vols = [random.uniform(0.06, 0.25) for _ in range(TICKER_COUNT)]
trends = [random.uniform(-0.02, 0.08) for _ in range(TICKER_COUNT)]
shares = [random.uniform(1e8, 5e9) for _ in range(TICKER_COUNT)]

current_prices = [BASE_PRICE * random.uniform(0.5, 3.5) for _ in range(TICKER_COUNT)]

for t in range(len(dates)):
    step_prices = []
    step_caps = []
    for i in range(TICKER_COUNT):
        drift = trends[i] / 12
        vol = vols[i] / math.sqrt(12)
        shock = random.gauss(0, 1)
        growth = math.exp(drift - 0.5 * vol * vol + vol * shock)
        current_prices[i] = max(0.5, current_prices[i] * growth)
        step_prices.append(round(current_prices[i], 4))
        cap = current_prices[i] * shares[i]
        step_caps.append(round(cap, 2))
    prices.append(step_prices)
    market_caps.append(step_caps)

payload = {
    "meta": {
        "tickers": TICKER_COUNT,
        "years": YEARS,
        "start_year": START_YEAR,
        "frequency": "monthly",
        "currency": "USD",
        "note": "Synthetic data for top-cap rotation simulation"
    },
    "tickers": TICKERS,
    "dates": dates,
    "prices": prices,
    "market_caps": market_caps
}

out_path = os.path.join(os.path.dirname(__file__), "fake_data.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(payload, f)

print(f"Wrote {out_path} with {TICKER_COUNT} tickers and {len(dates)} months")
