#!/usr/bin/env python3
"""
OpenAlex Paper Fetcher  —  live-rebuild edition
================================================
Fetches paper titles, dates, journals, and fields from the OpenAlex API.
Saves to openalex_papers.csv and automatically calls main.py every
FLUSH_EVERY rows so the JS chunk files are rebuilt in real time.

Usage:
  python get_data.py                       # fetch everything
  python get_data.py --limit 500000        # stop after 500 K papers
  python get_data.py --from-year 1980      # only papers 1980+
  python get_data.py --flush-every 50000   # rebuild JS every N papers (default 50000)
  python get_data.py --reset               # ignore checkpoint, start fresh

The output CSV is safe to interrupt and resume — re-run with no flags to continue.
"""

import argparse
import csv
import json
import os
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

# ── Settings ──────────────────────────────────────────────────────────────────
HERE        = os.path.dirname(os.path.abspath(__file__))
OUTFILE     = os.path.join(HERE, "openalex_papers.csv")
CURSOR_FILE = os.path.join(HERE, "output", "fetch_cursor.json")
EMAIL       = "foreandr@gmail.com"
PER_PAGE    = 200
POLITE_WAIT = 0.12          # ~8 req/s — within polite-pool limits
MAX_RETRIES = 6
BASE_URL    = "https://api.openalex.org/works"
SELECT_FIELDS = "display_name,publication_date,primary_location,topics"
# ──────────────────────────────────────────────────────────────────────────────


def _fmt_time(s):
    m, sec = divmod(int(s), 60)
    h, m   = divmod(m, 60)
    return f"{h}:{m:02d}:{sec:02d}" if h else f"{m:02d}:{sec:02d}"


def save_cursor(cursor, total_fetched, total_available):
    os.makedirs(os.path.join(HERE, "output"), exist_ok=True)
    with open(CURSOR_FILE, "w") as f:
        json.dump({"cursor": cursor, "fetched": total_fetched,
                   "total": total_available}, f)


def load_cursor():
    if os.path.exists(CURSOR_FILE):
        try:
            with open(CURSOR_FILE) as f:
                content = f.read().strip()
                return json.loads(content) if content else None
        except (json.JSONDecodeError, ValueError):
            return None
    return None


def clear_cursor():
    if os.path.exists(CURSOR_FILE):
        os.remove(CURSOR_FILE)


def fetch_page(cursor, filters_str):
    params = {
        "filter":   filters_str,
        "select":   SELECT_FIELDS,
        "per_page": PER_PAGE,
        "cursor":   cursor,
        "mailto":   EMAIL,
    }
    url = BASE_URL + "?" + urlencode(params)
    headers = {"User-Agent": f"openalex-fetcher/3.0 (mailto:{EMAIL})"}

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            req = Request(url, headers=headers)
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read())
        except HTTPError as e:
            if e.code == 429:
                print(f"\n  Rate limited (429). Waiting 90s…", flush=True)
                time.sleep(90)
            elif e.code >= 500:
                wait = min(60, attempt * 10)
                print(f"\n  Server error {e.code}. Retry {attempt} in {wait}s…", flush=True)
                time.sleep(wait)
            else:
                print(f"\n  HTTP {e.code}: {url}")
                raise
        except (URLError, OSError) as e:
            if attempt == MAX_RETRIES:
                raise
            wait = min(60, attempt * 10)
            print(f"\n  Network error: {e}. Retry {attempt}/{MAX_RETRIES} in {wait}s…", flush=True)
            time.sleep(wait)

    raise RuntimeError("Max retries exceeded")


def extract_row(result):
    title = (result.get("display_name") or "").strip()
    if not title:
        return None

    date = (result.get("publication_date") or "").strip()
    if not date or len(date) < 4 or not date[:4].isdigit():
        return None
    year = int(date[:4])
    if not (1800 <= year <= 2030):
        return None

    journal = ""
    loc = result.get("primary_location") or {}
    source = loc.get("source") or {}
    if isinstance(source, dict):
        journal = (source.get("display_name") or "").strip()

    field = ""
    topics = result.get("topics") or []
    if topics and isinstance(topics[0], dict):
        field_obj = topics[0].get("field") or {}
        if isinstance(field_obj, dict):
            field = (field_obj.get("display_name") or "").strip()

    return title, date, journal, field


def rebuild_js(incremental=True):
    """Call main.py to rebuild chunk files from the current CSV."""
    cmd = [sys.executable, os.path.join(HERE, "main.py")]
    if incremental:
        cmd.append("--incremental")
    print(f"\n  ── Rebuilding JS chunks {'(incremental)' if incremental else '(full)'}…", flush=True)
    t0 = time.time()
    try:
        result = subprocess.run(cmd, cwd=HERE, timeout=600)
        elapsed = time.time() - t0
        if result.returncode == 0:
            print(f"  ── Rebuild done in {elapsed:.1f}s\n", flush=True)
        else:
            print(f"  ── Rebuild exited with code {result.returncode}\n", flush=True)
    except subprocess.TimeoutExpired:
        print("  ── Rebuild timed out (>10 min) — will retry next flush\n", flush=True)
    except Exception as e:
        print(f"  ── Rebuild error: {e}\n", flush=True)


