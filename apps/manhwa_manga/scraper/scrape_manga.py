"""
PART 2 — For every tag in tags.csv, scrape up to MAX_PAGES_PER_TAG manga pages.

Outputs (in ./data/):
  manga.csv        — one row per unique manga
  manga_tags.csv   — many-to-many junction: manga_id, tag_slug
  progress.json    — checkpoint so you can resume if interrupted

Schema
------
manga.csv:
  id, title, cover_url, page_url, language

manga_tags.csv:
  manga_id, tag_slug

Usage:
  python scrape_manga.py                      # runs all tags
  python scrape_manga.py --resume             # skip already-done tags
  python scrape_manga.py --tag zombie         # single tag only
  python scrape_manga.py --limit 5            # only first 5 tags (testing)
"""

import argparse
import csv
import json
import os
import re
import time
import requests
from bs4 import BeautifulSoup

try:
    import cloudscraper
    HAS_CLOUDSCRAPER = True
except ImportError:
    HAS_CLOUDSCRAPER = False

# ── CONFIG ────────────────────────────────────────────────────────────────────
BASE              = 'https://nhentai.net'
MAX_PAGES_PER_TAG = 50      # max pages per tag (25 galleries/page = up to 1250 per tag)
DELAY             = 1.5     # seconds between requests
TAGS_CSV          = 'tags.csv'
DATA_DIR          = 'data'
CHECKPOINT_FILE   = os.path.join(DATA_DIR, 'progress.json')

COOKIES = {}  # paste cf_clearance etc. if blocked

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

MANGA_FILE      = os.path.join(DATA_DIR, 'manga.csv')
MANGA_TAGS_FILE = os.path.join(DATA_DIR, 'manga_tags.csv')

# ── SESSION ───────────────────────────────────────────────────────────────────
def make_session():
    s = cloudscraper.create_scraper() if HAS_CLOUDSCRAPER else requests.Session()
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
                wait = 15 * attempt
                print(f'    Rate limited, waiting {wait}s...')
                time.sleep(wait)
            elif r.status_code == 404:
                return None
            else:
                print(f'    HTTP {r.status_code} — {url}')
                return None
        except Exception as e:
            print(f'    Request error (attempt {attempt}): {e}')
            time.sleep(4 * attempt)
    return None


# ── PARSE GALLERY LISTING PAGE ────────────────────────────────────────────────
def parse_gallery_page(html):
    soup    = BeautifulSoup(html, 'html.parser')
    results = []

    for div in soup.select('div.gallery'):
        a   = div.select_one('a.cover')
        img = div.select_one('img')
        if not a or not img:
            continue

        href = a.get('href', '')
        m    = re.search(r'/g/(\d+)/', href)
        if not m:
            continue

        gid = m.group(1)

        cover = img.get('data-src') or img.get('src') or ''

        title = img.get('alt', '').strip()
        if not title:
            cap = div.select_one('.caption')
            title = cap.get_text(strip=True) if cap else ''

        classes = div.get('class', [])
        if   'lang-gb' in classes: lang = 'en'
        elif 'lang-jp' in classes: lang = 'jp'
        elif 'lang-cn' in classes: lang = 'zh'
        else:                       lang = 'other'

        results.append({
            'id':        gid,
            'title':     title,
            'cover_url': cover,
            'page_url':  BASE + href,
            'language':  lang,
        })

    return results


def has_next_page(html, current_page):
    soup = BeautifulSoup(html, 'html.parser')
    for a in soup.select('.pagination a'):
        href = a.get('href', '')
        mp = re.search(r'page=(\d+)', href)
        if mp and int(mp.group(1)) > current_page:
            return True
    return False


# ── CHECKPOINT ────────────────────────────────────────────────────────────────
def load_progress():
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, encoding='utf-8') as f:
            return json.load(f)
    return {'done_tags': []}


def save_progress(done_tags):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(CHECKPOINT_FILE, 'w', encoding='utf-8') as f:
        json.dump({'done_tags': done_tags}, f)


