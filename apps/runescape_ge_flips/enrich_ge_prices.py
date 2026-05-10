import csv
import re
import time
from pathlib import Path
from urllib.parse import quote_plus

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.webdriver import WebDriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager


BASE_DIR = Path(__file__).resolve().parent
INPUT_CSV = BASE_DIR / "ge_buy_limits.csv"
OUTPUT_CSV = BASE_DIR / "ge_buy_limits_enriched.csv"
PAGE_LOAD_WAIT_SECONDS = 30
PAGE_SETTLE_SECONDS = 0.75
REQUEST_RETRY_COUNT = 3
DRIVER_RESTART_EVERY = 150
PRICE_LINE_RE = re.compile(r"^([\d,]+)(?:[+-]\d+)?(?:\s+[+-]?\d+%.*)?$")
FIELDNAMES = ["item", "amount", "url", "price", "max_spend", "item_id", "official_ge_url", "error"]


def build_driver() -> WebDriver:
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1600,2200")
    chrome_options.add_argument("--log-level=3")
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=chrome_options,
    )
    driver.set_page_load_timeout(PAGE_LOAD_WAIT_SECONDS + 15)
    return driver


def close_driver(driver: WebDriver | None) -> None:
    if driver is None:
        return
    try:
        driver.quit()
    except Exception:
        pass


