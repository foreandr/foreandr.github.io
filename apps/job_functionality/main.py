#!/usr/bin/env python3
"""
Jobs Dashboard Data Exporter
Reads all job source SQLite DBs + applications DB from DataMarketplace,
generates compact pre-aggregated JS files for the GitHub Pages dashboard.

Run this any time you want to refresh the dashboard data.
"""

import sqlite3
import json
import os
from collections import defaultdict
from datetime import datetime, date, timedelta

# ── Paths ──────────────────────────────────────────────────────────────────
BASE        = r"C:\Users\forea\Documents\DataMarketplace"
SRC_DIR     = os.path.join(BASE, "src")
APPS_DB     = os.path.join(BASE, "actions", "apply_to_jobs", "database.sqlite")
OUT_DIR     = os.path.join(os.path.dirname(__file__), "data")

# Job source folders to include (skip cars, realestate, upwork, eluta – tiny/irrelevant)
JOB_SOURCES = [
    "_canadian_jobbank",
    "_charityvillage_jobs",
    "_craigslist_jobs",
    "_goodwork_jobs",
    "_indeed_jobs",
    "_jobspider_jobs",
    "_saskjobs",
    "_workbc_jobs",
]

# Friendly display names
SOURCE_LABELS = {
    "_canadian_jobbank":    "Canadian Job Bank",
    "_charityvillage_jobs": "Charity Village",
    "_craigslist_jobs":     "Craigslist",
    "_goodwork_jobs":       "GoodWork",
    "_indeed_jobs":         "Indeed",
    "_jobspider_jobs":      "JobSpider",
    "_saskjobs":            "SaskJobs",
    "_workbc_jobs":         "WorkBC",
}

TOP_TITLES_PER_SOURCE = 100

# ── Helpers ────────────────────────────────────────────────────────────────

def get_date(dt_str):
    """Extract YYYY-MM-DD from a datetime string."""
    if not dt_str:
        return None
    try:
        return str(dt_str)[:10]
    except Exception:
        return None


def is_valid_date(d):
    """Filter out placeholder / sentinel dates like 2000-01-01."""
    if not d:
        return False
    try:
        dt = datetime.strptime(d, "%Y-%m-%d")
        return dt.year >= 2025
    except Exception:
        return False


def write_js(path, var_name, data):
    """Serialize data as a JS global variable file."""
    content = f"window.{var_name} = {json.dumps(data, separators=(',', ':'))};\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    kb = os.path.getsize(path) / 1024
    print(f"  ✓ {os.path.basename(path)}  ({kb:.1f} KB)")


# ── Loaders ────────────────────────────────────────────────────────────────

def load_source(db_path):
    """Load minimal columns from an items table."""
    records = []
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("PRAGMA table_info(items)")
    cols = {row["name"] for row in c.fetchall()}

    fields = ["title", "crawled_at"]
    if "city"     in cols: fields.append("city")
    if "province" in cols: fields.append("province")
    if "state"    in cols: fields.append("state")
    if "pay"      in cols: fields.append("pay")
    if "job_type" in cols: fields.append("job_type")
    if "work_mode" in cols: fields.append("work_mode")

    c.execute(f"SELECT {', '.join(fields)} FROM items")
    for row in c.fetchall():
        d = get_date(row["crawled_at"])
        records.append({
            "title":      (row["title"] or "").lower().strip(),
            "crawled_at": d,
            "city":       row["city"]     if "city"     in cols else None,
            "region":     row["province"] if "province" in cols else (row["state"] if "state" in cols else None),
            "pay":        row["pay"]      if "pay"      in cols else None,
            "job_type":   row["job_type"] if "job_type" in cols else None,
            "work_mode":  row["work_mode"] if "work_mode" in cols else None,
        })
    conn.close()
    return records


