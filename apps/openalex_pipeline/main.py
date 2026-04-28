#!/usr/bin/env python3
"""
OpenAlex N-Gram Processor
=========================
Reads openalex_papers.csv (produced by get_data.py) and counts unigram +
bigram frequencies per year, broken down by:
  • global (all papers)
  • top N journals (by paper count)
  • all fields

Output: openalex_data.js  — loaded directly by index.html.

Data shape mirrors the ArXiv zeitgeist so the same UI pattern works.

Usage:
  python main.py
  python main.py --top-journals 100   # keep only top 100 journals (default 200)
  python main.py --min-year 1950      # ignore papers before this year
"""

import argparse
import csv
import json
import os
import re
import sys
import time
from collections import Counter, defaultdict

# ── Settings ──────────────────────────────────────────────────────────────────
INPUT_CSV           = "openalex_papers.csv"
OUTPUT_JS           = "openalex_data.js"

TOP_JOURNALS        = 300   # keep top N journals by paper count
MIN_JOURNAL_PAPERS  = 100   # discard journals with fewer total papers than this
MIN_YEAR            = 1600
MAX_YEAR            = 2030

TOP_TERMS_GLOBAL    = 200   # terms per year in the global bucket
TOP_TERMS_JOURNAL   = 60    # terms per year per journal
TOP_TERMS_FIELD     = 100   # terms per year per field
GLOBAL_TOP_TERMS    = 300   # all-time top terms (for header stats)

SAMPLE_PER_TERM     = 3     # max sample titles to store per (term, year)
# ──────────────────────────────────────────────────────────────────────────────

STOPWORDS = frozenset({
    "a","an","the","and","or","but","nor","so","yet","for","in","on","at","to",
    "of","up","by","as","is","it","its","be","am","are","was","were","been",
    "being","do","does","did","have","has","had","will","would","shall","should",
    "may","might","must","can","could","that","this","these","those","with",
    "from","into","upon","over","under","about","after","before","between",
    "among","through","during","against","without","within","along","across",
    "behind","beyond","out","around","down","off","above","near","he","she",
    "they","we","you","i","me","him","her","us","them","my","your","his","our",
    "their","which","who","whom","what","where","when","how","all","each",
    "every","both","few","more","most","other","some","such","no","not","only",
    "same","than","too","very","just","also","then","there","here","if","else",
    # academic filler
    "study","studies","analysis","analyses","research","paper","review","reviews",
    "report","reports","article","articles","journal","journals","method","methods",
    "methodology","approach","approaches","framework","frameworks","model","models",
    "modeling","modelling","system","systems","technique","techniques","algorithm",
    "algorithms","process","processes","application","applications","evaluation",
    "evaluations","assessment","investigation","experiment","experiments",
    "experimental","observation","observations","measurement","measurements",
    "development","developments","design","designs","introduction","overview",
    "survey","surveys","comparison","discussion","conclusion","conclusions",
    "result","results","finding","findings","evidence","data","dataset","datasets",
    "sample","samples","case","cases","example","examples","type","types","form",
    "forms","structure","structures","function","functions","role","roles",
    "effect","effects","impact","impacts","influence","influences","factor",
    "factors","cause","causes","relationship","relationships","association",
    "associations","test","tests","testing","validation","performance","accuracy",
    "efficiency","effectiveness","improvement","improvements","optimization",
    "solution","solutions","problem","problems","challenge","challenges","issue",
    "issues","task","tasks","objective","objectives","goal","goals","aim","aims",
    "perspective","perspectives","context","contexts","condition","conditions",
    "based","using","via","et","al","vs","new","novel","proposed","improved",
    "enhanced","advanced","simple","general","specific","different","various",
    "multiple","single","first","second","third","large","small","high","low",
    "deep","fast","real","recent","current","modern","traditional","standard",
    "complex","efficient","effective","accurate","robust","scalable","dynamic",
    "automatic","automated","potential","possible","available","existing",
    "related","similar","common","key","main","major","primary","secondary",
    "important","significant","critical","essential","fundamental","basic","core",
    "ie","eg","one","two","three","four","five","six","seven","eight","nine",
    "ten","towards","toward","per","non","multi","inter","intra","semi","sub",
    "pre","post","anti","co","de","en","le","la","les","und","der","die","das",
})

