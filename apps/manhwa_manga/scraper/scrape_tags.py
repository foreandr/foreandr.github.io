"""
PART 1 — Scrape all tags from nhentai.net/tags

Output: tags.csv
  name, slug, url, count

Usage:
  pip install requests beautifulsoup4 cloudscraper
  python scrape_tags.py

Tip: if Cloudflare blocks plain requests, the script auto-falls back to cloudscraper.
     If that also fails, add your browser cookies to COOKIES below.
"""

import csv
import time
import re
import sys
import requests
from bs4 import BeautifulSoup

try:
    import cloudscraper
    HAS_CLOUDSCRAPER = True
except ImportError:
    HAS_CLOUDSCRAPER = False

# ── CONFIG ────────────────────────────────────────────────────────────────────
BASE        = 'https://nhentai.net'
TOTAL_PAGES = 38          # nhentai tags go to page 38 alphabetically
DELAY       = 1.5         # seconds between requests — be polite
OUT_FILE    = 'tags.csv'

# Paste cookies from your browser if Cloudflare keeps blocking
# e.g. COOKIES = {'cf_clearance': 'xxxx', '__ddg1_': 'xxxx'}
COOKIES = {}

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    ),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://nhentai.net/',
}

# ── SESSION SETUP ─────────────────────────────────────────────────────────────
def make_session():
    if HAS_CLOUDSCRAPER:
        s = cloudscraper.create_scraper()
    else:
        s = requests.Session()
    s.headers.update(HEADERS)
    if COOKIES:
        s.cookies.update(COOKIES)
    return s


def fetch(session, url, retries=3):
    for attempt in range(1, retries + 1):
        try:
            r = session.get(url, timeout=15)
            if r.status_code == 200:
                return r.text
            elif r.status_code == 429:
                wait = 10 * attempt
                print(f'  Rate limited (429), waiting {wait}s...')
                time.sleep(wait)
            else:
                print(f'  HTTP {r.status_code} for {url}')
                return None
        except Exception as e:
            print(f'  Error (attempt {attempt}): {e}')
            time.sleep(3 * attempt)
    return None


# ── PARSE ─────────────────────────────────────────────────────────────────────
def parse_tags_page(html):
    """Return list of {name, slug, url, count} from one tags page."""
    soup = BeautifulSoup(html, 'html.parser')
    results = []

    for a in soup.select('a.tag'):
        href  = a.get('href', '')
        name  = a.select_one('span.name')
        count = a.select_one('span.count')

        if not name:
            continue

        slug = href.strip('/').split('/')[-1] if href else ''

        results.append({
            'name':  name.get_text(strip=True),
            'slug':  slug,
            'url':   BASE + href if href.startswith('/') else href,
            'count': count.get_text(strip=True).replace(',', '') if count else '0',
        })

    return results


def has_next_page(html, current_page):
    """Return True if there are more pages (checks pagination)."""
    soup = BeautifulSoup(html, 'html.parser')
    # Look for a page link beyond the current one
    for a in soup.select('section.pagination a, .pagination a'):
        href = a.get('href', '')
        m = re.search(r'page=(\d+)', href)
        if m and int(m.group(1)) > current_page:
            return True
    return False


# ── MAIN ──────────────────────────────────────────────────────────────────────
def scrape_tags(max_pages=TOTAL_PAGES, out_file=OUT_FILE):
    session  = make_session()
    all_tags = []
    seen     = set()

    for page in range(1, max_pages + 1):
        url = f'{BASE}/tags?sort=name&page={page}'
        print(f'[{page:>2}/{max_pages}] {url}')

        html = fetch(session, url)
        if not html:
            print(f'  Skipping page {page}')
            time.sleep(DELAY * 2)
            continue

        tags = parse_tags_page(html)
        added = 0
        for t in tags:
            if t['slug'] not in seen:
                seen.add(t['slug'])
                all_tags.append(t)
                added += 1

        print(f'  → {added} new tags (total so far: {len(all_tags)})')

        # Stop early if no pagination says there's a next page
        if not has_next_page(html, page):
            print(f'  No further pages found after page {page}.')
            break

        time.sleep(DELAY)

    # Write CSV
    with open(out_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['name', 'slug', 'url', 'count'])
        writer.writeheader()
        writer.writerows(all_tags)

    print(f'\nDone. {len(all_tags)} tags saved to {out_file}')
    return all_tags


if __name__ == '__main__':
    pages = int(sys.argv[1]) if len(sys.argv) > 1 else TOTAL_PAGES
    scrape_tags(max_pages=pages)