def load_apps():
    """Load applied_jobs and failed_jobs from the applications DB."""
    conn = sqlite3.connect(APPS_DB)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute("SELECT title, company, source, applied_at FROM applied_jobs ORDER BY applied_at")
    applied = []
    for row in c.fetchall():
        applied.append({
            "title":      row["title"],
            "company":    row["company"],
            "source":     row["source"],
            "date":       get_date(row["applied_at"]),
            "datetime":   row["applied_at"],
        })

    c.execute("SELECT title, company, source, reason, failed_at FROM failed_jobs ORDER BY failed_at")
    failed = []
    for row in c.fetchall():
        d = get_date(row["failed_at"])
        if not is_valid_date(d):
            continue
        failed.append({
            "title":   row["title"],
            "company": row["company"],
            "source":  row["source"],
            "reason":  row["reason"],
            "date":    d,
        })

    conn.close()
    return applied, failed


# ── Aggregators ────────────────────────────────────────────────────────────

def compute_by_day(all_data):
    """Return {source: {date: count}} for valid crawled_at dates."""
    by_day = {}
    for source, records in all_data.items():
        counts = defaultdict(int)
        for r in records:
            d = r["crawled_at"]
            if is_valid_date(d):
                counts[d] += 1
        by_day[source] = dict(sorted(counts.items()))
    return by_day


def compute_titles(all_data):
    """Return {source: [{title, count}, ...]} for top N titles per source."""
    titles = {}
    for source, records in all_data.items():
        counts = defaultdict(int)
        for r in records:
            t = r["title"]
            if t:
                counts[t] += 1
        top = sorted(counts.items(), key=lambda x: -x[1])[:TOP_TITLES_PER_SOURCE]
        titles[source] = [{"title": t, "count": c} for t, c in top]
    return titles


def compute_summary(all_data):
    """Return per-source stats + grand total."""
    sources = {}
    for source, records in all_data.items():
        valid = [r for r in records if is_valid_date(r["crawled_at"])]
        dates = [r["crawled_at"] for r in valid]
        sources[source] = {
            "label":    SOURCE_LABELS.get(source, source),
            "total":    len(valid),
            "min_date": min(dates) if dates else None,
            "max_date": max(dates) if dates else None,
        }
    return {
        "sources":      sources,
        "total_all":    sum(s["total"] for s in sources.values()),
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    print("=" * 60)
    print("Jobs Dashboard Data Exporter")
    print("=" * 60)

    # ── Load job sources
    all_data = {}
    for source in JOB_SOURCES:
        db_path = os.path.join(SRC_DIR, source, "database.sqlite")
        if not os.path.exists(db_path):
            print(f"  — Skipping {source} (no DB found)")
            continue
        records = load_source(db_path)
        valid = [r for r in records if is_valid_date(r["crawled_at"])]
        all_data[source] = valid
        label = SOURCE_LABELS.get(source, source)
        print(f"  Loaded {label}: {len(valid):,} valid / {len(records):,} total")

    print()

    # ── Export aggregated files
    print("Writing data files to:", OUT_DIR)

    summary = compute_summary(all_data)
    write_js(os.path.join(OUT_DIR, "summary.js"), "JOBS_SUMMARY", summary)

    by_day = compute_by_day(all_data)
    write_js(os.path.join(OUT_DIR, "by_day.js"), "JOBS_BY_DAY", by_day)

    titles = compute_titles(all_data)
    write_js(os.path.join(OUT_DIR, "titles.js"), "JOBS_TITLES", titles)

    # ── Load + export applications
    print()
    print("Loading application data...")
    applied, failed = load_apps()
    print(f"  Applied: {len(applied):,}  |  Failed: {len(failed):,}")

    apps_data = {
        "applied":      applied,
        "failed":       failed,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }
    write_js(os.path.join(OUT_DIR, "apps.js"), "APPS_DATA", apps_data)

    # ── Manifest
    manifest = {
        "files":         ["summary.js", "by_day.js", "titles.js", "apps.js"],
        "generated_at":  datetime.now().isoformat(timespec="seconds"),
        "total_jobs":    summary["total_all"],
        "total_applied": len(applied),
        "total_failed":  len(failed),
    }
    write_js(os.path.join(OUT_DIR, "manifest.js"), "DATA_MANIFEST", manifest)

    print()
    print("=" * 60)
    print(f"Done!  {summary['total_all']:,} jobs  |  {len(applied):,} applied  |  {len(failed):,} failed")
    print("=" * 60)


if __name__ == "__main__":
    main()