_CLEAN      = re.compile(r"[^a-z0-9\s\-]")
_SPACES     = re.compile(r"\s+")
_ASCII_WORD = re.compile(r"^[a-z][a-z\-]+$")


def tokenize(title: str) -> list:
    text   = _CLEAN.sub(" ", title.lower())
    text   = _SPACES.sub(" ", text).strip()
    tokens = []
    for w in text.split():
        if w in STOPWORDS:          continue
        if len(w) < 3:              continue
        if not _ASCII_WORD.match(w):continue
        if w.isdigit():             continue
        # must contain a vowel (drops pure consonant fragments / acronyms)
        if not any(c in "aeiouy" for c in w.replace("-", "")):
            continue
        tokens.append(w)
    return tokens


def safe_key(name: str) -> str:
    """Slug a journal/field name into a short ASCII key."""
    cleaned = re.sub(r"[^\w\s\-]", "", name.lower()).strip()
    return re.sub(r"[\s\-]+", "_", cleaned)[:80]


# ── Progress bar ──────────────────────────────────────────────────────────────
class Progress:
    def __init__(self, total, desc=""):
        self.total = total
        self.done  = 0
        self.desc  = desc
        self.t0    = time.time()
        self._ll   = 0

    def update(self, n=1):
        self.done += n
        if self.done % 5000 == 0 or self.done >= self.total:
            self._draw()

    def _draw(self):
        el  = time.time() - self.t0
        pct = self.done / self.total if self.total else 1
        rt  = self.done / el if el else 0
        eta = (self.total - self.done) / rt if rt and pct < 1 else 0
        def ft(s):
            m,sec=divmod(int(s),60); h,m=divmod(m,60)
            return f"{h}:{m:02d}:{sec:02d}" if h else f"{m:02d}:{sec:02d}"
        bar  = "█" * int(40 * pct) + "░" * (40 - int(40 * pct))
        line = (f"\r  {self.desc} |{bar}| {self.done:,}/{self.total:,} "
                f"({pct*100:.1f}%) [{ft(el)}<{ft(eta)}, {rt:,.0f}/s]")
        pad  = max(0, self._ll - len(line))
        sys.stdout.write(line + " " * pad)
        sys.stdout.flush()
        self._ll = len(line)

    def finish(self):
        self.done = self.total
        self._draw()
        sys.stdout.write("\n")
        sys.stdout.flush()
# ─────────────────────────────────────────────────────────────────────────────


