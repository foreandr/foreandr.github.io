import csv
import random
import re
from pathlib import Path

import requests


BASE_DIR = Path(__file__).resolve().parent
INPUT_CSV = BASE_DIR / "ge_buy_limits_enriched.csv"
REQUEST_TIMEOUT_SECONDS = 30
SAMPLE_SIZE = 10
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/136.0.0.0 Safari/537.36"
)
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": USER_AGENT})
TRADE180_RE = re.compile(
    r"trade180\.push\(\[new Date\('(?P<date>\d{4}/\d{2}/\d{2})'\),\s*(?P<value>\d+)\]\);"
)


def load_random_rows(csv_path: Path, sample_size: int) -> list[dict[str, str]]:
    with csv_path.open("r", newline="", encoding="utf-8") as csv_file:
        rows = list(csv.DictReader(csv_file))
    if not rows:
        raise ValueError(f"No rows found in {csv_path.name}")
    return random.sample(rows, k=min(sample_size, len(rows)))


def fetch_html(url: str) -> str:
    response = SESSION.get(url, timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    return response.text


def extract_last_trade180_volume(html: str) -> int:
    matches = list(TRADE180_RE.finditer(html))
    if not matches:
        raise ValueError("No trade180.push entries found in response text")
    return int(matches[-1].group("value"))


def main() -> None:
    rows = load_random_rows(INPUT_CSV, SAMPLE_SIZE)

    for index, row in enumerate(rows, start=1):
        url = (row.get("official_ge_url") or "").strip()
        item = (row.get("item") or "").strip()
        if not url:
            print(f"[{index}] {item} -> missing official_ge_url")
            continue

        try:
            html = fetch_html(url)
            volume = extract_last_trade180_volume(html)
            print(f"[{index}] {item}: {volume}")
        except Exception as exc:
            print(f"[{index}] {item}: ERROR {exc}")


if __name__ == "__main__":
    main()
