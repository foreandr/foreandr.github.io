#!/usr/bin/env python3
"""
ArXiv Title Frequency Analyzer
===============================
Reads arxiv_titles_urls.csv, extracts date from arXiv IDs,
counts unigram + bigram frequencies per year-month,
outputs arxiv_data.js for the HTML visualization.

Progress tracking with percentage, ETA, and throughput.
"""

import csv
import json
import re
import os
import sys
import time
from collections import Counter, defaultdict

# ──────────────────────────────────────────────────
# SETTINGS
# ──────────────────────────────────────────────────
INPUT_CSV = "arxiv_titles_urls.csv"
OUTPUT_JS = "arxiv_data.js"

# Words to ignore (stopwords + filler academic terms)
STOPWORDS = {
    # common english
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "can", "need",
    "it", "its", "this", "that", "these", "those", "i", "we", "you",
    "he", "she", "they", "me", "us", "him", "her", "them", "my", "our",
    "your", "his", "their", "which", "who", "whom", "what", "where",
    "when", "how", "why", "if", "then", "than", "so", "no", "not",
    "only", "very", "just", "more", "most", "other", "some", "such",
    "into", "over", "after", "before", "between", "under", "above",
    "up", "down", "out", "off", "about", "through", "during", "each",
    "all", "both", "few", "many", "much", "any", "every", "own",
    # academic filler
    "using", "based", "via", "approach", "method", "methods", "study",
    "analysis", "new", "novel", "improved", "towards", "toward",
    "non", "pre", "multi", "re", "de", "al", "et", "vs", "etc",
    "also", "well", "two", "one", "first", "second", "case",
}

# Minimum occurrences to include a term in output
MIN_COUNT_UNIGRAM = 2
MIN_COUNT_BIGRAM = 2


# ──────────────────────────────────────────────────
# PROGRESS BAR
# ──────────────────────────────────────────────────
class ProgressTracker:
    """Console progress bar with percentage, ETA, throughput."""

    def __init__(self, total, description="Processing"):
        self.total = total
        self.current = 0
        self.description = description
        self.start_time = time.time()
        self.bar_width = 40
        self._last_print_len = 0

    def update(self, n=1):
        self.current += n
        # Only render every 500 rows or at completion to avoid I/O bottleneck
        if self.current % 500 == 0 or self.current >= self.total:
            self._render()

    def _render(self):
        elapsed = time.time() - self.start_time
        pct = self.current / self.total if self.total > 0 else 1.0
        filled = int(self.bar_width * pct)
        bar = "█" * filled + "░" * (self.bar_width - filled)

        # Throughput & ETA
        rate = self.current / elapsed if elapsed > 0 else 0
        if rate > 0 and pct < 1.0:
            remaining = (self.total - self.current) / rate
            eta_str = self._fmt_time(remaining)
        else:
            eta_str = "00:00"

        elapsed_str = self._fmt_time(elapsed)

        line = (
            f"\r  {self.description} |{bar}| "
            f"{self.current:,}/{self.total:,} "
            f"({pct * 100:5.1f}%) "
            f"[{elapsed_str}<{eta_str}, {rate:,.0f} rows/s]"
        )
        pad = max(0, self._last_print_len - len(line))
        sys.stdout.write(line + " " * pad)
        sys.stdout.flush()
        self._last_print_len = len(line)

    def finish(self):
        self.current = self.total
        self._render()
        sys.stdout.write("\n")
        sys.stdout.flush()

    @staticmethod
    def _fmt_time(seconds):
        m, s = divmod(int(seconds), 60)
        h, m = divmod(m, 60)
        if h > 0:
            return f"{h}:{m:02d}:{s:02d}"
        return f"{m:02d}:{s:02d}"


