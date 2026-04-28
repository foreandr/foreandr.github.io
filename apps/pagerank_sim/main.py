#!/usr/bin/env python3
"""
PageRank Simulation Generator
==============================
Run:  python main.py
Then: open index.html in your browser

Generates ~10,000 synthetic HTML pages with cross-links, runs PageRank
via NetworkX, and produces:
  - pages/      10k interlinked HTML files (4 template varieties)
  - index.html  Interactive search + vis.js network dashboard
"""

import os, sys, json, random
from pathlib import Path
from collections import defaultdict

# ── auto-install networkx if needed ──────────────────────────────────────────
try:
    import networkx as nx
except ImportError:
    import subprocess
    print("Installing networkx...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "networkx"])
    import networkx as nx

# ── Config ────────────────────────────────────────────────────────────────────
NUM_PAGES    = 10_000
HUB_FRACTION = 0.05   # 5% of pages per topic are hub pages (high in-degree)
SEED         = 42
VIZ_N        = 700    # nodes shown in vis.js network
random.seed(SEED)

PAGES_DIR = Path("pages")

# ── Topic clusters ────────────────────────────────────────────────────────────
TOPICS = {
    "automotive": {
        "color": "#f97316",
        "keywords": ["car","engine","vehicle","motor","fuel","electric","brake","wheel","speed","transmission","exhaust","battery"],
        "title_parts": ["Electric Vehicles","Engine Design","Car Safety","Fuel Efficiency","Motor Technology","Highway Dynamics","Vehicle Engineering","Battery Systems","Auto Manufacturing"],
        "hubs": ["Automotive Encyclopedia","Car Technology Index","Vehicle Reference Hub","Motor Engineering Database"],
        "sentences": [
            "The {a} system fundamentally changed how engineers approach {b} optimization in modern vehicles.",
            "Research into {a} efficiency reveals critical dependencies on {b} performance characteristics.",
            "Modern {a} designs integrate advanced {b} control loops for improved reliability.",
            "The evolution of {a} has been driven by tighter regulations on {b} emissions and safety.",
        ],
    },
    "science": {
        "color": "#6366f1",
        "keywords": ["physics","chemistry","quantum","molecule","atom","experiment","theory","laboratory","research","particle","energy","wave"],
        "title_parts": ["Quantum Mechanics","Chemical Bonding","Particle Physics","Scientific Method","Energy Dynamics","Wave Theory","Atomic Structure","Molecular Biology","Field Theory"],
        "hubs": ["Science Reference Index","Physics Encyclopedia","Chemistry Database","Research Methods Hub"],
        "sentences": [
            "Experimental evidence for {a} behavior supports the theoretical framework of {b} interactions.",
            "The relationship between {a} and {b} is central to contemporary physical understanding.",
            "Laboratory investigations of {a} continue to refine our models of {b} mechanisms.",
            "A unified theory of {a} must account for all observed {b} phenomena at every scale.",
        ],
    },
    "cooking": {
        "color": "#10b981",
        "keywords": ["recipe","ingredient","cuisine","chef","flavor","bake","roast","spice","nutrition","diet","ferment","emulsify"],
        "title_parts": ["Mediterranean Cuisine","Baking Techniques","Flavor Chemistry","Chef Methods","Nutrition Science","Fermentation Guide","Spice Origins","Kitchen Science","Sauce Theory"],
        "hubs": ["Recipe Index","Culinary Encyclopedia","Food Science Reference","Flavor Database"],
        "sentences": [
            "The art of {a} preparation requires deep understanding of {b} and its effects on flavor.",
            "Traditional techniques for {a} have been refined over centuries to optimize {b} balance.",
            "The chemistry of {a} transformation during cooking involves complex {b} reactions.",
            "Expert chefs manipulate {a} to achieve precise control over {b} in the final dish.",
        ],
    },
    "sports": {
        "color": "#f43f5e",
        "keywords": ["athlete","game","team","score","tournament","training","coach","stadium","record","fitness","strategy","endurance"],
        "title_parts": ["Athletic Performance","Training Science","Team Strategy","Championship History","Sports Analytics","Endurance Training","Coaching Methods","Stadium Design","World Records"],
        "hubs": ["Sports Encyclopedia","Athletic Database","Game Records Hub","Team Statistics Index"],
        "sentences": [
            "Elite {a} performance depends on the optimization of {b} training protocols.",
            "The science of {a} has transformed how coaches develop {b} in high-level athletes.",
            "Championship-level {a} requires mastery of both physical and tactical {b} elements.",
            "Data analysis of {a} reveals important correlations with {b} performance outcomes.",
        ],
    },
    "technology": {
        "color": "#0ea5e9",
        "keywords": ["software","algorithm","computer","data","network","cloud","security","database","API","machine","system","protocol"],
        "title_parts": ["Machine Learning","Network Security","Cloud Architecture","Algorithm Design","Data Structures","Software Engineering","System Design","API Design","Protocol Analysis"],
        "hubs": ["Tech Reference Index","Computing Encyclopedia","Algorithm Database","Software Architecture Hub"],
        "sentences": [
            "Modern {a} architecture relies on efficient {b} design to achieve horizontal scalability.",
            "The integration of {a} with legacy {b} infrastructure presents unique engineering tradeoffs.",
            "Security considerations in {a} systems require careful analysis of {b} attack surfaces.",
            "Open-source {a} development has accelerated innovation across the {b} ecosystem.",
        ],
    },
    "history": {
        "color": "#a78bfa",
        "keywords": ["ancient","civilization","empire","war","revolution","culture","dynasty","artifact","conquest","trade","philosophy","religion"],
        "title_parts": ["Ancient Civilizations","Roman Empire","Industrial Revolution","Cultural Exchange","Trade Routes","Religious History","Philosophical Traditions","Military Strategy","Colonial History"],
        "hubs": ["History Reference Index","Civilization Encyclopedia","Archaeological Database","Cultural History Hub"],
        "sentences": [
            "The rise of {a} civilization altered patterns of {b} across entire continents.",
            "Archaeological evidence reveals how {a} societies conceptualized {b} and governance.",
            "The decline of {a} created conditions for new forms of {b} to emerge globally.",
            "Long-distance {a} trade drove the development of {b} networks across centuries.",
        ],
    },
    "medicine": {
        "color": "#ec4899",
        "keywords": ["disease","treatment","therapy","drug","patient","hospital","surgery","vaccine","diagnosis","genetics","anatomy","symptom"],
        "title_parts": ["Disease Prevention","Surgical Techniques","Drug Development","Genetic Medicine","Anatomy Atlas","Vaccine Science","Diagnostic Methods","Treatment Protocols","Clinical Trials"],
        "hubs": ["Medical Reference Index","Disease Encyclopedia","Treatment Database","Anatomy Atlas Hub"],
        "sentences": [
            "Clinical trials of {a} therapy demonstrated significant improvements in {b} outcomes.",
            "The mechanism of {a} action involves complex interactions with {b} cellular pathways.",
            "Advances in {a} diagnostics enabled earlier and more accurate detection of {b}.",
            "Understanding the genetic basis of {a} opened new frontiers in {b} personalized care.",
        ],
    },
    "space": {
        "color": "#fbbf24",
        "keywords": ["planet","star","galaxy","orbit","telescope","astronomy","rocket","mission","cosmos","nebula","satellite","exoplanet"],
        "title_parts": ["Planetary Science","Stellar Evolution","Galaxy Formation","Space Missions","Telescope Technology","Orbital Mechanics","Cosmic Phenomena","Exoplanet Discovery","Dark Matter"],
        "hubs": ["Space Reference Index","Astronomy Encyclopedia","Mission Archive","Cosmos Database"],
        "sentences": [
            "Observations of {a} phenomena provided new evidence for theories of {b} formation.",
            "Space missions targeting {a} environments yielded surprising data about {b} composition.",
            "Telescope arrays designed to study {a} emissions revealed unexpected {b} structures.",
            "The dynamics of {a} orbits are governed by complex gravitational interactions with {b}.",
        ],
    },
}
TOPIC_NAMES  = list(TOPICS.keys())
TOPIC_COLORS = {t: TOPICS[t]["color"] for t in TOPIC_NAMES}

# ── HTML Templates (4 varieties) ──────────────────────────────────────────────
def tmpl_article(p, links_html, tags_html, p1, p2):
    return f"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{p['title']}</title>
<style>
  body{{font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:28px 20px;background:#fafaf8;color:#1a1a1a;line-height:1.8}}
  .nav{{font-size:.8rem;margin-bottom:18px}}.nav a{{color:#555;text-decoration:none}}
  h1{{font-size:1.85rem;border-bottom:2px solid #333;padding-bottom:10px;margin:0 0 8px}}
  .meta{{color:#777;font-size:.82rem;margin-bottom:18px}}
  .tags{{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px}}
  .tag{{background:#e8e4dc;padding:3px 10px;border-radius:3px;font-size:.78rem}}
  p{{margin:0 0 14px}}
  .refs{{margin-top:36px;border-top:1px solid #ddd;padding-top:18px}}
  .refs a{{display:inline-block;margin:3px 5px;color:#1a6;text-decoration:none;font-size:.88rem}}
  .refs a:hover{{text-decoration:underline}}
</style></head><body>
<div class="nav"><a href="../index.html">← PageRank Sim</a></div>
<h1>{p['title']}</h1>
<div class="meta">Topic: {p['topic'].title()} &nbsp;·&nbsp; {p['id']}</div>
<div class="tags">{tags_html}</div>
<p>{p1}</p><p>{p2}</p>
<div class="refs"><strong>See also:</strong><br>{links_html}</div>
</body></html>"""

def tmpl_wiki(p, links_html, tags_html, p1, p2):
    return f"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{p['title']} — Wiki</title>
<style>
  *{{box-sizing:border-box}}body{{font-family:'Linux Libertine',Georgia,serif;margin:0;background:#fff;color:#202122;font-size:14px;line-height:1.65}}
  .nav{{background:#f8f9fa;border-bottom:1px solid #a2a9b1;padding:6px 18px;font-size:.8rem}}.nav a{{color:#555;text-decoration:none}}
  .hdr{{background:#f8f9fa;border-bottom:1px solid #a2a9b1;padding:10px 18px}}.hdr h1{{font-size:1.55rem;margin:0;font-weight:normal}}
  .wrap{{max-width:980px;margin:0 auto;padding:16px 18px;display:grid;grid-template-columns:1fr 240px;gap:22px}}
  .info{{background:#f8f9fa;border:1px solid #a2a9b1;padding:10px;font-size:.83rem}}
  .info dt{{font-weight:bold;color:#54595d;margin-top:8px}}.info dd{{margin:2px 0}}
  p{{margin:0 0 10px}}.see a{{color:#0645ad;text-decoration:none;display:block;margin:3px 0;font-size:.88rem}}
  .see a:hover{{text-decoration:underline}}
</style></head><body>
<div class="nav"><a href="../index.html">← PageRank Sim</a></div>
<div class="hdr"><h1>{p['title']}</h1></div>
<div class="wrap">
<div><p>{p1}</p><p>{p2}</p>
<div class="see"><strong>Related:</strong>{links_html}</div></div>
<aside><div class="info"><dl>
<dt>Topic</dt><dd>{p['topic'].title()}</dd>
<dt>Page ID</dt><dd>{p['id']}</dd>
<dt>Keywords</dt><dd>{', '.join(p['keywords'])}</dd>
</dl></div></aside></div>
</body></html>"""

def tmpl_blog(p, links_html, tags_html, p1, p2):
    return f"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{p['title']}</title>
<style>
  body{{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5}}
  .nav{{font-size:.8rem;padding:8px 18px}}.nav a{{color:#555;text-decoration:none}}
  .hero{{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:36px 20px;text-align:center}}
  .hero h1{{font-size:1.75rem;margin:0 0 6px}}.hero .meta{{opacity:.8;font-size:.82rem}}
  .card{{background:#fff;max-width:740px;margin:-18px auto 0;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.08);padding:28px}}
  .tags{{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px}}
  .tag{{background:#ede9fe;color:#6d28d9;padding:3px 10px;border-radius:99px;font-size:.75rem;font-weight:600}}
  p{{color:#374151;line-height:1.75;margin:0 0 14px}}
  .refs{{margin-top:22px;padding-top:18px;border-top:1px solid #e5e7eb}}
  .refs a{{display:inline-block;margin:3px 5px;background:#f3f4f6;color:#4b5563;padding:4px 11px;border-radius:6px;text-decoration:none;font-size:.8rem}}
  .refs a:hover{{background:#ddd6fe;color:#5b21b6}}
</style></head><body>
<div class="nav"><a href="../index.html">← PageRank Sim</a></div>
<div class="hero"><h1>{p['title']}</h1>
<div class="meta">{p['topic'].title()} · {p['id']}</div></div>
<div class="card">
<div class="tags">{tags_html}</div>
<p>{p1}</p><p>{p2}</p>
<div class="refs">{links_html}</div>
</div></body></html>"""

def tmpl_dark(p, links_html, tags_html, p1, p2):
    return f"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{p['title']}</title>
<style>
  body{{background:#0d1117;color:#c9d1d9;font-family:'SFMono-Regular',Consolas,monospace;font-size:13px;padding:18px;line-height:1.7;margin:0}}
  .nav{{margin-bottom:14px;font-size:.78rem}}.nav a{{color:#8b949e;text-decoration:none}}
  .hdr{{border-bottom:1px solid #30363d;padding-bottom:12px;margin-bottom:18px}}
  .hdr h1{{color:#e6edf3;font-size:1.3rem;margin:0}}.id{{color:#8b949e;font-size:.78rem}}
  .kw{{color:#7ee787;margin:6px 0}}.kw-l{{color:#8b949e}}
  p{{color:#adbac7;margin:0 0 12px}}
  .refs{{margin-top:22px;border-top:1px solid #30363d;padding-top:14px}}
  .refs a{{color:#58a6ff;text-decoration:none;display:inline-block;margin:2px 7px 2px 0;font-size:.83rem}}
  .refs a:hover{{text-decoration:underline}}
  .lbl{{color:#8b949e;font-size:.72rem;text-transform:uppercase;letter-spacing:1px;margin:0 0 7px}}
</style></head><body>
<div class="nav"><a href="../index.html">← PageRank Sim</a></div>
<div class="hdr">
<h1>{p['title']}</h1>
<div class="id">doc:{p['id']} · category:{p['topic']}</div>
<div class="kw"><span class="kw-l">tags: </span>{', '.join(p['keywords'])}</div>
</div>
<div class="lbl">Summary</div>
<p>{p1}</p><p>{p2}</p>
<div class="refs"><div class="lbl">References</div>{links_html}</div>
</body></html>"""

TEMPLATE_FNS = [tmpl_article, tmpl_wiki, tmpl_blog, tmpl_dark]

# ── Content helpers ───────────────────────────────────────────────────────────
def make_content(topic_name):
    td = TOPICS[topic_name]
    kws, sents = td["keywords"], td["sentences"]
    def s():
        a, b = random.sample(kws, 2)
        return random.choice(sents).format(a=a, b=b)
    return s() + " " + s(), s() + " " + s()

def make_title(topic_name, is_hub, i):
    td = TOPICS[topic_name]
    if is_hub:
        return td["hubs"][i % len(td["hubs"])]
    prefixes = ["Introduction to","Advanced","Fundamentals of","Modern","Applied","A Survey of","Deep Dive:","Practical"]
    suffixes = ["Guide","Overview","Analysis","Reference","Study","Review","Handbook"]
    parts = td["title_parts"]
    if random.random() < 0.5:
        return f"{random.choice(prefixes)} {random.choice(parts)}"
    return f"{random.choice(parts)}: A {random.choice(suffixes)}"

# ── Page generation ───────────────────────────────────────────────────────────
def generate_pages():
    pages, pid = [], 0
    per_topic = NUM_PAGES // len(TOPIC_NAMES)
    for topic_name in TOPIC_NAMES:
        n_hubs = max(4, int(per_topic * HUB_FRACTION))
        for i in range(per_topic):
            is_hub = (i < n_hubs)
            pages.append({
                "id":       f"page_{pid:05d}",
                "title":    make_title(topic_name, is_hub, i),
                "topic":    topic_name,
                "keywords": random.sample(TOPICS[topic_name]["keywords"], 5),
                "is_hub":   is_hub,
                "tmpl":     random.randint(0, 3),
                "links":    [],
            })
            pid += 1
    return pages

def assign_links(pages):
    by_topic  = defaultdict(list)
    for i, p in enumerate(pages):
        by_topic[p["topic"]].append(i)
    all_hubs = [i for i, p in enumerate(pages) if p["is_hub"]]

    for i, page in enumerate(pages):
        topic = page["topic"]
        same  = [j for j in by_topic[topic] if j != i]
        other = [j for j in range(len(pages)) if pages[j]["topic"] != topic]
        n = random.randint(30, 50) if page["is_hub"] else random.randint(10, 25)

        chosen = set()
        chosen.update(random.sample(same,     min(int(n * 0.70), len(same))))
        chosen.update(random.sample(all_hubs, min(max(2, int(n * 0.10)), len(all_hubs))))
        rem = n - len(chosen)
        if rem > 0 and other:
            chosen.update(random.sample(other, min(rem, len(other))))
        page["links"] = [pages[j]["id"] for j in chosen]
    return pages

def write_pages(pages):
    PAGES_DIR.mkdir(exist_ok=True)
    total = len(pages)
    for idx, p in enumerate(pages):
        if idx % 500 == 0:
            print(f"  Writing pages... {idx}/{total}", end="\r")
        tags_html = "".join(f'<span class="tag">{k}</span>' for k in p["keywords"])
        p1, p2 = make_content(p["topic"])
        fn = TEMPLATE_FNS[p["tmpl"]]
        if p["tmpl"] == 1:
            lhtml = "".join(f'<a href="{lid}.html">→ {lid.replace("_"," ").title()}</a>' for lid in p["links"])
        elif p["tmpl"] == 3:
            lhtml = " ".join(f'<a href="{lid}.html">{lid}</a>' for lid in p["links"])
        else:
            lhtml = " ".join(f'<a href="{lid}.html">{lid.replace("_"," ").title()}</a>' for lid in p["links"])
        html = fn(p, lhtml, tags_html, p1, p2)
        (PAGES_DIR / f"{p['id']}.html").write_text(html, encoding="utf-8")
    print(f"  Writing pages... {total}/{total} ✓               ")

# ── Graph & PageRank ──────────────────────────────────────────────────────────
def build_graph(pages):
    print("  Building graph...", end="\r")
    G   = nx.DiGraph()
    ids = {p["id"] for p in pages}
    for p in pages:
        G.add_node(p["id"])
    for p in pages:
        for lid in p["links"]:
            if lid in ids:
                G.add_edge(p["id"], lid)
    print(f"  Graph: {G.number_of_nodes():,} nodes, {G.number_of_edges():,} edges ✓")
    return G

def compute_pagerank(G):
    print("  Computing PageRank (NetworkX)...", end="\r")
    pr = nx.pagerank(G, alpha=0.85, max_iter=100)
    print("  PageRank computed ✓                         ")
    return pr

# ── Index HTML ────────────────────────────────────────────────────────────────
INDEX_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PageRank Simulation</title>
<script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
<style>
  :root {
    --bg: #0d1117; --surface: #161b22; --border: #30363d;
    --text: #c9d1d9; --muted: #8b949e; --accent: #58a6ff;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

  /* ── Nav ── */
  nav { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 20px; height: 50px; display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
  nav h1 { font-size: 1rem; font-weight: 600; margin-right: auto; }
  .stat-chip { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 3px 10px; font-size: .72rem; color: var(--muted); }
  .stat-chip strong { color: var(--text); }
  nav a { color: var(--muted); text-decoration: none; font-size: .8rem; }
  nav a:hover { color: var(--accent); }

  /* ── Layout ── */
  .body { display: flex; flex: 1; overflow: hidden; }

  /* ── Sidebar ── */
  .sidebar { width: 340px; flex-shrink: 0; border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
  .search-box { padding: 14px; border-bottom: 1px solid var(--border); }
  .search-row { display: flex; gap: 8px; }
  input[type=text] { flex: 1; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 7px 11px; border-radius: 6px; font-size: .88rem; outline: none; }
  input[type=text]:focus { border-color: var(--accent); }
  .btn { background: var(--accent); color: #0d1117; border: none; padding: 7px 14px; border-radius: 6px; font-weight: 700; font-size: .82rem; cursor: pointer; }
  .btn:hover { filter: brightness(1.1); }
  .btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--muted); }
  .btn-ghost:hover { border-color: var(--muted); color: var(--text); filter: none; }
  .hint { font-size: .7rem; color: var(--muted); margin-top: 7px; line-height: 1.5; }

  .results { flex: 1; overflow-y: auto; padding: 8px; }
  .result-item { padding: 9px 11px; border-radius: 7px; border: 1px solid transparent; margin-bottom: 3px; cursor: pointer; transition: .12s; }
  .result-item:hover { background: var(--surface); border-color: var(--border); }
  .result-item.active { background: rgba(88,166,255,.08); border-color: var(--accent); }
  .r-num { font-size: .65rem; color: var(--muted); font-weight: 700; letter-spacing: .5px; }
  .r-title { font-size: .86rem; color: var(--text); font-weight: 500; margin: 2px 0; }
  .r-meta { font-size: .7rem; color: var(--muted); }
  .r-bar-wrap { height: 2px; background: var(--border); border-radius: 1px; margin-top: 5px; }
  .r-bar { height: 100%; border-radius: 1px; }
  .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
  .empty { padding: 28px 14px; color: var(--muted); font-size: .82rem; text-align: center; line-height: 1.6; }

  /* ── Legend panel ── */
  .legend-panel { padding: 12px 14px; border-top: 1px solid var(--border); flex-shrink: 0; }
  .legend-title { font-size: .68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .legend-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
  .leg-row { display: flex; align-items: center; gap: 6px; padding: 4px 6px; border-radius: 5px; cursor: pointer; transition: .12s; border: 1px solid transparent; }
  .leg-row:hover { background: var(--surface); border-color: var(--border); }
  .leg-row.active { border-color: var(--accent); }
  .leg-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .leg-lbl { font-size: .75rem; color: var(--text); }
  .leg-lbl.dim { color: var(--muted); }

  /* ── Network panel ── */
  .net-panel { flex: 1; position: relative; overflow: hidden; }
  #network { width: 100%; height: 100%; }

  /* ── Info overlay ── */
  .net-info { position: absolute; top: 12px; right: 12px; background: rgba(13,17,23,.9); border: 1px solid var(--border); border-radius: 8px; padding: 10px 13px; font-size: .72rem; color: var(--muted); max-width: 260px; line-height: 1.55; pointer-events: none; }
  .net-info strong { color: var(--text); }

  /* ── Node detail popup ── */
  .node-popup { position: absolute; bottom: 16px; left: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; font-size: .8rem; max-width: 300px; display: none; }
  .node-popup.show { display: block; }
  .np-title { font-size: .95rem; font-weight: 600; color: var(--text); margin-bottom: 6px; }
  .np-row { color: var(--muted); margin: 3px 0; }
  .np-row strong { color: var(--text); }
  .np-open { display: inline-block; margin-top: 8px; background: var(--accent); color: #0d1117; text-decoration: none; padding: 4px 12px; border-radius: 5px; font-size: .75rem; font-weight: 700; }
  .np-close { float: right; background: none; border: none; color: var(--muted); cursor: pointer; font-size: 1rem; line-height: 1; }
</style>
</head>
<body>

<nav>
  <h1>🕸 PageRank Simulation</h1>
  <div class="stat-chip">Pages: <strong id="s-pages">—</strong></div>
  <div class="stat-chip">Links: <strong id="s-edges">—</strong></div>
  <div class="stat-chip">Viz nodes: <strong id="s-viz">—</strong></div>
  <a href="../../index.html">← Portfolio</a>
</nav>

<div class="body">
  <!-- ── Sidebar ── -->
  <div class="sidebar">
    <div class="search-box">
      <div class="search-row">
        <input type="text" id="q" placeholder="car, quantum, recipe, war…" />
        <button class="btn" onclick="runSearch()">Search</button>
        <button class="btn btn-ghost" onclick="resetView()" title="Reset">✕</button>
      </div>
      <div class="hint">
        Searches all <span id="hint-total">—</span> pages by keyword.<br>
        Results ranked by <strong>PageRank × relevance</strong>.
        Matched nodes highlight in the network.
      </div>
    </div>
    <div class="results" id="results">
      <div class="empty">Enter a search query above.<br>Try: <em>car</em> · <em>quantum</em> · <em>recipe</em> · <em>war</em></div>
    </div>
    <div class="legend-panel">
      <div class="legend-title">Topics — click to isolate</div>
      <div class="legend-grid" id="legend"></div>
    </div>
  </div>

  <!-- ── Network ── -->
  <div class="net-panel">
    <div id="network"></div>
    <div class="net-info" id="net-info">
      Showing top <strong id="viz-count">—</strong> pages by PageRank.<br>
      Node size = PageRank · Color = topic · Drag to explore.
    </div>
    <div class="node-popup" id="node-popup">
      <button class="np-close" onclick="closePopup()">×</button>
      <div class="np-title" id="np-title"></div>
      <div class="np-row">Topic: <strong id="np-topic"></strong></div>
      <div class="np-row">Keywords: <strong id="np-kw"></strong></div>
      <div class="np-row">PageRank score: <strong id="np-pr"></strong></div>
      <div class="np-row">In-links (viz): <strong id="np-deg"></strong></div>
      <a class="np-open" id="np-link" href="#" target="_blank">Open page →</a>
    </div>
  </div>
</div>

<script>
// ── Injected data ─────────────────────────────────────────────────────────────
const ALL_NODES    = __ALL_NODES__;
const VIZ_NODES    = __VIZ_NODES__;
const VIZ_EDGES    = __VIZ_EDGES__;
const TOPIC_COLORS = __TOPIC_COLORS__;
const STATS        = __STATS__;

// ── Init stats ────────────────────────────────────────────────────────────────
document.getElementById('s-pages').textContent    = STATS.pages.toLocaleString();
document.getElementById('s-edges').textContent    = STATS.edges.toLocaleString();
document.getElementById('s-viz').textContent      = VIZ_NODES.length.toLocaleString();
document.getElementById('viz-count').textContent  = VIZ_NODES.length.toLocaleString();
document.getElementById('hint-total').textContent = STATS.pages.toLocaleString();

const nodeMap  = new Map(ALL_NODES.map(n => [n.id, n]));
const prMax    = Math.max(...VIZ_NODES.map(n => n.pr));
const prMin    = Math.min(...VIZ_NODES.map(n => n.pr));

function prToSize(pr) {
  return 5 + 30 * Math.sqrt((pr - prMin) / (prMax - prMin + 1e-12));
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── vis.js datasets ───────────────────────────────────────────────────────────
const nodesDS = new vis.DataSet(VIZ_NODES.map(n => {
  const c = TOPIC_COLORS[n.topic] || '#888';
  return {
    id:    n.id,
    label: '',   // labels make 700-node graph too noisy; show on hover/click
    title: `<b>${n.title}</b><br><small>${n.topic} · ${n.kw}</small>`,
    size:  prToSize(n.pr),
    color: { background: c, border: c, highlight: { background: '#fff', border: '#fff' }, hover: { background: '#fff', border: c } },
    font:  { color: '#c9d1d9', size: 10 },
    _topic: n.topic,
    _pr:    n.pr,
    _title: n.title,
    _kw:    n.kw,
  };
}));

const edgesDS = new vis.DataSet(VIZ_EDGES.map((e, i) => ({
  id:     i,
  from:   e.source,
  to:     e.target,
  arrows: { to: { enabled: true, scaleFactor: 0.3 } },
  color:  { color: '#30363d', opacity: 0.5 },
  width:  0.5,
  smooth: { type: 'curvedCW', roundness: 0.1 },
})));

// ── vis.js Network ────────────────────────────────────────────────────────────
const container = document.getElementById('network');
const network   = new vis.Network(container, { nodes: nodesDS, edges: edgesDS }, {
  physics: {
    enabled: true,
    solver: 'forceAtlas2Based',
    forceAtlas2Based: {
      gravitationalConstant: -60,
      centralGravity: 0.005,
      springLength: 80,
      springConstant: 0.04,
      damping: 0.6,
      avoidOverlap: 0.3,
    },
    stabilization: { iterations: 150, updateInterval: 25 },
    maxVelocity: 40,
    minVelocity: 0.5,
  },
  interaction: {
    hover: true,
    tooltipDelay: 150,
    zoomView: true,
    dragView: true,
    selectConnectedEdges: true,
  },
  nodes: { shape: 'dot', scaling: { min: 5, max: 35 } },
});

// click → show popup
network.on('click', function(params) {
  if (params.nodes.length > 0) showPopup(params.nodes[0]);
  else closePopup();
});

// ── Node popup ────────────────────────────────────────────────────────────────
function showPopup(nodeId) {
  const nd = nodesDS.get(nodeId);
  if (!nd) return;
  document.getElementById('np-title').textContent  = nd._title;
  document.getElementById('np-topic').textContent  = nd._topic;
  document.getElementById('np-kw').textContent     = nd._kw;
  document.getElementById('np-pr').textContent     = (nd._pr * 1e4).toFixed(3) + ' ‱';
  document.getElementById('np-deg').textContent    = network.getConnectedNodes(nodeId, 'from').length;
  document.getElementById('np-link').href          = 'pages/' + nodeId + '.html';
  const popup = document.getElementById('node-popup');
  popup.classList.add('show');
}
function closePopup() {
  document.getElementById('node-popup').classList.remove('show');
}

// ── Search ────────────────────────────────────────────────────────────────────
let lastMatchIds = null;

function runSearch() {
  const q = document.getElementById('q').value.trim().toLowerCase();
  if (!q) { resetView(); return; }
  const terms = q.split(/\s+/);

  const scored = [];
  for (const n of ALL_NODES) {
    const hay = (n.title + ' ' + n.kw).toLowerCase();
    let rel = 0;
    for (const t of terms) {
      if (n.title.toLowerCase().includes(t)) rel += 3;
      if (n.kw.toLowerCase().includes(t))    rel += 2;
    }
    if (rel > 0) scored.push({ n, rel, score: n.pr * Math.sqrt(rel) });
  }
  scored.sort((a, b) => b.score - a.score);

  const top50   = scored.slice(0, 50);
  const matchIds = new Set(top50.map(x => x.n.id));
  lastMatchIds   = matchIds;

  renderResults(top50, q);
  highlightNetwork(matchIds);
  document.getElementById('net-info').innerHTML =
    `<strong>"${q}"</strong> → ${scored.length.toLocaleString()} matches across all pages.<br>
     Top ${Math.min(30, matchIds.size)} highlighted in network. Click node for details.`;
}

document.getElementById('q').addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });

function resetView() {
  document.getElementById('q').value   = '';
  document.getElementById('results').innerHTML =
    '<div class="empty">Enter a search query above.<br>Try: <em>car</em> · <em>quantum</em> · <em>recipe</em> · <em>war</em></div>';
  document.getElementById('net-info').innerHTML =
    `Showing top <strong>${VIZ_NODES.length.toLocaleString()}</strong> pages by PageRank.<br>Node size = PageRank · Color = topic · Drag to explore.`;
  lastMatchIds = null;
  applyTopicFilter(null);
  closePopup();
}

// ── Result panel renderer ─────────────────────────────────────────────────────
function renderResults(items, q) {
  if (!items.length) {
    document.getElementById('results').innerHTML = `<div class="empty">No matches for "${q}"</div>`;
    return;
  }
  const maxScore = items[0].score;
  document.getElementById('results').innerHTML = items.map((item, i) => {
    const n   = item.n;
    const pct = (item.score / maxScore * 100).toFixed(0);
    const c   = TOPIC_COLORS[n.topic] || '#888';
    const inViz = VIZ_NODES.find(v => v.id === n.id) ? '' : ' <span style="color:var(--muted);font-size:.65rem">(not in viz)</span>';
    return `<div class="result-item" onclick="focusNode('${n.id}')">
      <div class="r-num">#${i+1}</div>
      <div class="r-title">${n.title}${inViz}</div>
      <div class="r-meta"><span class="dot" style="background:${c}"></span>${n.topic} · PR: ${(n.pr*1e4).toFixed(2)}‱</div>
      <div class="r-bar-wrap"><div class="r-bar" style="width:${pct}%;background:${c}"></div></div>
    </div>`;
  }).join('');
}

function focusNode(id) {
  if (!VIZ_NODES.find(n => n.id === id)) return;
  network.focus(id, { scale: 2.0, animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
  network.selectNodes([id]);
  showPopup(id);
}

// ── Network highlight ─────────────────────────────────────────────────────────
function highlightNetwork(matchIds) {
  const vizMatch = new Set([...matchIds].filter(id => VIZ_NODES.find(n => n.id === id)));

  const nodeUpdates = VIZ_NODES.map(n => {
    const c = TOPIC_COLORS[n.topic] || '#888';
    if (vizMatch.has(n.id)) {
      return { id: n.id, color: { background: '#ffd700', border: '#fff', highlight: { background: '#fff', border: '#ffd700' } }, size: prToSize(n.pr) * 1.8, font: { color: '#ffd700', size: 11 }, label: n.title.length > 18 ? n.title.slice(0,18)+'…' : n.title };
    }
    return { id: n.id, color: { background: hexToRgba(c, 0.15), border: hexToRgba(c, 0.15) }, size: prToSize(n.pr), label: '' };
  });
  nodesDS.update(nodeUpdates);

  const edgeUpdates = edgesDS.get().map(e => ({
    id:    e.id,
    color: { color: (vizMatch.has(e.from) || vizMatch.has(e.to)) ? '#58a6ff' : '#1e2530', opacity: vizMatch.has(e.from) ? 0.7 : 0.1 },
    width: vizMatch.has(e.from) ? 1.5 : 0.3,
  }));
  edgesDS.update(edgeUpdates);
}

// ── Topic filter (legend) ─────────────────────────────────────────────────────
let activeTopic = null;

function applyTopicFilter(topic) {
  activeTopic = topic;
  const nodeUpdates = VIZ_NODES.map(n => {
    const c = TOPIC_COLORS[n.topic] || '#888';
    const on = !topic || n.topic === topic;
    return {
      id:    n.id,
      color: { background: on ? c : hexToRgba(c, 0.1), border: on ? c : hexToRgba(c, 0.1) },
      size:  on ? prToSize(n.pr) : prToSize(n.pr) * 0.5,
      label: '',
    };
  });
  nodesDS.update(nodeUpdates);
  edgesDS.update(edgesDS.get().map(e => ({
    id: e.id,
    color: { color: !topic || (VIZ_NODES.find(n=>n.id===e.from)?.topic === topic) ? '#30363d' : '#161b22', opacity: !topic ? 0.5 : (VIZ_NODES.find(n=>n.id===e.from)?.topic === topic ? 0.6 : 0.05) },
  })));

  Object.keys(TOPIC_COLORS).forEach(t => {
    const row = document.getElementById('leg-' + t);
    const lbl = document.getElementById('leg-lbl-' + t);
    if (row) row.classList.toggle('active', t === topic);
    if (lbl) lbl.className = 'leg-lbl' + (!topic || t === topic ? '' : ' dim');
  });
}

function toggleTopic(t) {
  applyTopicFilter(activeTopic === t ? null : t);
}

// ── Build legend ──────────────────────────────────────────────────────────────
document.getElementById('legend').innerHTML = Object.keys(TOPIC_COLORS).map(t =>
  `<div class="leg-row" id="leg-${t}" onclick="toggleTopic('${t}')">
    <div class="leg-dot" style="background:${TOPIC_COLORS[t]}"></div>
    <div class="leg-lbl" id="leg-lbl-${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</div>
  </div>`
).join('');
</script>
</body>
</html>
"""

def generate_index(pages, G, pr):
    print("  Generating index.html...", end="\r")
    id_to_page = {p["id"]: p for p in pages}

    # all node data for search (all 10k)
    all_nodes_js = [
        {"id": p["id"], "title": p["title"], "topic": p["topic"],
         "kw": ",".join(p["keywords"]), "pr": round(pr.get(p["id"], 0), 8)}
        for p in pages
    ]

    # top VIZ_N nodes for vis.js
    top_ids  = sorted(pr.keys(), key=lambda x: pr[x], reverse=True)[:VIZ_N]
    top_set  = set(top_ids)
    viz_nodes = [
        {"id": nid, "title": id_to_page[nid]["title"], "topic": id_to_page[nid]["topic"],
         "kw": ",".join(id_to_page[nid]["keywords"]), "pr": round(pr[nid], 8)}
        for nid in top_ids
    ]

    # edges between top nodes only
    seen, viz_edges = set(), []
    for nid in top_ids:
        for succ in G.successors(nid):
            if succ in top_set and (nid, succ) not in seen:
                seen.add((nid, succ))
                viz_edges.append({"source": nid, "target": succ})

    stats = {"pages": len(pages), "edges": G.number_of_edges()}

    html = INDEX_TEMPLATE
    html = html.replace("__ALL_NODES__",  json.dumps(all_nodes_js, separators=(',',':')))
    html = html.replace("__VIZ_NODES__",  json.dumps(viz_nodes,    separators=(',',':')))
    html = html.replace("__VIZ_EDGES__",  json.dumps(viz_edges,    separators=(',',':')))
    html = html.replace("__TOPIC_COLORS__", json.dumps(TOPIC_COLORS, separators=(',',':')))
    html = html.replace("__STATS__",      json.dumps(stats,         separators=(',',':')))

    Path("index.html").write_text(html, encoding="utf-8")
    print(f"  index.html generated ({len(html.encode())//1024} KB) ✓")

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import time
    t0 = time.time()
    print(f"\n🕸  PageRank Simulation Generator")
    print(f"   {NUM_PAGES:,} pages · {len(TOPIC_NAMES)} topics · top {VIZ_N} nodes in vis.js\n")

    print("[1/5] Generating page metadata...")
    pages = generate_pages()
    print("[2/5] Assigning links...")
    pages = assign_links(pages)
    print("[3/5] Writing HTML files...")
    write_pages(pages)
    print("[4/5] Building graph + running PageRank (NetworkX)...")
    G  = build_graph(pages)
    pr = compute_pagerank(G)
    print("[5/5] Generating index.html...")
    generate_index(pages, G, pr)

    print(f"\n✅  Done in {time.time()-t0:.1f}s")
    print(f"   → Open index.html in your browser\n")