def main():
    parser = argparse.ArgumentParser(description="Fetch OpenAlex papers + live JS rebuild")
    parser.add_argument("--limit",       type=int, default=0,
                        help="Stop after N papers (0 = fetch all)")
    parser.add_argument("--from-year",   type=int, default=0,
                        help="Only papers this year or later")
    parser.add_argument("--flush-every", type=int, default=50_000,
                        help="Rebuild JS chunk files every N papers (default 50000)")
    parser.add_argument("--reset",       action="store_true",
                        help="Ignore checkpoint and start fresh")
    args = parser.parse_args()

    print()
    print("  ╔══════════════════════════════════════════════════╗")
    print("  ║   OpenAlex Paper Fetcher  (live-rebuild mode)    ║")
    print("  ╚══════════════════════════════════════════════════╝")
    print()
    print(f"  Output CSV   : {OUTFILE}")
    print(f"  JS rebuild   : every {args.flush_every:,} papers")
    if args.limit:       print(f"  Fetch limit  : {args.limit:,}")
    if args.from_year:   print(f"  From year    : {args.from_year}")
    print()

    # Build filter string
    filters = ["is_paratext:false", "language:en"]
    if args.from_year:
        filters.append(f"from_publication_date:{args.from_year}-01-01")
    filters_str = ",".join(filters)

    # Resume logic
    if args.reset:
        if os.path.exists(OUTFILE):
            os.remove(OUTFILE)
        clear_cursor()

    checkpoint    = None if args.reset else load_cursor()
    cursor        = "*"
    total_fetched = 0
    file_mode     = "w"

    if checkpoint:
        cursor        = checkpoint["cursor"]
        total_fetched = checkpoint["fetched"]
        file_mode     = "a"
        print(f"  Resuming from checkpoint — {total_fetched:,} papers already fetched")
        print()

    file_exists = os.path.isfile(OUTFILE) and file_mode == "a"
    next_flush  = (total_fetched // args.flush_every + 1) * args.flush_every

    with open(OUTFILE, file_mode, newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["title", "date", "journal", "field"])

        t0           = time.time()
        total_avail  = None
        pages        = 0
        rows_written = 0

        while True:
            try:
                data = fetch_page(cursor, filters_str)
            except Exception as e:
                print(f"\n\n  ✗ Fatal error: {e}")
                save_cursor(cursor, total_fetched, total_avail or 0)
                print(f"  Progress saved. Re-run to resume.")
                sys.exit(1)

            if total_avail is None:
                total_avail = data.get("meta", {}).get("count", 0)
                print(f"  Total available: {total_avail:,}")
                print()

            results = data.get("results", [])
            if not results:
                print("\n  No more results — fetch complete!")
                clear_cursor()
                break

            new_rows = 0
            for r in results:
                row = extract_row(r)
                if row:
                    writer.writerow(row)
                    new_rows += 1

            f.flush()
            total_fetched += len(results)
            rows_written  += new_rows
            pages         += 1

            # Progress line
            elapsed = time.time() - t0
            rate    = total_fetched / elapsed if elapsed > 0 else 0
            pct     = (total_fetched / total_avail * 100) if total_avail else 0
            eta     = (total_avail - total_fetched) / rate if rate > 0 and total_avail else 0

            sys.stdout.write(
                f"\r  [{pct:5.1f}%]  {total_fetched:>10,} / {total_avail:,}"
                f"  |  {rows_written:,} written"
                f"  |  {rate:,.0f}/s"
                f"  |  ETA {_fmt_time(eta)}"
                f"  |  next rebuild @ {next_flush:,}"
            )
            sys.stdout.flush()

            # Periodic JS rebuild
            if total_fetched >= next_flush:
                rebuild_js(incremental=True)
                next_flush += args.flush_every

            # Hit user limit?
            if args.limit and total_fetched >= args.limit:
                print(f"\n\n  Limit of {args.limit:,} reached.")
                clear_cursor()
                break

            next_cursor = data.get("meta", {}).get("next_cursor")
            if not next_cursor:
                print("\n\n  All pages fetched!")
                clear_cursor()
                break

            cursor = next_cursor
            save_cursor(cursor, total_fetched, total_avail)
            time.sleep(POLITE_WAIT)

    elapsed = time.time() - t0
    size    = os.path.getsize(OUTFILE)
    size_s  = f"{size/1024:.1f} KB" if size < 1_048_576 else f"{size/1_048_576:.1f} MB"

    print()
    print(f"  ┌────────────────────────────────────────────────────┐")
    print(f"  │ ✓ CSV saved: {os.path.basename(OUTFILE):<38} │")
    print(f"  │   Rows  : {rows_written:<42,} │")
    print(f"  │   Size  : {size_s:<42} │")
    print(f"  │   Time  : {_fmt_time(elapsed):<42} │")
    print(f"  └────────────────────────────────────────────────────┘")
    print()
    print("  Running final full JS rebuild…")
    rebuild_js(incremental=False)
    print("  All done!  Push to GitHub and open index.html.")
    print()


if __name__ == "__main__":
    main()
