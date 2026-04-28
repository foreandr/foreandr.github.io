import json
import os
import re
import time
from datetime import datetime, timedelta, timezone

try:
    import pandas as pd
except ImportError:  # pragma: no cover
    pd = None

try:
    import yfinance as yf
except ImportError:  # pragma: no cover
    yf = None


DATA_DIR = os.path.dirname(__file__)
TICKERS_PATH = os.path.join(DATA_DIR, "tickers.txt")
DATA_PATH = os.path.join(DATA_DIR, "real_data.json")
MANIFEST_PATH = os.path.join(DATA_DIR, "real_data_manifest.json")
SHARES_CACHE_PATH = os.path.join(DATA_DIR, "shares_cache.json")
FAILED_TICKERS_PATH = os.path.join(DATA_DIR, "failed_tickers.txt")

START_YEAR = 2000
BATCH_SIZE = int(os.getenv("TOPCAP_BATCH_SIZE", "25"))
MAX_TICKERS = int(os.getenv("TOPCAP_MAX_TICKERS", "0"))
SLEEP_BETWEEN_BATCHES = float(os.getenv("TOPCAP_SLEEP", "0.5"))
SAVE_EVERY_BATCHES = int(os.getenv("TOPCAP_SAVE_EVERY", "2"))


def month_range(start_year, start_month, end_date):
    months = []
    year = start_year
    month = start_month
    while True:
        first = datetime(year, month, 1)
        if first > end_date:
            break
        months.append(first.strftime("%Y-%m-%d"))
        month += 1
        if month > 12:
            month = 1
            year += 1
    return months


def load_tickers():
    if not os.path.exists(TICKERS_PATH):
        with open(TICKERS_PATH, "w", encoding="utf-8") as f:
            f.write("AAPL\nMSFT\nAMZN\nNVDA\nGOOGL\nMETA\nTSLA\nBRK-B\nJPM\nV\n")
        raise SystemExit(
            f"Created {TICKERS_PATH} with a starter list. Replace it with your universe (>=1000 tickers) and rerun."
        )

    def normalize(ticker):
        ticker = ticker.strip().upper()
        if ticker.startswith("$"):
            ticker = ticker[1:]
        ticker = ticker.replace(".", "-")
        return ticker

    with open(TICKERS_PATH, "r", encoding="utf-8") as f:
        raw = [line for line in f if line.strip() and not line.startswith("#")]
    tickers = [normalize(line) for line in raw]
    tickers = [t for t in tickers if re.match(r"^[A-Z0-9-]{1,6}$", t)]
    if MAX_TICKERS > 0:
        tickers = tickers[:MAX_TICKERS]
    if len(tickers) < 1000:
        print(f"Warning: only {len(tickers)} tickers found. Top-1000 ranking will be limited by this universe.")
    return tickers


def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, payload):
    with open(path, "w", encoding="utf-8") as f:
        # json.dump writes bare `NaN` for float NaN by default, which is not valid JSON
        # and causes JSON.parse() to fail in browsers. Replace with null.
        text = json.dumps(payload)
        text = re.sub(r'\bNaN\b', 'null', text)
        f.write(text)


def get_shares_outstanding(ticker, cache):
    cached = cache.get(ticker)
    if cached and cached.get("shares_outstanding"):
        return cached["shares_outstanding"]

    if yf is None:
        return None

    try:
        tkr = yf.Ticker(ticker)
        shares = None
        if hasattr(tkr, "fast_info") and tkr.fast_info:
            shares = tkr.fast_info.get("shares_outstanding")
        if shares is None:
            info = tkr.get_info()
            shares = info.get("sharesOutstanding")
        if shares:
            cache[ticker] = {
                "shares_outstanding": shares,
                "updated": datetime.now(timezone.utc).strftime("%Y-%m-%d")
            }
            return shares
    except Exception:
        return None

    return None


def load_existing_dataset():
    if not os.path.exists(DATA_PATH):
        return None
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        raw = f.read().strip()
        if not raw:
            return None
        return json.loads(raw)


def ensure_append_only(existing_dates, target_dates):
    if not existing_dates:
        return target_dates
    if target_dates[: len(existing_dates)] != existing_dates:
        raise SystemExit("Existing dataset dates are not a prefix of target dates. Aborting to avoid duplication.")
    return target_dates[len(existing_dates) :]


def build_month_index(months):
    return {m: i for i, m in enumerate(months)}


