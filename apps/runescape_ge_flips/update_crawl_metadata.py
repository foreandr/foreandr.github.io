import json
from datetime import datetime
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_JSON = BASE_DIR / "crawl_metadata.json"


def main() -> None:
    now = datetime.now().astimezone()
    payload = {
        "last_crawl_at": now.isoformat(),
        "generated_files": [
            "ge_buy_limits.csv",
            "ge_buy_limits_enriched.csv",
            "ge_buy_limits_enriched_with_trade_volume.csv",
            "ge_buy_limits_enriched_with_trade_volume.json",
        ],
    }
    OUTPUT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote crawl metadata to {OUTPUT_JSON.resolve()}")


if __name__ == "__main__":
    main()