# ── SEEN-ID LOADERS (lightweight sets, no full rows in memory) ────────────────
def load_seen_ids():
    """Return set of manga IDs already in manga.csv."""
    seen = set()
    if os.path.exists(MANGA_FILE):
        with open(MANGA_FILE, newline='', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                seen.add(row['id'])
    return seen


def load_seen_links():
    """Return set of (manga_id, tag_slug) already in manga_tags.csv."""
    seen = set()
    if os.path.exists(MANGA_TAGS_FILE):
        with open(MANGA_TAGS_FILE, newline='', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                seen.add((row['manga_id'], row['tag_slug']))
    return seen


def ensure_csv_headers():
    """Write CSV headers if the files don't exist yet."""
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(MANGA_FILE):
        with open(MANGA_FILE, 'w', newline='', encoding='utf-8') as f:
            csv.DictWriter(f, fieldnames=['id', 'title', 'cover_url', 'page_url', 'language']).writeheader()
    if not os.path.exists(MANGA_TAGS_FILE):
        with open(MANGA_TAGS_FILE, 'w', newline='', encoding='utf-8') as f:
            csv.DictWriter(f, fieldnames=['manga_id', 'tag_slug']).writeheader()


# ── SCRAPE ONE TAG ────────────────────────────────────────────────────────────
def scrape_tag(session, tag_url, tag_slug, seen_ids, seen_links, max_pages=MAX_PAGES_PER_TAG):
    new_manga = 0
    new_links = 0

    manga_writer = open(MANGA_FILE,      'a', newline='', encoding='utf-8')
    links_writer = open(MANGA_TAGS_FILE, 'a', newline='', encoding='utf-8')
    mw = csv.DictWriter(manga_writer, fieldnames=['id', 'title', 'cover_url', 'page_url', 'language'])
    lw = csv.DictWriter(links_writer, fieldnames=['manga_id', 'tag_slug'])

    try:
        for page in range(1, max_pages + 1):
            url  = f'{tag_url}?sort=date&page={page}'
            html = fetch(session, url)

            if not html:
                break

            entries = parse_gallery_page(html)
            if not entries:
                break

            new_this_page = 0
            for entry in entries:
                gid = entry['id']

                if gid not in seen_ids:
                    mw.writerow(entry)
                    seen_ids.add(gid)
                    new_manga += 1
                    new_this_page += 1

                link = (gid, tag_slug)
                if link not in seen_links:
                    lw.writerow({'manga_id': gid, 'tag_slug': tag_slug})
                    seen_links.add(link)
                    new_links += 1

            # Flush to disk after every page
            manga_writer.flush()
            links_writer.flush()

            if new_this_page == 0:
                print(f'    Page {page}: all dupes, stopping early.')
                break

            if not has_next_page(html, page):
                break

            time.sleep(DELAY)
    finally:
        manga_writer.close()
        links_writer.close()

    print(f'    +{new_manga} manga, +{new_links} tag links')
    return new_manga, new_links


# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--resume', action='store_true', help='Skip already-completed tags')
    parser.add_argument('--tag',    type=str, default=None,  help='Only scrape this tag slug')
    parser.add_argument('--limit',  type=int, default=None,  help='Only first N tags')
    args = parser.parse_args()

    if not os.path.exists(TAGS_CSV):
        print(f'ERROR: {TAGS_CSV} not found. Run scrape_tags.py first.')
        return

    with open(TAGS_CSV, newline='', encoding='utf-8') as f:
        tags = list(csv.DictReader(f))

    if args.tag:
        tags = [t for t in tags if t['slug'] == args.tag]
        if not tags:
            print(f'Tag "{args.tag}" not found in {TAGS_CSV}.')
            return

    if args.limit:
        tags = tags[:args.limit]

    ensure_csv_headers()

    progress  = load_progress()
    done_tags = set(progress['done_tags'])

    # Only IDs and link pairs in memory — no full rows
    seen_ids   = load_seen_ids()
    seen_links = load_seen_links()
    session    = make_session()

    print(f'Tags to process : {len(tags)}')
    print(f'Already done    : {len(done_tags)}')
    print(f'Seen manga IDs  : {len(seen_ids)}\n')

    total_manga = len(seen_ids)
    total_links = len(seen_links)

    for i, tag in enumerate(tags):
        slug = tag['slug']
        name = tag['name']
        url  = tag['url']

        if args.resume and slug in done_tags:
            print(f'[{i+1:>4}/{len(tags)}] SKIP {name}')
            continue

        print(f'[{i+1:>4}/{len(tags)}] {name}  ({tag.get("count","?")} manga)  {url}')
        nm, nl = scrape_tag(session, url, slug, seen_ids, seen_links)
        total_manga += nm
        total_links += nl

        done_tags.add(slug)
        save_progress(list(done_tags))

        time.sleep(DELAY)

    print(f'\nAll done!')
    print(f'  Unique manga : {total_manga}')
    print(f'  Tag links    : {total_links}')
    print(f'  Output dir   : {os.path.abspath(DATA_DIR)}')


if __name__ == '__main__':
    main()