def counter_to_list(c: Counter, limit: int) -> list:
    return [{"term": t, "count": n} for t, n in c.most_common(limit)]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--top-journals", type=int, default=TOP_JOURNALS)
    parser.add_argument("--min-year",     type=int, default=MIN_YEAR)
    args = parser.parse_args()

    top_j   = args.top_journals
    min_yr  = args.min_year

    print()
    print("  ╔══════════════════════════════════════════════════╗")
    print("  ║   OpenAlex N-Gram Processor                      ║")
    print("  ╚══════════════════════════════════════════════════╝")
    print()

    if not os.path.isfile(INPUT_CSV):
        print(f"  ✗  {INPUT_CSV} not found.")
        print(f"     Run get_data.py first, then re-run this script.")
        sys.exit(1)

    # ── Phase 1: count rows ───────────────────────────────────────────────────
    print("  Phase 1/4 · Counting rows...")
    total_rows = sum(1 for _ in open(INPUT_CSV, encoding="utf-8", errors="replace")) - 1
    print(f"  Found {total_rows:,} rows\n")

    # ── Phase 2: parse & accumulate ──────────────────────────────────────────
    print("  Phase 2/4 · Parsing titles and counting...\n")

    # global_years[year] = { u: Counter, b: Counter, n: int, s: {term: [samples]} }
    global_years = defaultdict(lambda: {
        "u": Counter(), "b": Counter(), "n": 0,
        "s": defaultdict(list),
    })

    # journal_years[jkey][year] = { u: Counter, b: Counter, n: int }
    journal_years  = defaultdict(lambda: defaultdict(lambda: {"u": Counter(), "b": Counter(), "n": 0}))
    journal_labels = {}   # jkey → display name
    journal_total  = Counter()

    # field_years[fkey][year] = { u: Counter, b: Counter, n: int }
    field_years    = defaultdict(lambda: defaultdict(lambda: {"u": Counter(), "b": Counter(), "n": 0}))
    field_labels   = {}
    field_total    = Counter()

    total_papers = skipped = 0
    prog = Progress(total_rows, "Parsing")

    with open(INPUT_CSV, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            prog.update()
            try:
                title   = (row.get("title")   or "").strip()
                date    = (row.get("date")     or "").strip()
                journal = (row.get("journal")  or "").strip()
                field   = (row.get("field")    or "").strip()

                if not title or not date or len(date) < 4:
                    skipped += 1; continue
                if not date[:4].isdigit():
                    skipped += 1; continue
                year_int = int(date[:4])
                if not (min_yr <= year_int <= MAX_YEAR):
                    skipped += 1; continue

                tokens = tokenize(title)
                if len(tokens) < 2:
                    skipped += 1; continue

                year = str(year_int)
                total_papers += 1

                gy = global_years[year]
                gy["n"] += 1

                seen_u = set()
                for t in tokens:
                    gy["u"][t] += 1
                    if t not in seen_u and len(gy["s"][t]) < SAMPLE_PER_TERM:
                        gy["s"][t].append({"title": title[:140], "date": date})
                        seen_u.add(t)

                for i in range(len(tokens) - 1):
                    gy["b"][f"{tokens[i]} {tokens[i+1]}"] += 1

                if journal:
                    jk = safe_key(journal)
                    journal_labels[jk] = journal
                    journal_total[jk] += 1
                    jy = journal_years[jk][year]
                    jy["n"] += 1
                    for t in tokens:
                        jy["u"][t] += 1
                    for i in range(len(tokens) - 1):
                        jy["b"][f"{tokens[i]} {tokens[i+1]}"] += 1

                if field:
                    fk = safe_key(field)
                    field_labels[fk] = field
                    field_total[fk] += 1
                    fy = field_years[fk][year]
                    fy["n"] += 1
                    for t in tokens:
                        fy["u"][t] += 1
                    for i in range(len(tokens) - 1):
                        fy["b"][f"{tokens[i]} {tokens[i+1]}"] += 1

            except Exception:
                skipped += 1
                continue

    prog.finish()
    print(f"\n  Parsed: {total_papers:,} papers  |  Skipped: {skipped:,}\n")

    # ── Phase 3: select top journals, build output dicts ─────────────────────
    print("  Phase 3/4 · Building output structures...\n")

    top_journal_keys = {
        jk for jk, cnt in journal_total.most_common(top_j)
        if cnt >= MIN_JOURNAL_PAPERS
    }

    sorted_years = sorted(global_years.keys(), key=int)
    if not sorted_years:
        print("  No usable data found in the CSV.")
        sys.exit(1)

    # Global years
    years_out = {}
    for yr in sorted_years:
        gy = global_years[yr]
        # Only keep samples for terms that appear at least a few times
        samples = {t: s for t, s in gy["s"].items() if gy["u"][t] >= 3}
        years_out[yr] = {
            "paperCount": gy["n"],
            "unigrams":   counter_to_list(gy["u"], TOP_TERMS_GLOBAL),
            "bigrams":    counter_to_list(gy["b"], TOP_TERMS_GLOBAL),
            "samples":    samples,
        }

    # Journals
    journals_out = {}
    journal_list = []
    for jk, total_cnt in journal_total.most_common(top_j):
        if jk not in top_journal_keys:
            continue
        label   = journal_labels.get(jk, jk)
        jy_dict = journal_years[jk]
        jyears  = {}
        for yr in sorted(jy_dict.keys(), key=int):
            jy = jy_dict[yr]
            jyears[yr] = {
                "paperCount": jy["n"],
                "unigrams":   counter_to_list(jy["u"], TOP_TERMS_JOURNAL),
                "bigrams":    counter_to_list(jy["b"], TOP_TERMS_JOURNAL),
            }
        journals_out[jk] = {"label": label, "paperCount": total_cnt, "years": jyears}
        journal_list.append({"key": jk, "label": label, "paperCount": total_cnt})

    # Fields
    fields_out = {}
    field_list = []
    for fk, total_cnt in field_total.most_common():
        label   = field_labels.get(fk, fk)
        fy_dict = field_years[fk]
        fyears  = {}
        for yr in sorted(fy_dict.keys(), key=int):
            fy = fy_dict[yr]
            fyears[yr] = {
                "paperCount": fy["n"],
                "unigrams":   counter_to_list(fy["u"], TOP_TERMS_FIELD),
                "bigrams":    counter_to_list(fy["b"], TOP_TERMS_FIELD),
            }
        fields_out[fk] = {"label": label, "paperCount": total_cnt, "years": fyears}
        field_list.append({"key": fk, "label": label, "paperCount": total_cnt})

    # All-time global top terms (for header stats)
    all_u = Counter()
    all_b = Counter()
    for yr in sorted_years:
        gy = global_years[yr]
        all_u.update(gy["u"])
        all_b.update(gy["b"])

    output = {
        "meta": {
            "totalPapers":  total_papers,
            "totalYears":   len(sorted_years),
            "yearRange":    [sorted_years[0], sorted_years[-1]],
            "totalJournals": len(journals_out),
            "totalFields":   len(fields_out),
            "generatedAt":   time.strftime("%Y-%m-%d %H:%M:%S"),
        },
        "years":         years_out,
        "globalUnigrams": counter_to_list(all_u, GLOBAL_TOP_TERMS),
        "globalBigrams":  counter_to_list(all_b, GLOBAL_TOP_TERMS),
        "journalList":    journal_list,
        "fieldList":      field_list,
        "journals":       journals_out,
        "fields":         fields_out,
    }

    # ── Phase 4: write JS ────────────────────────────────────────────────────
    print("  Phase 4/4 · Writing openalex_data.js...")
    js = (
        "// Auto-generated by main.py — do not edit manually.\n"
        "// Re-run main.py to regenerate after fetching new data.\n"
        "const OPENALEX_DATA = "
        + json.dumps(output, separators=(",", ":"))
        + ";\n"
    )
    with open(OUTPUT_JS, "w", encoding="utf-8") as f:
        f.write(js)

    size   = os.path.getsize(OUTPUT_JS)
    size_s = f"{size/1024:.1f} KB" if size < 1_048_576 else f"{size/1_048_576:.1f} MB"

    print()
    print(f"  ┌──────────────────────────────────────────────────┐")
    print(f"  │ ✓ Output: {OUTPUT_JS:<40} │")
    print(f"  │   Size:   {size_s:<40} │")
    print(f"  │   Papers: {total_papers:<40,} │")
    print(f"  │   Years:  {len(sorted_years):<40} │")
    print(f"  │   Journals: {len(journals_out):<38,} │")
    print(f"  │   Fields:   {len(fields_out):<38,} │")
    print(f"  └──────────────────────────────────────────────────┘")
    print()
    print("  Next → open index.html in your browser!")
    print()


if __name__ == "__main__":
    main()
