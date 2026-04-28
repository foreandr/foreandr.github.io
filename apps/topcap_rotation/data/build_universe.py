import gzip
import json
import os
import re
import urllib.request


DATA_DIR = os.path.dirname(__file__)
TICKERS_PATH = os.path.join(DATA_DIR, "tickers.txt")

SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers_exchange.json"
USER_AGENT = "TopCapRotationLab/1.0 (contact: foreandr@gmail.com)"

EXCHANGES = {
    "NASDAQ",
    "NYSE",
    "NYSE ARCA",
    "NYSE AMERICAN",
    "BATS",
    "IEX",
}


def normalize_ticker(ticker):
    ticker = ticker.strip().upper()
    if ticker.startswith("$"):
        ticker = ticker[1:]
    ticker = ticker.replace(".", "-")
    return ticker


def is_valid_ticker(ticker):
    return bool(re.match(r"^[A-Z0-9-]{1,6}$", ticker))


def main():
    req = urllib.request.Request(
        SEC_TICKERS_URL,
        headers={"User-Agent": USER_AGENT, "Accept-Encoding": "gzip"},
    )
    with urllib.request.urlopen(req) as resp:
        raw = resp.read()
        if raw[:2] == b"\x1f\x8b":
            raw = gzip.decompress(raw)
        payload = json.loads(raw.decode("utf-8"))

    fields = None
    if isinstance(payload, dict) and "data" in payload and isinstance(payload["data"], list):
        rows = payload["data"]
        if isinstance(payload.get("fields"), list):
            fields = payload.get("fields")
    elif isinstance(payload, dict):
        rows = list(payload.values())
    elif isinstance(payload, list):
        rows = payload
    else:
        raise SystemExit("Unexpected SEC payload structure.")

    tickers = []
    skipped = 0
    for row in rows:
        if isinstance(row, list) and fields:
            row = {fields[i]: row[i] for i in range(min(len(fields), len(row)))}
        if not isinstance(row, dict):
            continue
        exchange = (row.get("exchange") or row.get("exchangeName") or "").strip().upper()
        if exchange and exchange not in EXCHANGES:
            skipped += 1
            continue
        ticker = normalize_ticker(row.get("ticker") or row.get("symbol") or "")
        if not ticker or not is_valid_ticker(ticker):
            continue
        tickers.append(ticker)

    tickers = sorted(set(tickers))

    if not tickers:
        # Fallback: accept all tickers if exchange labels don't match expected values.
        for row in rows:
            if isinstance(row, list) and fields:
                row = {fields[i]: row[i] for i in range(min(len(fields), len(row)))}
            if not isinstance(row, dict):
                continue
            ticker = normalize_ticker(row.get("ticker") or row.get("symbol") or "")
            if not ticker or not is_valid_ticker(ticker):
                continue
            tickers.append(ticker)
        tickers = sorted(set(tickers))
        print("Warning: exchange filter produced 0 tickers. Using all tickers from payload instead.")
    with open(TICKERS_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(tickers) + "\n")

    print(f"Wrote {len(tickers)} tickers to {TICKERS_PATH}")
    print("Reminder: set a real contact email in USER_AGENT before heavy use.")


if __name__ == "__main__":
    main()