# ──────────────────────────────────────────────────
# EXTRACT DATE FROM ARXIV ID
# ──────────────────────────────────────────────────
def extract_year_month(url):
    """
    ArXiv IDs encode submission date:
      - New format: YYMM.NNNNN  (e.g., 2601.00141 = Jan 2026)
      - Old format: category/YYMMNNN (e.g., math/0601001 = Jan 2006)
    Returns (year, month) or None.
    """
    try:
        paper_id = url.strip().split("/")[-1]
        # Remove version suffix
        paper_id = re.sub(r"v\d+$", "", paper_id)

        # New format: YYMM.NNNNN
        m = re.match(r"^(\d{2})(\d{2})\.\d+$", paper_id)
        if m:
            yy, mm = int(m.group(1)), int(m.group(2))
            year = 2000 + yy if yy < 90 else 1900 + yy
            if 1 <= mm <= 12:
                return (year, mm)
            return None

        # Old format: YYMMNNN+
        m = re.match(r"^(\d{2})(\d{2})\d{3,}$", paper_id)
        if m:
            yy, mm = int(m.group(1)), int(m.group(2))
            year = 2000 + yy if yy < 90 else 1900 + yy
            if 1 <= mm <= 12:
                return (year, mm)

        return None
    except Exception:
        return None


# ──────────────────────────────────────────────────
# TOKENIZE TITLE
# ──────────────────────────────────────────────────
def tokenize(title):
    """Clean and tokenize a paper title into lowercase words."""
    text = re.sub(r"[^a-zA-Z0-9\s\-]", " ", title.lower())
    tokens = text.split()
    tokens = [
        t for t in tokens
        if len(t) >= 2 and t not in STOPWORDS and not t.isdigit()
    ]
    return tokens


