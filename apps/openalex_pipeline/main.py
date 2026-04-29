#!/usr/bin/env python3
"""
OpenAlex N-Gram Processor  —  chunked output edition
=====================================================
Reads openalex_papers.csv and writes multiple JS chunk files (~45 MB each)
plus a manifest, instead of one giant openalex_data.js.

Output files (written to the same directory as this script):
  openalex_manifest.js        – tiny file listing all chunk filenames
  openalex_data_000.js        – meta + global lists (always first, always small)
  openalex_data_001.js …      – years data  (split across as many files as needed)
  openalex_data_NNN.js …      – journals data  (continuation)
  openalex_data_NNN.js …      – fields data    (continuation)

index.html loads the manifest, then fetches all chunks in parallel and merges them.

Usage:
  python main.py                        # full run
  python main.py --incremental          # faster mid-crawl rebuild (lower term limits)
  python main.py --top-journals 100
  python main.py --min-year 1950
"""

import argparse
import csv
import glob
import json
import os
import re
import sys
import time
from collections import Counter, defaultdict

# ── Settings ──────────────────────────────────────────────────────────────────
HERE            = os.path.dirname(os.path.abspath(__file__))
INPUT_CSV       = os.path.join(HERE, "openalex_papers.csv")
MANIFEST_FILE   = os.path.join(HERE, "openalex_manifest.js")
CHUNK_PREFIX    = "openalex_data_"
TARGET_CHUNK_B  = 45 * 1024 * 1024   # 45 MB per chunk file

TOP_JOURNALS        = 300
MIN_JOURNAL_PAPERS  = 100
MIN_YEAR            = 1600
MAX_YEAR            = 2030

# Full-run term limits
TOP_TERMS_GLOBAL    = 200
TOP_TERMS_JOURNAL   = 60
TOP_TERMS_FIELD     = 100
GLOBAL_TOP_TERMS    = 300

# Incremental-run term limits (faster, smaller output)
INC_TOP_TERMS_GLOBAL  = 100
INC_TOP_TERMS_JOURNAL = 30
INC_TOP_TERMS_FIELD   = 50
INC_GLOBAL_TOP_TERMS  = 150

SAMPLE_PER_TERM = 3
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
    text = _CLEAN.sub(" ", title.lower())
    text = _SPACES.sub(" ", text).strip()
    tokens = []
    for w in text.split():
        if w in STOPWORDS:           continue
        if len(w) < 3:               continue
        if not _ASCII_WORD.match(w): continue
        if not any(c in "aeiouy" for c in w.replace("-", "")):
            continue
        tokens.append(w)
    return tokens


def safe_key(name: str) -> str:
    cleaned = re.sub(r"[^\w\s\-]", "", name.lower()).strip()
    return re.sub(r"[\s\-]+", "_", cleaned)[:80]


class Progress:
    def __init__(self, total, desc=""):
        self.total = total; self.done = 0
        self.desc = desc; self.t0 = time.time(); self._ll = 0

    def update(self, n=1):
        self.done += n
        if self.done % 10000 == 0 or self.done >= self.total:
            self._draw()

    def _draw(self):
        el = time.time() - self.t0
        pct = self.done / self.total if self.total else 1
        rt = self.done / el if el else 0
        eta = (self.total - self.done) / rt if rt and pct < 1 else 0
        def ft(s):
            m, sec = divmod(int(s), 60); h, m = divmod(m, 60)
            return f"{h}:{m:02d}:{sec:02d}" if h else f"{m:02d}:{sec:02d}"
        bar  = "█" * int(40 * pct) + "░" * (40 - int(40 * pct))
        line = (f"\r  {self.desc} |{bar}| {self.done:,}/{self.total:,} "
                f"({pct*100:.1f}%) [{ft(el)}<{ft(eta)}, {rt:,.0f}/s]")
        pad  = max(0, self._ll - len(line))
        sys.stdout.write(line + " " * pad)
        sys.stdout.flush()
        self._ll = len(line)

    def finish(self):
        self.done = self.total; self._draw()
        sys.stdout.write("\n"); sys.stdout.flush()


def counter_to_list(c: Counter, limit: int) -> list:
    return [{"term": t, "count": n} for t, n in c.most_common(limit)]


# ── Chunk writer ──────────────────────────────────────────────────────────────