def load_rows(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open("r", newline="", encoding="utf-8") as csv_file:
        return list(csv.DictReader(csv_file))


def extract_item_id(lines: list[str]) -> str:
    for index, line in enumerate(lines):
        if line == "Item ID" and index + 1 < len(lines):
            match = re.search(r"\d+", lines[index + 1])
            if match:
                return match.group(0)
    raise ValueError("Could not find Item ID on page.")


def extract_price(lines: list[str]) -> str:
    if "Last updated" in lines:
        cutoff = lines.index("Last updated")
        search_lines = lines[:cutoff]
    else:
        search_lines = lines

    for line in search_lines:
        match = PRICE_LINE_RE.match(line)
        if match:
            return match.group(1).replace(",", "")

    raise ValueError("Could not find price on page.")


def build_official_ge_url(item_name: str, item_id: str) -> str:
    quoted_name = quote_plus(item_name, safe="")
    return f"https://secure.runescape.com/m=itemdb_rs/{quoted_name}/viewitem?obj={item_id}"


def extract_page_data(page_html: str, fallback_item_name: str) -> tuple[str, str, str]:
    soup = BeautifulSoup(page_html, "html.parser")
    content = soup.select_one("#mw-content-text") or soup
    lines = list(content.stripped_strings)

    item_id = extract_item_id(lines)
    price = extract_price(lines)

    official_link = content.find("a", href=re.compile(r"secure\.runescape\.com/m=itemdb_rs/"))
    if official_link and official_link.get("href"):
        official_url = official_link["href"]
    else:
        official_url = build_official_ge_url(fallback_item_name, item_id)

    return price, item_id, official_url


def enrich_rows(driver: webdriver.Chrome, rows: list[dict[str, str]]) -> list[dict[str, str]]:
    enriched_rows = []

    for index, row in enumerate(rows, start=1):
        item = row["item"]
        url = row["url"]
        print(f"[{index}/{len(rows)}] Loading {item} -> {url}")

        price = ""
        item_id = ""
        official_url = ""
        error_text = ""

        try:
            driver.get(url)
            WebDriverWait(driver, PAGE_LOAD_WAIT_SECONDS).until(
                ec.presence_of_element_located((By.ID, "mw-content-text"))
            )
            time.sleep(PAGE_SETTLE_SECONDS)

            price, item_id, official_url = extract_page_data(driver.page_source, item)
            print(f"  price={price} item_id={item_id}")
        except Exception as exc:
            error_text = str(exc)
            print(f"  ERROR: {error_text}")

        enriched_rows.append(build_output_row(row, price, item_id, official_url, error_text))

    return enriched_rows


def build_output_row(
    row: dict[str, str],
    price: str,
    item_id: str,
    official_url: str,
    error_text: str,
) -> dict[str, str]:
    max_spend = ""
    if row["amount"] and price:
        try:
            max_spend = str(int(row["amount"]) * int(price))
        except ValueError:
            max_spend = ""

    return {
        "item": row["item"],
        "amount": row["amount"],
        "url": row["url"],
        "price": price,
        "max_spend": max_spend,
        "item_id": item_id,
        "official_ge_url": official_url,
        "error": error_text,
    }


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

    completed_urls = set()
    for row in load_rows(csv_path):
        url = (row.get("url") or "").strip()
        if url:
            completed_urls.add(url)
    return completed_urls


def ensure_output_csv(csv_path: Path) -> set[str]:
    if not csv_path.exists():
        initialize_output_csv(csv_path)
        return set()
    return load_completed_urls(csv_path)


def load_page_data(driver: WebDriver, item: str, url: str) -> tuple[str, str, str]:
    driver.get(url)
    WebDriverWait(driver, PAGE_LOAD_WAIT_SECONDS).until(
        ec.presence_of_element_located((By.ID, "mw-content-text"))
    )
    time.sleep(PAGE_SETTLE_SECONDS)
    return extract_page_data(driver.page_source, item)


def enrich_rows_incrementally(driver: WebDriver, rows: list[dict[str, str]], output_csv: Path) -> None:
    completed_urls = ensure_output_csv(output_csv)
    completed_count = len(completed_urls)
    if completed_count:
        print(f"Resuming with {completed_count} existing rows already saved")

    for index, row in enumerate(rows, start=1):
        item = row["item"]
        url = row["url"]

        if url in completed_urls:
            print(f"[{index}/{len(rows)}] Skipping already saved row for {item}")
            continue

        print(f"[{index}/{len(rows)}] Loading {item} -> {url}")

        if index > 1 and (index - 1) % DRIVER_RESTART_EVERY == 0:
            print("  Restarting browser session to avoid stale driver timeouts")
            close_driver(driver)
            driver = build_driver()

        price = ""
        item_id = ""
        official_url = ""
        error_text = ""

        for attempt in range(1, REQUEST_RETRY_COUNT + 1):
            try:
                price, item_id, official_url = load_page_data(driver, item, url)
                print(f"  price={price} item_id={item_id}")
                error_text = ""
                break
            except (TimeoutException, WebDriverException) as exc:
                error_text = f"attempt {attempt}/{REQUEST_RETRY_COUNT}: {exc}"
                print(f"  RETRYABLE ERROR: {error_text}")
                close_driver(driver)
                driver = build_driver()
            except Exception as exc:
                error_text = str(exc)
                print(f"  ERROR: {error_text}")
                break

        append_row(output_csv, build_output_row(row, price, item_id, official_url, error_text))
        completed_urls.add(url)

    close_driver(driver)


def sort_output_csv_by_max_spend(csv_path: Path) -> None:
    rows = load_rows(csv_path)
    rows.sort(key=max_spend_sort_key, reverse=True)
    write_rows(csv_path, rows)


def max_spend_sort_key(row: dict[str, str]) -> int:
    try:
        return int(row.get("max_spend", "") or 0)
    except ValueError:
        return 0


def write_rows(csv_path: Path, rows: list[dict[str, str]]) -> None:
    with csv_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    if not INPUT_CSV.exists():
        raise FileNotFoundError(f"Missing input CSV: {INPUT_CSV.resolve()}")

    rows = load_rows(INPUT_CSV)
    driver = build_driver()

    enrich_rows_incrementally(driver, rows, OUTPUT_CSV)
    sort_output_csv_by_max_spend(OUTPUT_CSV)
    print(f"Wrote incremental results to {OUTPUT_CSV.resolve()}")


if __name__ == "__main__":
    main()