# ──────────────────────────────────────────────────
# MAIN PIPELINE
# ──────────────────────────────────────────────────
def main():
    print()
    print("  ╔══════════════════════════════════════════════════╗")
    print("  ║   ArXiv Title Frequency Analyzer                 ║")
    print("  ╚══════════════════════════════════════════════════╝")
    print()

    if not os.path.isfile(INPUT_CSV):
        print(f"  ✗ File not found: {INPUT_CSV}")
        print(f"    Run your arxiv scraper first to generate this file.")
        sys.exit(1)

    # ── PHASE 1: Count rows ──────────────────────────
    print("  Phase 1/3 · Counting rows...")
    total_rows = 0
    with open(INPUT_CSV, "r", encoding="utf-8", errors="replace") as f:
        for _ in f:
            total_rows += 1
    total_rows = max(total_rows - 1, 0)  # subtract header
    print(f"  Found {total_rows:,} papers\n")

    # ── PHASE 2: Parse & count frequencies ───────────
    print("  Phase 2/3 · Parsing titles & counting frequencies...\n")

    # { "2026-01": { unigrams: Counter, bigrams: Counter, count: int } }
    monthly_data = defaultdict(lambda: {
        "unigrams": Counter(),
        "bigrams": Counter(),
        "count": 0,
    })

    global_unigrams = Counter()
    global_bigrams = Counter()
    total_papers = 0
    skipped = 0
    sample_titles = defaultdict(lambda: defaultdict(list))

    progress = ProgressTracker(total_rows, "Parsing")

    with open(INPUT_CSV, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        header = next(reader, None)

        if header:
            h_lower = [h.strip().lower() for h in header]
            title_idx = h_lower.index("title") if "title" in h_lower else 0
            url_idx = h_lower.index("url") if "url" in h_lower else 1
        else:
            title_idx, url_idx = 0, 1

        for row in reader:
            progress.update()
            try:
                if len(row) < 2:
                    skipped += 1
                    continue

                title = row[title_idx].strip()
                url = row[url_idx].strip()

                if not title or not url:
                    skipped += 1
                    continue

                ym = extract_year_month(url)
                if ym is None:
                    skipped += 1
                    continue

                year, month = ym
                key = f"{year}-{month:02d}"

                tokens = tokenize(title)
                if not tokens:
                    skipped += 1
                    continue

                total_papers += 1
                monthly_data[key]["count"] += 1

                # Unigrams
                uni_counted = set()
                for t in tokens:
                    monthly_data[key]["unigrams"][t] += 1
                    global_unigrams[t] += 1
                    if t not in uni_counted and len(sample_titles[key].get(t, [])) < 3:
                        sample_titles[key].setdefault(t, []).append({
                            "title": title[:140],
                            "url": url,
                        })
                        uni_counted.add(t)

                # Bigrams
                bi_counted = set()
                for i in range(len(tokens) - 1):
                    bigram = f"{tokens[i]} {tokens[i+1]}"
                    monthly_data[key]["bigrams"][bigram] += 1
                    global_bigrams[bigram] += 1
                    if bigram not in bi_counted and len(sample_titles[key].get(bigram, [])) < 3:
                        sample_titles[key].setdefault(bigram, []).append({
                            "title": title[:140],
                            "url": url,
                        })
                        bi_counted.add(bigram)

            except Exception:
                skipped += 1
                continue

    progress.finish()
    print(f"\n  Parsed: {total_papers:,} papers | Skipped: {skipped:,} rows\n")

    # ── PHASE 3: Build output JS ─────────────────────
    print("  Phase 3/3 · Building JS output...\n")

    sorted_months = sorted(monthly_data.keys())

    months_output = {}
    progress2 = ProgressTracker(len(sorted_months), "Building")

    for key in sorted_months:
        progress2.update()
        md = monthly_data[key]

        top_uni = [
            {"term": term, "count": cnt}
            for term, cnt in md["unigrams"].most_common(200)
            if cnt >= MIN_COUNT_UNIGRAM
        ]

        top_bi = [
            {"term": term, "count": cnt}
            for term, cnt in md["bigrams"].most_common(200)
            if cnt >= MIN_COUNT_BIGRAM
        ]

        samples = {}
        for item in (top_uni[:50] + top_bi[:50]):
            t = item["term"]
            if t in sample_titles[key]:
                samples[t] = sample_titles[key][t]

        months_output[key] = {
            "paperCount": md["count"],
            "unigrams": top_uni,
            "bigrams": top_bi,
            "samples": samples,
        }

    progress2.finish()

    # Global top terms
    global_top_uni = [
        {"term": t, "count": c}
        for t, c in global_unigrams.most_common(300)
        if c >= MIN_COUNT_UNIGRAM
    ]
    global_top_bi = [
        {"term": t, "count": c}
        for t, c in global_bigrams.most_common(300)
        if c >= MIN_COUNT_BIGRAM
    ]

    output = {
        "meta": {
            "totalPapers": total_papers,
            "totalMonths": len(sorted_months),
            "monthRange": [sorted_months[0], sorted_months[-1]] if sorted_months else [],
            "generatedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        },
        "months": months_output,
        "globalUnigrams": global_top_uni,
        "globalBigrams": global_top_bi,
    }

    js_content = (
        "// Auto-generated by process_arxiv.py\n"
        "// Do not edit manually — re-run the script to update.\n"
        "const ARXIV_DATA = "
        + json.dumps(output, separators=(",", ":"))
        + ";\n"
    )

    with open(OUTPUT_JS, "w", encoding="utf-8") as f:
        f.write(js_content)

    file_size = os.path.getsize(OUTPUT_JS)
    size_str = f"{file_size / 1024:.1f} KB" if file_size < 1_048_576 else f"{file_size / 1_048_576:.1f} MB"

    print()
    print("  ┌──────────────────────────────────────────────┐")
    print(f"  │ ✓ Output: {OUTPUT_JS:<34} │")
    print(f"  │   Size:   {size_str:<34} │")
    print(f"  │   Papers: {total_papers:<34,} │")
    print(f"  │   Months: {len(sorted_months):<34} │")
    print(f"  │   Terms:  {len(global_top_uni):,} unigrams, {len(global_top_bi):,} bigrams{' ' * (18 - len(str(len(global_top_uni))) - len(str(len(global_top_bi))))}│")
    print("  └──────────────────────────────────────────────┘")
    print()
    print("  Next → open index.html in your browser!")
    print()


if __name__ == "__main__":
    main()