def download_batch(tickers, start_date, end_date):
    return yf.download(
        tickers,
        start=start_date,
        end=end_date,
        interval="1d",
        group_by="ticker",
        auto_adjust=False,
        threads=True,
        progress=False
    )


def monthly_highs(series):
    series = series.dropna()
    if series.empty:
        return series
    return series.resample("MS").max()


def main():
    if pd is None or yf is None:
        raise SystemExit("Missing dependencies. Install `pandas` and `yfinance` in your environment.")

    tickers = load_tickers()
    today = datetime.now()
    end_date = today + timedelta(days=1)
    months_all = month_range(START_YEAR, 1, end_date)

    existing = load_existing_dataset()
    existing_dates = existing.get("dates", []) if existing else []
    missing_months = ensure_append_only(existing_dates, months_all)
    if not missing_months:
        print("No new months to fetch. Dataset is up to date.")
        return

    start_missing = datetime.strptime(missing_months[0], "%Y-%m-%d")
    missing_index = build_month_index(missing_months)

    prices_new = [[None for _ in tickers] for _ in missing_months]
    caps_new = [[None for _ in tickers] for _ in missing_months]

    shares_cache = load_json(SHARES_CACHE_PATH, {})

    def write_checkpoint(note_suffix=""):
        if existing:
            prices = existing["prices"] + prices_new
            caps = existing["market_caps"] + caps_new
            dates = existing["dates"] + missing_months
        else:
            prices = prices_new
            caps = caps_new
            dates = missing_months

        payload = {
            "meta": {
                "tickers": len(tickers),
                "start_year": START_YEAR,
                "end_year": today.year,
                "frequency": "monthly",
                "currency": "USD",
                "note": "Monthly highs from Yahoo Finance (unofficial). Market caps estimated as price * shares_outstanding.",
                "partial": True if note_suffix else False
            },
            "tickers": tickers,
            "dates": dates,
            "prices": prices,
            "market_caps": caps
        }
        save_json(DATA_PATH, payload)
        save_json(MANIFEST_PATH, {"last_month": dates[-1], "total_months": len(dates), "note": note_suffix})
        if note_suffix:
            print(f"Checkpoint{note_suffix}: {len(dates)} months written.")

    failed = set()
    batch_count = 0
    try:
        for i in range(0, len(tickers), BATCH_SIZE):
            batch = tickers[i : i + BATCH_SIZE]
            print(f"Fetching {i + 1}-{i + len(batch)} / {len(tickers)}")
            df = download_batch(batch, start_missing, end_date)
            if df is None or df.empty:
                failed.update(batch)
                continue

            for idx, ticker in enumerate(batch):
                col = i + idx
                try:
                    if isinstance(df.columns, pd.MultiIndex):
                        high_series = df[ticker]["High"]
                    else:
                        high_series = df["High"]
                except Exception:
                    failed.add(ticker)
                    continue

                high_series.index = pd.to_datetime(high_series.index)
                month_high = monthly_highs(high_series)
                if month_high is None or month_high.empty:
                    failed.add(ticker)
                    continue

                shares = get_shares_outstanding(ticker, shares_cache)
                for dt, price in month_high.items():
                    key = dt.strftime("%Y-%m-%d")
                    if key not in missing_index:
                        continue
                    row = missing_index[key]
                    price_val = float(price)
                    prices_new[row][col] = price_val
                    if shares:
                        caps_new[row][col] = round(price_val * shares, 2)

            if SLEEP_BETWEEN_BATCHES > 0:
                time.sleep(SLEEP_BETWEEN_BATCHES)
            batch_count += 1
            if SAVE_EVERY_BATCHES > 0 and batch_count % SAVE_EVERY_BATCHES == 0:
                write_checkpoint(note_suffix=f" (after {i + len(batch)} tickers)")
    except KeyboardInterrupt:
        print("Interrupted. Writing partial data...")
        write_checkpoint(note_suffix=" (interrupted)")

    save_json(SHARES_CACHE_PATH, shares_cache)
    if failed:
        with open(FAILED_TICKERS_PATH, "w", encoding="utf-8") as f:
            f.write("\n".join(sorted(failed)) + "\n")

    write_checkpoint()
    print(f"Wrote {DATA_PATH} with {len(tickers)} tickers and {len(existing_dates) + len(missing_months)} months.")


if __name__ == "__main__":
    main()
