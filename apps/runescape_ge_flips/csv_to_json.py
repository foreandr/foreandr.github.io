import csv
import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
INPUT_CSV = BASE_DIR / "ge_buy_limits_enriched_with_trade_volume.csv"
OUTPUT_JSON = BASE_DIR / "ge_buy_limits_enriched_with_trade_volume.json"
INT_FIELDS = {"amount", "price", "max_spend", "item_id", "trade_volume"}


def convert_value(key: str, value: str):
    if key in INT_FIELDS:
        stripped = value.strip()
        if not stripped:
            return None
        try:
            return int(stripped)
        except ValueError:
            return value
    return value


def load_rows(csv_path: Path) -> list[dict]:
    with csv_path.open("r", newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        rows = []
        for row in reader:
            converted = {key: convert_value(key, value) for key, value in row.items()}
            rows.append(converted)
        return rows


def write_json(json_path: Path, rows: list[dict]) -> None:
    with json_path.open("w", encoding="utf-8") as json_file:
        json.dump(rows, json_file, indent=2, ensure_ascii=False)


def main() -> None:
    if not INPUT_CSV.exists():
        raise FileNotFoundError(f"Missing input CSV: {INPUT_CSV.resolve()}")

    rows = load_rows(INPUT_CSV)
    write_json(OUTPUT_JSON, rows)
    print(f"Wrote {len(rows)} rows to {OUTPUT_JSON.resolve()}")


if __name__ == "__main__":
    main()