class ChunkWriter:
    """Streams data into ~45 MB JS chunk files."""

    def __init__(self, target_bytes=TARGET_CHUNK_B):
        self.target = target_bytes
        self.chunk_idx = 1          # 000 is reserved for meta
        self.chunk_files = []
        self._cur = {}              # accumulated data for current chunk
        self._cur_size = 0

    def _flush(self):
        if not any(self._cur.get(k) for k in ("years", "journals", "fields")):
            return
        fname = f"{CHUNK_PREFIX}{self.chunk_idx:03d}.js"
        path  = os.path.join(HERE, fname)
        js    = (
            "window._OA=window._OA||[];\n"
            "window._OA.push("
            + json.dumps(self._cur, separators=(",", ":"))
            + ");\n"
        )
        with open(path, "w", encoding="utf-8") as f:
            f.write(js)
        self.chunk_files.append(fname)
        print(f"    wrote {fname}  ({len(js)/1024/1024:.1f} MB)")
        self.chunk_idx += 1
        self._cur = {}
        self._cur_size = 0

    def _ensure_key(self, key):
        if key not in self._cur:
            self._cur[key] = {}

    def add_year(self, yr, data):
        payload = json.dumps({yr: data}, separators=(",", ":"))
        size    = len(payload.encode())
        if self._cur_size + size > self.target and self._cur.get("years"):
            self._flush()
        self._ensure_key("years")
        self._cur["years"][yr] = data
        self._cur_size += size

    def add_journal(self, jk, data):
        payload = json.dumps({jk: data}, separators=(",", ":"))
        size    = len(payload.encode())
        # flush years first if still in cur
        if self._cur.get("years") and self._cur_size + size > self.target:
            self._flush()
        elif self._cur_size + size > self.target and self._cur.get("journals"):
            self._flush()
        self._ensure_key("journals")
        self._cur["journals"][jk] = data
        self._cur_size += size

    def add_field(self, fk, data):
        payload = json.dumps({fk: data}, separators=(",", ":"))
        size    = len(payload.encode())
        if (self._cur.get("years") or self._cur.get("journals")) and self._cur_size + size > self.target:
            self._flush()
        elif self._cur_size + size > self.target and self._cur.get("fields"):
            self._flush()
        self._ensure_key("fields")
        self._cur["fields"][fk] = data
        self._cur_size += size

    def finish(self):
        self._flush()
        return self.chunk_files


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--top-journals",  type=int, default=TOP_JOURNALS)
    parser.add_argument("--min-year",      type=int, default=MIN_YEAR)
    parser.add_argument("--incremental",   action="store_true",
                        help="Faster rebuild during live crawl (reduced term limits)")
    args = parser.parse_args()

    top_j  = args.top_journals
    min_yr = args.min_year
    inc    = args.incremental

    tg = INC_TOP_TERMS_GLOBAL  if inc else TOP_TERMS_GLOBAL
    tj = INC_TOP_TERMS_JOURNAL if inc else TOP_TERMS_JOURNAL
    tf = INC_TOP_TERMS_FIELD   if inc else TOP_TERMS_FIELD
    tG = INC_GLOBAL_TOP_TERMS  if inc else GLOBAL_TOP_TERMS

    tag = "[incremental] " if inc else ""
    print()
    print(f"  ╔══════════════════════════════════════════════════╗")
    print(f"  ║   OpenAlex N-Gram Processor  {tag:<20}║")
    print(f"  ╚══════════════════════════════════════════════════╝")
    print()

    if not os.path.isfile(INPUT_CSV):
        print(f"  ✗  {INPUT_CSV} not found.  Run get_data.py first.")
        sys.exit(1)

    # ── Phase 1: count rows ───────────────────────────────────────────────────
    total_rows = sum(1 for _ in open(INPUT_CSV, encoding="utf-8", errors="replace")) - 1
    print(f"  Phase 1/4 · {total_rows:,} rows found\n")

    # ── Phase 2: parse & accumulate ──────────────────────────────────────────
    print("  Phase 2/4 · Parsing…\n")

    global_years  = defaultdict(lambda: {"u": Counter(), "b": Counter(), "n": 0, "s": defaultdict(list)})
    journal_years = defaultdict(lambda: defaultdict(lambda: {"u": Counter(), "b": Counter(), "n": 0}))
    journal_labels= {}
    journal_total = Counter()
    field_years   = defaultdict(lambda: defaultdict(lambda: {"u": Counter(), "b": Counter(), "n": 0}))
    field_labels  = {}
    field_total   = Counter()

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

                if not title or not date or len(date) < 4 or not date[:4].isdigit():
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
                    for t in tokens:          jy["u"][t] += 1
                    for i in range(len(tokens)-1): jy["b"][f"{tokens[i]} {tokens[i+1]}"] += 1

                if field:
                    fk = safe_key(field)
                    field_labels[fk] = field
                    field_total[fk] += 1
                    fy = field_years[fk][year]
                    fy["n"] += 1
                    for t in tokens:          fy["u"][t] += 1
                    for i in range(len(tokens)-1): fy["b"][f"{tokens[i]} {tokens[i+1]}"] += 1

            except Exception:
                skipped += 1

    prog.finish()
    print(f"\n  Parsed: {total_papers:,}  |  Skipped: {skipped:,}\n")

    # ── Phase 3: build output dicts ──────────────────────────────────────────
    print("  Phase 3/4 · Building structures…\n")

    top_journal_keys = {
        jk for jk, cnt in journal_total.most_common(top_j) if cnt >= MIN_JOURNAL_PAPERS
    }
    sorted_years = sorted(global_years.keys(), key=int)
    if not sorted_years:
        print("  No usable data."); sys.exit(1)

    # Global per-year
    years_out = {}
    for yr in sorted_years:
        gy = global_years[yr]
        samples = {t: s for t, s in gy["s"].items() if gy["u"][t] >= 3}
        years_out[yr] = {
            "paperCount": gy["n"],
            "unigrams":   counter_to_list(gy["u"], tg),
            "bigrams":    counter_to_list(gy["b"], tg),
            "samples":    samples,
        }

    # Journals
    journals_out = {}
    journal_list = []
    for jk, total_cnt in journal_total.most_common(top_j):
        if jk not in top_journal_keys: continue
        label  = journal_labels.get(jk, jk)
        jyears = {}
        for yr in sorted(journal_years[jk].keys(), key=int):
            jy = journal_years[jk][yr]
            jyears[yr] = {
                "paperCount": jy["n"],
                "unigrams":   counter_to_list(jy["u"], tj),
                "bigrams":    counter_to_list(jy["b"], tj),
            }
        journals_out[jk] = {"label": label, "paperCount": total_cnt, "years": jyears}
        journal_list.append({"key": jk, "label": label, "paperCount": total_cnt})

    # Fields
    fields_out = {}
    field_list = []
    for fk, total_cnt in field_total.most_common():
        label  = field_labels.get(fk, fk)
        fyears = {}
        for yr in sorted(field_years[fk].keys(), key=int):
            fy = field_years[fk][yr]
            fyears[yr] = {
                "paperCount": fy["n"],
                "unigrams":   counter_to_list(fy["u"], tf),
                "bigrams":    counter_to_list(fy["b"], tf),
            }
        fields_out[fk] = {"label": label, "paperCount": total_cnt, "years": fyears}
        field_list.append({"key": fk, "label": label, "paperCount": total_cnt})

    # All-time top terms
    all_u = Counter()
    all_b = Counter()
    for yr in sorted_years:
        all_u.update(global_years[yr]["u"])
        all_b.update(global_years[yr]["b"])

    meta = {
        "totalPapers":   total_papers,
        "totalYears":    len(sorted_years),
        "yearRange":     [sorted_years[0], sorted_years[-1]],
        "totalJournals": len(journals_out),
        "totalFields":   len(fields_out),
        "generatedAt":   time.strftime("%Y-%m-%d %H:%M:%S"),
        "partial":       inc,
    }

    # ── Phase 4: write chunk files ───────────────────────────────────────────
    print("  Phase 4/4 · Writing chunk files…")

    # Remove stale chunk files from previous runs
    for old in glob.glob(os.path.join(HERE, f"{CHUNK_PREFIX}*.js")):
        os.remove(old)

    all_chunk_files = []

    # Chunk 000 — meta + global lists (always small, always first)
    chunk0_data = {
        "meta":           meta,
        "globalUnigrams": counter_to_list(all_u, tG),
        "globalBigrams":  counter_to_list(all_b, tG),
        "journalList":    journal_list,
        "fieldList":      field_list,
    }
    chunk0_fname = f"{CHUNK_PREFIX}000.js"
    chunk0_path  = os.path.join(HERE, chunk0_fname)
    chunk0_js = (
        "window._OA=window._OA||[];\n"
        "window._OA.push("
        + json.dumps(chunk0_data, separators=(",", ":"))
        + ");\n"
    )
    with open(chunk0_path, "w", encoding="utf-8") as f:
        f.write(chunk0_js)
    all_chunk_files.append(chunk0_fname)
    print(f"    wrote {chunk0_fname}  ({len(chunk0_js)/1024:.1f} KB)")

    # Chunks 001+ — years / journals / fields
    cw = ChunkWriter(TARGET_CHUNK_B)

    for yr in sorted_years:
        cw.add_year(yr, years_out[yr])

    for jk, jdata in journals_out.items():
        cw.add_journal(jk, jdata)

    for fk, fdata in fields_out.items():
        cw.add_field(fk, fdata)

    data_chunks = cw.finish()
    all_chunk_files.extend(data_chunks)

    # Write manifest
    manifest = {
        "chunks":       all_chunk_files,
        "generatedAt":  meta["generatedAt"],
        "totalPapers":  total_papers,
        "partial":      inc,
    }
    manifest_js = (
        "window.OPENALEX_MANIFEST="
        + json.dumps(manifest, separators=(",", ":"))
        + ";\n"
    )
    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        f.write(manifest_js)

    total_size = sum(
        os.path.getsize(os.path.join(HERE, fn)) for fn in all_chunk_files
    ) + os.path.getsize(MANIFEST_FILE)
    size_s = f"{total_size/1024/1024:.1f} MB"

    print()
    print(f"  ┌──────────────────────────────────────────────────────┐")
    print(f"  │ ✓ {len(all_chunk_files)} chunk file(s) + manifest written            │")
    print(f"  │   Total size : {size_s:<38} │")
    print(f"  │   Papers     : {total_papers:<38,} │")
    print(f"  │   Years      : {len(sorted_years):<38} │")
    print(f"  │   Journals   : {len(journals_out):<38,} │")
    print(f"  │   Fields     : {len(fields_out):<38,} │")
    print(f"  └──────────────────────────────────────────────────────┘")
    print()
    if not inc:
        print("  Next → push to GitHub, then open index.html in browser!")
    print()


if __name__ == "__main__":
    main()
