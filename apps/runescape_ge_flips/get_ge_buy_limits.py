import csv
import re
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager


TARGET_URL = "https://runescape.wiki/w/Calculator:Grand_Exchange_buying_limits"
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_CSV = BASE_DIR / "ge_buy_limits.csv"
BASE_URL = "https://runescape.wiki"


def fetch_html(url: str) -> str:
    chrome_options = Options()
    # chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1600,2200")
    chrome_options.add_argument("--log-level=3")

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=chrome_options,
    )

    try:
        driver.get(url)
        WebDriverWait(driver, 30).until(
            ec.presence_of_element_located((By.TAG_NAME, "table"))
        )
        time.sleep(1)
        return driver.page_source
    finally:
        driver.quit()


def extract_limit(value: str) -> str:
    match = re.search(r"[\d,]+", value)
    if not match:
        return value.strip()
    return match.group(0).replace(",", "")


def row_to_record(row) -> tuple[str, str, str] | None:
    cells = row.find_all("td", recursive=False)
    if len(cells) < 2:
        return None

    item_cell = cells[0]
    limit_cell = cells[1]

    link = item_cell.find("a", href=True)
    item = item_cell.get_text(" ", strip=True)
    limit = extract_limit(limit_cell.get_text(" ", strip=True))
    item_url = urljoin(BASE_URL, link["href"]) if link else ""

    if not item or not limit:
        return None

    return item, limit, item_url


def table_has_item_limit_headers(table) -> bool:
    headers = [th.get_text(" ", strip=True).lower() for th in table.find_all("th")]
    return "item" in headers and "limit" in headers


def tables_for_fragment(soup: BeautifulSoup, fragment: str):
    anchor = soup.find(id=fragment)
    if anchor is None:
        raise ValueError(f"Could not find section #{fragment} on the page.")

    section_heading = anchor
    while section_heading and getattr(section_heading, "name", None) not in {"h1", "h2", "h3", "h4", "h5", "h6"}:
        section_heading = section_heading.parent

    if section_heading is None:
        raise ValueError(f"Could not resolve the heading for section #{fragment}.")

    tables = []
    for sibling in section_heading.find_next_siblings():
        if getattr(sibling, "name", None) == section_heading.name:
            break
        if getattr(sibling, "name", None) == "table" and table_has_item_limit_headers(sibling):
            tables.append(sibling)

    return tables


def collect_records(html: str, source_url: str) -> list[tuple[str, str, str]]:
    soup = BeautifulSoup(html, "html.parser")
    parsed = urlparse(source_url)
    fragment = parsed.fragment

    if fragment:
        tables = tables_for_fragment(soup, fragment)
    else:
        tables = [
            table
            for table in soup.find_all("table")
            if table_has_item_limit_headers(table)
        ]

    records = []
    seen = set()

    for table in tables:
        for row in table.find_all("tr"):
            record = row_to_record(row)
            if record is None:
                continue
            if record[0] in seen:
                continue
            seen.add(record[0])
            records.append(record)

    return records


def write_csv(records: list[tuple[str, str, str]], output_path: Path) -> None:
    with output_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(["item", "amount", "url"])
        writer.writerows(records)


def main() -> None:
    html = fetch_html(TARGET_URL)
    records = collect_records(html, TARGET_URL)
    write_csv(records, OUTPUT_CSV)
    print(f"Wrote {len(records)} rows to {OUTPUT_CSV.resolve()}")


if __name__ == "__main__":
    main()
