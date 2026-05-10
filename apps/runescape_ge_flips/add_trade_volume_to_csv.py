import csv
from pathlib import Path

from inspect_official_ge_soup import extract_last_trade180_volume, fetch_html


BASE_DIR = Path(__file__).resolve().parent
INPUT_CSV = BASE_DIR / "ge_buy_limits_enriched.csv"
OUTPUT_CSV = BASE_DIR / "ge_buy_limits_enriched_with_trade_volume.csv"
FIELDNAMES = [
    "item",
    "amount",
    "url",
    "price",
    "max_spend",
    "item_id",
    "official_ge_url",
    "trade_volume",
    "error",
]


def load_rows(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open("r", newline="", encoding="utf-8") as csv_file:
        return list(csv.DictReader(csv_file))


def initialize_output_csv(csv_path: Path) -> None:
    with csv_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=FIELDNAMES)
        writer.writeheader()


def append_row(csv_path: Path, row: dict[str, str]) -> None:
    with csv_path.open("a", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=FIELDNAMES)
        writer.writerow(row)


def load_completed_urls(csv_path: Path) -> set[str]:
    if not csv_path.exists():
        return set()
    return {
        (row.get("url") or "").strip()
        for row in load_rows(csv_path)
        if (row.get("url") or "").strip()
    }


def build_output_row(row: dict[str, str], trade_volume: str, error_text: str) -> dict[str, str]:
    return {
        "item": row.get("item", ""),
        "amount": row.get("amount", ""),
        "url": row.get("url", ""),
        "price": row.get("price", ""),
        "max_spend": row.get("max_spend", ""),
        "item_id": row.get("item_id", ""),
        "official_ge_url": row.get("official_ge_url", ""),
        "trade_volume": trade_volume,
        "error": error_text or row.get("error", ""),
    }


def write_rows(csv_path: Path, rows: list[dict[str, str]]) -> None:
    with csv_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def normalize_output_csv(input_csv: Path, output_csv: Path) -> None:
    input_rows = load_rows(input_csv)
    output_rows = load_rows(output_csv)
    latest_by_url = {
        (row.get("url") or "").strip(): row
        for row in output_rows
        if (row.get("url") or "").strip()
    }

    normalized_rows = []
    for input_row in input_rows:
        source_url = (input_row.get("url") or "").strip()
        normalized_rows.append(
            latest_by_url.get(source_url, build_output_row(input_row, "", "missing normalized output row"))
        )

    write_rows(output_csv, normalized_rows)


def main() -> None:
    rows = load_rows(INPUT_CSV)
    if not OUTPUT_CSV.exists():
        initialize_output_csv(OUTPUT_CSV)
    completed_urls = load_completed_urls(OUTPUT_CSV)

    for index, row in enumerate(rows, start=1):
        item = (row.get("item") or "").strip()
        source_url = (row.get("url") or "").strip()
        url = (row.get("official_ge_url") or "").strip()
        if source_url in completed_urls:
            print(f"[{index}/{len(rows)}] {item}")
            print("  skipping already saved row")
            continue

        print(f"[{index}/{len(rows)}] {item}")

        if not url:
            append_row(OUTPUT_CSV, build_output_row(row, "", "missing official_ge_url"))
            completed_urls.add(source_url)
            print("  ERROR: missing official_ge_url")
            continue

        try:
            html = fetch_html(url)
            trade_volume = str(extract_last_trade180_volume(html))
            append_row(OUTPUT_CSV, build_output_row(row, trade_volume, ""))
            completed_urls.add(source_url)
            print(f"  trade_volume={trade_volume}")
        except Exception as exc:
            append_row(OUTPUT_CSV, build_output_row(row, "", str(exc)))
            completed_urls.add(source_url)
            print(f"  ERROR: {exc}")

    normalize_output_csv(INPUT_CSV, OUTPUT_CSV)
    print(f"Wrote trade-volume rows to {OUTPUT_CSV.resolve()}")


if __name__ == "__main__":
    main()
